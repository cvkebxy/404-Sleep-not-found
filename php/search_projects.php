<?php
include 'db.php';
header('Content-Type: application/json');

$query = $_GET['q'] ?? '';
$page = $_GET['page'] ?? 1;
$limit = 6;
$offset = ($page - 1) * $limit;

if (empty($query)) {
    echo json_encode(['success' => false, 'message' => 'Пустой запрос']);
    exit;
}

try {
    // Получаем ID текущего пользователя (если есть)
    $user_id = null;
    if (isset($_COOKIE['auth_key'])) {
        $stmt = $conn->prepare("SELECT id FROM users WHERE auth_key = ?");
        $stmt->bind_param("s", $_COOKIE['auth_key']);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($user = $result->fetch_assoc()) {
            $user_id = $user['id'];
        }
        $stmt->close();
    }

    // Полнотекстовый поиск с JOIN для данных НКО
    $sql = "SELECT c.*, 
                   COALESCE(cp.id, 0) as is_joined,
                   n.name as nko_name,
                   n.website as nko_website,
                   n.social_links as nko_social_links,
                   MATCH(c.header, c.main_text, c.location, c.sub_text) 
                   AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
            FROM cards c
            LEFT JOIN card_participants cp ON c.id = cp.card_id AND cp.user_id = ?
            LEFT JOIN nko_organizations n ON c.created_by = n.user_id
            WHERE MATCH(c.header, c.main_text, c.location, c.sub_text) 
                  AGAINST(? IN NATURAL LANGUAGE MODE)
            ORDER BY relevance DESC, c.created_at DESC 
            LIMIT ? OFFSET ?";
    
    $stmt = $conn->prepare($sql);
    
    // Если пользователь не авторизован, используем 0 для user_id
    if (!$user_id) {
        $user_id = 0;
    }
    
    $stmt->bind_param("siii", $query, $user_id, $query, $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $projects = [];
    while ($row = $result->fetch_assoc()) {
        $projects[] = $row;
    }
    
    // Получаем общее количество результатов
    $count_sql = "SELECT COUNT(*) as total 
                  FROM cards c 
                  WHERE MATCH(c.header, c.main_text, c.location, c.sub_text) 
                        AGAINST(? IN NATURAL LANGUAGE MODE)";
    
    $count_stmt = $conn->prepare($count_sql);
    $count_stmt->bind_param("s", $query);
    $count_stmt->execute();
    $count_result = $count_stmt->get_result();
    $total_count = $count_result->fetch_assoc()['total'] ?? 0;
    
    echo json_encode([
        'success' => true,
        'projects' => $projects,
        'query' => $query,
        'total' => $total_count,
        'current_page' => $page,
        'total_pages' => ceil($total_count / $limit)
    ]);
    
} catch (Exception $e) {
    error_log("Ошибка поиска: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Ошибка поиска']);
}
?>