<?php
session_start();
include 'db.php';

function checkAuth() {
    global $conn;
    
    // Если сессия уже установлена
    if (isset($_SESSION['user']['id'])) {
        return $_SESSION['user'];
    }
    
    // Если есть кука auth_key, восстанавливаем сессию
    if (isset($_COOKIE['auth_key']) && !empty($_COOKIE['auth_key'])) {
        $auth_key = $_COOKIE['auth_key'];
        
        $stmt = $conn->prepare("SELECT id, login, name, surname FROM users WHERE auth_key = ?");
        $stmt->bind_param("s", $auth_key);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($user = $result->fetch_assoc()) {
            // Восстанавливаем сессию
            $_SESSION['user'] = [
                'id' => $user['id'],
                'login' => $user['login'],
                'name' => $user['name'],
                'surname' => $user['surname']
            ];
            
            $stmt->close();
            return $_SESSION['user'];
        }
        
        $stmt->close();
    }
    
    return false;
}

// Проверяем авторизацию при каждом запросе
$current_user = checkAuth();
?>