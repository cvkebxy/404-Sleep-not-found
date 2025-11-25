<?php
include '../php/db.php';
include '../php/functions.php';
session_start();

// Проверка авторизации
$user_key = $_COOKIE['auth_key'] ?? '';
$current_user = null;

if ($user_key) {
    $stmt = $conn->prepare("SELECT id, login, name, surname FROM users WHERE auth_key = ?");
    $stmt->bind_param("s", $user_key);
    $stmt->execute();
    $current_user = $stmt->get_result()->fetch_assoc();
    $stmt->close();
}

if (!$current_user || !is_admin($current_user['id'])) {
    header("Location: ../index.php");
    exit;
}

// ОБРАБОТКА POST-ЗАПРОСОВ
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $user_id = $_POST['user_id'] ?? '';
    $role = $_POST['role'] ?? '';
    
    if ($action === 'assign_role' && $user_id && $role) {
        if (assign_role($user_id, $role)) {
            $message = "Роль '$role' успешно назначена пользователю";
            $message_type = "success";
        } else {
            $message = "Ошибка назначения роли";
            $message_type = "error";
        }
    } 
    elseif ($action === 'delete_user' && $user_id) {
        if ($user_id != $current_user['id']) {
            if (delete_user($user_id)) {
                $message = "Пользователь успешно удален";
                $message_type = "success";
            } else {
                $message = "Ошибка удаления пользователя";
                $message_type = "error";
            }
        } else {
            $message = "Нельзя удалить свой аккаунт";
            $message_type = "error";
        }
    }
    elseif ($action === 'add_city') {
        $name = $_POST['name'] ?? '';
        $region = $_POST['region'] ?? '';
        $latitude = $_POST['latitude'] ?? '';
        $longitude = $_POST['longitude'] ?? '';
        
        if ($name && $latitude && $longitude) {
            $result = add_rosatom_city($name, $region, $latitude, $longitude);
            if ($result['success']) {
                $message = $result['message'];
                $message_type = "success";
            } else {
                $message = $result['message'];
                $message_type = "error";
            }
        } else {
            $message = "Заполните обязательные поля";
            $message_type = "error";
        }
    }
    elseif ($action === 'toggle_city_status') {
        $city_id = $_POST['city_id'] ?? '';
        $is_active = $_POST['is_active'] ?? '';
        
        if ($city_id) {
            $stmt = $conn->prepare("UPDATE rosatom_cities SET is_active = ? WHERE id = ?");
            $stmt->bind_param("ii", $is_active, $city_id);
            if ($stmt->execute()) {
                $message = "Статус города обновлен";
                $message_type = "success";
            } else {
                $message = "Ошибка обновления статуса";
                $message_type = "error";
            }
            $stmt->close();
        }
    }
    elseif ($action === 'delete_city') {
        $city_id = $_POST['city_id'] ?? '';
        
        if ($city_id) {
            $stmt = $conn->prepare("DELETE FROM rosatom_cities WHERE id = ?");
            $stmt->bind_param("i", $city_id);
            if ($stmt->execute()) {
                $message = "Город успешно удален";
                $message_type = "success";
            } else {
                $message = "Ошибка удаления города";
                $message_type = "error";
            }
            $stmt->close();
        }
    }
    
    // После обработки перезагружаем страницу чтобы показать изменения
    if (isset($message)) {
        $_SESSION['admin_message'] = $message;
        $_SESSION['admin_message_type'] = $message_type;
        header("Location: " . $_SERVER['PHP_SELF']);
        exit;
    }
}

// Получаем всех пользователей для SSR
$users = get_all_users_with_roles();
// Получаем города для SSR
$cities = get_rosatom_cities();
?>

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Панель администратора - Карта добрых дел Росатома</title>
    <!-- Подключаем стили -->
    <link rel="stylesheet" href="../styles/gigamain.css">
    <link rel="stylesheet" href="../styles/map.css">
    <!-- Стили для админ-панели -->
    <style>
        .admin-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            margin-top: 20px;
        }

        .admin-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            border-bottom: 1px solid rgba(255,255,255,0.3);
            padding-bottom: 20px;
        }

        .back-link {
            color: #4a90e2;
            text-decoration: none;
            font-size: 16px;
            margin-bottom: 20px;
            display: inline-block;
        }

        .back-link:hover {
            color: #357abd;
        }

        /* Стили для вкладок */
        .admin-tabs {
            display: flex;
            border-bottom: 1px solid rgba(255,255,255,0.2);
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .tab-btn {
            background: none;
            border: none;
            padding: 12px 24px;
            color: rgba(255,255,255,0.7);
            font-family: 'Roboto', sans-serif;
            font-size: 14px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.3s ease;
        }

        .tab-btn:hover {
            color: white;
            background: rgba(255,255,255,0.05);
        }

        .tab-btn.active {
            color: white;
            border-bottom-color: #4a90e2;
            background: rgba(255,255,255,0.1);
        }

        .tab-content {
            display: none;
            animation: fadeIn 0.3s ease;
        }

        .tab-content.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Общие стили для таблиц */
        .admin-table {
            width: 100%;
            border-collapse: collapse;
            background: rgba(255,255,255,0.02);
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 20px;
        }

        .admin-table th,
        .admin-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .admin-table th {
            background: rgba(255,255,255,0.1);
            font-weight: 600;
            color: white;
            font-size: 12px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
        }

        .admin-table td {
            color: rgba(255,255,255,0.9);
            font-size: 12px;
        }

        /* Стили для бейджей ролей */
        .role-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 10px;
            margin: 2px;
            font-weight: 500;
        }

        .role-admin { background: linear-gradient(135deg, #ff6b6b, #ee5a52); color: white; }
        .role-nko { background: linear-gradient(135deg, #4ecdc4, #44a08d); color: white; }
        .role-user { background: linear-gradient(135deg, #45b7d1, #3498db); color: white; }

        /* Стили для кнопок действий */
        .action-buttons {
            display: flex;
            gap: 5px;
            flex-wrap: wrap;
        }

        .btn-small {
            padding: 6px 12px;
            font-size: 12px;
            margin: 2px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-primary { background: #4a90e2; color: white; }
        .btn-primary:hover { background: #357abd; }

        .btn-secondary { background: #6b7280; color: white; }
        .btn-secondary:hover { background: #4b5563; }

        .btn-danger { background: #ef4444; color: white; }
        .btn-danger:hover { background: #dc2626; }

        .btn-success { background: #10b981; color: white; }
        .btn-success:hover { background: #059669; }

        /* Стили для форм */
        .admin-form {
            margin-bottom: 20px;
            padding: 20px;
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.1);
        }

        .admin-form h3 {
            margin: 0 0 15px 0;
            color: white;
            font-size: 18px;
        }

        .form-row {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
        }

        .form-row .form-group {
            flex: 1;
        }

        .form-group label {
            display: block;
            margin-bottom: 5px;
            color: rgba(255,255,255,0.8);
            font-size: 14px;
        }

        .form-control {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 6px;
            background: rgba(255,255,255,0.1);
            color: white;
            font-family: 'Roboto', sans-serif;
            font-size: 14px;
        }

        .form-control:focus {
            outline: none;
            border-color: #4a90e2;
            background: rgba(255,255,255,0.15);
        }

        .form-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 20px;
        }

        /* Стили для статусов */
        .status-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }

        .status-active { background: #10b981; color: white; }
        .status-inactive { background: #6b7280; color: white; }

        /* Сообщения */
        .admin-message {
            padding: 12px 15px;
            border-radius: 6px;
            margin-bottom: 15px;
            font-size: 14px;
            display: none;
        }

        .admin-message.success {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .admin-message.error {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .admin-message.info {
            background: rgba(59, 130, 246, 0.2);
            color: #3b82f6;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }

        /* Загрузка */
        .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Адаптивность */
        @media (max-width: 768px) {
            .admin-container {
                padding: 10px;
            }

            .form-row {
                flex-direction: column;
                gap: 10px;
            }

            .tab-btn {
                padding: 10px 15px;
                font-size: 12px;
            }

            .admin-table th,
            .admin-table td {
                padding: 8px;
                font-size: 10px;
            }
        }
    </style>
</head>
<body class="accessibility-normal">
    <div class="container">
        <a href="../index.php" class="back-link">← Назад на главную</a>

        <div class="admin-container">
            <div class="admin-header">
                <h1>Панель администратора</h1>
                <div>Текущий пользователь: <strong><?php echo htmlspecialchars($current_user['name'] . ' ' . $current_user['surname']); ?></strong></div>
            </div>

            <!-- Вкладки -->
            <div class="admin-tabs">
                <button class="tab-btn active" onclick="switchTab('users')">Пользователи</button>
                <button class="tab-btn" onclick="switchTab('cities')">Города и НКО</button>
                <button class="tab-btn" onclick="switchTab('statistics')">Статистика</button>
            </div>

            <!-- Сообщения -->
            <div id="adminMessage" class="admin-message"></div>
            <!-- PHP сообщения -->
            <?php if (isset($_SESSION['admin_message'])): ?>
                <div class="admin-message <?php echo $_SESSION['admin_message_type']; ?>">
                    <?php 
                    echo htmlspecialchars($_SESSION['admin_message']);
                    unset($_SESSION['admin_message']);
                    unset($_SESSION['admin_message_type']);
                    ?>
                </div>
            <?php endif; ?>

            <!-- Вкладка пользователей -->
            <div id="tab-users" class="tab-content active">
                <h2>Управление пользователями</h2>
                
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Логин</th>
                            <th>Имя</th>
                            <th>Фамилия</th>
                            <th>Роли</th>
                            <th>Дата регистрации</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody id="adminUsersTable">
                        <?php foreach ($users as $user): ?>
                        <tr>
                            <td><?php echo $user['id']; ?></td>
                            <td><?php echo htmlspecialchars($user['login']); ?></td>
                            <td><?php echo htmlspecialchars($user['name'] ?? ''); ?></td>
                            <td><?php echo htmlspecialchars($user['surname'] ?? ''); ?></td>
                            <td>
                                <?php
                                $roles = $user['roles'] ? explode(',', $user['roles']) : [];
                                foreach ($roles as $role): ?>
                                    <span class="role-badge role-<?php echo $role; ?>"><?php echo $role; ?></span>
                                <?php endforeach; ?>
                            </td>
                            <td><?php echo date('d.m.Y H:i', strtotime($user['created_at'])); ?></td>
                            <td class="action-buttons">
                                <!-- Кнопки назначения ролей -->
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="action" value="assign_role">
                                    <input type="hidden" name="user_id" value="<?php echo $user['id']; ?>">
                                    <button type="submit" name="role" value="admin" class="btn-small btn-primary" 
                                            <?php echo in_array('admin', $roles) ? 'disabled' : ''; ?>>Админ</button>
                                    <button type="submit" name="role" value="nko" class="btn-small btn-success"
                                            <?php echo in_array('nko', $roles) ? 'disabled' : ''; ?>>НКО</button>
                                    <button type="submit" name="role" value="user" class="btn-small btn-secondary"
                                            <?php echo in_array('user', $roles) ? 'disabled' : ''; ?>>Пользователь</button>
                                </form>
                                <?php if ($user['id'] != $current_user['id']): ?>
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="action" value="delete_user">
                                    <input type="hidden" name="user_id" value="<?php echo $user['id']; ?>">
                                    <button type="submit" class="btn-small btn-danger" 
                                            onclick="return confirm('Вы уверены, что хотите удалить этого пользователя?')">Удалить</button>
                                </form>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>

            <!-- Вкладка городов и НКО -->
            <div id="tab-cities" class="tab-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2>Управление городами и НКО</h2>
                    <div>
                        <button class="btn-success" onclick="importCSVData()" style="margin-right: 10px;">
                            📥 Импорт из CSV
                        </button>
                        <button class="btn-primary" onclick="showAddCityForm()">➕ Добавить город</button>
                    </div>
                </div>

                <!-- Форма добавления города -->
                <div id="addCityForm" class="admin-form" style="display: none;">
                    <h3>Добавить новый город</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="newCityName">Название города *</label>
                            <input type="text" id="newCityName" class="form-control" placeholder="Например: Москва">
                        </div>
                        <div class="form-group">
                            <label for="newCityRegion">Регион</label>
                            <input type="text" id="newCityRegion" class="form-control" placeholder="Например: Московская область">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="newCityLat">Широта *</label>
                            <input type="number" id="newCityLat" class="form-control" step="0.000001" placeholder="55.7558" value="55.7558">
                        </div>
                        <div class="form-group">
                            <label for="newCityLon">Долгота *</label>
                            <input type="number" id="newCityLon" class="form-control" step="0.000001" placeholder="37.6173" value="37.6173">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="hideAddCityForm()">Отмена</button>
                        <button type="button" class="btn-primary" onclick="addNewCity()">Добавить город</button>
                    </div>
                </div>

                <!-- Таблица городов и НКО -->
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Название / Тип</th>
                            <th>Регион</th>
                            <th>Координаты</th>
                            <th>Соцсети</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody id="citiesTable">
                        <!-- Данные будут загружены через JavaScript -->
                    </tbody>
                </table>
            </div>

            <!-- Вкладка статистики -->
            <div id="tab-statistics" class="tab-content">
                <h2>Статистика платформы</h2>
                
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div class="stat-card" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; text-align: center;">
                        <div class="stat-number" style="font-size: 32px; font-weight: bold; color: #4a90e2;" id="statsCities">0</div>
                        <div class="stat-label" style="color: rgba(255,255,255,0.8);">Городов присутствия</div>
                    </div>
                    <div class="stat-card" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; text-align: center;">
                        <div class="stat-number" style="font-size: 32px; font-weight: bold; color: #4ecdc4;" id="statsNko">0</div>
                        <div class="stat-label" style="color: rgba(255,255,255,0.8);">Некоммерческих организаций</div>
                    </div>
                    <div class="stat-card" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; text-align: center;">
                        <div class="stat-number" style="font-size: 32px; font-weight: bold; color: #45b7d1;" id="statsProjects">0</div>
                        <div class="stat-label" style="color: rgba(255,255,255,0.8);">Проектов</div>
                    </div>
                    <div class="stat-card" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; text-align: center;">
                        <div class="stat-number" style="font-size: 32px; font-weight: bold; color: #ff6b6b;" id="statsVolunteers">0</div>
                        <div class="stat-label" style="color: rgba(255,255,255,0.8);">Волонтёров</div>
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px;">
                    <h3>Быстрые действия</h3>
                    <div class="action-buttons">
                        <button class="btn-primary" onclick="refreshStatistics()">Обновить статистику</button>
                        <button class="btn-secondary" onclick="exportStatistics()">Экспорт данных</button>
                        <button class="btn-success" onclick="openSystemLogs()">Системные логи</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Подключаем скрипты -->
    <script src="../js/gigascript.js"></script>
    <script src="../js/map.js"></script>

    <script>
        // Базовые функции для админ-панели
        function switchTab(tabName) {
            // Скрываем все вкладки
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Убираем активный класс у всех кнопок
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Показываем выбранную вкладку
            document.getElementById('tab-' + tabName).classList.add('active');
            
            // Активируем кнопку
            event.target.classList.add('active');
            
            // Если переключились на города, обновляем данные
            if (tabName === 'cities') {
                loadAdminCities();
            } else if (tabName === 'statistics') {
                loadAdminStatistics();
            } else if (tabName === 'users') {
                loadAdminUsers();
            }
        }

        function showAddCityForm() {
            document.getElementById('addCityForm').style.display = 'block';
        }

        function hideAddCityForm() {
            document.getElementById('addCityForm').style.display = 'none';
            clearAddCityForm();
        }

        function clearAddCityForm() {
            document.getElementById('newCityName').value = '';
            document.getElementById('newCityRegion').value = '';
            document.getElementById('newCityLat').value = '55.7558';
            document.getElementById('newCityLon').value = '37.6173';
        }

        // Показать сообщение
        function showMessage(message, type) {
            const messageEl = document.getElementById('adminMessage');
            messageEl.textContent = message;
            messageEl.className = `admin-message ${type}`;
            messageEl.style.display = 'block';

            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        }

        // Вспомогательные функции
        function escapeHtml(unsafe) {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        // Инициализация при загрузке
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Админ-панель загружена');
            
            // Загружаем начальные данные
            loadAdminStatistics();
            
            // Инициализируем карту если она есть на странице
            if (document.getElementById('map')) {
                initMap().catch(error => {
                    console.error('Ошибка инициализации карты:', error);
                });
            }
        });

        // Функция импорта данных из CSV
        async function importCSVData() {
            if (!confirm('Импортировать все данные из CSV файла? Существующие записи будут обновлены.')) {
                return;
            }

            try {
                const submitBtn = event.target;
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '⏳ Импорт...';
                submitBtn.disabled = true;

                const formData = new FormData();
                formData.append('action', 'import_csv');

                const response = await fetch('../php/import_csv_data.php', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    showMessage(data.message, 'success');
                    // Показываем детальную статистику
                    if (data.stats) {
                        const stats = data.stats;
                        showMessage(`Детали: Добавлено ${stats.imported}, Обновлено ${stats.updated}, Ошибок ${stats.errors}`, 'info');
                    }
                    // Перезагружаем данные
                    setTimeout(() => loadAdminCities(), 1000);
                } else {
                    showMessage(data.message, 'error');
                }

            } catch (error) {
                console.error('Ошибка импорта:', error);
                showMessage('Ошибка импорта данных: ' + error.message, 'error');
            } finally {
                const submitBtn = event.target;
                submitBtn.innerHTML = '📥 Импорт из CSV';
                submitBtn.disabled = false;
            }
        }
    </script>
</body>
</html>
