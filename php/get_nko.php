<?php
session_start();
include 'db.php';
header('Content-Type: application/json');

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

// Получаем данные НКО
$nko_stmt = $conn->prepare("SELECT * FROM nko_organizations WHERE user_id = ?");
$nko_stmt->bind_param("i", $user_id);
$nko_stmt->execute();
$nko_result = $nko_stmt->get_result();
$nko_data = $nko_result->fetch_assoc();

if ($nko_data) {
    echo json_encode([
        "success" => true,
        "nko" => [
            "name" => $nko_data['name'],
            "category" => $nko_data['category'],
            "description" => $nko_data['description'],
            "activities" => $nko_data['activities'],
            "phone" => $nko_data['phone'],
            "address" => $nko_data['address'],
            "website" => $nko_data['website'],
            "social_links" => $nko_data['social_links'],
            "status" => $nko_data['status'],
            "moderation_comment" => $nko_data['moderation_comment']
        ]
    ]);
} else {
    echo json_encode(["success" => true, "nko" => null]);
}

$user_stmt->close();
$nko_stmt->close();
?>