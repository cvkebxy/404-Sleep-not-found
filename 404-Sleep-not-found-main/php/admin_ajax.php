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
    case 'get_users':
        $users = get_all_users_with_roles();
        
        // Добавляем флаг текущего пользователя
        foreach ($users as &$user) {
            $user['is_current'] = ($user['id'] == $current_user['id']);
        }
        
        echo json_encode([
            "status" => "success", 
            "users" => $users
        ]);
        break;
        
    case 'assign_role':
        $user_id = $_POST['user_id'] ?? '';
        $role = $_POST['role'] ?? '';
        
        if (empty($user_id) || empty($role)) {
            echo json_encode(["status" => "error", "message" => "Не указаны данные"]);
            break;
        }
        
        if (assign_role($user_id, $role)) {
            echo json_encode(["status" => "success", "message" => "Роль успешно назначена"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Ошибка назначения роли"]);
        }
        break;
        
    case 'remove_role':
        $user_id = $_POST['user_id'] ?? '';
        $role = $_POST['role'] ?? '';
        
        if (empty($user_id) || empty($role)) {
            echo json_encode(["status" => "error", "message" => "Не указаны данные"]);
            break;
        }
        
        if (remove_role($user_id, $role)) {
            echo json_encode(["status" => "success", "message" => "Роль успешно удалена"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Ошибка удаления роли"]);
        }
        break;
        
    case 'delete_user':
        $user_id = $_POST['user_id'] ?? '';
        
        if (empty($user_id)) {
            echo json_encode(["status" => "error", "message" => "Не указан пользователь"]);
            break;
        }
        
        // Не позволяем удалить самого себя
        if ($user_id == $current_user['id']) {
            echo json_encode(["status" => "error", "message" => "Нельзя удалить свой аккаунт"]);
            break;
        }
        
        if (delete_user($user_id)) {
            echo json_encode(["status" => "success", "message" => "Пользователь успешно удален"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Ошибка удаления пользователя"]);
        }
        break;
        
    default:
        echo json_encode(["status" => "error", "message" => "Неизвестное действие"]);
        break;
}
?>