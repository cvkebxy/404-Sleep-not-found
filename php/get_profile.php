<?php
session_start();
include 'db.php';
header('Content-Type: application/json');

error_log("=== DEBUG: Начало get_profile.php ===");

if (!isset($_COOKIE['auth_key'])) {
    error_log("DEBUG: auth_key не найден в cookies");
    echo json_encode(["success" => false, "message" => "Необходима авторизация"]);
    exit;
}

$auth_key = $_COOKIE['auth_key'];
error_log("DEBUG: auth_key = " . $auth_key);

$user_stmt = $conn->prepare("SELECT id, login, name, surname FROM users WHERE auth_key = ?");
if (!$user_stmt) {
    error_log("DEBUG: Ошибка подготовки запроса: " . $conn->error);
    echo json_encode(["success" => false, "message" => "Ошибка базы данных"]);
    exit;
}

$user_stmt->bind_param("s", $auth_key);
$user_stmt->execute();
$user_result = $user_stmt->get_result();

if (!$user = $user_result->fetch_assoc()) {
    error_log("DEBUG: Пользователь не найден по auth_key");
    echo json_encode(["success" => false, "message" => "Пользователь не найден"]);
    exit;
}

error_log("DEBUG: Пользователь найден - ID: " . $user['id']);

$user_id = $user['id'];

// Получаем данные НКО если есть
$nko_stmt = $conn->prepare("SELECT * FROM nko_organizations WHERE user_id = ?");
if ($nko_stmt) {
    $nko_stmt->bind_param("i", $user_id);
    $nko_stmt->execute();
    $nko_result = $nko_stmt->get_result();
    $nko_data = $nko_result->fetch_assoc();
    $nko_stmt->close();
} else {
    error_log("DEBUG: Ошибка подготовки запроса НКО");
    $nko_data = null;
}

// Получаем созданные пользователем проекты - ИСПРАВЛЕННЫЙ ЗАПРОС
$projects_stmt = $conn->prepare("SELECT id, header, status, type, location, date FROM cards WHERE created_by = ? ORDER BY created_at DESC");
if ($projects_stmt) {
    $projects_stmt->bind_param("i", $user_id);
    $projects_stmt->execute();
    $projects_result = $projects_stmt->get_result();
    $user_projects = [];

    while ($project = $projects_result->fetch_assoc()) {
        $user_projects[] = $project;
    }
    $projects_stmt->close();
    
    error_log("DEBUG: Найдено проектов: " . count($user_projects));
} else {
    error_log("DEBUG: Ошибка подготовки запроса проектов");
    $user_projects = [];
}

$response = [
    "success" => true,
    "user" => [
        "login" => $user['login'],
        "name" => $user['name'],
        "surname" => $user['surname'],
        "id" => $user['id']
    ],
    "projects" => $user_projects
];

if ($nko_data) {
    $response["nko"] = [
        "name" => $nko_data['name'],
        "category" => $nko_data['category'],
        "description" => $nko_data['description'],
        "activities" => $nko_data['activities'],
        "phone" => $nko_data['phone'],
        "address" => $nko_data['address'],
        "website" => $nko_data['website'],
        "social_links" => $nko_data['social_links'],
        "status" => $nko_data['status'],
        "moderation_comment" => $nko_data['moderation_comment'],
        "logo_path" => $nko_data['logo_path']
    ];
}

error_log("DEBUG: Отправка успешного ответа");
echo json_encode($response);

$user_stmt->close();
error_log("=== DEBUG: Конец get_profile.php ===");
?>