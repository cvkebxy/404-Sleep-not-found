<?php
include 'db.php';
header('Content-Type: application/json');

// Отладка
error_log("POST данные: " . print_r($_POST, true));

$name = $_POST['name'] ?? '';
$surname = $_POST['surname'] ?? '';
$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';
$confirm = $_POST['confirm'] ?? '';

error_log("Полученные данные - name: $name, surname: $surname, email: $email, password: $password, confirm: $confirm");

// Проверяем нажата ли кнопка отправки формы
if (isset($_POST['doGo']) || $_SERVER['REQUEST_METHOD'] === 'POST') {
    
    $error = '';
    
    // Все последующие проверки, проверяют форму и выводят ошибку
    // Проверка есть ли логин (email)
    if (empty($email)) {
        $error = 'Введите email';
    }
    
    // Проверка есть ли имя
    if (empty($name)) {
        $error = 'Введите имя';
    }
    
    // Проверка есть ли фамилия
    if (empty($surname)) {
        $error = 'Введите фамилию';
    }
    
    // Проверка есть ли пароль
    if (empty($password)) {
        $error = 'Введите пароль';
    }
 
    // Проверка есть ли повторный пароль
    if (empty($confirm)) {
        $error = 'Введите повторный пароль';
    }
    
    // Проверка на совпадение паролей
    if ($password !== $confirm) {
        $error = 'Пароли не совпадают';
    }
    
    // Валидация email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Введите корректный email адрес!';
    }

    // Валидация имени - только русские буквы любого регистра
    if (!empty($name) && !preg_match('/^[а-яёА-ЯЁ]+$/u', $name)) {
        $error = "Имя должно содержать только русские буквы!";
    }

    // Валидация фамилии - только русские буквы любого регистра
    if (!empty($surname) && !preg_match('/^[а-яёА-ЯЁ]+$/u', $surname)) {
        $error = "Фамилия должна содержать только русские буквы!";
    }

    if (strlen($password) < 6) {
        $error = "Пароль должен содержать минимум 6 символов!";
    }

    // Проверка существующего пользователя
    if (empty($error)) {
        $stmt = $conn->prepare("SELECT id FROM users WHERE login = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) {
            $error = "Пользователь с таким email уже существует!";
        }
        $stmt->close();
    }

    // Если ошибок нет, то происходит регистрация 
    if (empty($error)) {
        // Пароль хешируется
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        // Добавление пользователя в БД
        $stmt = $conn->prepare("INSERT INTO users (login, password, name, surname) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", $email, $hashed_password, $name, $surname);

        if ($stmt->execute()) {
            echo json_encode([
                "status" => "success", 
                "message" => "Регистрация прошла успешно! Теперь вы можете войти в систему."
            ]);
        } else {
            echo json_encode([
                "status" => "error", 
                "message" => "Ошибка при регистрации. Попробуйте позже."
            ]);
        }
        $stmt->close();
    } else {
        // Если ошибка есть, то выводить её 
        echo json_encode([
            "status" => "error", 
            "message" => $error
        ]);
    }
} else {
    echo json_encode([
        "status" => "error", 
        "message" => "Неверный запрос"
    ]);
}
?>