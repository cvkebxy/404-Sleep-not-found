<?php
// Настройки подключения к базе данных
$host = 'localhost';
$user = 'root';
$pass = 'strong_root_password_123';
$db_name = 'rosatom_map';

// Подключаемся к базе данных
$conn = new mysqli($host, $user, $pass, $db_name);
if ($conn->connect_error) {
    die("Ошибка подключения к базе данных: " . $conn->connect_error);
}

// Проверяем, существует ли база данных, если нет - создаем
$db_check = $conn->query("SHOW DATABASES LIKE '$db_name'");
if ($db_check->num_rows == 0) {
    if ($conn->query("CREATE DATABASE `$db_name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")) {
        // База создана успешно
    } else {
        die("Ошибка при создании базы: " . $conn->error);
    }
}

// Подключаемся к самой базе данных
$conn->select_db($db_name);

// Создаем таблицу users если не существует
$table_check = $conn->query("SHOW TABLES LIKE 'users'");
if ($table_check->num_rows == 0) {
    $create_table = "
        CREATE TABLE users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            login VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            surname VARCHAR(255),
            auth_key VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";

    if (!$conn->query($create_table)) {
        die("Ошибка при создании таблицы: " . $conn->error);
    }
}

// Создаем таблицу cards если не существует
$cards_table_check = $conn->query("SHOW TABLES LIKE 'cards'");
if ($cards_table_check->num_rows == 0) {
    $create_cards_table = "
        CREATE TABLE cards (
            id INT AUTO_INCREMENT PRIMARY KEY,
            status VARCHAR(50) DEFAULT '',
            type VARCHAR(100) NOT NULL,
            header VARCHAR(255) NOT NULL,
            location VARCHAR(255) NOT NULL,
            main_text TEXT NOT NULL,
            current_participants INT DEFAULT 0,
            max_participants INT DEFAULT 0,
            date VARCHAR(100) NOT NULL,
            sub_text VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";

    if (!$conn->query($create_cards_table)) {
        die("Ошибка при создании таблицы cards: " . $conn->error);
    }
}

// Создаем полнотекстовый индекс для поиска если его нет
$fulltext_check = $conn->query("SHOW INDEX FROM cards WHERE Key_name = 'header' AND Index_type = 'FULLTEXT'");
if ($fulltext_check->num_rows == 0) {
    try {
        // Сначала удаляем все существующие FULLTEXT индексы чтобы избежать дубликатов
        $existing_indexes = $conn->query("SHOW INDEX FROM cards WHERE Index_type = 'FULLTEXT' AND Key_name != 'header'");
        while ($index = $existing_indexes->fetch_assoc()) {
            $conn->query("ALTER TABLE cards DROP INDEX " . $index['Key_name']);
        }
        
        $conn->query("ALTER TABLE cards ADD FULLTEXT header_main_text_location_sub_text (header, main_text, location, sub_text)");
        error_log("Полнотекстовый индекс для поиска создан успешно");
    } catch (Exception $e) {
        error_log("Ошибка создания полнотекстового индекса: " . $e->getMessage());
    }
}

// Создаем таблицу для отслеживания участников
$participants_table_check = $conn->query("SHOW TABLES LIKE 'card_participants'");
if ($participants_table_check->num_rows == 0) {
    $create_participants_table = "
        CREATE TABLE card_participants (
            id INT AUTO_INCREMENT PRIMARY KEY,
            card_id INT NOT NULL,
            user_id INT NOT NULL,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_participation (card_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";

    if (!$conn->query($create_participants_table)) {
        die("Ошибка при создании таблицы card_participants: " . $conn->error);
    }
}

// Создаем таблицу nko_organizations если не существует
$nko_table_check = $conn->query("SHOW TABLES LIKE 'nko_organizations'");
if ($nko_table_check->num_rows == 0) {
    $create_nko_table = "
        CREATE TABLE nko_organizations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            description TEXT NOT NULL,
            activities TEXT NOT NULL,
            phone VARCHAR(50),
            address TEXT,
            website VARCHAR(255),
            social_links TEXT,
            logo_path VARCHAR(255),
            status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
            moderation_comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_user_nko (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";

    if (!$conn->query($create_nko_table)) {
        die("Ошибка при создании таблицы nko_organizations: " . $conn->error);
    }
}

// Всегда проверяем и создаем пользователя admin если его не существует
$admin_check = $conn->query("SELECT id FROM users WHERE login = 'admin'");
if ($admin_check->num_rows == 0) {
    // Создаем пользователя admin с паролем 123456 если не существует
    $admin_login = 'admin';
    $admin_password = password_hash('123456', PASSWORD_DEFAULT);
    $admin_name = 'Администратор';
    $admin_surname = 'Системы';
    
    $stmt = $conn->prepare("INSERT INTO users (login, password, name, surname) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $admin_login, $admin_password, $admin_name, $admin_surname);
    $stmt->execute();
    $stmt->close();
    
    error_log("Пользователь admin создан успешно");
} else {
    error_log("Пользователь admin уже существует");
}

// Создаем таблицу ролей если не существует
$roles_table_check = $conn->query("SHOW TABLES LIKE 'roles'");
if ($roles_table_check->num_rows == 0) {
    $create_roles_table = "
        CREATE TABLE roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE,
            description VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    
    if (!$conn->query($create_roles_table)) {
        die("Ошибка при создании таблицы roles: " . $conn->error);
    }
    
    // Добавляем базовые роли
    $roles = [
        ['admin', 'Администратор'],
        ['nko', 'Некоммерческая организация'],
        ['user', 'Обычный пользователь']
    ];
    
    $stmt = $conn->prepare("INSERT INTO roles (name, description) VALUES (?, ?)");
    foreach ($roles as $role) {
        $stmt->bind_param("ss", $role[0], $role[1]);
        $stmt->execute();
    }
    $stmt->close();
}

// Создаем таблицу связей пользователей и ролей
$user_roles_table_check = $conn->query("SHOW TABLES LIKE 'user_roles'");
if ($user_roles_table_check->num_rows == 0) {
    $create_user_roles_table = "
        CREATE TABLE user_roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            role_id INT NOT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
            UNIQUE KEY unique_user_role (user_id, role_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    
    if (!$conn->query($create_user_roles_table)) {
        die("Ошибка при создании таблицы user_roles: " . $conn->error);
    }
    
    // Назначаем роль admin пользователю admin
    $admin_user_id_result = $conn->query("SELECT id FROM users WHERE login = 'admin'");
    if ($admin_user_id_result && $admin_user_id_result->num_rows > 0) {
        $admin_user_id = $admin_user_id_result->fetch_assoc()['id'];
        $admin_role_id_result = $conn->query("SELECT id FROM roles WHERE name = 'admin'");
        
        if ($admin_role_id_result && $admin_role_id_result->num_rows > 0) {
            $admin_role_id = $admin_role_id_result->fetch_assoc()['id'];
            
            $stmt = $conn->prepare("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)");
            $stmt->bind_param("ii", $admin_user_id, $admin_role_id);
            $stmt->execute();
            $stmt->close();
        }
    }
}

// Добавляем поле created_by в таблицу cards для отслеживания создателя
$columns_check = $conn->query("SHOW COLUMNS FROM cards LIKE 'created_by'");
if ($columns_check->num_rows == 0) {
    $conn->query("ALTER TABLE cards ADD COLUMN created_by INT NULL AFTER sub_text");
    
    // Добавляем внешний ключ только если таблица cards существует и есть записи
    $conn->query("ALTER TABLE cards ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL");
}

// Добавляем поле created_by в таблицу nko_organizations
$nko_columns_check = $conn->query("SHOW COLUMNS FROM nko_organizations LIKE 'created_by'");
if ($nko_columns_check->num_rows == 0) {
    $conn->query("ALTER TABLE nko_organizations ADD COLUMN created_by INT NULL AFTER logo_path");
    $conn->query("ALTER TABLE nko_organizations ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL");
}

// Обновляем таблицу users если нужно
$columns_check = $conn->query("SHOW COLUMNS FROM users LIKE 'confirm_hash'");
if ($columns_check->num_rows == 0) {
    $conn->query("ALTER TABLE users ADD COLUMN confirm_hash VARCHAR(32) NULL AFTER surname");
}

$columns_check = $conn->query("SHOW COLUMNS FROM users LIKE 'email_confirmed'");
if ($columns_check->num_rows == 0) {
    $conn->query("ALTER TABLE users ADD COLUMN email_confirmed BOOLEAN DEFAULT 0 AFTER confirm_hash");
}

// Создаем таблицу rosatom_cities если не существует
$cities_table_check = $conn->query("SHOW TABLES LIKE 'rosatom_cities'");
if ($cities_table_check->num_rows == 0) {
    $create_cities_table = "
        CREATE TABLE rosatom_cities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            region VARCHAR(255),
            latitude DECIMAL(10, 6),
            longitude DECIMAL(10, 6),
            is_active BOOLEAN DEFAULT TRUE,
            object_type ENUM('city', 'nko') DEFAULT 'city',
            description TEXT,
            nko_activities TEXT,
            social_links TEXT,
            target_audience TEXT,
            yearly_plan TEXT,
            nko_type VARCHAR(100),
            marker_number VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    
    if (!$conn->query($create_cities_table)) {
        die("Ошибка при создании таблицы rosatom_cities: " . $conn->error);
    }
    
    // Создаем индексы для оптимизации
    $conn->query("CREATE INDEX idx_object_type ON rosatom_cities(object_type)");
    $conn->query("CREATE INDEX idx_nko_type ON rosatom_cities(nko_type)");
    $conn->query("CREATE INDEX idx_is_active ON rosatom_cities(is_active)");
    
} else {
    // Если таблица уже существует, добавляем недостающие поля
    $columns_to_add = [
        "object_type" => "ALTER TABLE rosatom_cities ADD COLUMN object_type ENUM('city', 'nko') DEFAULT 'city'",
        "description" => "ALTER TABLE rosatom_cities ADD COLUMN description TEXT",
        "nko_activities" => "ALTER TABLE rosatom_cities ADD COLUMN nko_activities TEXT",
        "social_links" => "ALTER TABLE rosatom_cities ADD COLUMN social_links TEXT",
        "target_audience" => "ALTER TABLE rosatom_cities ADD COLUMN target_audience TEXT",
        "yearly_plan" => "ALTER TABLE rosatom_cities ADD COLUMN yearly_plan TEXT",
        "nko_type" => "ALTER TABLE rosatom_cities ADD COLUMN nko_type VARCHAR(100)",
        "marker_number" => "ALTER TABLE rosatom_cities ADD COLUMN marker_number VARCHAR(50)"
    ];
    
    foreach ($columns_to_add as $column_name => $sql) {
        $column_check = $conn->query("SHOW COLUMNS FROM rosatom_cities LIKE '$column_name'");
        if ($column_check->num_rows == 0) {
            if (!$conn->query($sql)) {
                error_log("Ошибка добавления поля $column_name: " . $conn->error);
            }
        }
    }
    
    // Создаем индексы если их нет
    $indexes_to_add = [
        "idx_object_type" => "CREATE INDEX idx_object_type ON rosatom_cities(object_type)",
        "idx_nko_type" => "CREATE INDEX idx_nko_type ON rosatom_cities(nko_type)",
        "idx_is_active" => "CREATE INDEX idx_is_active ON rosatom_cities(is_active)"
    ];
    
    foreach ($indexes_to_add as $index_name => $sql) {
        $index_check = $conn->query("SHOW INDEX FROM rosatom_cities WHERE Key_name = '$index_name'");
        if ($index_check->num_rows == 0) {
            if (!$conn->query($sql)) {
                error_log("Ошибка создания индекса $index_name: " . $conn->error);
            }
        }
    }
}
?>