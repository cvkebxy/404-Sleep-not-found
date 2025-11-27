<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

include 'db.php';

// Проверяем подключение к БД
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$query = $_GET['q'] ?? '';
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$limit = 6;
$offset = ($page - 1) * $limit;

if (empty($query)) {
    echo json_encode(['success' => false, 'message' => 'Empty query']);
    exit;
}

try {
    // Получаем ID текущего пользователя (если есть)
    $user_id = null;
    if (isset($_COOKIE['auth_key'])) {
        $stmt = $conn->prepare("SELECT id FROM users WHERE auth_key = ?");
        if ($stmt) {
            $stmt->bind_param("s", $_COOKIE['auth_key']);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($user = $result->fetch_assoc()) {
                $user_id = $user['id'];
            }
            $stmt->close();
        }
    }

    // Если пользователь не авторизован, используем 0 для user_id
    if (!$user_id) {
        $user_id = 0;
    }

    $projects = [];
    $total_count = 0;

    // Используем LIKE поиск для лучшей работы с русским языком
    $search_term = "%$query%";
    $sql = "SELECT c.*, 
                   COALESCE(cp.id, 0) as is_joined,
                   n.name as nko_name,
                   n.website as nko_website,
                   n.social_links as nko_social_links,
                   (CASE 
                      WHEN c.header LIKE ? THEN 4
                      WHEN c.location LIKE ? THEN 3
                      WHEN c.main_text LIKE ? THEN 2
                      WHEN c.sub_text LIKE ? THEN 1
                      ELSE 0
                   END) as relevance
            FROM cards c
            LEFT JOIN card_participants cp ON c.id = cp.card_id AND cp.user_id = ?
            LEFT JOIN nko_organizations n ON c.created_by = n.user_id
            WHERE c.header LIKE ? OR c.location LIKE ? OR c.main_text LIKE ? OR c.sub_text LIKE ?
            ORDER BY relevance DESC, c.created_at DESC 
            LIMIT ? OFFSET ?";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $stmt->bind_param("ssssissssii", 
        $search_term, $search_term, $search_term, $search_term, // для CASE
        $user_id, // для JOIN
        $search_term, $search_term, $search_term, $search_term, // для WHERE
        $limit, $offset // для LIMIT
    );
    
    if (!$stmt->execute()) {
        throw new Exception("Execute failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    while ($row = $result->fetch_assoc()) {
        $projects[] = $row;
    }
    $stmt->close();

    // Получаем общее количество результатов
    $count_sql = "SELECT COUNT(*) as total 
                  FROM cards c 
                  WHERE c.header LIKE ? OR c.location LIKE ? OR c.main_text LIKE ? OR c.sub_text LIKE ?";
    $count_stmt = $conn->prepare($count_sql);
    
    if (!$count_stmt) {
        throw new Exception("Count prepare failed: " . $conn->error);
    }
    
    $count_stmt->bind_param("ssss", $search_term, $search_term, $search_term, $search_term);
    
    if (!$count_stmt->execute()) {
        throw new Exception("Count execute failed: " . $count_stmt->error);
    }
    
    $count_result = $count_stmt->get_result();
    $total_data = $count_result->fetch_assoc();
    $total_count = $total_data['total'] ?? 0;
    $count_stmt->close();

    echo json_encode([
        'success' => true,
        'projects' => $projects,
        'query' => $query,
        'total' => $total_count,
        'current_page' => $page,
        'total_pages' => ceil($total_count / $limit),
        'search_type' => 'LIKE'
    ]);
    
} catch (Exception $e) {
    error_log("Search error: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'message' => 'Search failed',
        'error' => $e->getMessage()
    ]);
}

$conn->close();
?>