<?php
// Подключаем проверку сессии
require_once 'check_session.php';

header('Content-Type: application/json');

// Проверяем авторизацию
if (!$current_user) {
    echo json_encode([
        'status' => 'error', 
        'message' => 'Не авторизован. Пожалуйста, перезайдите в систему.'
    ]);
    exit;
}

$user_id = $current_user['id'];
$current_password = $_POST['current_password'] ?? '';

if (empty($current_password)) {
    echo json_encode(['status' => 'error', 'message' => 'Введите текущий пароль']);
    exit;
}

// Получаем текущий пароль из БД
$stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();
    
    if (password_verify($current_password, $user['password'])) {
        echo json_encode(['status' => 'success', 'message' => 'Пароль верный']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Неверный текущий пароль']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Пользователь не найден']);
}

$stmt->close();
?>