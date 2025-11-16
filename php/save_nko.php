<?php
session_start();
include 'db.php';
header('Content-Type: application/json');

class GoogleSheetsIntegration {
    private $webapp_url;
    
    public function __construct() {
        // ⚠️ ЗАМЕНИТЕ НА ВАШ РЕАЛЬНЫЙ URL ВЕБ-ПРИЛОЖЕНИЯ ⚠️
        $this->webapp_url = 'https://script.google.com/macros/s/AKfycbzlWNA23PgAMahv50y-nLbmB5UX0cfIvtgKzbcdNGHat3FS2nUFTutgtGg8NArwDN6Xkw/exec';
    }
    
    public function sendNkoData($data) {
        // Валидация данных
        if (!$this->validateData($data)) {
            return ['success' => false, 'message' => 'Невалидные данные'];
        }
        
        // Подготовка данных
        $payload = $this->preparePayload($data);
        
        // Отправка в Google Sheets
        return $this->sendToGoogleSheets($payload);
    }
    
    private function validateData($data) {
        $required_fields = ['name', 'category', 'description', 'activities', 'user_id'];
        
        foreach ($required_fields as $field) {
            if (empty($data[$field])) {
                error_log("Отсутствует обязательное поле: $field");
                return false;
            }
        }
        
        // Дополнительная валидация
        if (strlen($data['name']) > 255) {
            error_log("Слишком длинное название организации");
            return false;
        }
        
        return true;
    }
    
    private function preparePayload($data) {
        return [
            'user_id' => $data['user_id'],
            'name' => substr($data['name'], 0, 255),
            'category' => $data['category'],
            'description' => $data['description'],
            'activities' => $data['activities'],
            'phone' => $data['phone'] ?? '',
            'address' => $data['address'] ?? '',
            'website' => $data['website'] ?? '',
            'social_links' => $data['social_links'] ?? ''
        ];
    }
    
    private function sendToGoogleSheets($payload) {
        $json_payload = json_encode($payload);
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->webapp_url,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $json_payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($json_payload),
                'User-Agent: Rosatom-NKO-Form/1.0'
            ],
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1
        ]);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            error_log("CURL Error: " . $error);
            return ['success' => false, 'message' => 'Ошибка соединения: ' . $error];
        }
        
        if ($http_code === 200) {
            return json_decode($response, true);
        } else {
            error_log("HTTP Error: " . $http_code . " Response: " . $response);
            return ['success' => false, 'message' => 'HTTP Error: ' . $http_code];
        }
    }
}

// Основная логика обработки формы НКО
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
$name = $_POST['name'] ?? '';
$category = $_POST['category'] ?? '';
$description = $_POST['description'] ?? '';
$activities = $_POST['activities'] ?? '';
$phone = $_POST['phone'] ?? '';
$address = $_POST['address'] ?? '';
$website = $_POST['website'] ?? '';
$social_links = $_POST['social_links'] ?? '';

// Валидация обязательных полей
if (empty($name) || empty($category) || empty($description) || empty($activities)) {
    echo json_encode(["success" => false, "message" => "Заполните все обязательные поля"]);
    exit;
}

// Обработка загрузки логотипа
$logo_path = '';
if (isset($_FILES['logo']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
    $upload_dir = '../uploads/logos/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }
    
    $file_extension = pathinfo($_FILES['logo']['name'], PATHINFO_EXTENSION);
    $allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'svg'];
    
    if (!in_array(strtolower($file_extension), $allowed_extensions)) {
        echo json_encode(["success" => false, "message" => "Недопустимый формат файла. Разрешены: JPG, PNG, GIF, SVG"]);
        exit;
    }
    
    $filename = 'nko_' . $user_id . '_' . time() . '.' . $file_extension;
    $logo_path = $upload_dir . $filename;
    
    if (!move_uploaded_file($_FILES['logo']['tmp_name'], $logo_path)) {
        echo json_encode(["success" => false, "message" => "Ошибка загрузки логотипа"]);
        exit;
    }
}

// Проверяем существует ли уже запись НКО
$check_stmt = $conn->prepare("SELECT id FROM nko_organizations WHERE user_id = ?");
$check_stmt->bind_param("i", $user_id);
$check_stmt->execute();
$check_result = $check_stmt->get_result();

if ($check_result->num_rows > 0) {
    // Обновляем существующую запись
    if (!empty($logo_path)) {
        $stmt = $conn->prepare("UPDATE nko_organizations SET name = ?, category = ?, description = ?, activities = ?, phone = ?, address = ?, website = ?, social_links = ?, logo_path = ?, status = 'pending' WHERE user_id = ?");
        $stmt->bind_param("sssssssssi", $name, $category, $description, $activities, $phone, $address, $website, $social_links, $logo_path, $user_id);
    } else {
        $stmt = $conn->prepare("UPDATE nko_organizations SET name = ?, category = ?, description = ?, activities = ?, phone = ?, address = ?, website = ?, social_links = ?, status = 'pending' WHERE user_id = ?");
        $stmt->bind_param("ssssssssi", $name, $category, $description, $activities, $phone, $address, $website, $social_links, $user_id);
    }
} else {
    // Создаем новую запись
    $stmt = $conn->prepare("INSERT INTO nko_organizations (user_id, name, category, description, activities, phone, address, website, social_links, logo_path, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')");
    $stmt->bind_param("isssssssss", $user_id, $name, $category, $description, $activities, $phone, $address, $website, $social_links, $logo_path);
}

// После успешного сохранения в базу данных
if ($stmt->execute()) {
    // ОТПРАВКА ДАННЫХ В GOOGLE SHEETS
    $google_sheets = new GoogleSheetsIntegration();
    $sheets_data = [
        'user_id' => $user_id,
        'name' => $name,
        'category' => $category,
        'description' => $description,
        'activities' => $activities,
        'phone' => $phone,
        'address' => $address,
        'website' => $website,
        'social_links' => $social_links,
        'logo_filename' => $logo_path ? basename($logo_path) : 'Не загружено' // важно!
    ];
    
    $google_result = $google_sheets->sendNkoData($sheets_data);
    
    if ($google_result['success']) {
        echo json_encode(["success" => true, "message" => "Данные НКО успешно сохранены и отправлены в Google Sheets"]);
    } else {
        error_log("Google Sheets error: " . $google_result['message']);
        echo json_encode(["success" => true, "message" => "Данные НКО сохранены. Ошибка отправки в Google Sheets: " . $google_result['message']]);
    }
}

// Закрываем соединения
if (isset($stmt)) $stmt->close();
$user_stmt->close();
$check_stmt->close();
?>