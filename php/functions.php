<?php
include 'db.php';

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
    
    $stmt = $conn->prepare("SELECT * FROM cards ORDER BY created_at DESC LIMIT ? OFFSET ?");
    $stmt->bind_param("ii", $limit, $offset);
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
    
    if ($card_data['current_participants'] >= $card_data['max_participants']) {
        return ['success' => false, 'message' => 'Достигнуто максимальное количество участников'];
    }
    
    // Добавляем участника
    $insert_stmt = $conn->prepare("INSERT INTO card_participants (card_id, user_id) VALUES (?, ?)");
    $insert_stmt->bind_param("ii", $card_id, $user_id);
    
    if ($insert_stmt->execute()) {
        // Обновляем счетчик участников
        $update_stmt = $conn->prepare("UPDATE cards SET current_participants = current_participants + 1 WHERE id = ?");
        $update_stmt->bind_param("i", $card_id);
        $update_stmt->execute();
        $update_stmt->close();
        
        $insert_stmt->close();
        return ['success' => true, 'message' => 'Вы успешно присоединились к проекту!'];
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



// Получить количество городов
function get_cities_count() {
    global $conn;
    $result = $conn->query("SELECT COUNT(DISTINCT location) as count FROM cards");
    $row = $result->fetch_assoc();
    return $row['count'] ?? 32; // Возвращаем реальное число или дефолтное
}

// Получить количество НКО
function get_nko_count() {
    global $conn;
    // Считаем пользователей с ролью 'nko'
    $result = $conn->query("
        SELECT COUNT(DISTINCT ur.user_id) as count 
        FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE r.name = 'nko'
    ");
    $row = $result->fetch_assoc();
    return $row['count'] ?? 130;
}

// Получить количество проектов
function get_projects_count() {
    global $conn;
    $result = $conn->query("SELECT COUNT(*) as count FROM cards");
    $row = $result->fetch_assoc();
    return $row['count'] ?? 300;
}

// Получить количество волонтеров
function get_volunteers_count() {
    global $conn;
    // Считаем уникальных участников проектов
    $result = $conn->query("SELECT COUNT(DISTINCT user_id) as count FROM card_participants");
    if ($result) {
        $row = $result->fetch_assoc();
        return $row['count'] ?? 5202;
    }
    
    // Если таблицы нет, считаем всех пользователей кроме админа
    $result = $conn->query("SELECT COUNT(*) as count FROM users WHERE id != 1");
    $row = $result->fetch_assoc();
    return $row['count'] ?? 5202;
}

// Универсальная функция для получения всей статистики
function get_all_stats() {
    return [
        'cities' => 32,
        'nko' => 130,
        'projects' => 300,
        'volunteers' => 5202
    ];
}
?>