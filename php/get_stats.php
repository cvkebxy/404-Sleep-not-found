<?php
session_start();
include 'functions.php'; // Подключаем functions.php где все функции уже есть
header('Content-Type: application/json');

// Получаем статистику используя функции из functions.php
$stats = get_all_stats();

echo json_encode(['success' => true, 'stats' => $stats]);
?>