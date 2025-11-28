<?php
session_start();
include 'db.php';
include 'functions.php'; // Добавляем подключение functions.php
header('Content-Type: application/json');

// Поддержка как FormData, так и JSON
$data_source = $_POST;
if (empty($_POST)) {
    $raw = file_get_contents('php://input');
    if ($raw && ($json = json_decode($raw, true))) {
        $data_source = $json;
    }
}

if (!isset($_COOKIE['auth_key'])) {
    echo json_encode(["success" => false, "message" => "Необходима авторизация"]);
    exit;
}

$auth_key = $_COOKIE['auth_key'];
$user_stmt = $conn->prepare("SELECT id FROM users WHERE auth_key = ?");
$user_stmt->bind_param("s", $auth_key);
$user_stmt->execute();
$user_result = $user_stmt->get_result();

if (!$user = $user_result->fetch_assoc()) {
    echo json_encode(["success" => false, "message" => "Пользователь не найден"]);
    exit;
}

$user_id = $user['id'];

// Получаем данные из $data_source (если FormData — данные в $_POST; если JSON — в $data_source)
$name = trim($data_source['name'] ?? $data_source['nko_name'] ?? '');
$category = trim($data_source['category'] ?? $data_source['nko_category'] ?? '');
$description = trim($data_source['description'] ?? $data_source['nko_description'] ?? '');
$activities = trim($data_source['activities'] ?? $data_source['nko_activities'] ?? '');
$phone = trim($data_source['phone'] ?? $data_source['nko_phone'] ?? '');
$address = trim($data_source['address'] ?? $data_source['nko_address'] ?? '');
$website = trim($data_source['website'] ?? $data_source['nko_website'] ?? '');
$social_links = trim($data_source['social_links'] ?? $data_source['nko_social'] ?? '');

// Проверим существование записи НКО
$check_stmt = $conn->prepare("SELECT id, logo_path, status, moderation_comment FROM nko_organizations WHERE user_id = ?");
$check_stmt->bind_param("i", $user_id);
$check_stmt->execute();
$check_result = $check_stmt->get_result();
$existing_nko = $check_result->fetch_assoc();
$has_existing_nko = (bool)$existing_nko;
$existing_logo = $existing_nko['logo_path'] ?? null;
$current_status = $existing_nko['status'] ?? null;

// Если это повторная отправка отклоненной заявки
$is_resubmit = isset($data_source['is_resubmit']) && $data_source['is_resubmit'] === '1';

if ($is_resubmit && $current_status === 'rejected') {
    // Для повторной отправки меняем статус на pending и очищаем комментарий
    $status_to_set = 'pending';
    $moderation_comment_to_set = null;
} else if (!$has_existing_nko) {
    // Новая заявка
    $status_to_set = 'pending';
    $moderation_comment_to_set = null;
    
    // Проверяем обязательные поля для новой заявки
    $missing = [];
    if ($name === '') $missing[] = 'название';
    if ($category === '') $missing[] = 'категория';
    if ($description === '') $missing[] = 'описание';
    if ($activities === '') $missing[] = 'функционал волонтёров';
    if (!empty($missing)) {
        echo json_encode(["success" => false, "message" => "Заполните все обязательные поля: " . implode(", ", $missing)]);
        exit;
    }
} else {
    // Обновление существующей заявки без изменения статуса
    $status_to_set = $current_status;
    $moderation_comment_to_set = $existing_nko['moderation_comment'] ?? null;
}

// ... существующий код обработки файла логотипа ...

// Определяем сообщение об успехе
if ($is_resubmit) {
    $msg = "Заявка НКО отправлена на повторную модерацию";
} else if ($has_existing_nko) {
    $msg = "Данные НКО обновлены";
} else {
    $msg = "НКО успешно зарегистрирована";
}

// Выполняем INSERT или UPDATE
if ($has_existing_nko) {
    // Формируем динамический UPDATE
    $updates = [];
    $params = [];
    $types = '';

    if ($name !== '') { $updates[] = "name = ?"; $params[] = $name; $types .= 's'; }
    if ($category !== '') { $updates[] = "category = ?"; $params[] = $category; $types .= 's'; }
    if ($description !== '') { $updates[] = "description = ?"; $params[] = $description; $types .= 's'; }
    if ($activities !== '') { $updates[] = "activities = ?"; $params[] = $activities; $types .= 's'; }
    if ($phone !== '') { $updates[] = "phone = ?"; $params[] = $phone; $types .= 's'; }
    if ($address !== '') { $updates[] = "address = ?"; $params[] = $address; $types .= 's'; }
    if ($website !== '') { $updates[] = "website = ?"; $params[] = $website; $types .= 's'; }
    if ($social_links !== '') { $updates[] = "social_links = ?"; $params[] = $social_links; $types .= 's'; }
    if ($logo_path_to_save && $logo_path_to_save !== $existing_logo) { $updates[] = "logo_path = ?"; $params[] = $logo_path_to_save; $types .= 's'; }
    
    // Добавляем обновление статуса и комментария для повторной отправки
    if ($is_resubmit) {
        $updates[] = "status = ?"; 
        $params[] = $status_to_set; 
        $types .= 's';
        $updates[] = "moderation_comment = ?"; 
        $params[] = $moderation_comment_to_set; 
        $types .= 's';
    }

    $changes_made = false;

    if (!empty($updates)) {
        $changes_made = true;
        $params[] = $user_id;
        $types .= 'i';
        $sql = "UPDATE nko_organizations SET " . implode(', ', $updates) . " WHERE user_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $success = $stmt->execute();
        $stmt->close();
    } else {
        $success = true;
    }

} else {
    // INSERT новой заявки
    $stmt = $conn->prepare("
        INSERT INTO nko_organizations 
        (user_id, name, category, description, activities, phone, address, website, social_links, logo_path, status, moderation_comment) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param(
        "isssssssssss",
        $user_id,
        $name,
        $category,
        $description,
        $activities,
        $phone,
        $address,
        $website,
        $social_links,
        $logo_path_to_save,
        $status_to_set,
        $moderation_comment_to_set
    );
    $success = $stmt->execute();
    $stmt->close();

    // Отправка в Google Sheets при создании
    if ($success) {
        // ... существующий код отправки в Google Sheets ...
    }
}

if ($success) {
    // Получаем актуальное количество НКО из базы данных
    $nko_count = get_nko_count();
    
    echo json_encode([
        "success" => true,
        "message" => $msg, 
        "logo_path" => $logo_path_to_save ? $logo_path_to_save : null,
        "new_nko_count" => $nko_count,
        "status" => $status_to_set // Возвращаем новый статус
    ]);
    exit;
}

$user_stmt->close();
$check_stmt->close();
?>