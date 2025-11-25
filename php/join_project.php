<?php
session_start();
include 'functions.php';

header('Content-Type: application/json');

if (!isset($_COOKIE['auth_key'])) {
    echo json_encode(["success" => false, "message" => "Необходима авторизация"]);
    exit;
}

$auth_key = $_COOKIE['auth_key'];
$card_id = $_POST['card_id'] ?? 0;

// Получаем пользователя
$stmt = $conn->prepare("SELECT id FROM users WHERE auth_key = ?");
$stmt->bind_param("s", $auth_key);
$stmt->execute();
$result = $stmt->get_result();

if ($user = $result->fetch_assoc()) {
    $user_id = $user['id'];
    $result = join_card($card_id, $user_id);
    
    if ($result['success']) {
        // Возвращаем актуальное количество волонтеров
        $result['new_volunteers_count'] = get_volunteers_count();
    }
    
    echo json_encode($result);
} else {
    echo json_encode(["success" => false, "message" => "Пользователь не найден"]);
}

$stmt->close();
?>