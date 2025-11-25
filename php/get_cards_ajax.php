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

$nko_data = null;

if ($is_logged_in) {
    $stmt_nko = $conn->prepare("SELECT status FROM nko_organizations WHERE user_id = ?");
    $stmt_nko->bind_param("i", $user_id);
    $stmt_nko->execute();
    $result_nko = $stmt_nko->get_result();
    $nko_data = $result_nko->fetch_assoc();
    $stmt_nko->close();
}

// Формируем HTML
ob_start();
?>

<!-- Вся структура должна быть такой же как в index.php -->
<div class="projects-header">
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
                <?php 
                $can_delete = $is_logged_in && 
                             (is_admin($user_id) || 
                              (is_nko($user_id) && $card['created_by'] == $user_id));
                if ($can_delete): 
                ?>
                <button class="delete-card-btn" title="Удалить проект" data-card-id="<?php echo $card['id']; ?>">
                    ×
                </button>
                <?php endif; ?>

                <div class="project-card-content">
                    <div class="project-badges">
                        <?php if (!empty($card['status'])): ?>
                            <span class="badge badge-urgent"><?php echo htmlspecialchars($card['status']); ?></span>
                        <?php endif; ?>
                        <?php if ($card['type'] === 'СОЦ.ПРОЕКТ'): ?>
                            <span class="badge badge-social">Социальный</span>
                        <?php elseif ($card['type'] === 'ЭКОЛОГИЯ'): ?>
                            <span class="badge badge-ecology">Экология</span>
                        <?php elseif ($card['type'] === 'ЖИВОТНЫЕ'): ?>
                            <span class="badge badge-animals">Животные</span>
                        <?php endif; ?>
                    </div>

                    <h3 class="project-title"><?php echo htmlspecialchars($card['header']); ?></h3>
                    <div class="project-location"><?php echo htmlspecialchars($card['location']); ?></div>
                    <p class="project-description"><?php echo htmlspecialchars($card['main_text']); ?></p>

                    <div class="project-meta">
                        <div class="meta-item">
                            <span class="participants-count"><?php echo $card['current_participants']; ?>/<?php echo $card['max_participants']; ?> участников</span>
                        </div>
                        <div class="meta-item">
                            <span><?php echo htmlspecialchars($card['date']); ?></span>
                        </div>
                    </div>

                    <div class="project-footer">
                        <div class="project-org">
                            <?php if (!empty($card['nko_name'])): ?>
                                <?php 
                                // Получаем первую ссылку из social_links или используем website
                                $nko_link = '';
                                if (!empty($card['nko_website'])) {
                                    $nko_link = $card['nko_website'];
                                } elseif (!empty($card['nko_social_links'])) {
                                    $links = explode(',', $card['nko_social_links']);
                                    $nko_link = trim($links[0]);
                                }
                                ?>

                                <?php if (!empty($nko_link)): ?>
                                    <a href="<?php echo htmlspecialchars($nko_link); ?>" 
                                       target="_blank" 
                                       class="nko-link"
                                       onclick="event.stopPropagation();">
                                        <?php echo htmlspecialchars($card['nko_name']); ?>
                                    </a>
                                <?php else: ?>
                                    <span class="nko-name">
                                        <?php echo htmlspecialchars($card['nko_name']); ?>
                                    </span>
                                <?php endif; ?>
                            <?php else: ?>
                                <span class="project-org-text">
                                    <?php echo htmlspecialchars($card['sub_text']); ?>
                                </span>
                            <?php endif; ?>
                        </div>

                        <?php if ($is_logged_in): ?>
                            <button class="btn-help" 
                                    data-card-id="<?php echo $card['id']; ?>"
                                    <?php if ($card['is_joined'] > 0) echo 'disabled'; ?>>
                                <?php echo $card['is_joined'] > 0 ? 'Вы участвуете' : 'Помочь'; ?>
                            </button>
                        <?php else: ?>
                            <button class="btn-help" onclick="openAuthModal()">
                                Войти чтобы помочь
                            </button>
                        <?php endif; ?>
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
    <!-- Кнопка для добавления проекта НКО -->
    <div style="text-align: center; margin: 20px 0 30px 0;">
        <?php if ($is_logged_in): ?>
            <?php if (is_nko($user_id)): ?>
                <!-- Роль НКО выдана -> можно добавлять проект -->
                <button class="btn-primary" onclick="openCreateCardModal()">Добавить свой проект</button>
            <?php elseif ($nko_data && $nko_data['status'] === 'pending'): ?>
                <!-- НКО подана, но ещё не одобрена -->
                <button class="btn-primary disabled-nko" disabled>Данные НКО на модерации</button>
            <?php else: ?>
                <!-- НКО нет, можно открыть форму регистрации -->
                <p style="color: rgba(255,255,255,0.8); font-size: 16px; margin-bottom: 10px;">Хотите добавить свой проект?</p>
                <button class="btn-primary" onclick="openNkoRegistration()">Зарегистрировать НКО</button>
            <?php endif; ?>
        <?php endif; ?>
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