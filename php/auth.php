<?php
include 'db.php';
header('Content-Type: application/json');

// Отладка
error_log("=== AUTH DEBUG ===");
error_log("POST данные: " . print_r($_POST, true));

$login = $_POST['login'] ?? '';
$password = $_POST['password'] ?? '';
$remember = isset($_POST['remember']);

error_log("Полученные данные - login: $login, password: $password, remember: " . ($remember ? 'true' : 'false'));

// Валидация
if (empty($login) || empty($password)) {
    error_log("Ошибка: пустые поля");
    echo json_encode(["status" => "error", "message" => "Все поля обязательны для заполнения!"]);
    exit;
}

error_log("Ищем пользователя с логином: $login");

$stmt = $conn->prepare("SELECT * FROM users WHERE login = ?");
$stmt->bind_param("s", $login);
$stmt->execute();
$result = $stmt->get_result();

if ($user = $result->fetch_assoc()) {
    error_log("Пользователь найден: " . print_r($user, true));
    error_log("Хэш пароля в БД: " . $user['password']);
    error_log("Введенный пароль: $password");
    
    if (password_verify($password, $user['password'])) {
        error_log("Пароль верный");
        
        // Генерируем уникальный ключ авторизации
        $auth_key = bin2hex(random_bytes(32));
        
        // Сохраняем ключ в базу данных
        $update = $conn->prepare("UPDATE users SET auth_key = ? WHERE id = ?");
        $update->bind_param("si", $auth_key, $user['id']);
        $update->execute();
        $update->close();

        // Устанавливаем cookie
        $expire = $remember ? time() + (10 * 365 * 24 * 60 * 60) : time() + 3600; // 10 лет или 1 час
        setcookie("auth_key", $auth_key, $expire, "/");

        error_log("Auth key установлен: $auth_key");
        error_log("Cookie установлен с expire: $expire");

        // Формируем приветственное сообщение с полным именем
        $full_name = '';
        if (!empty($user['name']) && !empty($user['surname'])) {
            $full_name = $user['name'] . ' ' . $user['surname'];
        } elseif (!empty($user['name'])) {
            $full_name = $user['name'];
        } else {
            $full_name = $user['login'];
        }

        echo json_encode([
            "status" => "success", 
            "message" => "Добро пожаловать, " . $full_name . "!"
        ]);
    } else {
        error_log("Неверный пароль");
        echo json_encode(["status" => "error", "message" => "Неверный пароль!"]);
    }
} else {
    error_log("Пользователь не найден");
    echo json_encode(["status" => "error", "message" => "Пользователь не найден!"]);
}

$stmt->close();
error_log("=== END AUTH DEBUG ===");
?>