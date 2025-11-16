<?php
include 'db.php';
include 'functions.php';
header('Content-Type: application/json');

// Проверяем авторизацию
$user_key = $_COOKIE['auth_key'] ?? '';
$user = null;

if ($user_key) {
    $stmt = $conn->prepare("SELECT id, login FROM users WHERE auth_key = ?");
    $stmt->bind_param("s", $user_key);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();
}

if (!$user) {
    echo json_encode(["status" => "error", "message" => "Необходима авторизация"]);
    exit;
}

// Проверяем права (админ или НКО)
if (!is_admin($user['id']) && !is_nko($user['id'])) {
    echo json_encode(["status" => "error", "message" => "Недостаточно прав"]);
    exit;
}

// Создаем карточку
$status = $_POST['status'] ?? '';
$type = $_POST['type'] ?? '';
$header = $_POST['header'] ?? '';
$location = $_POST['location'] ?? '';
$main_text = $_POST['main_text'] ?? '';
$max_participants = $_POST['max_participants'] ?? 30;
$date = $_POST['date'] ?? '';
$sub_text = $_POST['sub_text'] ?? '';

// Валидация обязательных полей
if (empty($type) || empty($header) || empty($location) || empty($main_text) || empty($date) || empty($sub_text)) {
    echo json_encode(["status" => "error", "message" => "Все обязательные поля должны быть заполнены"]);
    exit;
}

// Проверяем, не создана ли уже такая карточка (защита от дублирования)
$check_stmt = $conn->prepare("SELECT id FROM cards WHERE header = ? AND location = ? AND created_by = ?");
$check_stmt->bind_param("ssi", $header, $location, $user['id']);
$check_stmt->execute();
$result = $check_stmt->get_result();

if ($result->num_rows > 0) {
    $check_stmt->close();
    echo json_encode(["status" => "error", "message" => "Похожий проект уже существует"]);
    exit;
}
$check_stmt->close();

// Создаем карточку
$stmt = $conn->prepare("
    INSERT INTO cards (status, type, header, location, main_text, current_participants, max_participants, date, sub_text, created_by) 
    VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
");

// ВАЖНО: передаем user_id как created_by
$stmt->bind_param("sssssissi", $status, $type, $header, $location, $main_text, $max_participants, $date, $sub_text, $user['id']);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Проект успешно создан"]);
} else {
    echo json_encode(["status" => "error", "message" => "Ошибка при создании проекта: " . $stmt->error]);
}

$stmt->close();
?>