<?php
include 'db.php';
require 'phpmailer/PHPMailer.php';
require 'phpmailer/SMTP.php';
require 'phpmailer/Exception.php';

header('Content-Type: application/json');
session_start();

// Отладка
error_log("POST данные: " . print_r($_POST, true));

$name = $_POST['name'] ?? '';
$surname = $_POST['surname'] ?? '';
$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';
$confirm = $_POST['confirm'] ?? '';
$code = $_POST['code'] ?? '';

error_log("Полученные данные - name: $name, surname: $surname, email: $email, password: $password, confirm: $confirm, code: $code");

function generateCode() {
    return str_pad(random_int(0, 9999), 4, '0', STR_PAD_LEFT);
}

// Проверяем нажата ли кнопка отправки формы
if (isset($_POST['doGo']) || $_SERVER['REQUEST_METHOD'] === 'POST') {
    
    $error = '';
    
    // Если код уже отправлен, проверяем введенный код
    if (isset($_SESSION['registration_step']) && $_SESSION['registration_step'] === 'code_verification') {
        if ($code == $_SESSION['registration_code']) {
            // Код верный, завершаем регистрацию
            $hashed_password = password_hash($_SESSION['reg_password'], PASSWORD_DEFAULT);
            
            $stmt = $conn->prepare("INSERT INTO users (login, password, name, surname) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("ssss", $_SESSION['reg_email'], $hashed_password, $_SESSION['reg_name'], $_SESSION['reg_surname']);

            if ($stmt->execute()) {
                // Очищаем сессию
                unset($_SESSION['registration_step']);
                unset($_SESSION['registration_code']);
                unset($_SESSION['reg_email']);
                unset($_SESSION['reg_password']);
                unset($_SESSION['reg_name']);
                unset($_SESSION['reg_surname']);
                
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
            echo json_encode([
                "status" => "error", 
                "message" => "Неверный код подтверждения"
            ]);
        }
        return;
    }
    
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

    // Если ошибок нет, то отправляем код подтверждения
    if (empty($error)) {
        $renderCode = generateCode();
        
        // Сохраняем данные в сессии
        $_SESSION['registration_step'] = 'code_verification';
        $_SESSION['registration_code'] = $renderCode;
        $_SESSION['reg_email'] = $email;
        $_SESSION['reg_password'] = $password;
        $_SESSION['reg_name'] = $name;
        $_SESSION['reg_surname'] = $surname;

        // Формирование письма
        $title = "Подтвердите регистрацию";
        $body = "
            <h2>Здравствуйте, $name!</h2>
            <p>Благодарим вас за регистрацию на нашем сайте.</p>
            <p>Ваш код подтверждения: <strong>$renderCode</strong></p>
            <p>Введите этот код в форму регистрации для завершения процесса.</p>
        ";
        
        // Настройки PHPMailer
        $mail = new PHPMailer\PHPMailer\PHPMailer();
        
        try {
            $mail->isSMTP();   
            $mail->CharSet = "UTF-8";
            $mail->SMTPAuth = true;
            $mail->SMTPDebug = 0; // Поставьте 2 для отладки
            $mail->Debugoutput = function($str, $level) {$GLOBALS['data']['debug'][] = $str;};
            
            // ЗАМЕНИТЕ НА ВАШИ РЕАЛЬНЫЕ НАСТРОЙКИ ПОЧТЫ
            $mail->Host       = 'smtp.yandex.com'; // SMTP сервер
            $mail->Username   = 'rohanudzumaki@yandex.ru'; // Логин почты
            $mail->Password   = 'wjzuvxdrgxpoloda'; // Пароль почты
            $mail->SMTPSecure = 'ssl';
            $mail->Port       = 465;
            $mail->setFrom('rohanudzumaki@yandex.ru', 'КАРТА ДОБРЫХ ДЕЛ РОСАТОМА'); // От кого
            
            // Получатель - email пользователя
            $mail->addAddress($email);  
            
            $mail->isHTML(true);
            $mail->Subject = $title;
            $mail->Body = $body;    
            
            if ($mail->send()) {
                echo json_encode([
                    "status" => "code_sent", 
                    "message" => "Код подтверждения отправлен на вашу почту. Проверьте email и введите код ниже."
                ]);
            } else {
                error_log("Ошибка отправки письма: " . $mail->ErrorInfo);
                echo json_encode([
                    "status" => "error", 
                    "message" => "Ошибка отправки кода подтверждения. Попробуйте позже."
                ]);
            }
        } catch (Exception $e) {
            error_log("Ошибка PHPMailer: " . $e->getMessage());
            echo json_encode([
                "status" => "error", 
                "message" => "Ошибка отправки email: " . $e->getMessage()
            ]);
        }
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