<?php
session_start();
include 'db.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user']['id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Не авторизован']);
    exit;
}

$user_id = $_SESSION['user']['id'];
$new_password = $_POST['new_password'] ?? '';
$current_password = $_POST['current_password'] ?? '';

// Дополнительная проверка текущего пароля для безопасности
$stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();
    
    if (!password_verify($current_password, $user['password'])) {
        echo json_encode(['status' => 'error', 'message' => 'Ошибка безопасности']);
        exit;
    }
    
    // Хешируем новый пароль
    $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
    
    $update_stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
    $update_stmt->bind_param("si", $hashed_password, $user_id);
    
    if ($update_stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Пароль успешно изменен']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Ошибка при обновлении пароля']);
    }
    
    $update_stmt->close();
} else {
    echo json_encode(['status' => 'error', 'message' => 'Пользователь не найден']);
}

$stmt->close();
?>