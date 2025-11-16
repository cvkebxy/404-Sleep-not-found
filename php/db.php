<?php
// Настройки подключения к базе данных
$host = 'localhost';
$user = 'root';
$pass = '';
$db_name = 'rosatom_map';

// Подключаемся к серверу MySQL
$conn = new mysqli($host, $user, $pass);
if ($conn->connect_error) {
    die("Ошибка подключения к MySQL: " . $conn->connect_error);
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
    
    // Добавляем тестовые данные
    $test_cards = [
        ['СРОЧНО', 'СОЦ.ПРОЕКТ', 'Помощь пожилым соседям', 'Десногорск, Смоленская область', 'Нужны волонтёры для доставки продуктов и лекарств', 15, 30, '15.12.2025', 'Мы рядом'],
        ['', 'ЭКОЛОГИЯ', 'Чистый берег', 'Волгодонск, Ростовская область', 'Экологическая акция по очистке берега набережной. Ждём волонтёров!', 15, 30, '15.12.2025', 'Зелёный мир'],
        ['', 'ЖИВОТНЫЕ', 'Приют для бездомных животных', 'Северск, Томская область', 'Требуется помощь в уходе за животными.', 15, 30, '15.12.2025', 'Четыре лапы'],
        ['СРОЧНО', 'СОЦ.ПРОЕКТ', 'Помощь детям', 'Саров, Нижегородская область', 'Организация досуга для детей из многодетных семей', 8, 20, '20.12.2025', 'Детский фонд'],
        ['', 'ЭКОЛОГИЯ', 'Посадка деревьев', 'Нововоронеж, Воронежская область', 'Массовая посадка деревьев в городском парке', 25, 50, '18.12.2025', 'ЭкоДруг'],
        ['', 'ЖИВОТНЫЕ', 'Помощь приюту', 'Зеленогорск, Красноярский край', 'Сбор кормов и медикаментов для животных', 30, 45, '22.12.2025', 'Лапа помощи'],
        ['СРОЧНО', 'СОЦ.ПРОЕКТ', 'Поддержка ветеранов', 'Озёрск, Челябинская область', 'Помощь по хозяйству и общение с ветеранами', 12, 25, '17.12.2025', 'Поколение'],
        ['', 'ЭКОЛОГИЯ', 'Чистый лес', 'Снежинск, Челябинская область', 'Уборка мусора в лесопарковой зоне', 18, 35, '19.12.2025', 'Зелёный патруль']
    ];
    
    $stmt = $conn->prepare("INSERT INTO cards (status, type, header, location, main_text, current_participants, max_participants, date, sub_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    foreach ($test_cards as $card) {
        $stmt->bind_param("sssssiiss", $card[0], $card[1], $card[2], $card[3], $card[4], $card[5], $card[6], $card[7], $card[8]);
        $stmt->execute();
    }
    $stmt->close();
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

// Добавляем в конец db.php после создания таблицы nko_organizations

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
    
    // Добавляем базовые роли - ИСПРАВЛЕННЫЙ СИНТАКСИС
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
?>