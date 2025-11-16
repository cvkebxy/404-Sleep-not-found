<?php
include '../php/db.php';
include '../php/functions.php';
session_start();

// Проверяем авторизацию и права администратора
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

// Обработка действий
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'assign_role':
            $user_id = $_POST['user_id'];
            $role = $_POST['role'];
            
            if (assign_role($user_id, $role)) {
                $_SESSION['success_message'] = "Роль успешно назначена";
            } else {
                $_SESSION['error_message'] = "Ошибка назначения роли";
            }
            break;
            
        case 'remove_role':
            $user_id = $_POST['user_id'];
            $role = $_POST['role'];
            
            if (remove_role($user_id, $role)) {
                $_SESSION['success_message'] = "Роль успешно удалена";
            } else {
                $_SESSION['error_message'] = "Ошибка удаления роли";
            }
            break;
            
        case 'delete_user':
            $user_id = $_POST['user_id'];
            
            // Не позволяем удалить самого себя
            if ($user_id == $current_user['id']) {
                $_SESSION['error_message'] = "Нельзя удалить свой аккаунт";
            } else if (delete_user($user_id)) {
                $_SESSION['success_message'] = "Пользователь успешно удален";
            } else {
                $_SESSION['error_message'] = "Ошибка удаления пользователя";
            }
            break;
    }
    
    header("Location: admin_panel.php");
    exit;
}

$users = get_all_users_with_roles();
?>

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Панель администратора - Карта добрых дел Росатома</title>
    <link rel="stylesheet" href="../styles/main.css">
    <link rel="stylesheet" href="../styles/components/buttons.css">
    <link rel="stylesheet" href="../styles/components/modals.css">
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
        
        .users-table {
            width: 100%;
            border-collapse: collapse;
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            overflow: hidden;
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
        }
        
        .role-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-right: 5px;
        }
        
        .role-admin { background: #ff6b6b; color: white; }
        .role-nko { background: #4ecdc4; color: white; }
        .role-user { background: #45b7d1; color: white; }
        
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
        
        .back-link {
            display: inline-block;
            margin-bottom: 20px;
            color: white;
            text-decoration: none;
        }
        
        .back-link:hover {
            text-decoration: underline;
        }
        
        .alert {
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        
        .alert-success {
            background: rgba(46, 204, 113, 0.2);
            color: #2ecc71;
            border: 1px solid #2ecc71;
        }
        
        .alert-error {
            background: rgba(231, 76, 60, 0.2);
            color: #e74c3c;
            border: 1px solid #e74c3c;
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
                            foreach ($roles as $role): 
                            ?>
                                <span class="role-badge role-<?php echo $role; ?>"><?php echo $role; ?></span>
                            <?php endforeach; ?>
                        </td>
                        <td><?php echo date('d.m.Y H:i', strtotime($user['created_at'])); ?></td>
                        <td class="action-buttons">
                            <!-- Назначение ролей -->
                            <form method="POST" style="display: inline;">
                                <input type="hidden" name="action" value="assign_role">
                                <input type="hidden" name="user_id" value="<?php echo $user['id']; ?>">
                                <button type="submit" name="role" value="admin" class="btn-small">Админ</button>
                                <button type="submit" name="role" value="nko" class="btn-small">НКО</button>
                                <button type="submit" name="role" value="user" class="btn-small">Пользователь</button>
                            </form>
                            
                            <!-- Удаление пользователя -->
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
</body>
</html>