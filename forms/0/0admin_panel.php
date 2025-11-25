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

// Получаем всех пользователей для SSR
$users = get_all_users_with_roles(); // Эта функция уже есть в functions.php
?>

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Панель администратора - Карта добрых дел Росатома</title>
    <!-- Подключаем стили -->
    <link rel="stylesheet" href="../styles/main.css">
    <link rel="stylesheet" href="../styles/components/buttons.css">
    <link rel="stylesheet" href="../styles/components/modals.css">
    <!-- Новые стили для админ-панели -->
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

        /* Стили для модального окна админ-панели */
        #adminModal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            z-index: 3000;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        #adminModal.show {
            opacity: 1;
        }

        .admin-dialog {
            background: linear-gradient(135deg, #000093 0%, #00D9CE 100%);
            border-radius: 24px;
            padding: 0;
            width: 90%; /* Максимальная ширина */
            max-width: 1000px; /* Фиксированная максимальная ширина */
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
            position: relative;
            overflow: hidden;
            border: none;
            /* Фиксированная высота */
            height: 900px; /* Основная цель! */
            display: flex;
            flex-direction: column;
            /* Убираем scroll у самого диалога */
            overflow: hidden;
        }

        .admin-header {
            padding: 20px 30px;
            background: rgba(255,255,255,0.05);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0; /* Не сжимается */
        }

        .admin-header h2 {
            color: white;
            font-family: 'Nexa', sans-serif;
            font-size: 24px;
            margin: 0;
        }

        .admin-stats {
            color: rgba(255,255,255,0.8);
            font-size: 14px;
        }

        .admin-content {
            flex-grow: 1; /* Занимает все оставшееся место */
            overflow-y: auto; /* Прокрутка только внутри контента */
            padding: 20px 30px;
        }

        .admin-message {
            padding: 12px 20px;
            margin: 0 0 20px 0;
            border-radius: 6px;
            font-size: 14px;
        }

        .admin-message.success {
            background: rgba(46, 204, 113, 0.2);
            color: #2ecc71;
            border: 1px solid #2ecc71;
        }

        .admin-message.error {
            background: rgba(231, 76, 60, 0.2);
            color: #e74c3c;
            border: 1px solid #e74c3c;
        }

        .users-table {
            width: 100%;
            border-collapse: collapse;
            background: rgba(255,255,255,0.02);
            border-radius: 8px;
            overflow: hidden;
            /* Убираем фиксированную высоту таблицы */
            min-height: 200px;
        }

        .users-table th,
        .users-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .users-table th {
            background: rgba(255,255,255,0.1);
            font-weight: 600;
            color: white;
            font-size: 12px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
        }

        .users-table td {
            color: rgba(255,255,255,0.9);
            font-size: 12px;
        }

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

        .action-buttons {
            display: flex;
            gap: 5px;
            flex-wrap: wrap;
        }

        .btn-small {
            padding: 6px 12px;
            font-size: 12px;
            margin: 2px;
        }

        .close-btn {
            position: absolute;
            top: 15px;
            right: 20px;
            background: rgba(255,255,255,0.15);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 50%;
            width: 35px;
            height: 35px;
            color: white;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }

        .close-btn:hover {
            background: rgba(255,255,255,0.25);
            border-color: rgba(255,255,255,0.4);
            transform: scale(1.1);
            color: #ff6b6b;
        }

        .close-btn:active {
            transform: scale(0.95);
        }

        .close-btn:focus {
            outline: 2px solid #ff6b6b;
            outline-offset: 2px;
        }

        /* Для мобильных устройств */
        @media (max-width: 768px) {
            .admin-dialog {
                width: 95%;
                height: 80vh; /* Для мобильных */
                padding: 10px;
            }

            .admin-header {
                padding: 15px;
                flex-direction: column;
                align-items: flex-start;
            }

            .admin-content {
                padding: 15px;
            }

            .users-table th,
            .users-table td {
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

            <?php if (isset($_SESSION['success_message'])): ?>
                <div class="alert alert-success"><?php echo $_SESSION['success_message']; unset($_SESSION['success_message']); ?></div>
            <?php endif; ?>

            <?php if (isset($_SESSION['error_message'])): ?>
                <div class="alert alert-error"><?php echo $_SESSION['error_message']; unset($_SESSION['error_message']); ?></div>
            <?php endif; ?>

            <h2>Управление пользователями</h2>

            <!-- Таблица будет заполнена JS-ом, но здесь есть заглушка для SSR -->
            <div id="adminContent" class="admin-content">
                <table class="users-table">
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
                    <tbody>
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
                                <!-- Кнопки назначения/удаления ролей -->
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="action" value="assign_role">
                                    <input type="hidden" name="user_id" value="<?php echo $user['id']; ?>">
                                    <button type="submit" name="role" value="admin" class="btn-small">Админ</button>
                                    <button type="submit" name="role" value="nko" class="btn-small">НКО</button>
                                    <button type="submit" name="role" value="user" class="btn-small">Пользователь</button>
                                </form>
                                <?php if ($user['id'] != $current_user['id']): ?>
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="action" value="delete_user">
                                    <input type="hidden" name="user_id" value="<?php echo $user['id']; ?>">
                                    <button type="submit" class="btn-small" onclick="return confirm('Вы уверены, что хотите удалить этого пользователя?')">Удалить</button>
                                </form>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Модальное окно админ-панели (для AJAX-режима) -->
    <div id="adminModal" class="auth-modal">
        <div class="admin-dialog">
            <button class="close-btn" onclick="closeAdminModal()">×</button>
            <div class="admin-header">
                <h2>Панель администратора</h2>
                <div class="admin-stats">Всего пользователей: <span id="totalUsers">0</span></div>
            </div>
            <div class="admin-content">
                <div id="adminMessage" class="admin-message" style="display: none;"></div>
                <table class="users-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Логин</th>
                            <th>Имя</th>
                            <th>Фамилия</th>
                            <th>Текущие роли</th>
                            <th>Дата регистрации</th>
                            <th>Управление ролями</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody id="adminUsersTable">
                        <!-- Данные будут загружены через AJAX -->
                    </tbody>
                </table>
                <div id="adminLoading" class="admin-loading">
                    <div class="loading-spinner"></div>
                    <p>Загрузка данных...</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Скрипты -->
    <script src="../js/gigascript.js"></script>
    <script>
        // Функция для открытия модального окна
        function openAdminModal() {
            const modal = document.getElementById('adminModal');
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            loadAdminData();
        }

        // Функция для закрытия модального окна
        function closeAdminModal() {
            const modal = document.getElementById('adminModal');
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }

        // Загрузка данных для админ панели
        async function loadAdminData() {
            const tableBody = document.getElementById('adminUsersTable');
            const loading = document.getElementById('adminLoading');
            const totalUsers = document.getElementById('totalUsers');
            tableBody.innerHTML = '';
            loading.style.display = 'block';
            try {
                const response = await fetch('php/admin_ajax.php?action=get_users');
                const data = await response.json();
                if (data.status === 'success') {
                    renderUsersTable(data.users);
                    totalUsers.textContent = data.users.length;
                } else {
                    showAdminMessage('Ошибка загрузки данных: ' + data.message, 'error');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                showAdminMessage('Ошибка соединения с сервером', 'error');
            } finally {
                loading.style.display = 'none';
            }
        }

        // Рендер таблицы пользователей
        function renderUsersTable(users) {
            const tableBody = document.getElementById('adminUsersTable');
            if (users.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                            Пользователи не найдены
                        </td>
                    </tr>
                `;
                return;
            }
            tableBody.innerHTML = users.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${escapeHtml(user.login)}</td>
                    <td>${escapeHtml(user.name || '')}</td>
                    <td>${escapeHtml(user.surname || '')}</td>
                    <td>
                        ${user.roles ? user.roles.split(',').map(role => `
                            <span class="role-badge role-${role}">${role}</span>
                        `).join('') : '<span style="color: rgba(255,255,255,0.5);">нет ролей</span>'}
                    </td>
                    <td>${formatDate(user.created_at)}</td>
                    <td>
                        <div class="role-controls">
                            <div class="role-section">
                                <span class="role-section-label">Назначить роль:</span>
                                <button class="role-btn add" onclick="adminAssignRole(${user.id}, 'admin')" ${user.roles && user.roles.includes('admin') ? 'disabled' : ''}>
                                    + Админ
                                </button>
                                <button class="role-btn add" onclick="adminAssignRole(${user.id}, 'nko')" ${user.roles && user.roles.includes('nko') ? 'disabled' : ''}>
                                    + НКО
                                </button>
                                <button class="role-btn add" onclick="adminAssignRole(${user.id}, 'user')" ${user.roles && user.roles.includes('user') ? 'disabled' : ''}>
                                    + Пользователь
                                </button>
                            </div>
                            <div class="role-section">
                                <span class="role-section-label">Убрать роль:</span>
                                <button class="role-btn remove" onclick="adminRemoveRole(${user.id}, 'admin')" ${user.roles && user.roles.includes('admin') ? '' : 'disabled'}>
                                    - Админ
                                </button>
                                <button class="role-btn remove" onclick="adminRemoveRole(${user.id}, 'nko')" ${user.roles && user.roles.includes('nko') ? '' : 'disabled'}>
                                    - НКО
                                </button>
                                <button class="role-btn remove" onclick="adminRemoveRole(${user.id}, 'user')" ${user.roles && user.roles.includes('user') ? '' : 'disabled'}>
                                    - Пользователь
                                </button>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="admin-actions">
                            <button class="delete-btn" onclick="adminDeleteUser(${user.id})" ${user.is_current ? 'disabled' : ''}>
                                Удалить
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // Вспомогательные функции
        function showAdminMessage(message, type) {
            const messageEl = document.getElementById('adminMessage');
            messageEl.textContent = message;
            messageEl.className = `admin-message ${type}`;
            messageEl.style.display = 'block';
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        }

        function escapeHtml(unsafe) {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "<")
                .replace(/>/g, ">")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Функции управления ролями
        async function adminAssignRole(userId, role) {
            if (!confirm(`Назначить роль "${role}" пользователю?`)) return;
            try {
                const response = await fetch('php/admin_ajax.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `action=assign_role&user_id=${userId}&role=${role}`
                });
                const data = await response.json();
                if (data.status === 'success') {
                    showAdminMessage(data.message, 'success');
                    loadAdminData(); // Перезагружаем данные
                } else {
                    showAdminMessage(data.message, 'error');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                showAdminMessage('Ошибка соединения с сервером', 'error');
            }
        }

        async function adminRemoveRole(userId, role) {
            if (!confirm(`Убрать роль "${role}" у пользователя?`)) return;
            try {
                const response = await fetch('php/admin_ajax.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `action=remove_role&user_id=${userId}&role=${role}`
                });
                const data = await response.json();
                if (data.status === 'success') {
                    showAdminMessage(data.message, 'success');
                    loadAdminData(); // Перезагружаем данные
                } else {
                    showAdminMessage(data.message, 'error');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                showAdminMessage('Ошибка соединения с сервером', 'error');
            }
        }

        async function adminDeleteUser(userId) {
            if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
            try {
                const response = await fetch('php/admin_ajax.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `action=delete_user&user_id=${userId}`
                });
                const data = await response.json();
                if (data.status === 'success') {
                    showAdminMessage(data.message, 'success');
                    loadAdminData(); // Перезагружаем данные
                } else {
                    showAdminMessage(data.message, 'error');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                showAdminMessage('Ошибка соединения с сервером', 'error');
            }
        }

        // Обработчик клика по кнопке "Админ панель"
        document.addEventListener('DOMContentLoaded', function() {
            const adminBtn = document.querySelector('.admin-btn');
            if (adminBtn) {
                adminBtn.addEventListener('click', openAdminModal);
            }
        });

        // Обработчик закрытия по ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const modal = document.getElementById('adminModal');
                if (modal && modal.classList.contains('show')) {
                    closeAdminModal();
                }
            }
        });
    </script>
</body>
</html>