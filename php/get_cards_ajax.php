<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();

include 'db.php';
include 'functions.php';

// Получаем параметры
$card_page = isset($_GET['card_page']) ? max(1, (int)$_GET['card_page']) : 1;
$cards_per_page = 6;
$offset = ($card_page - 1) * $cards_per_page;

// Получаем карточки
$cards = get_cards($offset, $cards_per_page);
$total_cards = get_total_cards();
$total_pages = ceil($total_cards / $cards_per_page);

// Проверяем авторизацию
$is_logged_in = false;
$user_id = '';

if (isset($_COOKIE['auth_key'])) {
    $auth_key = $_COOKIE['auth_key'];
    $stmt = $conn->prepare("SELECT id FROM users WHERE auth_key = ?");
    $stmt->bind_param("s", $auth_key);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($user = $result->fetch_assoc()) {
        $is_logged_in = true;
        $user_id = $user['id'];
    }
    $stmt->close();
}

// Формируем HTML
ob_start();
?>

<div class="projects-header" data-total-pages="<?php echo $total_pages; ?>">
    <h2 class="section-title">АКТУАЛЬНЫЕ ПРОЕКТЫ</h2>
    <div class="pagination-controls">
        <?php if ($card_page > 1): ?>
            <button class="btn-text prev-btn">← Назад</button>
        <?php endif; ?>
        <?php if ($card_page < $total_pages): ?>
            <button class="btn-text next-btn">Вперед →</button>
        <?php endif; ?>
    </div>
</div>

<div class="projects-grid" id="projectsGrid">
    <?php if (empty($cards)): ?>
        <div class="no-cards-message">
            <p>Проекты временно отсутствуют. Зайдите позже!</p>
        </div>
    <?php else: ?>
        <?php foreach ($cards as $card): ?>
            <div class="project-card" data-card-id="<?php echo $card['id']; ?>">
                <?php if ($is_logged_in && can_delete_card($user_id, $card['id'])): ?>
                    <button class="delete-card-btn" title="Удалить карточку" data-card-id="<?php echo $card['id']; ?>">
                        ×
                    </button>
                <?php endif; ?>
                
                <div class="project-card-content">
                    <div class="project-badges">
                        <?php if (!empty($card['status'])): ?>
                            <span class="badge badge-urgent"><?php echo htmlspecialchars($card['status']); ?></span>
                        <?php endif; ?>
                        <?php
                        $type_class = '';
                        switch (strtolower($card['type'])) {
                            case 'соц.проект':
                            case 'социальные проекты':
                                $type_class = 'badge-social';
                                break;
                            case 'экология':
                            case 'экологические проекты':
                                $type_class = 'badge-ecology';
                                break;
                            case 'животные':
                                $type_class = 'badge-animals';
                                break;
                            default:
                                $type_class = 'badge-social';
                        }
                        ?>
                        <span class="badge <?php echo $type_class; ?>">
                            <?php echo htmlspecialchars($card['type']); ?>
                        </span>
                    </div>
                    <h3 class="project-title"><?php echo htmlspecialchars($card['header']); ?></h3>
                    <p class="project-location"><?php echo htmlspecialchars($card['location']); ?></p>
                    <p class="project-description"><?php echo htmlspecialchars($card['main_text']); ?></p>
                    <div class="project-meta">
                        <div class="meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <span class="participants-count"><?php echo $card['current_participants'] . '/' . $card['max_participants']; ?> участников</span>
                        </div>
                        <div class="meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span><?php echo htmlspecialchars($card['date']); ?></span>
                        </div>
                    </div>
                    <div class="project-footer">
                        <span class="project-org"><?php echo htmlspecialchars($card['sub_text']); ?></span>
                        <button class="btn-help" 
                                data-card-id="<?php echo $card['id']; ?>"
                                <?php echo ($is_logged_in && is_user_joined($card['id'], $user_id)) ? 'disabled' : ''; ?>>
                            <?php echo ($is_logged_in && is_user_joined($card['id'], $user_id)) ? 'Вы участвуете' : 'Помочь'; ?>
                        </button>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>

<?php if ($total_pages > 1): ?>
    <div class="pagination" id="paginationBottom">
        <?php for ($i = 1; $i <= $total_pages; $i++): ?>
            <button class="pagination-btn <?php echo $i == $card_page ? 'active' : ''; ?>">
                <?php echo $i; ?>
            </button>
        <?php endfor; ?>
    </div>
<?php endif; ?>

<?php
$html = ob_get_clean();

echo json_encode([
    'success' => true,
    'html' => $html,
    'current_page' => $card_page,
    'total_pages' => $total_pages
]);
?>