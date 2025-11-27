<?php
include 'db.php';
include 'functions.php';
header('Content-Type: application/json');

// Включим подробное логирование
error_log("=== DELETE CARD DEBUG ===");
error_log("POST данные: " . print_r($_POST, true));

// Проверяем авторизацию
$user_key = $_COOKIE['auth_key'] ?? '';
$user = null;

error_log("Auth key: " . $user_key);

if ($user_key) {
    $stmt = $conn->prepare("SELECT id, login FROM users WHERE auth_key = ?");
    $stmt->bind_param("s", $user_key);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    
    if ($user) {
        error_log("Пользователь найден: ID=" . $user['id'] . ", Login=" . $user['login']);
    } else {
        error_log("Пользователь не найден");
    }
}

if (!$user) {
    error_log("Ошибка: пользователь не авторизован");
    echo json_encode(["status" => "error", "message" => "Необходима авторизация"]);
    exit;
}

// Проверяем, что передан ID карточки
$card_id = $_POST['card_id'] ?? '';
error_log("Card ID из запроса: " . $card_id);

if (empty($card_id)) {
    error_log("Ошибка: card_id пустой");
    echo json_encode(["status" => "error", "message" => "Не указана карточка"]);
    exit;
}

// Проверяем права пользователя
error_log("Проверка прав пользователя " . $user['id'] . " на карточку " . $card_id);
error_log("is_admin: " . (is_admin($user['id']) ? 'true' : 'false'));
error_log("is_nko: " . (is_nko($user['id']) ? 'true' : 'false'));

// Удаляем карточку
$result = delete_card($card_id, $user['id']);
error_log("Результат удаления: " . print_r($result, true));

if ($result['success']) {
    echo json_encode(["status" => "success", "message" => $result['message']]);
} else {
    echo json_encode(["status" => "error", "message" => $result['message']]);
}

error_log("=== END DELETE CARD DEBUG ===");
?>