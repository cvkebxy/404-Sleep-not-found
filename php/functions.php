<?php
include 'db.php';
// УБИРАЕМ include 'get_stats.php' - создает циклическую зависимость

function get_user_roles($user_id) {
    global $conn;
    
    $stmt = $conn->prepare("
        SELECT r.name 
        FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = ?
    ");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $roles = [];
    while ($row = $result->fetch_assoc()) {
        $roles[] = $row['name'];
    }
    $stmt->close();
    
    return $roles;
}

function is_admin($user_id) {
    $roles = get_user_roles($user_id);
    return in_array('admin', $roles);
}

function is_nko($user_id) {
    $roles = get_user_roles($user_id);
    return in_array('nko', $roles);
}

function assign_role($user_id, $role_name) {
    global $conn;
    
    // Получаем ID роли
    $stmt = $conn->prepare("SELECT id FROM roles WHERE name = ?");
    $stmt->bind_param("s", $role_name);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        return false;
    }
    
    $role_id = $result->fetch_assoc()['id'];
    $stmt->close();
    
    // Назначаем роль
    $stmt = $conn->prepare("INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)");
    $stmt->bind_param("ii", $user_id, $role_id);
    $result = $stmt->execute();
    $stmt->close();
    
    return $result;
}

function remove_role($user_id, $role_name) {
    global $conn;
    
    // Получаем ID роли
    $stmt = $conn->prepare("SELECT id FROM roles WHERE name = ?");
    $stmt->bind_param("s", $role_name);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        return false;
    }
    
    $role_id = $result->fetch_assoc()['id'];
    $stmt->close();
    
    // Удаляем роль
    $stmt = $conn->prepare("DELETE FROM user_roles WHERE user_id = ? AND role_id = ?");
    $stmt->bind_param("ii", $user_id, $role_id);
    $result = $stmt->execute();
    $stmt->close();
    
    return $result;
}

function get_all_users_with_roles() {
    global $conn;
    
    $stmt = $conn->prepare("
        SELECT u.id, u.login, u.name, u.surname, u.created_at,
               GROUP_CONCAT(r.name) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    ");
    $stmt->execute();
    $result = $stmt->get_result();
    
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    $stmt->close();
    
    return $users;
}

function delete_user($user_id) {
    global $conn;
    
    $conn->begin_transaction();
    
    try {
        // Удаляем роли пользователя
        $stmt = $conn->prepare("DELETE FROM user_roles WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        
        // Удаляем пользователя
        $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        
        $conn->commit();
        return true;
    } catch (Exception $e) {
        $conn->rollback();
        return false;
    }
}

function can_edit_card($user_id, $card_id) {
    global $conn;
    
    // Админы могут редактировать все
    if (is_admin($user_id)) {
        return true;
    }
    
    // НКО могут редактировать только свои карточки
    if (is_nko($user_id)) {
        $stmt = $conn->prepare("SELECT created_by FROM cards WHERE id = ?");
        $stmt->bind_param("i", $card_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $card = $result->fetch_assoc();
        $stmt->close();
        
        return $card && $card['created_by'] == $user_id;
    }
    
    return false;
}

function can_delete_card($user_id, $card_id) {
    global $conn;
    
    error_log("can_delete_card: user_id=$user_id, card_id=$card_id");
    
    // Админы могут удалять все
    if (is_admin($user_id)) {
        error_log("Пользователь является администратором - доступ разрешен");
        return true;
    }
    
    // НКО могут удалять только свои карточки
    if (is_nko($user_id)) {
        $stmt = $conn->prepare("SELECT created_by FROM cards WHERE id = ?");
        $stmt->bind_param("i", $card_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $card = $result->fetch_assoc();
        $stmt->close();
        
        $can_delete = $card && $card['created_by'] == $user_id;
        error_log("НКО проверка: created_by=" . ($card['created_by'] ?? 'null') . ", can_delete=" . ($can_delete ? 'true' : 'false'));
        
        return $can_delete;
    }
    
    error_log("Пользователь не имеет прав для удаления");
    return false;
}

// Оригинальные функции карточек
function get_cards($offset = 0, $limit = 6) {
    global $conn;
    
    // Получаем ID текущего пользователя (если есть)
    $user_id = null;
    if (isset($_COOKIE['auth_key'])) {
        $stmt = $conn->prepare("SELECT id FROM users WHERE auth_key = ?");
        $stmt->bind_param("s", $_COOKIE['auth_key']);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($user = $result->fetch_assoc()) {
            $user_id = $user['id'];
        }
        $stmt->close();
    }
    
    // Формируем SQL-запрос с JOIN для получения данных НКО
    $sql = "SELECT c.*, 
                   COALESCE(cp.id, 0) as is_joined,
                   n.name as nko_name,
                   n.website as nko_website,
                   n.social_links as nko_social_links
            FROM cards c
            LEFT JOIN card_participants cp ON c.id = cp.card_id AND cp.user_id = ?
            LEFT JOIN nko_organizations n ON c.created_by = n.user_id
            ORDER BY c.created_at DESC LIMIT ? OFFSET ?";
    
    $stmt = $conn->prepare($sql);
    
    // Если пользователь не авторизован, используем 0 для user_id
    if (!$user_id) {
        $user_id = 0;
    }
    
    $stmt->bind_param("iii", $user_id, $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $cards = [];
    while ($row = $result->fetch_assoc()) {
        $cards[] = $row;
    }
    
    $stmt->close();
    return $cards;
}

function get_total_cards() {
    global $conn;
    
    $result = $conn->query("SELECT COUNT(*) as total FROM cards");
    $row = $result->fetch_assoc();
    return $row['total'];
}

function join_card($card_id, $user_id) {
    global $conn;
    
    // Проверяем, не участвует ли уже пользователь
    $check_stmt = $conn->prepare("SELECT id FROM card_participants WHERE card_id = ? AND user_id = ?");
    $check_stmt->bind_param("ii", $card_id, $user_id);
    $check_stmt->execute();
    
    if ($check_stmt->get_result()->num_rows > 0) {
        $check_stmt->close();
        return ['success' => false, 'message' => 'Вы уже участвуете в этом проекте'];
    }
    $check_stmt->close();
    
    // Получаем текущее количество участников и максимум
    $card_stmt = $conn->prepare("SELECT current_participants, max_participants FROM cards WHERE id = ?");
    $card_stmt->bind_param("i", $card_id);
    $card_stmt->execute();
    $card_data = $card_stmt->get_result()->fetch_assoc();
    $card_stmt->close();
    
    if (!$card_data) {
        return ['success' => false, 'message' => 'Проект не найден'];
    }
    
    if ($card_data['current_participants'] >= $card_data['max_participants']) {
        return ['success' => false, 'message' => 'Достигнуто максимальное количество участников'];
    }
    
    // Добавляем участника
    $insert_stmt = $conn->prepare("INSERT INTO card_participants (card_id, user_id) VALUES (?, ?)");
    $insert_stmt->bind_param("ii", $card_id, $user_id);
    
    if ($insert_stmt->execute()) {
        // Обновляем счетчик участников - ТОЛЬКО +1
        $update_stmt = $conn->prepare("UPDATE cards SET current_participants = current_participants + 1 WHERE id = ?");
        $update_stmt->bind_param("i", $card_id);
        $update_stmt->execute();
        $update_stmt->close();
        
        $insert_stmt->close();
        return ['success' => true, 'message' => 'Вы успешно присоединились к проекте!'];
    }
    
    $insert_stmt->close();
    return ['success' => false, 'message' => 'Ошибка при присоединении к проекту'];
}

function is_user_joined($card_id, $user_id) {
    global $conn;
    
    $stmt = $conn->prepare("SELECT id FROM card_participants WHERE card_id = ? AND user_id = ?");
    $stmt->bind_param("ii", $card_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $is_joined = $result->num_rows > 0;
    $stmt->close();
    
    return $is_joined;
}

// Удаление карточки
function delete_card($card_id, $user_id) {
    global $conn;
    
    error_log("delete_card вызвана с card_id: $card_id, user_id: $user_id");
    
    // Проверяем права на удаление
    if (!can_delete_card($user_id, $card_id)) {
        error_log("Недостаточно прав для удаления карточки");
        return ['success' => false, 'message' => 'Недостаточно прав для удаления этой карточки'];
    }
    
    $conn->begin_transaction();
    
    try {
        // Сначала проверяем существование карточки
        $check_stmt = $conn->prepare("SELECT id, created_by FROM cards WHERE id = ?");
        $check_stmt->bind_param("i", $card_id);
        $check_stmt->execute();
        $card_result = $check_stmt->get_result();
        
        if ($card_result->num_rows === 0) {
            $check_stmt->close();
            error_log("Карточка с ID $card_id не найдена");
            return ['success' => false, 'message' => 'Карточка не найдена'];
        }
        
        $card_data = $card_result->fetch_assoc();
        $check_stmt->close();
        
        error_log("Найдена карточка: " . print_r($card_data, true));
        
        // Удаляем участников карточки (если таблица существует)
        $tables = $conn->query("SHOW TABLES LIKE 'card_participants'");
        if ($tables->num_rows > 0) {
            $stmt = $conn->prepare("DELETE FROM card_participants WHERE card_id = ?");
            $stmt->bind_param("i", $card_id);
            $stmt->execute();
            $stmt->close();
            error_log("Удалены участники карточки");
        }
        
        // Удаляем саму карточку
        $stmt = $conn->prepare("DELETE FROM cards WHERE id = ?");
        $stmt->bind_param("i", $card_id);
        $delete_result = $stmt->execute();
        $stmt->close();
        
        if ($delete_result) {
            $conn->commit();
            error_log("Карточка успешно удалена");
            return ['success' => true, 'message' => 'Карточка успешно удалена'];
        } else {
            throw new Exception("Ошибка выполнения DELETE запроса");
        }
        
    } catch (Exception $e) {
        $conn->rollback();
        error_log("Ошибка при удалении карточки: " . $e->getMessage());
        return ['success' => false, 'message' => 'Ошибка при удалении карточки: ' . $e->getMessage()];
    }
}

// Базовые значения
$base_cities = 0;
$base_nko = 0; 
$base_projects = 0;
$base_volunteers = 0;

// Функция для получения всех городов присутствия
function get_rosatom_cities() {
    global $conn;
    $result = $conn->query("SELECT * FROM rosatom_cities WHERE is_active = TRUE ORDER BY name");
    $cities = [];
    while ($row = $result->fetch_assoc()) {
        $cities[] = $row;
    }
    return $cities;
}

// Функция для добавления нового города (для админов)
function add_rosatom_city($name, $region, $latitude, $longitude) {
    global $conn;
    
    // Проверяем, нет ли уже такого города
    $check_stmt = $conn->prepare("SELECT id FROM rosatom_cities WHERE name = ? AND region = ?");
    $check_stmt->bind_param("ss", $name, $region);
    $check_stmt->execute();
    
    if ($check_stmt->get_result()->num_rows > 0) {
        $check_stmt->close();
        return ['success' => false, 'message' => 'Город уже существует'];
    }
    $check_stmt->close();
    
    // Добавляем город
    $stmt = $conn->prepare("INSERT INTO rosatom_cities (name, region, latitude, longitude) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssdd", $name, $region, $latitude, $longitude);
    
    if ($stmt->execute()) {
        $stmt->close();
        return ['success' => true, 'message' => 'Город успешно добавлен', 'new_cities_count' => get_cities_count()];
    } else {
        $stmt->close();
        return ['success' => false, 'message' => 'Ошибка при добавлении города'];
    }
}

// Функции для статистики 
function get_cities_count() {
    global $conn, $base_cities;
    $result = $conn->query("SELECT COUNT(*) as count FROM rosatom_cities WHERE object_type = 'city' AND is_active = 1");
    $row = $result->fetch_assoc();
    $dynamic_cities = $row['count'] ?: 0;
    
    return $base_cities + $dynamic_cities;
}

function get_nko_count() {
    global $conn, $base_nko;
    // Считаем активные НКО из таблицы rosatom_cities + базовое значение
    $result = $conn->query("SELECT COUNT(*) as count FROM rosatom_cities WHERE object_type = 'nko' AND is_active = 1");
    $row = $result->fetch_assoc();
    $dynamic_nko = $row['count'] ?: 0;
    
    return $base_nko + $dynamic_nko;
}

function get_projects_count() {
    global $conn, $base_projects;
    // Считаем все карточки проектов + базовое значение
    $result = $conn->query("SELECT COUNT(*) as count FROM cards");
    $row = $result->fetch_assoc();
    $dynamic_projects = $row['count'] ?: 0;
    
    return $base_projects + $dynamic_projects;
}

function get_volunteers_count() {
    global $conn, $base_volunteers;
    // Считаем уникальных волонтеров + базовое значение
    $result = $conn->query("SELECT COUNT(DISTINCT user_id) as count FROM card_participants");
    $row = $result->fetch_assoc();
    $dynamic_volunteers = $row['count'] ?: 0;
    
    return $base_volunteers + $dynamic_volunteers;
}

// Получить всю статистику
function get_all_stats() {
    return [
        'cities' => get_cities_count(),
        'nko' => get_nko_count(),
        'projects' => get_projects_count(),
        'volunteers' => get_volunteers_count()
    ];
}

// Функция для добавления города на карту (вызывается при добавлении метки)
function add_city_to_map($city_name) {
    global $conn;
    // Здесь может быть логика добавления города в отдельную таблицу
    // Пока просто увеличиваем счетчик через добавление карточки
    return true;
}

// Функция для получения всех городов с пагинацией
function get_all_cities($offset = 0, $limit = 50) {
    global $conn;
    
    $stmt = $conn->prepare("SELECT * FROM rosatom_cities ORDER BY name LIMIT ? OFFSET ?");
    $stmt->bind_param("ii", $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $cities = [];
    while ($row = $result->fetch_assoc()) {
        $cities[] = $row;
    }
    $stmt->close();
    
    return $cities;
}

// Функция для получения общего количества городов
function get_total_cities() {
    global $conn;
    
    $result = $conn->query("SELECT COUNT(*) as total FROM rosatom_cities");
    $row = $result->fetch_assoc();
    return $row['total'];
}

// Функция для обновления города
function update_city($city_id, $name, $region, $latitude, $longitude, $is_active) {
    global $conn;
    
    $stmt = $conn->prepare("UPDATE rosatom_cities SET name = ?, region = ?, latitude = ?, longitude = ?, is_active = ? WHERE id = ?");
    $stmt->bind_param("ssddii", $name, $region, $latitude, $longitude, $is_active, $city_id);
    $result = $stmt->execute();
    $stmt->close();
    
    return $result;
}
?>