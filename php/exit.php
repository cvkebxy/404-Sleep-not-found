<?php
session_start();
include 'db.php';

$auth_key = $_COOKIE['auth_key'] ?? '';
if ($auth_key) {
    // Удаляем ключ из базы данных
    $stmt = $conn->prepare("UPDATE users SET auth_key = NULL WHERE auth_key = ?");
    $stmt->bind_param("s", $auth_key);
    $stmt->execute();
    $stmt->close();
}

// Удаляем cookie
setcookie("auth_key", "", time() - 3600, "/");

// Устанавливаем сообщение об успешном выходе в сессию
$_SESSION['success_message'] = 'Вы успешно вышли из аккаунта';

// Перенаправляем на главную страницу
header("Location: ../index.php");
exit;
?>