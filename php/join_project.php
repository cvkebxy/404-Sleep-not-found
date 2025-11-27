<?php
session_start();
include 'functions.php';

header('Content-Type: application/json');

if (!isset($_COOKIE['auth_key'])) {
    echo json_encode(["success" => false, "message" => "Необходима авторизация"]);
    exit;
}

$auth_key = $_COOKIE['auth_key'];
$card_id = $_POST['card_id'] ?? 0;

if ($card_id <= 0) {
    echo json_encode(["success" => false, "message" => "Неверный ID проекта"]);
    exit;
}

// Получаем информацию о пользователе и проекте ДО участия
$user_info = getUserInfoByAuthKey($auth_key);
$project_info = getProjectCreatorInfo($card_id);

if (!$user_info) {
    echo json_encode(["success" => false, "message" => "Пользователь не найден"]);
    exit;
}

$user_id = $user_info['id'];
$volunteer_name = trim($user_info['name'] . ' ' . $user_info['surname']);
$volunteer_email = $user_info['login'];

// Участвуем в проекте
$result = join_card($card_id, $user_id);

if ($result['success']) {
    // Отправляем email уведомление создателю проекта
    if ($project_info && !empty($project_info['creator_email'])) {
        sendProjectParticipationEmail($project_info, $volunteer_name, $volunteer_email);
    }
    
    // Возвращаем актуальное количество волонтеров
    $result['new_volunteers_count'] = get_volunteers_count();
}

echo json_encode($result);

/**
 * Получает информацию о пользователе по auth_key
 */
function getUserInfoByAuthKey($auth_key) {
    global $conn;
    
    $stmt = $conn->prepare("SELECT id, login, name, surname FROM users WHERE auth_key = ?");
    $stmt->bind_param("s", $auth_key);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    
    return $user;
}

/**
 * Получает информацию о проекте и его создателе
 */
function getProjectCreatorInfo($card_id) {
    global $conn;
    
    $stmt = $conn->prepare("
        SELECT 
            c.id,
            c.header,
            c.location,
            c.current_participants,
            c.max_participants,
            u.login as creator_email,
            u.name as creator_name,
            u.surname as creator_surname
        FROM cards c 
        LEFT JOIN users u ON c.created_by = u.id 
        WHERE c.id = ?
    ");
    $stmt->bind_param("i", $card_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        return $result->fetch_assoc();
    }
    
    $stmt->close();
    return null;
}

/**
 * Отправляет email уведомление создателю проекта о новом участнике
 */
function sendProjectParticipationEmail($project, $volunteer_name, $volunteer_email) {
    $creator_email = $project['creator_email'];
    
    // Если у создателя нет email, не отправляем письмо
    if (empty($creator_email)) {
        error_log("❌ Не удалось отправить email: у создателя проекта нет email");
        return false;
    }
    
    $subject = "Новый участник в вашем проекте: " . $project['header'];
    
    // Формируем имя создателя для персонального обращения
    $creator_name = trim($project['creator_name'] . ' ' . $project['creator_surname']);
    $greeting = !empty($creator_name) ? "Уважаемый(ая) {$creator_name}!" : "Здравствуйте!";
    
    $message = "
    <html>
    <head>
        <title>Новый участник в вашем проекте</title>
        <style>
            body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: linear-gradient(135deg, #4a90e2, #357abd); color: white; padding: 30px 20px; text-align: center; }
            .content { padding: 30px; }
            .project-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4a90e2; }
            .volunteer-info { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; border-top: 1px solid #dee2e6; }
            .button { display: inline-block; padding: 12px 24px; background: #4a90e2; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .stats { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: center; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>Карта добрых дел Росатома</h1>
                <p>Платформа волонтерских проектов</p>
            </div>
            
            <div class='content'>
                <h2>🎉 Ура! У вашего проекта появился новый участник!</h2>
                <p>{$greeting}</p>
                
                <div class='project-info'>
                    <h3 style='color: #4a90e2; margin-top: 0;'>📋 Информация о проекте:</h3>
                    <p><strong>Название проекта:</strong> " . htmlspecialchars($project['header']) . "</p>
                    <p><strong>Местоположение:</strong> " . htmlspecialchars($project['location']) . "</p>
                </div>
                
                <div class='volunteer-info'>
                    <h3 style='color: #28a745; margin-top: 0;'>👤 Информация о новом участнике:</h3>
                    <p><strong>Имя участника:</strong> " . htmlspecialchars($volunteer_name) . "</p>
                    <p><strong>Email участника:</strong> " . htmlspecialchars($volunteer_email) . "</p>
                    <p><strong>Дата присоединения:</strong> " . date('d.m.Y в H:i') . "</p>
                </div>
                
                <div class='stats'>
                    <p><strong>📊 Текущая статистика проекта:</strong></p>
                    <p style='font-size: 18px; font-weight: bold; color: #4a90e2;'>
                        Участников: " . ($project['current_participants'] + 1) . " из " . $project['max_participants'] . "
                    </p>
                </div>
                
                <p><strong>💡 Что дальше?</strong></p>
                <p>Вы можете связаться с участником по email для уточнения деталей участия и координации дальнейших действий.</p>
                
                <p style='text-align: center;'>
                    <a href='mailto:" . htmlspecialchars($volunteer_email) . "?subject=Проект: " . htmlspecialchars(urlencode($project['header'])) . "' class='button'>
                        📧 Написать участнику
                    </a>
                </p>
                
                <p>С уважением,<br><strong>Команда Карты добрых дел Росатома</strong></p>
            </div>
            
            <div class='footer'>
                <p>Это письмо отправлено автоматически. Пожалуйста, не отвечайте на него.</p>
                <p>Если у вас есть вопросы, обратитесь в поддержку платформы.</p>
                <p>© 2025 Карта добрых дел Росатома. Все права защищены.</p>
            </div>
        </div>
    </body>
    </html>
    ";
    
    // Устанавливаем заголовки для HTML письма
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: Карта добрых дел Росатома <noreply@rosatom-volunteer.ru>" . "\r\n";
    $headers .= "Reply-To: noreply@rosatom-volunteer.ru" . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();
    $headers .= "X-Priority: 1 (Highest)" . "\r\n";
    $headers .= "X-MSMail-Priority: High" . "\r\n";
    $headers .= "Importance: High" . "\r\n";
    
    // Отправляем письмо
    $mail_sent = mail($creator_email, '=?UTF-8?B?' . base64_encode($subject) . '?=', $message, $headers);
    
    // Логируем результат отправки
    if ($mail_sent) {
        error_log("✅ Email уведомление отправлено создателю проекта: " . $creator_email . " (Проект: " . $project['header'] . ")");
    } else {
        error_log("❌ Ошибка отправки email создателю проекта: " . $creator_email . " (Проект: " . $project['header'] . ")");
        
        // Для отладки в локальной среде
        $debug_info = "
        ===== DEBUG EMAIL INFO =====
        To: {$creator_email}
        Subject: {$subject}
        Project: {$project['header']}
        Volunteer: {$volunteer_name} ({$volunteer_email})
        Time: " . date('Y-m-d H:i:s') . "
        ============================
        ";
        error_log($debug_info);
    }
    
    return $mail_sent;
}

/**
 * Простая версия для локальной разработки (без реальной отправки)
 */
function sendProjectParticipationEmailLocal($project, $volunteer_name, $volunteer_email) {
    $creator_email = $project['creator_email'];
    
    $log_message = "
    ===== EMAIL УВЕДОМЛЕНИЕ (ЛОКАЛЬНО) =====
    Кому: {$creator_email}
    Тема: Новый участник в вашем проекте: {$project['header']}
    
    Проект: {$project['header']}
    Местоположение: {$project['location']}
    Участников: " . ($project['current_participants'] + 1) . "/{$project['max_participants']}
    
    Новый участник:
    - Имя: {$volunteer_name}
    - Email: {$volunteer_email}
    - Дата: " . date('d.m.Y H:i') . "
    ======================================
    ";
    
    error_log($log_message);
    
    // В продакшене замените эту функцию на sendProjectParticipationEmail
    return true;
}
?>