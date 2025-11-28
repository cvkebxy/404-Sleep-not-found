<?php
include 'db.php';
include 'functions.php';

header('Content-Type: application/json');

// Проверяем авторизацию и права администратора
$user_key = $_COOKIE['auth_key'] ?? '';
$current_user = null;

if ($user_key) {
    $stmt = $conn->prepare("SELECT id, login FROM users WHERE auth_key = ?");
    $stmt->bind_param("s", $user_key);
    $stmt->execute();
    $current_user = $stmt->get_result()->fetch_assoc();
    $stmt->close();
}

if (!$current_user || !is_admin($current_user['id'])) {
    echo json_encode(["status" => "error", "message" => "Доступ запрещен"]);
    exit;
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'get_nko_applications':
        $applications = get_nko_applications('pending');
        echo json_encode(["status" => "success", "applications" => $applications]);
        break;
        
    case 'get_verified_nko':
        $verified_nko = get_nko_applications('approved');
        echo json_encode(["status" => "success", "nko_list" => $verified_nko]);
        break;
        
    case 'approve_nko':
        $nko_id = $_POST['nko_id'] ?? '';
        $user_id = $_POST['user_id'] ?? '';
        
        if (empty($nko_id) || empty($user_id)) {
            echo json_encode(["status" => "error", "message" => "Не указаны данные"]);
            break;
        }
        
        if (approve_nko_application($nko_id, $user_id)) {
            echo json_encode(["status" => "success", "message" => "НКО одобрена"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Ошибка одобрения НКО"]);
        }
        break;
        
    case 'reject_nko':
        $nko_id = $_POST['nko_id'] ?? '';
        $comment = $_POST['comment'] ?? '';
        
        if (empty($nko_id)) {
            echo json_encode(["status" => "error", "message" => "Не указана НКО"]);
            break;
        }
        
        if (reject_nko_application($nko_id, $comment)) {
            echo json_encode(["status" => "success", "message" => "НКО отклонена"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Ошибка отклонения НКО"]);
        }
        break;
        
    default:
        echo json_encode(["status" => "error", "message" => "Неизвестное действие"]);
        break;
}

// Функции для работы с НКО
function get_nko_applications($status) {
    global $conn;
    
    $stmt = $conn->prepare("
        SELECT n.*, u.login, u.name, u.surname 
        FROM nko_organizations n 
        LEFT JOIN users u ON n.user_id = u.id 
        WHERE n.status = ?
        ORDER BY n.created_at DESC
    ");
    $stmt->bind_param("s", $status);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $applications = [];
    while ($row = $result->fetch_assoc()) {
        $applications[] = $row;
    }
    
    $stmt->close();
    return $applications;
}

function approve_nko_application($nko_id, $user_id) {
    global $conn;
    
    // Обновляем статус НКО
    $stmt = $conn->prepare("UPDATE nko_organizations SET status = 'approved' WHERE id = ?");
    $stmt->bind_param("i", $nko_id);
    $result = $stmt->execute();
    $stmt->close();
    
    if ($result) {
        // Назначаем пользователю роль НКО
        return assign_role($user_id, 'nko');
    }
    
    return false;
}

function reject_nko_application($nko_id, $comment) {
    global $conn;
    
    $stmt = $conn->prepare("UPDATE nko_organizations SET status = 'rejected', moderation_comment = ? WHERE id = ?");
    $stmt->bind_param("si", $comment, $nko_id);
    $result = $stmt->execute();
    $stmt->close();
    
    return $result;
}
?>