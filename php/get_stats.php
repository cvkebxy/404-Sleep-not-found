<?php
include 'db.php';
include 'functions.php';
header('Content-Type: application/json');

$stats = get_all_stats();

echo json_encode([
    'success' => true,
    'stats' => $stats
]);
?>