<?php
include 'db.php';
header('Content-Type: application/json');

$login = $_POST['login'] ?? '';
$password = $_POST['password'] ?? '';
$remember = isset($_POST['remember']);

// Валидация
if (empty($login) || empty($password)) {
    echo json_encode(["status" => "error", "message" => "Все поля обязательны для заполнения!"]);
    exit;
}

$stmt = $conn->prepare("SELECT * FROM users WHERE login = ?");
$stmt->bind_param("s", $login);
$stmt->execute();
$result = $stmt->get_result();

if ($user = $result->fetch_assoc()) {
    // Проверяем подтвержден ли email
    /*if ($user['email_confirmed'] == 0) {
        echo json_encode([
            "status" => "error", 
            "message" => "Email не подтвержден. Проверьте вашу почту и подтвердите регистрацию перед входом."
        ]);
        exit;
    }*/
    
    if (password_verify($password, $user['password'])) {
        // Генерируем auth_key для cookie
        $auth_key = md5(uniqid(rand(), true));
        
        // Сохраняем auth_key в базу
        $update_stmt = $conn->prepare("UPDATE users SET auth_key = ? WHERE id = ?");
        $update_stmt->bind_param("si", $auth_key, $user['id']);
        $update_stmt->execute();
        $update_stmt->close();
        
        // Устанавливаем cookie
        if ($remember) {
            setcookie('auth_key', $auth_key, time() + 86400 * 30, "/"); // 30 дней
        } else {
            setcookie('auth_key', $auth_key, 0, "/"); // до закрытия браузера
        }
        
        echo json_encode([
            "status" => "success", 
            "message" => "Добро пожаловать, " . ($user['name'] ?: $user['login']) . "!"
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Неверный пароль!"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Пользователь не найден!"]);
}

$stmt->close();
?>