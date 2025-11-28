<?php
session_start();
include 'db.php';
require 'phpmailer/PHPMailer.php';
require 'phpmailer/SMTP.php';
require 'phpmailer/Exception.php';

header('Content-Type: application/json');

// Проверяем, что запрос POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Неверный метод запроса']);
    exit;
}

$email = $_POST['email'] ?? '';

// Валидация
if (empty($email)) {
    echo json_encode(['status' => 'error', 'message' => 'Введите email адрес']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['status' => 'error', 'message' => 'Введите корректный email адрес']);
    exit;
}

// Проверяем существование пользователя
$stmt = $conn->prepare("SELECT id, name, login FROM users WHERE login = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    // Для безопасности не сообщаем, что пользователь не найден
    echo json_encode([
        'status' => 'success', 
        'message' => 'Если email зарегистрирован в системе, инструкции по восстановлению пароля будут отправлены на указанный адрес'
    ]);
    exit;
}

$user = $result->fetch_assoc();
$stmt->close();

// Генерируем токен для восстановления пароля
$token = bin2hex(random_bytes(32));
$expires = date('Y-m-d H:i:s', strtotime('+1 hour')); // Токен действует 1 час

// Создаем таблицу для токенов восстановления пароля если не существует
$create_table_sql = "
    CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_token (token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";

if (!$conn->query($create_table_sql)) {
    error_log("Ошибка создания таблицы password_resets: " . $conn->error);
}

// Удаляем старые токены для этого email
$delete_stmt = $conn->prepare("DELETE FROM password_resets WHERE email = ?");
$delete_stmt->bind_param("s", $email);
$delete_stmt->execute();
$delete_stmt->close();

// Сохраняем новый токен
$insert_stmt = $conn->prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)");
$insert_stmt->bind_param("sss", $email, $token, $expires);

if ($insert_stmt->execute()) {
    // Формируем ссылку для восстановления
    $reset_link = "https://" . $_SERVER['HTTP_HOST'] . "/php/reset_password.php?token=" . $token;
    
    // Отправляем email с инструкциями
    $mail_sent = sendPasswordResetEmail($email, $user['name'], $reset_link);
    
    if ($mail_sent) {
        echo json_encode([
            'status' => 'success', 
            'message' => 'Инструкции по восстановлению пароля отправлены на ваш email. Пожалуйста, проверьте вашу почту.'
        ]);
    } else {
        echo json_encode([
            'status' => 'error', 
            'message' => 'Ошибка при отправке email. Попробуйте позже или обратитесь в поддержку.'
        ]);
    }
} else {
    echo json_encode([
        'status' => 'error', 
        'message' => 'Ошибка при обработке запроса. Попробуйте позже.'
    ]);
}

$insert_stmt->close();

/* Отправка email с инструкциями по восстановлению пароля */
function sendPasswordResetEmail($email, $name, $reset_link) {
    $mail = new PHPMailer\PHPMailer\PHPMailer();
    
    try {
        // Настройки SMTP
        $mail->isSMTP();
        $mail->CharSet = "UTF-8";
        $mail->SMTPAuth = true;
        $mail->SMTPDebug = 0;
        
        // ЗАМЕНИТЕ НА ВАШИ РЕАЛЬНЫЕ НАСТРОЙКИ ПОЧТЫ
        $mail->Host       = 'smtp.yandex.com'; // SMTP сервер
        $mail->Username   = 'rohanudzumaki@yandex.ru'; // Логин почты
        $mail->Password   = 'wjzuvxdrgxpoloda'; // Пароль почты
        $mail->SMTPSecure = 'ssl';
        $mail->Port       = 465;
        $mail->setFrom('rohanudzumaki@yandex.ru', 'КАРТА ДОБРЫХ ДЕЛ РОСАТОМА'); // От кого
        
        // Получатель
        $mail->addAddress($email, $name);
        
        // Тема и содержимое письма
        $mail->Subject = 'Восстановление пароля';
        
        $mail->Body = "
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='UTF-8'>
                <style>
                    body { color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; font-family: 'Nexa', sans-serif; font-weight: 800;}
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; font-family: 'Roboto', sans-serif; font-weight: 400;}
                    .button { width: 100%; padding: 16px; background: linear-gradient(90deg, #025EA1 0%, #025EA1 100%); color: white; border: none; border-radius: 12px; font-family: 'Nexa', sans-serif; font-size: 18px; font-weight: 700; cursor: pointer; transition: all 0.3s ease; text-transform: uppercase; letter-spacing: 0.5px; position: relative; overflow: hidden; margin-top: 10px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);}
                    .button::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition: left 0.5s;}
                    .button:hover::before { left: 100%;}
                    .button:hover { box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3); transform: translateY(-2px);}
                    .button:active { transform: translateY(0);}
                    .button:disabled { background: #64748b; cursor: not-allowed; transform: none; box-shadow: none;}
                    .button:disabled::before { display: none;}
                    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-family: 'Roboto', sans-serif; font-weight: 300; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h1>Восстановление пароля</h1>
                    </div>
                    <div class='content'>
                        <h2>Здравствуйте, {$name}!</h2>
                        <p>Мы получили запрос на восстановление пароля для вашего аккаунта.</p>
                        <p>Для создания нового пароля нажмите на кнопку ниже:</p>
                        
                        <div style='text-align: center;'>
                            <a href='{$reset_link}' class='button' style='color: white; text-decoration: none;'>
                                Восстановить пароль
                            </a>
                        </div>
                        
                        <p>Или скопируйте и вставьте в браузер следующую ссылку:</p>
                        <p style='word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;'>
                            <a href='{$reset_link}'>" . htmlspecialchars($reset_link) . "</a>
                        </p>
                        
                        <p><strong>Важно:</strong> Ссылка действительна в течение 1 часа.</p>
                        <p>Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.</p>
                    </div>
                    <div class='footer'>
                        <p>Это письмо отправлено автоматически. Пожалуйста, не отвечайте на него.</p>
                        <p>© " . date('Y') . " Ваш Сайт. Все права защищены.</p>
                    </div>
                </div>
            </body>
            </html>
        ";
        
        $mail->AltBody = "Здравствуйте, {$name}!\n\n" .
                        "Мы получили запрос на восстановление пароля для вашего аккаунта.\n\n" .
                        "Для создания нового пароля перейдите по ссылке:\n" .
                        "{$reset_link}\n\n" .
                        "Ссылка действительна в течение 1 часа.\n\n" .
                        "Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.\n\n" .
                        "С уважением,\nВаш Сайт";
        
        $mail->isHTML(true);
        
        return $mail->send();
        
    } catch (Exception $e) {
        error_log("Ошибка отправки email для восстановления пароля: " . $e->getMessage());
        return false;
    }
}
?>