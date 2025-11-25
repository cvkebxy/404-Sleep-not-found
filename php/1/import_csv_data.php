<?php
session_start();
include 'db.php';
include 'functions.php';

header('Content-Type: application/json');

// Проверка авторизации и прав администратора
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

// Проверяем права администратора
if (!is_admin($user_id)) {
    echo json_encode(["success" => false, "message" => "Недостаточно прав"]);
    exit;
}

// Функция для поиска CSV файла
function findCSVFile() {
    $possiblePaths = [
        'data/nko.csv',
        '../data/nko.csv',
        '../../data/nko.csv',
        './data/nko.csv',
        'nko.csv',
        '../nko.csv'
    ];
    
    foreach ($possiblePaths as $path) {
        if (file_exists($path)) {
            return realpath($path);
        }
    }
    
    // Логируем все проверенные пути для отладки
    $checkedPaths = [];
    foreach ($possiblePaths as $path) {
        $checkedPaths[] = $path . ' (exists: ' . (file_exists($path) ? 'yes' : 'no') . ')';
    }
    
    error_log("CSV file search paths: " . implode(', ', $checkedPaths));
    error_log("Current directory: " . __DIR__);
    
    return false;
}

// Функция для парсинга CSV
function parseNkoCSV($filePath) {
    $data = [];
    
    if (!file_exists($filePath)) {
        return ["success" => false, "message" => "CSV файл не найден: " . $filePath];
    }
    
    $fileContent = file_get_contents($filePath);
    
    if ($fileContent === false) {
        return ["success" => false, "message" => "Не удалось прочитать файл: " . $filePath];
    }
    
    // Конвертируем в UTF-8 если нужно
    $encoding = mb_detect_encoding($fileContent, ['UTF-8', 'Windows-1251', 'ISO-8859-1', 'CP1251'], true);
    if ($encoding != 'UTF-8') {
        $fileContent = mb_convert_encoding($fileContent, 'UTF-8', $encoding);
    }
    
    // Удаляем BOM если есть
    $fileContent = preg_replace('/^\xEF\xBB\xBF/', '', $fileContent);
    
    // Обрабатываем многострочные записи
    $lines = [];
    $currentLine = '';
    
    foreach (preg_split('/\r\n|\n/', $fileContent) as $line) {
        $line = trim($line);
        
        // Если строка пустая, пропускаем
        if (empty($line)) continue;
        
        // Считаем количество кавычек в строке
        $quoteCount = substr_count($line, '"');
        
        // Если кавычек нечетное количество, это многострочное поле
        if ($quoteCount % 2 !== 0) {
            $currentLine .= $line . ' ';
            continue;
        }
        
        // Если есть накопленная строка, добавляем к ней текущую
        if (!empty($currentLine)) {
            $currentLine .= $line;
            $lines[] = $currentLine;
            $currentLine = '';
        } else {
            $lines[] = $line;
        }
    }
    
    // Добавляем последнюю накопленную строку если есть
    if (!empty($currentLine)) {
        $lines[] = $currentLine;
    }
    
    error_log("Обработано строк после объединения: " . count($lines));
    
    foreach ($lines as $index => $line) {
        $line = trim($line);
        if (empty($line)) continue;
        
        // Используем str_getcsv с учетом кавычек
        $fields = str_getcsv($line, ';', '"');
        
        // Убираем лишние пробелы
        $fields = array_map('trim', $fields);
        
        // Логируем для отладки
        if ($index < 5) { // Логируем первые 5 строк для отладки
            error_log("Строка " . ($index + 1) . ": полей = " . count($fields));
            foreach ($fields as $i => $field) {
                error_log("  Поле $i: " . substr($field, 0, 100) . (strlen($field) > 100 ? '...' : ''));
            }
        }
        
        if (count($fields) >= 4) {
            $data[] = [
                'latitude' => str_replace(',', '.', trim($fields[0])),
                'longitude' => str_replace(',', '.', trim($fields[1])),
                'description' => trim($fields[2]),
                'name' => trim($fields[3]),
                'marker_number' => isset($fields[4]) ? trim($fields[4]) : '',
                'line_number' => $index + 1
            ];
        } else {
            error_log("Строка " . ($index + 1) . ": недостаточно полей (" . count($fields) . ")");
            error_log("Содержимое: " . $line);
        }
    }
    
    return ["success" => true, "data" => $data, "total_lines" => count($lines), "processed_lines" => count($data)];
}

// Функция для определения типа НКО из описания
function determineNkoType($description) {
    if (empty($description)) {
        return 'Другое';
    }
    
    $description = mb_strtolower($description, 'UTF-8');
    
    // Сначала проверяем города
    if (strpos($description, 'город присутствия') !== false) {
        return 'Город присутствия ГК Росатома';
    }
    
    // Затем проверяем типы НКО
    if (strpos($description, 'деятельность нко:') !== false) {
        // Извлекаем тип из начала описания
        if (preg_match('/деятельность нко:\s*([^\.\n]+)/', $description, $matches)) {
            $typeText = trim($matches[1]);
            
            if (strpos($typeText, 'социальная защита') !== false) {
                return 'Социальная защита';
            } elseif (strpos($typeText, 'экология') !== false) {
                return 'Экология и устойчивое развитие';
            } elseif (strpos($typeText, 'здоровье') !== false || strpos($typeText, 'спорт') !== false) {
                return 'Здоровье и спорт';
            } elseif (strpos($typeText, 'культура') !== false || strpos($typeText, 'образование') !== false) {
                return 'Культура и образование';
            } elseif (strpos($typeText, 'местное сообщество') !== false || strpos($typeText, 'развитие территорий') !== false) {
                return 'Местное сообщество и развитие территорий';
            } elseif (strpos($typeText, 'защита животных') !== false) {
                return 'Защита животных';
            }
        }
    }
    
    // Если не нашли в начале, ищем в тексте
    if (strpos($description, 'социальная защита') !== false) {
        return 'Социальная защита';
    } elseif (strpos($description, 'экология') !== false) {
        return 'Экология и устойчивое развитие';
    } elseif (strpos($description, 'здоровье') !== false || strpos($description, 'спорт') !== false) {
        return 'Здоровье и спорт';
    } elseif (strpos($description, 'культура') !== false || strpos($description, 'образование') !== false) {
        return 'Культура и образование';
    } elseif (strpos($description, 'местное сообщество') !== false || strpos($description, 'развитие территорий') !== false) {
        return 'Местное сообщество и развитие территорий';
    } elseif (strpos($description, 'защита животных') !== false) {
        return 'Защита животных';
    }
    
    return 'Другое';
}

// Функция для извлечения информации из описания
function extractNkoInfo($description) {
    $info = [
        'activities' => '',
        'social_links' => '',
        'target_audience' => '',
        'yearly_plan' => ''
    ];
    
    if (empty($description)) {
        return $info;
    }
    
    // Извлекаем основную деятельность
    if (preg_match('/Основная деятельность:\s*(.*?)(?=Ссылка|ЦА:|План мероприятий|$)/s', $description, $matches)) {
        $info['activities'] = trim($matches[1]);
    }
    
    // Извлекаем социальные сети
    if (preg_match('/Ссылка на социальные сети:\s*(.*?)(?=ЦА:|План мероприятий|$)/s', $description, $matches)) {
        $info['social_links'] = trim($matches[1]);
    }
    
    // Извлекаем целевую аудиторию
    if (preg_match('/ЦА:\s*(.*?)(?=План мероприятий|$)/s', $description, $matches)) {
        $info['target_audience'] = trim($matches[1]);
    }
    
    // Извлекаем план мероприятий
    if (preg_match('/План мероприятий (на год|до конца года):\s*(.*?)$/s', $description, $matches)) {
        $info['yearly_plan'] = trim($matches[2]);
    }
    
    // Альтернативные паттерны
    if (empty($info['activities']) && preg_match('/Основная деятельность[:\s]*(.*?)(?=Ссылка|Соцсети|ЦА|$)/s', $description, $matches)) {
        $info['activities'] = trim($matches[1]);
    }
    
    if (empty($info['social_links']) && preg_match('/(Ссылка|Соцсети)[^:]*:\s*(.*?)(?=ЦА|План|$)/s', $description, $matches)) {
        $info['social_links'] = trim($matches[2]);
    }
    
    return $info;
}

// Основная логика импорта
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($action === 'import_csv') {
    try {
        // Ищем CSV файл
        $csvFilePath = findCSVFile();
        
        if (!$csvFilePath) {
            echo json_encode([
                "success" => false, 
                "message" => "CSV файл не найден. Убедитесь, что файл nko.csv находится в папке data/"
            ]);
            exit;
        }
        
        error_log("Найден CSV файл: " . $csvFilePath);
        
        $parseResult = parseNkoCSV($csvFilePath);
        
        if (!$parseResult['success']) {
            echo json_encode($parseResult);
            exit;
        }
        
        $nkoData = $parseResult['data'];
        $totalLines = $parseResult['total_lines'];
        $imported = 0;
        $updated = 0;
        $errors = 0;
        $errorDetails = [];
        
        error_log("Начало импорта CSV. Всего строк: $totalLines, данных: " . count($nkoData));
        
        foreach ($nkoData as $nko) {
            // Проверяем обязательные поля
            if (empty($nko['latitude']) || empty($nko['longitude']) || empty($nko['name'])) {
                $errors++;
                $errorDetails[] = "Строка {$nko['line_number']}: Неполные данные (широта: '{$nko['latitude']}', долгота: '{$nko['longitude']}', название: '{$nko['name']}')";
                continue;
            }
            
            // Проверяем корректность координат
            $latitude = floatval(str_replace(',', '.', $nko['latitude']));
            $longitude = floatval(str_replace(',', '.', $nko['longitude']));
            
            if ($latitude == 0 || $longitude == 0 || $latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
                $errors++;
                $errorDetails[] = "Строка {$nko['line_number']}: Неверные координаты (широта: $latitude, долгота: $longitude)";
                continue;
            }
            
            // Определяем тип объекта
            $isCity = (strpos(mb_strtolower($nko['description'], 'UTF-8'), 'город присутствия') !== false);
            $objectType = $isCity ? 'city' : 'nko';
            $nkoType = determineNkoType($nko['description']);
            
            // Извлекаем дополнительную информацию
            $extractedInfo = extractNkoInfo($nko['description']);
            
            // Проверяем, существует ли уже такой объект
            $check_stmt = $conn->prepare("SELECT id, name FROM rosatom_cities WHERE name = ? AND latitude = ? AND longitude = ?");
            $check_stmt->bind_param("sdd", $nko['name'], $latitude, $longitude);
            $check_stmt->execute();
            $existing = $check_stmt->get_result()->fetch_assoc();
            $check_stmt->close();
            
            if ($existing) {
                // Обновляем существующую запись
                $stmt = $conn->prepare("
                    UPDATE rosatom_cities 
                    SET object_type = ?, nko_type = ?, description = ?, nko_activities = ?, 
                        social_links = ?, target_audience = ?, yearly_plan = ?, marker_number = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ");
                
                if ($stmt) {
                    $stmt->bind_param(
                        "ssssssssi", 
                        $objectType, $nkoType, $nko['description'], $extractedInfo['activities'],
                        $extractedInfo['social_links'], $extractedInfo['target_audience'], 
                        $extractedInfo['yearly_plan'], $nko['marker_number'], $existing['id']
                    );
                    
                    if ($stmt->execute()) {
                        $updated++;
                        error_log("Обновлен объект: {$existing['name']} (ID: {$existing['id']})");
                    } else {
                        $errors++;
                        $errorDetails[] = "Строка {$nko['line_number']}: Ошибка обновления - " . $stmt->error;
                    }
                    $stmt->close();
                } else {
                    $errors++;
                    $errorDetails[] = "Строка {$nko['line_number']}: Ошибка подготовки запроса обновления";
                }
            } else {
                // Добавляем новую запись
                $stmt = $conn->prepare("
                    INSERT INTO rosatom_cities 
                    (name, region, latitude, longitude, object_type, nko_type, description, 
                     nko_activities, social_links, target_audience, yearly_plan, marker_number) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                if ($stmt) {
                    $region = ''; // Можно извлечь из названия или оставить пустым
                    $stmt->bind_param(
                        "ssddssssssss", 
                        $nko['name'], $region, $latitude, $longitude, 
                        $objectType, $nkoType, $nko['description'], $extractedInfo['activities'],
                        $extractedInfo['social_links'], $extractedInfo['target_audience'], 
                        $extractedInfo['yearly_plan'], $nko['marker_number']
                    );
                    
                    if ($stmt->execute()) {
                        $imported++;
                        $newId = $stmt->insert_id;
                        error_log("Добавлен новый объект: {$nko['name']} (ID: $newId)");
                    } else {
                        $errors++;
                        $errorDetails[] = "Строка {$nko['line_number']}: Ошибка добавления - " . $stmt->error;
                    }
                    $stmt->close();
                } else {
                    $errors++;
                    $errorDetails[] = "Строка {$nko['line_number']}: Ошибка подготовки запроса добавления";
                }
            }
        }
        
        $response = [
            "success" => true,
            "message" => "Импорт завершен. Обработано строк: $totalLines. Добавлено: $imported, Обновлено: $updated, Ошибок: $errors",
            "stats" => [
                "total_lines" => $totalLines,
                "imported" => $imported,
                "updated" => $updated,
                "errors" => $errors
            ]
        ];
        
        // Добавляем детали ошибок если есть
        if ($errors > 0) {
            $response['error_details'] = array_slice($errorDetails, 0, 10); // Первые 10 ошибок
        }
        
        error_log("Импорт завершен: Добавлено $imported, Обновлено $updated, Ошибок $errors");
        
        echo json_encode($response);
        
    } catch (Exception $e) {
        error_log("Ошибка импорта CSV: " . $e->getMessage());
        echo json_encode([
            "success" => false,
            "message" => "Ошибка импорта: " . $e->getMessage()
        ]);
    }
} else {
    echo json_encode([
        "success" => false,
        "message" => "Неизвестное действие: $action"
    ]);
}

$user_stmt->close();
?>