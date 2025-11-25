<?php
include 'db.php';
header('Content-Type: application/json');

$project_id = $_GET['project_id'] ?? 0;

if (!$project_id) {
    echo json_encode(['success' => false, 'message' => 'ID проекта не указан']);
    exit;
}

try {
    // Настройки пагинации (должны совпадать с настройками в index.php)
    $cards_per_page = 6;
    
    // 1. Проверяем существует ли проект
    $stmt = $conn->prepare("SELECT id, created_at FROM cards WHERE id = ?");
    $stmt->bind_param("i", $project_id);
    $stmt->execute();
    $project_result = $stmt->get_result();
    
    if ($project_result->num_rows === 0) {
        echo json_encode([
            'success' => false, 
            'message' => 'Проект не существует или был удален'
        ]);
        exit;
    }
    
    $project = $project_result->fetch_assoc();
    $stmt->close();
    
    // 2. Определяем порядковый номер проекта в общем списке
    // Считаем сколько проектов создано ДО этого проекта
    $stmt = $conn->prepare("
        SELECT COUNT(*) as position 
        FROM cards 
        WHERE created_at > ? OR (created_at = ? AND id > ?)
        ORDER BY created_at DESC, id DESC
    ");
    $stmt->bind_param("sii", $project['created_at'], $project['created_at'], $project_id);
    $stmt->execute();
    $position_result = $stmt->get_result();
    $position_data = $position_result->fetch_assoc();
    $position = $position_data['position'] ?? 0;
    $stmt->close();
    
    // 3. Вычисляем страницу (проекты отсортированы от новых к старым)
    $page = floor($position / $cards_per_page) + 1;
    
    // 4. Проверяем что страница существует
    $total_cards_stmt = $conn->prepare("SELECT COUNT(*) as total FROM cards");
    $total_cards_stmt->execute();
    $total_cards_result = $total_cards_stmt->get_result();
    $total_cards = $total_cards_result->fetch_assoc()['total'] ?? 0;
    $total_cards_stmt->close();
    
    $total_pages = ceil($total_cards / $cards_per_page);
    
    if ($page > $total_pages) {
        $page = $total_pages; // На случай если расчеты не точные
    }
    
    echo json_encode([
        'success' => true, 
        'page' => $page,
        'position' => $position + 1, // +1 потому что позиция с 0
        'total_pages' => $total_pages,
        'project_exists' => true
    ]);
    
} catch (Exception $e) {
    error_log("Ошибка в get_project_page.php: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'message' => 'Внутренняя ошибка сервера'
    ]);
}
?>