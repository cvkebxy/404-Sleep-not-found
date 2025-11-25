<?php
include 'db.php';
header('Content-Type: application/json');

// Отладка - посмотрим что приходит
error_log("POST данные: " . print_r($_POST, true));

$name = $_POST['name'] ?? '';
$surname = $_POST['surname'] ?? '';
$login = $_POST['login'] ?? '';
$password = $_POST['password'] ?? '';
$confirm = $_POST['confirm'] ?? '';

error_log("Полученные данные - name: $name, surname: $surname, login: $login, password: $password, confirm: $confirm");

// Валидация данных
if (empty($name) || empty($surname) || empty($login) || empty($password) || empty($confirm)) {
    error_log("Ошибка валидации: пустые поля");
    echo json_encode(["status" => "error", "message" => "Все поля обязательны для заполнения!"]);
    exit;
}

// Валидация имени - только русские буквы любого регистра
if (!preg_match('/^[а-яёА-ЯЁ]+$/u', $name)) {
    echo json_encode(["status" => "error", "message" => "Имя должно содержать только русские буквы!"]);
    exit;
}

// Валидация фамилии - только русские буквы любого регистра
if (!preg_match('/^[а-яёА-ЯЁ]+$/u', $surname)) {
    echo json_encode(["status" => "error", "message" => "Фамилия должна содержать только русские буквы!"]);
    exit;
}

// Валидация email
if (!filter_var($login, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["status" => "error", "message" => "Введите корректный email адрес!"]);
    exit;
}

if (strlen($password) < 6) {
    echo json_encode(["status" => "error", "message" => "Пароль должен содержать минимум 6 символов!"]);
    exit;
}

if ($password !== $confirm) {
    echo json_encode(["status" => "error", "message" => "Пароли не совпадают!"]);
    exit;
}

// Проверка существующего пользователя
$stmt = $conn->prepare("SELECT id FROM users WHERE login = ?");
$stmt->bind_param("s", $login);
$stmt->execute();
if ($stmt->get_result()->num_rows > 0) {
    echo json_encode(["status" => "error", "message" => "Пользователь с таким email уже существует!"]);
    exit;
}
$stmt->close();

// Регистрация
$hashed_password = password_hash($password, PASSWORD_DEFAULT);
$stmt = $conn->prepare("INSERT INTO users (login, password, name, surname) VALUES (?, ?, ?, ?)");
$stmt->bind_param("ssss", $login, $hashed_password, $name, $surname);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Регистрация прошла успешно! Теперь вы можете войти."]);
} else {
    echo json_encode(["status" => "error", "message" => "Ошибка при регистрации. Попробуйте позже."]);
}

$stmt->close();
?>