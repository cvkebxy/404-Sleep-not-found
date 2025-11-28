<?php
session_start();
include 'db.php';

$token = $_GET['token'] ?? '';

// Проверяем токен
if (empty($token)) {
    die("Неверная ссылка для восстановления пароля");
}

// Проверяем токен в базе данных
$stmt = $conn->prepare("
    SELECT email, expires_at 
    FROM password_resets 
    WHERE token = ? AND expires_at > NOW()
");
$stmt->bind_param("s", $token);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    die("Ссылка для восстановления пароля недействительна или устарела");
}

$reset_data = $result->fetch_assoc();
$email = $reset_data['email'];
$stmt->close();

// Если форма отправлена
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $new_password = $_POST['new_password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';
    
    // Валидация
    if (empty($new_password) || empty($confirm_password)) {
        $error = "Все поля обязательны для заполнения";
    } elseif ($new_password !== $confirm_password) {
        $error = "Пароли не совпадают";
    } elseif (strlen($new_password) < 6) {
        $error = "Пароль должен содержать минимум 6 символов";
    } else {
        // Обновляем пароль
        $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
        
        $update_stmt = $conn->prepare("UPDATE users SET password = ? WHERE login = ?");
        $update_stmt->bind_param("ss", $hashed_password, $email);
        
        if ($update_stmt->execute()) {
            // Удаляем использованный токен
            $delete_stmt = $conn->prepare("DELETE FROM password_resets WHERE token = ?");
            $delete_stmt->bind_param("s", $token);
            $delete_stmt->execute();
            $delete_stmt->close();
            
            $success = "Пароль успешно изменен! Теперь вы можете войти в систему.";
        } else {
            $error = "Ошибка при обновлении пароля";
        }
        
        $update_stmt->close();
    }
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Восстановление пароля</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Roboto', sans-serif;
            background: linear-gradient(180deg, #259789 0%, #6CACE4 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .reset-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            padding: 40px;
            max-width: 450px;
            width: 100%;
        }
        
        .reset-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .reset-header h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 24px;
        }
        
        .reset-header p {
            color: #666;
            font-size: 14px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 500;
        }
        
        .form-group input {
            width: 100%;
            padding: 12px 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            transition: border 0.3s ease;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #4a90e2;
            box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
        }
        
        .reset-btn { 
            width: 100%; 
            padding: 16px; 
            background: linear-gradient(90deg, #025EA1 0%, #025EA1 100%); 
            color: white; border: none; 
            border-radius: 12px; 
            font-family: 'Nexa', sans-serif; 
            font-size: 18px; 
            font-weight: 700; 
            cursor: pointer; 
            transition: all 0.3s ease; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
            position: relative; 
            overflow: hidden; 
            margin-top: 10px; 
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
                    
        .reset-btn::before { 
            content: ''; 
            position: absolute; 
            top: 0; 
            left: -100%; 
            width: 100%; 
            height: 100%; 
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); 
            transition: left 0.5s;
        }
                    
        .reset-btn:hover::before { 
            left: 100%;
        }
                    
        .reset-btn:hover { 
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3); 
            transform: translateY(-2px);
        }
                    
        .reset-btn:active { 
            transform: translateY(0);
        }
                    
        .reset-btn:disabled {
            background: #64748b; 
            cursor: not-allowed; 
            transform: none; 
            box-shadow: none;
        }
                    
        .reset-btn:disabled::before { 
            display: none;
        }
        
        .message {
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .login-link {
            text-align: center;
            margin-top: 20px;
        }
        
        .login-link a {
            color: #4a90e2;
            text-decoration: none;
        }
        
        .login-link a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="reset-container">
        <div class="reset-header">
            <h1>Создание нового пароля</h1>
            <p>Введите новый пароль для вашего аккаунта</p>
        </div>
        
        <?php if (isset($success)): ?>
            <div class="message success">
                <?php echo htmlspecialchars($success); ?>
            </div>
            <div class="login-link">
                <a href="/">Перейти к входу в систему</a>
            </div>
        <?php elseif (isset($error)): ?>
            <div class="message error">
                <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>
        
        <?php if (!isset($success)): ?>
        <form method="POST">
            <div class="form-group">
                <label for="new_password">Новый пароль</label>
                <input type="password" id="new_password" name="new_password" required minlength="6" placeholder="Введите новый пароль">
            </div>
            
            <div class="form-group">
                <label for="confirm_password">Подтвердите пароль</label>
                <input type="password" id="confirm_password" name="confirm_password" required minlength="6" placeholder="Повторите новый пароль">
            </div>
            
            <button type="submit" class="reset-btn">СОХРАНИТЬ НОВЫЙ ПАРОЛЬ</button>
        </form>
        
        <div class="login-link">
            <a href="/">Вернуться на главную</a>
        </div>
        <?php endif; ?>
    </div>
</body>
</html>