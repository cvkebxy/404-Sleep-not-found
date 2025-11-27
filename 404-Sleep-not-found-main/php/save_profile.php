<?php
session_start();
include 'db.php';
header('Content-Type: application/json');

if (!isset($_COOKIE['auth_key'])) {
    echo json_encode(["success" => false, "message" => "Необходима авторизация"]);
    exit;
}

$auth_key = $_COOKIE['auth_key'];
$user_stmt = $conn->prepare("SELECT id FROM users WHERE auth_key = ?");
$user_stmt->bind_param("s", $auth_key);
$user_stmt->execute();
$user_result = $user_stmt->get_result();

if (!$user = $user_result->fetch_assoc()) {
    echo json_encode(["success" => false, "message" => "Пользователь не найден"]);
    exit;
}

$user_id = $user['id'];
$name = $_POST['name'] ?? '';
$surname = $_POST['surname'] ?? '';
$login = $_POST['login'] ?? '';

// Валидация данных
if (empty($name) || empty($surname) || empty($login)) {
    echo json_encode(["success" => false, "message" => "Все поля обязательны для заполнения"]);
    exit;
}

// Обновляем данные пользователя
$update_stmt = $conn->prepare("UPDATE users SET name = ?, surname = ?, login = ? WHERE id = ?");
$update_stmt->bind_param("sssi", $name, $surname, $login, $user_id);

if ($update_stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Профиль успешно обновлен"]);
} else {
    echo json_encode(["success" => false, "message" => "Ошибка при обновлении профиля: " . $conn->error]);
}

$update_stmt->close();
$user_stmt->close();
?>