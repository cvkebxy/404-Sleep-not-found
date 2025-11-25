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
$check_stmt = $conn->prepare("SELECT id, logo_path FROM nko_organizations WHERE user_id = ?");
$check_stmt->bind_param("i", $user_id);
$check_stmt->execute();
$check_result = $check_stmt->get_result();
$existing_nko = $check_result->fetch_assoc();
$has_existing_nko = (bool)$existing_nko;
$existing_logo = $existing_nko['logo_path'] ?? null;

// Если записи нет — требуем обязательные поля
if (!$has_existing_nko) {
    $missing = [];
    if ($name === '') $missing[] = 'название';
    if ($category === '') $missing[] = 'категория';
    if ($description === '') $missing[] = 'описание';
    if ($activities === '') $missing[] = 'функционал волонтёров';
    if (!empty($missing)) {
        echo json_encode(["success" => false, "message" => "Заполните все обязательные поля: " . implode(", ", $missing)]);
        exit;
    }
}

// Обработка загрузки файла (если прислали)
$logo_path_to_save = $existing_logo; // по умолчанию — прежний
if (!empty($_FILES['logo']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = __DIR__ . '/../uploads/logos/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    $fileTmp = $_FILES['logo']['tmp_name'];
    $fileName = basename($_FILES['logo']['name']);
    $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    // Простейшая проверка формата
    $allowed = ['jpg','jpeg','png','gif','webp'];
    if (!in_array($ext, $allowed)) {
        echo json_encode(["success" => false, "message" => "Недопустимый формат изображения"]);
        exit;
    }
    $newName = 'nko_' . $user_id . '_' . time() . '.' . $ext;
    $dest = $uploadDir . $newName;
    if (move_uploaded_file($fileTmp, $dest)) {
        // относительный путь для использования в src в браузере
        $logo_path_to_save = 'uploads/logos/' . $newName;
        // удалить старое лого, если есть и оно в uploads/logos
        if ($existing_logo && strpos($existing_logo, 'uploads/logos/') === 0) {
            $oldFile = __DIR__ . '/../' . $existing_logo;
            if (file_exists($oldFile)) @unlink($oldFile);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Ошибка при загрузке файла"]);
        exit;
    }
}

// Определяем сообщение об успехе
$msg = $has_existing_nko ? "Данные НКО обновлены" : "НКО успешно зарегистрирована";

// Выполняем INSERT или UPDATE
if ($has_existing_nko) {
    // Формируем динамический UPDATE (только переданные поля)
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
        // Изменений нет
        $success = true;
    }

} else {
    // INSERT: все поля считаются обязательными (проверка выше)
    $stmt = $conn->prepare("
        INSERT INTO nko_organizations 
        (user_id, name, category, description, activities, phone, address, website, social_links, logo_path, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    ");
    $stmt->bind_param(
        "isssssssss",
        $user_id,
        $name,
        $category,
        $description,
        $activities,
        $phone,
        $address,
        $website,
        $social_links,
        $logo_path_to_save
    );
    $success = $stmt->execute();
    $stmt->close();

    // Отправка в Google Sheets при создании
    if ($success) {
        include_once 'GoogleSheetsIntegration.php';
        if (!class_exists('GoogleSheetsIntegration')) {
            class GoogleSheetsIntegration {
                private $webapp_url = 'https://script.google.com/macros/s/AKfycbzlWNA23PgAMahv50y-nLbmB5UX0cfIvtgKzbcdNGHat3FS2nUFTutgtGg8NArwDN6Xkw/exec';
                public function sendNkoData($data) {
                    $json_payload = json_encode($data);
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
                    ]);
                    $response = curl_exec($ch);
                    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    $error = curl_error($ch);
                    curl_close($ch);
                    if ($error) {
                        error_log("GSHEETS CURL ERROR: $error");
                        return ['success' => false, 'message' => $error];
                    }
                    return $http_code === 200 ? ['success' => true] : ['success' => false, 'message' => "HTTP $http_code"];
                }
            }
        }
        $gs = new GoogleSheetsIntegration();
        $gs_res = $gs->sendNkoData([
            'user_id' => $user_id,
            'name' => $name,
            'category' => $category,
            'description' => $description,
            'activities' => $activities,
            'phone' => $phone,
            'address' => $address,
            'website' => $website,
            'social_links' => $social_links,
        ]);
    }
}

if ($success) {
    // Получаем актуальное количество НКО из базы данных
    $nko_count = get_nko_count();
    
    echo json_encode([
        "success" => true,
        "message" => $msg, 
        "logo_path" => $logo_path_to_save ? $logo_path_to_save : null,
        "new_nko_count" => $nko_count // Возвращаем актуальное значение
    ]);
    exit;
}

$user_stmt->close();
$check_stmt->close();
?>