<?php
include 'db.php';
include 'functions.php';

header('Content-Type: application/json');

// Проверяем авторизацию и права администратора
$user_key = $_COOKIE['auth_key'] ?? '';
$current_user = null;

if ($user_key) {
    $stmt = $conn->prepare("SELECT id, login FROM users WHERE auth_key = ?");
    $stmt->bind_param("s", $user_key);
    $stmt->execute();
    $current_user = $stmt->get_result()->fetch_assoc();
    $stmt->close();
}

if (!$current_user || !is_admin($current_user['id'])) {
    echo json_encode(["status" => "error", "message" => "Доступ запрещен"]);
    exit;
}

$nko_id = $_GET['nko_id'] ?? '';

if (empty($nko_id)) {
    echo json_encode(["status" => "error", "message" => "Не указан ID НКО"]);
    exit;
}

// Получаем полную информацию о НКО
$stmt = $conn->prepare("
    SELECT 
        n.*,
        u.login,
        u.name,
        u.surname
    FROM nko_organizations n
    LEFT JOIN users u ON n.user_id = u.id
    WHERE n.id = ?
");

$stmt->bind_param("i", $nko_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["status" => "error", "message" => "НКО не найдена"]);
    exit;
}

$nko_data = $result->fetch_assoc();
$stmt->close();

echo json_encode([
    "status" => "success",
    "nko" => $nko_data
]);
?>