<?php
session_start();
include 'db.php';
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';

// Определяем, какие действия требуют прав администратора
$requires_admin = in_array($action, ['add_city', 'delete_city', 'toggle_city_status', 'get_all_for_admin']);

if ($requires_admin) {
    include 'functions.php';
    
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
    $user_stmt->close();

    if (!is_admin($user_id)) {
        echo json_encode(["success" => false, "message" => "Недостаточно прав"]);
        exit;
    }
}

switch ($action) {        
    case 'add_city':
        $name = trim($_POST['name'] ?? '');
        $region = trim($_POST['region'] ?? '');
        $latitude = floatval($_POST['latitude'] ?? 0);
        $longitude = floatval($_POST['longitude'] ?? 0);
        $object_type = $_POST['object_type'] ?? 'city';
        $description = trim($_POST['description'] ?? '');
        $nko_type = trim($_POST['nko_type'] ?? '');
        $nko_activities = trim($_POST['nko_activities'] ?? '');
        $social_links = trim($_POST['social_links'] ?? '');
        $target_audience = trim($_POST['target_audience'] ?? '');
        $yearly_plan = trim($_POST['yearly_plan'] ?? '');
        
        if (empty($name)) {
            echo json_encode(["success" => false, "message" => "Название обязательно"]);
            exit;
        }
        
        if ($latitude == 0 || $longitude == 0) {
            echo json_encode(["success" => false, "message" => "Координаты обязательны"]);
            exit;
        }
        
        // Проверяем, нет ли уже такого объекта
        $check_stmt = $conn->prepare("SELECT id FROM rosatom_cities WHERE name = ? AND region = ?");
        $check_stmt->bind_param("ss", $name, $region);
        $check_stmt->execute();
        
        if ($check_stmt->get_result()->num_rows > 0) {
            $check_stmt->close();
            echo json_encode(["success" => false, "message" => "Объект с таким названием и регионом уже существует"]);
            exit;
        }
        $check_stmt->close();
        
        // Добавляем объект в базу
        $stmt = $conn->prepare("INSERT INTO rosatom_cities (name, region, latitude, longitude, object_type, description, nko_type, nko_activities, social_links, target_audience, yearly_plan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssddsssssss", $name, $region, $latitude, $longitude, $object_type, $description, $nko_type, $nko_activities, $social_links, $target_audience, $yearly_plan);
        
        if ($stmt->execute()) {
            $new_city_id = $stmt->insert_id;
            $stmt->close();
            
            // Получаем данные добавленного объекта
            $get_city_stmt = $conn->prepare("SELECT * FROM rosatom_cities WHERE id = ?");
            $get_city_stmt->bind_param("i", $new_city_id);
            $get_city_stmt->execute();
            $city_result = $get_city_stmt->get_result();
            $new_city = $city_result->fetch_assoc();
            $get_city_stmt->close();
            
            echo json_encode([
                "success" => true, 
                "message" => "Объект успешно добавлен",
                "city" => $new_city,
                "new_cities_count" => get_cities_count()
            ]);
        } else {
            echo json_encode(["success" => false, "message" => "Ошибка при добавлении объекта: " . $stmt->error]);
        }
        break;
        
    case 'delete_city':
        $city_id = intval($_POST['city_id'] ?? 0);
        
        if ($city_id <= 0) {
            echo json_encode(["success" => false, "message" => "Неверный ID объекта"]);
            exit;
        }
        
        $stmt = $conn->prepare("DELETE FROM rosatom_cities WHERE id = ?");
        $stmt->bind_param("i", $city_id);
        
        if ($stmt->execute()) {
            echo json_encode([
                "success" => true, 
                "message" => "Объект успешно удален",
                "new_cities_count" => get_cities_count()
            ]);
        } else {
            echo json_encode(["success" => false, "message" => "Ошибка при удалении объекта: " . $stmt->error]);
        }
        $stmt->close();
        break;
        
    case 'toggle_city_status':
        $city_id = $_POST['city_id'] ?? '';
        $is_active = $_POST['is_active'] ?? '';

        if ($city_id && $is_active !== '') {
            $stmt = $conn->prepare("UPDATE rosatom_cities SET is_active = ? WHERE id = ?");
            $stmt->bind_param("ii", $is_active, $city_id);

            if ($stmt->execute()) {
                $status_text = $is_active ? 'активирован' : 'деактивирован';
                echo json_encode([
                    'success' => true, 
                    'message' => "Объект успешно $status_text"
                ]);
            } else {
                echo json_encode([
                    'success' => false, 
                    'message' => 'Ошибка обновления статуса'
                ]);
            }
            $stmt->close();
        } else {
            echo json_encode([
                'success' => false, 
                'message' => 'Неверные параметры'
            ]);
        }
        break;
    
    case 'get_all_for_admin':
        $stmt = $conn->prepare("SELECT * FROM rosatom_cities ORDER BY object_type, name");
        $stmt->execute();
        $result = $stmt->get_result();
        $cities = [];
        while ($row = $result->fetch_assoc()) {
            $cities[] = $row;
        }
        $stmt->close();
        echo json_encode(["success" => true, "cities" => $cities]);
        break;

    case 'get_city':
        $city_id = intval($_GET['city_id'] ?? 0);
        if ($city_id <= 0) {
            echo json_encode(["success" => false, "message" => "Неверный ID объекта"]);
            exit;
        }

        $stmt = $conn->prepare("SELECT * FROM rosatom_cities WHERE id = ?");
        $stmt->bind_param("i", $city_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $city = $result->fetch_assoc();
        $stmt->close();

        if ($city) {
            echo json_encode(["success" => true, "city" => $city]);
        } else {
            echo json_encode(["success" => false, "message" => "Объект не найден"]);
        }
        break;

    case 'get_all':
        $stmt = $conn->prepare("SELECT * FROM rosatom_cities WHERE is_active = 1 ORDER BY name");
        $stmt->execute();
        $result = $stmt->get_result();
        $cities = [];
        while ($row = $result->fetch_assoc()) {
            $cities[] = $row;
        }
        $stmt->close();
        echo json_encode(["success" => true, "cities" => $cities]);
        break;
        
    case 'get_all_with_nko':
        $stmt = $conn->prepare("SELECT * FROM rosatom_cities WHERE is_active = 1 ORDER BY object_type, name");
        $stmt->execute();
        $result = $stmt->get_result();
        $cities = [];
        while ($row = $result->fetch_assoc()) {
            $cities[] = $row;
        }
        $stmt->close();
        
        echo json_encode(["success" => true, "cities" => $cities], JSON_UNESCAPED_UNICODE);
        break;

    default:
        echo json_encode(["success" => false, "message" => "Неизвестное действие"]);
}
?>