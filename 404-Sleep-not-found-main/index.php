<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
$page_title = "Карта добрых дел Росатома";
$current_page_name = "index"; 

// Подключение бд и функций
include 'php/db.php';
include 'php/functions.php';

// Проверяем авторизацию по cookie
$is_logged_in = false;
$username = '';
$user_id = '';

if (isset($_COOKIE['auth_key'])) {
    $auth_key = $_COOKIE['auth_key'];
    
    $stmt = $conn->prepare("SELECT id, login, name, surname FROM users WHERE auth_key = ?");
    $stmt->bind_param("s", $auth_key);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($user = $result->fetch_assoc()) {
        $is_logged_in = true;
        if ($user['login'] === 'admin') {
            $username = 'Администратор';
        } else {
            $username = $user['name'] ?: $user['login'];
        }
        $user_id = $user['id'];
    }
    $stmt->close();
}

// Получаем карточки для отображения
$card_page = isset($_GET['card_page']) ? max(1, (int)$_GET['card_page']) : 1; // переименовали переменную
$cards_per_page = 6;
$offset = ($card_page - 1) * $cards_per_page;

$cards = get_cards($offset, $cards_per_page);
$total_cards = get_total_cards();
$total_pages = ceil($total_cards / $cards_per_page);

// Проверяем сообщения из сессии
$success_message = $_SESSION['success_message'] ?? '';
$error_message = $_SESSION['error_message'] ?? '';

// Очищаем сообщения после использования
unset($_SESSION['success_message']);
unset($_SESSION['error_message']);
?>

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Карта добрых дел Росатома</title>
    <meta name="description" content="Платформа для объединения волонтёров и социальных проектов в городах присутствия Росатома. Найди возможность помочь рядом с собой.">
    
    <!-- Шрифты Nexa и Roboto -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link href="https://fonts-online.ru/fonts/nexa" rel="stylesheet">
    <script src="https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=92a819d3-a340-447d-b51b-1c9c5f963335" type="text/javascript"></script>
    <script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
    
    <!-- Основные стили -->
    <link rel="stylesheet" href="styles/gigamain.css">
    <link rel="stylesheet" href="styles/map.css">

</head>
<body class="accessibility-normal" data-logged-in="<?php echo $is_logged_in ? 'true' : 'false'; ?>" data-user-id="<?php echo $user_id; ?>">
    <!-- Хедер -->
    <header class="header">
        <div class="container">
            <div class="header-content">
                <!-- Логотип слева -->
                <div class="logo">
                    <div class="logo-icon">
                        <img src="img/logo.png" alt="РОСАТОМ" width="258.33" height="52">
                    </div>
                </div>

                <!-- Навигационное меню -->
                <nav class="nav">
                    <button class="nav-link" onclick="scrollToSection('hero')">ГЛАВНАЯ</button>
                    <button class="nav-link" onclick="scrollToSection('how-it-works')">КАК ПОМОЧЬ</button>
                    <button class="nav-link" onclick="scrollToSection('map-section')">КАРТА</button>
                    <button class="nav-link" onclick="scrollToSection('projects')">ПРОЕКТЫ</button>
                    <button class="accessibility-btn" id="accessibilityBtn" onclick="toggleAccessibilityMode()" title="Версия для слабовидящих">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M12 5C7 5 2.73 8.11 1 12.5c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5z"></path>
                        </svg>
                    </button>
                </nav>

                <!-- Блок пользователя и кнопка "Выйти" справа -->
                <div class="user-controls">
                    <?php if ($is_logged_in): ?>
                        <div class="user-info">
                            <!-- Кнопка профиля, которая выводит имя и фамилию -->
                            <button class="user-profile-btn" id="profileBtn" onclick="openProfileModal()">
                                <?php 
                                $display_name = '';
                                if (!empty($user['name']) && !empty($user['surname'])) {
                                    $display_name = $user['name'] . ' ' . $user['surname'];
                                } elseif (!empty($user['name'])) {
                                    $display_name = $user['name'];
                                } else {
                                    $display_name = $user['login'];
                                }
                                echo htmlspecialchars($display_name); 
                                ?>
                            </button>
                            <!-- Кнопка админ-панели (только для админов) -->
                            <?php if (is_admin($user_id)): ?>
                                <button class="btn-admin-panel" onclick="openAdminModal()">
                                    АДМИН ПАНЕЛЬ
                                </button>
                            <?php endif; ?>

                            <button class="btn-login" onclick="window.location.href='php/exit.php'">Выйти</button>
                        </div>
                    <?php else: ?>
                        <button class="btn-register" id="registerBtn" onclick="openRegisterModal()">РЕГИСТРАЦИЯ</button>
                        <button class="btn-login" id="loginBtn" onclick="openAuthModal()">ВОЙТИ</button>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </header>

    <!-- Панелька доступности -->
    <div id="accessibilityPanel" class="accessibility-panel">
        <div class="accessibility-header">
            <h3>Версия для слабовидящих</h3>
            <button class="close-panel" id="closeAccessibilityPanel" onclick="toggleAccessibilityMode()">×</button>
        </div>
        <div class="accessibility-controls">
            <div class="control-group">
                <label>Размер текста:</label>
                <div class="size-controls">
                    <button onclick="changeFontSize('smaller')">A-</button>
                    <button onclick="changeFontSize('normal')">A</button>
                    <button onclick="changeFontSize('larger')">A+</button>
                </div>
            </div>
            <div class="control-group">
                <label>Цветовая схема:</label>
                <div class="color-schemes">
                    <button class="scheme-btn" data-scheme="normal" onclick="changeColorScheme('normal')">Обычная</button>
                    <button class="scheme-btn" data-scheme="contrast" onclick="changeColorScheme('contrast')">Контрастная</button>
                    <button class="scheme-btn" data-scheme="dark" onclick="changeColorScheme('dark')">Тёмная</button>
                </div>
            </div>
            <div class="control-group">
                <label>Межстрочный интервал:</label>
                <div class="spacing-controls">
                    <button onclick="changeLineHeight('normal')">Обычный</button>
                    <button onclick="changeLineHeight('large')">Увеличенный</button>
                </div>
            </div>
            <div class="control-group">
                <label>Шрифт:</label>
                <div class="font-controls">
                    <button onclick="changeFontFamily('standard')">Стандартный</button>
                    <button onclick="changeFontFamily('dyslexic')">Для дислексии</button>
                </div>
            </div>
            <button class="reset-btn" onclick="resetAccessibilitySettings()">Сбросить настройки</button>
        </div>
    </div>

    <!-- Мэин -->
    <main class="main-content">
        <div class="background-line">
            <img src="img/Vector%204.svg" alt="Фоновая линия" class="svg-background">
        </div>
        
        <!-- Начальная секция, первый блок на странице -->
        <section id="hero" class="hero">
            <div class="container hero-container">
                <div class="hero-content">
                    <h1 class="hero-title">
                        КАРТА ДОБРЫХ ДЕЛ<br>РОСАТОМА
                    </h1>
                    <p class="hero-subtitle">
                        НАЙДИ ВОЗМОЖНОСТЬ ПОМОЧЬ РЯДОМ С СОБОЙ.<br>
                        ИССЛЕДУЙ КАРТУ, ВЫБИРАЙ ПРОЕКТЫ И ПРИСОЕДИНЯЙСЯ<br>
                        К ДОБРЫМ ДЕЛАМ!
                    </p>
                </div>


                <?php
                $stats = [
                    'cities' => get_cities_count(),
                    'nko' => get_nko_count(), 
                    'projects' => get_projects_count(),
                    'volunteers' => get_volunteers_count()
                ];
                ?>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number"><?php echo $stats['cities']; ?></div>
                        <div class="stat-label">Города присутствия<br>Росатома</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number"><?php echo $stats['nko']; ?></div>
                        <div class="stat-label">Некоммерческих организаций</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number"><?php echo $stats['projects']; ?></div>
                        <div class="stat-label">Проектов</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number"><?php echo $stats['volunteers']; ?></div>
                        <div class="stat-label">Волонтёра</div>
                    </div>
                </div>

                <button class="btn-primary" onclick="scrollToSection('map-section')">Карта</button>
            </div>
        </section>
        
        <!-- Секция пояснялка -->
        <section id="how-it-works" class="how-it-works">
            <div class="container">
                <div class="section-header">
                    <h2 class="section-title">КАК ЭТО РАБОТАЕТ</h2>
                    <div class="steps-count">3 ШАГА ДО ДОБРОГО ДЕЛА</div>
                </div>

                <div class="steps-container">
                    <div class="step-card">
                        <img src="img/icon1.png" alt="Иконка поиска" class="icon-image">
                        <div class="step-icon">
                        </div>
                        <div class="step-card-content">
                            <h3 class="step-title">НАЙДИ ПРОЕКТ</h3>
                            <p class="step-description">
                                Выбери проект на карте<br>
                                или в каталоге по интересам<br>
                                и городу
                            </p>
                        </div>
                    </div>

                    <div class="arrow-icon">→</div>

                    <div class="step-card">
                        <img src="img/icon2.png" alt="Иконка отклика" class="icon-image">
                        <div class="step-icon">
                        </div>
                        <div class="step-card-content">
                            <h3 class="step-title">ОТКЛИКНИСЬ</h3>
                            <p class="step-description">
                                Заполни короткую форму<br>
                                или свяжись<br>
                                с организаторами
                            </p>
                        </div>
                    </div>

                    <div class="arrow-icon">→</div>

                    <div class="step-card">
                        <img src="img/icon3.png" alt="Иконка помощи" class="icon-image">
                        <div class="step-icon">
                        </div>
                        <div class="step-card-content">
                            <h3 class="step-title">ПОМОГИ</h3>
                            <p class="step-description">
                                Участвуй в проекте и<br>
                                получай благодарности<br>
                                и достижения
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Интерактивная карта -->
        <section id="map-section" class="map-section">
            <div class="container">
                <div class="map-header">
                    <h2 class="section-title">ИНТЕРАКТИВНАЯ КАРТА</h2>
                </div>

                <div class="map-wrapper">
                    <div class="sidebar" id="custom-filters">
                        <div class="sidebar-header">
                            <span class="header-title">ФИЛЬТРЫ</span>
                            <div id="sidebar-toggle" class="toggle-btn">
                                <svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8.5 1L1.5 8L8.5 15" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                        </div>

                        <div id="filter-list" class="filter-list">
                            <!-- Фильтры генерируются через JavaScript -->
                        </div>
                    </div>

                    <div id="map" class="map-container">
                        <!-- Кнопка полноэкранного режима добавится через JavaScript -->
                    </div>
                </div>
            </div>
        </section>

        <!-- Модальное окно для детальной информации -->
        <div id="details-modal" class="modal-overlay">
            <div class="modal-content">
                <span class="modal-close">&times;</span>
                <h2 id="modal-org-name"></h2>
                <h3 id="modal-title"></h3>
                <div id="modal-social-link" class="modal-link-container"></div>
                <div class="modal-description-full">
                    <p id="modal-description"></p>
                </div>
            </div>
        </div>

        <!-- Секция поиска -->
        <section class="search-section">
            <div class="container">
                <div class="search-content">
                    <h2 class="section-title">НАЙДИ ПРОЕКТ РЯДОМ С СОБОЙ</h2>
                    <p class="search-subtitle">Введите название города или ключевое слово для поиска подходящего проекта</p>
                </div>

                <div class="search-form">
                    <div class="search-main">
                        <input type="text" placeholder="Например: Саров, помощь детям, экология..." class="search-input-large">
                        <svg class="search-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                    </div>

                    <div class="search-filters">
                        <!-- Категории проектов -->
                        <div class="category-dropdown">
                            <button class="category-toggle" onclick="toggleCategoryDropdown('categories')">
                                <span>Все категории</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                            <div class="category-dropdown-menu" id="categories-dropdown">
                                <div class="category-item" onmouseenter="showSubcategories('social', 'categories')">
                                    <span>Социальные проекты</span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>

                                    <div class="subcategory-menu" id="social-subcategories">
                                        <div class="subcategory-item" onclick="selectSubcategory('social', 'children', 'categories')">
                                            Помощь детям
                                        </div>
                                        <div class="subcategory-item" onclick="selectSubcategory('social', 'elderly', 'categories')">
                                            Помощь пожилым
                                        </div>
                                    </div>
                                </div>

                                <div class="category-item" onmouseenter="showSubcategories('ecology', 'categories')">
                                    <span>Экологические проекты</span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>

                                    <div class="subcategory-menu" id="ecology-subcategories">
                                        <div class="subcategory-item" onclick="selectSubcategory('ecology', 'cleanup', 'categories')">
                                            Уборка территорий
                                        </div>
                                        <div class="subcategory-item" onclick="selectSubcategory('ecology', 'planting', 'categories')">
                                            Озеленение
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Тип помощи -->
                        <div class="category-dropdown">
                            <button class="category-toggle" onclick="toggleCategoryDropdown('help-type')">
                                <span>Тип помощи</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                            <div class="category-dropdown-menu" id="help-type-dropdown">
                                <div class="category-item" onclick="selectSubcategory('volunteering', 'all', 'help-type')">
                                    <span>Волонтёрство</span>
                                </div>

                                <div class="category-item" onclick="selectSubcategory('donations', 'all', 'help-type')">
                                    <span>Пожертвования</span>
                                </div>

                                <div class="category-item" onclick="selectSubcategory('mentoring', 'all', 'help-type')">
                                    <span>Наставничество</span>
                                </div>
                            </div>
                        </div>

                        <!-- Формат участия -->
                        <div class="category-dropdown">
                            <button class="category-toggle" onclick="toggleCategoryDropdown('participation')">
                                <span>Формат участия</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                            <div class="category-dropdown-menu" id="participation-dropdown">
                                <div class="category-item" onclick="selectSubcategory('online', 'all', 'participation')">
                                    <span>Онлайн</span>
                                </div>

                                <div class="category-item" onclick="selectSubcategory('offline', 'all', 'participation')">
                                    <span>Офлайн</span>
                                </div>

                                <div class="category-item" onclick="selectSubcategory('hybrid', 'all', 'participation')">
                                    <span>Гибрид</span>
                                </div>
                            </div>
                        </div>

                        <!-- Регулярность -->
                        <div class="category-dropdown">
                            <button class="category-toggle" onclick="toggleCategoryDropdown('regularity')">
                                <span>Регулярность</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                            <div class="category-dropdown-menu" id="regularity-dropdown">
                                <div class="category-item" onclick="selectSubcategory('regular', 'all', 'regularity')">
                                    <span>Регулярная помощь</span>
                                </div>

                                <div class="category-item" onclick="selectSubcategory('one-time', 'all', 'regularity')">
                                    <span>Разовое участие</span>
                                </div>

                                <div class="category-item" onclick="selectSubcategory('ongoing', 'all', 'regularity')">
                                    <span>Постоянная поддержка</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Секция проектов -->
        <section id="projects" class="projects-section">
            <div class="container">
                <div id="projectsContainer">
                    <div class="projects-header">
                        <h2 class="section-title">АКТУАЛЬНЫЕ ПРОЕКТЫ</h2>
                        <div class="pagination-controls">
                            <?php if ($card_page > 1) { ?>
                                <button class="btn-text prev-btn">← Назад</button>
                            <?php } ?>
                            <?php if ($card_page < $total_pages) { ?>
                                <button class="btn-text next-btn">Вперед →</button>
                            <?php } ?>
                        </div>
                    </div>

                    <div class="projects-grid" id="projectsGrid">
                        <?php if (empty($cards)) { ?>
                            <div class="no-cards-message">
                                <p>Проекты временно отсутствуют. Зайдите позже!</p>
                            </div>
                        <?php } else { ?>
                            <?php foreach ($cards as $card) { ?>
                                <div class="project-card" data-card-id="<?php echo $card['id']; ?>">
                                    <?php 
                                    $can_delete = $is_logged_in && 
                                                 (is_admin($user_id) || 
                                                  (is_nko($user_id) && $card['created_by'] == $user_id));
                                    if ($can_delete) { 
                                    ?>
                                    <button class="delete-card-btn" title="Удалить проект" data-card-id="<?php echo $card['id']; ?>">
                                        ×
                                    </button>
                                    <?php } ?>

                                    <div class="project-card-content">
                                        <div class="project-badges">
                                            <?php if (!empty($card['status'])) { ?>
                                                <span class="badge badge-urgent"><?php echo htmlspecialchars($card['status']); ?></span>
                                            <?php } ?>
                                            <?php if ($card['type'] === 'СОЦ.ПРОЕКТ') { ?>
                                                <span class="badge badge-social">Социальный</span>
                                            <?php } elseif ($card['type'] === 'ЭКОЛОГИЯ') { ?>
                                                <span class="badge badge-ecology">Экология</span>
                                            <?php } elseif ($card['type'] === 'ЖИВОТНЫЕ') { ?>
                                                <span class="badge badge-animals">Животные</span>
                                            <?php } ?>
                                        </div>

                                        <h3 class="project-title"><?php echo htmlspecialchars($card['header']); ?></h3>
                                        <div class="project-location"><?php echo htmlspecialchars($card['location']); ?></div>
                                        <p class="project-description"><?php echo htmlspecialchars($card['main_text']); ?></p>

                                        <div class="project-meta">
                                            <div class="meta-item">
                                                <span><?php echo $card['current_participants']; ?>/<?php echo $card['max_participants']; ?></span>
                                            </div>
                                            <div class="meta-item">
                                                <span><?php echo htmlspecialchars($card['date']); ?></span>
                                            </div>
                                        </div>

                                        <div class="project-footer">
                                            <div class="project-org">
                                                <?php if (!empty($card['nko_name'])): ?>
                                                    <?php 
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

                                            <?php if ($is_logged_in) { ?>
                                                <button class="btn-help" 
                                                        data-card-id="<?php echo $card['id']; ?>"
                                                        <?php if ($card['is_joined'] > 0) echo 'disabled'; ?>>
                                                    <?php echo $card['is_joined'] > 0 ? 'Вы участвуете' : 'Помочь'; ?>
                                                </button>
                                            <?php } else { ?>
                                                <button class="btn-help" onclick="openAuthModal()">
                                                    Войти чтобы помочь
                                                </button>
                                            <?php } ?>
                                        </div>
                                    </div>
                                </div>
                            <?php } ?>
                        <?php } ?>
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
                            <?php if (is_nko($user_id)): ?>
                                <button class="btn-primary" onclick="openCreateCardModal()">Добавить свой проект</button>
                            <?php else: ?>
                                <p style="color: rgba(255,255,255,0.8); font-size: 16px; margin-bottom: 10px;">Хотите добавить свой проект?</p>
                                <button class="btn-primary" onclick="openNkoRegistration()">Зарегистрировать НКО</button>
                            <?php endif; ?>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </section>
        
        
        <!-- Секция новостей -->
        <section id="news" class="news-section">
            <div class="container">
                <div class="section-header">
                    <h2 class="section-title">НОВОСТИ</h2>
                </div>

                <div class="news-grid">
                    <!-- Новость 1 -->
                    <div class="news-card">
                        <div class="news-image">
                            <img src="img/news1.jpg" alt="Обучающий курс по устойчивому развитию">
                        </div>
                        <div class="news-content">
                            <h3 class="news-title">Обучающий курс «Устойчивое развитие. Успешный бизнес по новым требованиям»</h3>
                            <p class="news-date">15 декабря 2024</p>
                            <p class="news-description">
                                Новый обучающий курс для предпринимателей и руководителей, 
                                посвященный внедрению принципов устойчивого развития в бизнес-процессы.
                            </p>
                            <a href="#" class="news-link">Подробнее →</a>
                        </div>
                    </div>

                    <!-- Новость 2 -->
                    <div class="news-card">
                        <div class="news-image">
                            <img src="img/news2.jpg" alt="ESG-реинжиниринг бизнес-процессов">
                        </div>
                        <div class="news-content">
                            <h3 class="news-title">ESG-реинжиниринг бизнес-процессов</h3>
                            <p class="news-date">10 декабря 2024</p>
                            <p class="news-description">
                                Практическое руководство по трансформации бизнес-процессов 
                                в соответствии с экологическими, социальными и управленческими стандартами.
                            </p>
                            <a href="#" class="news-link">Подробнее →</a>
                        </div>
                    </div>

                    <!-- Новость 3 -->
                    <div class="news-card">
                        <div class="news-image">
                            <img src="img/news3.jpg" alt="Календарь волонтерских акций">
                        </div>
                        <div class="news-content">
                            <h3 class="news-title">Календарь волонтерских акций</h3>
                            <p class="news-date">5 декабря 2024</p>
                            <p class="news-description">
                                Публикуем расписание волонтерских мероприятий на ближайшие месяцы. 
                                Присоединяйтесь к добрым делам в вашем городе!
                            </p>
                            <a href="#" class="news-link">Подробнее →</a>
                        </div>
                    </div>
                </div>

                <div class="news-footer">
                    <button class="btn-primary">Все новости</button>
                </div>
            </div>
        </section>
    </main>

    <!-- Footer -->
    <footer id="footer" class="footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-column">
                    <h3 class="footer-title">Карта добрых дел</h3>
                    <p class="footer-text">
                        Платформа для объединения<br>
                        волонтёров и социальных проектов<br>
                        в городах присутствия Росатома
                    </p>
                </div>

                <div class="footer-column">
                    <h3 class="footer-title">Проекты</h3>
                    <ul class="footer-links">
                        <button class="footer-link" onclick="scrollToSection('projects')">Все проекты</button>
                        <button class="footer-link" onclick="scrollToSection('projects')">Срочные</button>
                        <button class="footer-link">Онлайн-помощь</button>
                        <button class="footer-link">Для детей</button>
                        <button class="footer-link" onclick="scrollToSection('map-section')">НКО</button>
                    </ul>
                </div>

                <div class="footer-column">
                    <h3 class="footer-title">Помощь</h3>
                    <ul class="footer-links">
                        <button class="footer-link" onclick="openNkoRegistration()">Регистрация НКО</button>
                        <button class="footer-link">Документы</button>
                        <button class="footer-link">Помощь</button>
                        <button class="footer-link">Частые вопросы</button>
                    </ul>
                </div>

                <div class="footer-column">
                    <h3 class="footer-title">Контакты</h3>
                    <ul class="footer-links">
                        <button class="footer-link">Обратная связь</button>
                        <button class="footer-link">Политика
                            конфиденциальности</button>
                        <li>
                            <button class="accessibility-btn footer-accessibility-btn" id="footerAccessibilityBtn" onclick="toggleAccessibilityMode()" title="Версия для слабовидящих">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M12 5C7 5 2.73 8.11 1 12.5c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5z"></path>
                                </svg>
                                Версия для слабовидящих
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            <div class="footer-bottom">
                <p class="copyright">© 2025 404 Sleep Not Found. Проект Росатома и ВИТИ НИЯУ МИФИ</p>
                <img src="img/Cat2.png" class="footer-image">
            </div>
        </div>
    </footer>
    
    <!-- Модальное окно авторизации -->
    <div id="authModal" class="auth-modal">
        <div class="auth-dialog">
            <button class="close-dialog" onclick="closeAuthModal()">×</button>

            <!-- Форма входа -->
            <form id="loginForm" class="auth-form active" action="php/auth.php" method="POST">
                <h3>ВХОД</h3>

                <div class="form-group">
                    <label for="loginEmail">Логин (Email)</label>
                    <input type="text" id="loginEmail" name="login" required placeholder="Ваш логин">
                </div>
                <div class="form-group">
                    <label for="loginPassword">Пароль</label>
                    <input type="password" id="loginPassword" name="password" required placeholder="Ваш пароль">
                </div>
                <div class="form-group checkbox-group">
                    <input type="checkbox" id="rememberMe" name="remember">
                    <label for="rememberMe">Запомнить меня</label>
                </div>
                <button type="submit" class="auth-submit">ВОЙТИ</button>
                <p class="auth-switch">Нет аккаунта? <a href="#" onclick="openRegisterModal(); return false;">Зарегистрироваться</a></p>
            </form>
        </div>
    </div>

    <!-- Модальное окно регистрации -->
    <div id="regModal" class="auth-modal">
        <div class="auth-dialog large">
            <button class="close-dialog" onclick="closeRegModal()">×</button>

            <!-- Форма регистрации -->
            <form id="registerForm" class="auth-form active" method="POST">
                <h3>РЕГИСТРАЦИЯ</h3>

                <div class="form-group">
                    <label for="registerName">Имя</label>
                    <input type="text" id="registerName" name="name" required placeholder="Ваше имя">
                </div>
                <div class="form-group">
                    <label for="registerSurname">Фамилия</label>
                    <input type="text" id="registerSurname" name="surname" required placeholder="Ваша фамилия">
                </div>
                <div class="form-group">
                    <label for="registerEmail">Email</label>
                    <input type="email" id="registerEmail" name="email" required placeholder="Ваш email">
                </div>
                <div class="form-group">
                    <label for="registerPassword">Пароль</label>
                    <input type="password" id="registerPassword" name="password" required placeholder="Придумайте пароль" minlength="6">
                </div>
                <div class="form-group">
                    <label for="registerConfirm">Подтвердите пароль</label>
                    <input type="password" id="registerConfirm" name="confirm" required placeholder="Повторите пароль">
                </div>
                <button type="submit" class="auth-submit" name="doGo">ЗАРЕГИСТРИРОВАТЬСЯ</button>
                <p class="auth-switch">Уже есть аккаунт? <a href="#" onclick="openAuthModal(); return false;">Войти</a></p>
            </form>
        </div>
    </div>
    
    <!-- Модальное окно создания карточки -->
    <div id="createCardModal" class="auth-modal">
        <div class="auth-dialog large">
            <button class="close-dialog" onclick="closeCreateCardModal()">×</button>

            <div class="auth-tabs">
                <button class="tab-btn active">Создание проекта</button>
            </div>

            <form id="createCardForm" class="auth-form active">

                <!-- Контейнер с прокруткой ВНУТРИ формы -->
                <div class="form-scrollable">
                    <div class="form-group">
                        <label for="cardStatus">Статус</label>
                        <select id="cardStatus" name="status">
                            <option value="">Обычный</option>
                            <option value="СРОЧНО">СРОЧНО</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="cardType">Тип проекта</label>
                        <select id="cardType" name="type" required>
                            <option value="СОЦ.ПРОЕКТ">Социальный проект</option>
                            <option value="ЭКОЛОГИЯ">Экология</option>
                            <option value="ЖИВОТНЫЕ">Помощь животным</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="cardHeader">Заголовок</label>
                        <input type="text" id="cardHeader" name="header" required placeholder="Название проекта">
                    </div>

                    <div class="form-group">
                        <label for="cardLocation">Местоположение</label>
                        <input type="text" id="cardLocation" name="location" required placeholder="Город, область">
                    </div>

                    <div class="form-group">
                        <label for="cardMainText">Описание проекта</label>
                        <textarea id="cardMainText" name="main_text" required placeholder="Подробное описание проекта" rows="4"></textarea>
                    </div>

                    <div class="form-group">
                        <label for="cardMaxParticipants">Максимальное количество участников</label>
                        <input type="number" id="cardMaxParticipants" name="max_participants" required min="1" value="30">
                    </div>

                    <div class="form-group">
                        <label for="cardDate">Дата проведения</label>
                        <input type="text" id="cardDate" name="date" required placeholder="15.12.2025">
                    </div>

                    <input type="hidden" id="cardSubText" name="sub_text" value="">
                </div>

                <!-- Кнопка ВНЕ контейнера с прокруткой -->
                <button type="submit" class="auth-submit">Опубликовать проект</button>
            </form>
        </div>
    </div>
    
    <!-- Модальное окно профиля -->
    <div id="profileModal" class="auth-modal">
        <div class="auth-dialog fullscreen">
            <button class="close-dialog" onclick="closeProfileModal()">×</button>

            <div class="auth-tabs">
                <button class="tab-btn active" data-tab="profile">Профиль пользователя</button>
            </div>

            <!-- Основной контейнер с прокруткой -->
            <div class="profile-scrollable">
                <div class="profile-layout">
                    <!-- Левая колонка - форма профиля -->
                    <form id="profileForm" class="auth-form active profile-left-column">
                        <div class="profile-grid">
                            <!-- Основная информация -->
                            <div class="profile-section">
                                <h3>Основная информация</h3>
                                <div class="form-columns">
                                    <div class="form-group">
                                        <label for="profileName">Имя</label>
                                        <input type="text" id="profileName" name="name" required placeholder="Ваше имя">
                                    </div>
                                    <div class="form-group">
                                        <label for="profileSurname">Фамилия</label>
                                        <input type="text" id="profileSurname" name="surname" required placeholder="Ваша фамилия">
                                    </div>
                                    <div class="form-group full-width">
                                        <label for="profileEmail">Email</label>
                                        <input type="email" id="profileEmail" name="login" required placeholder="Ваш email" readonly style="background: rgba(255,255,255,0.1);">
                                        <small class="field-hint">Email нельзя изменить</small>
                                    </div>
                                </div>
                            </div>

                            <!-- Информация о НКО -->
                            <div class="profile-section" id="nkoProfileSection">
                                <div class="nko-section-header" onclick="toggleNkoSection()">
                                    <h3>Информация об НКО</h3>
                                    <div class="nko-toggle-icon">▼</div>
                                </div>

                                <div class="nko-section-content" id="nkoSectionContent" style="display: none;">
                                    <div id="profileNkoHint" class="nko-hint">
                                        <div class="hint-content">
                                            <strong>Вы ещё не зарегистрировали НКО</strong>
                                            <p>Заполните все обязательные поля, чтобы создать запись об организации</p>
                                        </div>
                                    </div>

                                    <div class="form-columns">
                                        <div class="form-group full-width">
                                            <label for="profileNkoName">Название организации</label>
                                            <input type="text" id="profileNkoName" name="nko_name" placeholder="Название вашей организации">
                                        </div>

                                        <div class="form-group">
                                            <label for="profileNkoCategory">Категория</label>
                                            <select id="profileNkoCategory" name="nko_category">
                                                <option value="">Выберите категорию</option>
                                                <option value="Социальные проекты">Социальные проекты</option>
                                                <option value="Экология">Экология</option>
                                                <option value="Помощь животным">Помощь животным</option>
                                                <option value="Образование">Образование</option>
                                                <option value="Культура">Культура</option>
                                                <option value="Спорт">Спорт</option>
                                                <option value="Здравоохранение">Здравоохранение</option>
                                            </select>
                                        </div>

                                        <div class="form-group">
                                            <label for="profileNkoPhone">Контактный телефон</label>
                                            <input type="tel" id="profileNkoPhone" name="nko_phone" placeholder="+7 (XXX) XXX-XX-XX">
                                        </div>

                                        <div class="form-group full-width">
                                            <label for="profileNkoDescription">Описание деятельности</label>
                                            <textarea id="profileNkoDescription" name="nko_description" rows="3" placeholder="Опишите основную деятельность организации"></textarea>
                                        </div>

                                        <div class="form-group full-width">
                                            <label for="profileNkoActivities">Функционал волонтеров</label>
                                            <textarea id="profileNkoActivities" name="nko_activities" rows="3" placeholder="Опишите чем могут заниматься волонтеры"></textarea>
                                        </div>

                                        <div class="form-group full-width">
                                            <label for="profileNkoAddress">Адрес</label>
                                            <textarea id="profileNkoAddress" name="nko_address" rows="2" placeholder="Адрес организации"></textarea>
                                        </div>

                                        <div class="form-group">
                                            <label for="profileNkoWebsite">Веб-сайт</label>
                                            <input type="url" id="profileNkoWebsite" name="nko_website" placeholder="https://example.com">
                                        </div>

                                        <div class="form-group">
                                            <label for="profileNkoSocial">Социальные сети</label>
                                            <textarea id="profileNkoSocial" name="nko_social" rows="2" placeholder="Ссылки на социальные сети"></textarea>
                                            <small class="field-hint">Укажите ссылки через запятую</small>
                                        </div>

                                        <div class="form-group full-width">
                                            <label for="profileNkoLogo">Логотип организации</label>
                                            <div class="file-upload-container">
                                                <input type="file" id="profileNkoLogo" name="nko_logo" accept="image/*" class="file-input">
                                                <label for="profileNkoLogo" class="file-upload-label">
                                                    <span class="upload-icon">📁</span>
                                                    <span class="upload-text">Выберите файл</span>
                                                </label>
                                                <div id="profileNkoLogoPreview" class="logo-preview">
                                                    <img src="" alt="Предпросмотр логотипа">
                                                    <button type="button" class="remove-logo-btn" onclick="removeLogoPreview()">×</button>
                                                </div>
                                            </div>
                                            <small class="field-hint">Рекомендуемый размер: 200x200px, форматы: JPG, PNG, SVG</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Проекты пользователя -->
                            <div class="profile-section" id="userProjectsSection">
                                <div class="profile-section-header">
                                    <h3>Мои проекты</h3>
                                    <button type="button" class="profile-btn-text" onclick="closeProfileModal(); openCreateCardModal()">
                                        Создать новый проект
                                    </button>
                                </div>
                                <div id="projectsList" class="projects-container">
                                    <div class="loading-state">
                                        <div class="profile-loading-spinner"></div>
                                        <p>Загрузка проектов...</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Кнопки действий - ВНУТРИ формы, но на всю ширину -->
                        <div class="profile-form-actions-fullwidth">
                            <button type="button" class="profile-btn-secondary" onclick="closeProfileModal()">
                                Отмена
                            </button>
                            <button type="button" class="profile-btn-primary" id="profileSaveBtn" onclick="saveProfileChanges()">
                                Сохранить изменения
                            </button>
                            <button type="button" class="profile-btn-warning" id="profileResubmitBtn" onclick="resubmitNkoApplication()" style="display: none;">
                                Отправить заявку повторно
                            </button>
                        </div>
                    </form>

                    <!-- Правая колонка - блок "Скоро здесь появится новая информация" -->
                    <div class="profile-right-column">
                        <div class="coming-soon-block">
                            <div class="coming-soon-content">
                                <div class="coming-soon-icon">🚧</div>
                                <h3>Скоро здесь появится новая информация</h3>
                                <p>Мы работаем над добавлением новых функций и улучшением вашего профиля.</p>
                                <div class="coming-soon-features">
                                    <div class="feature-item">
                                        <span class="feature-badge">Скоро</span>
                                        <span>Статистика активности</span>
                                    </div>
                                    <div class="feature-item">
                                        <span class="feature-badge">Скоро</span>
                                        <span>История волонтерства</span>
                                    </div>
                                    <div class="feature-item">
                                        <span class="feature-badge">Скоро</span>
                                        <span>Достижения и награды</span>
                                    </div>
                                    <div class="feature-item">
                                        <span class="feature-badge">Скоро</span>
                                        <span>Рекомендации</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    
    <!-- Модальное окно администратора -->
    <div id="adminModal" class="auth-modal">
        <div class="auth-dialog xlarge" style="max-width: 1200px; width: 95%; height: 90vh;">
            <button class="close-dialog" onclick="closeAdminModal()" style="margin-top: 8px;">×</button>

            <div class="admin-modal-content">
                <div class="admin-header">
                    <h1 style="color: white; margin: 0;">Панель администратора</h1>
                    <div id="adminCurrentUser" style="color: rgba(255,255,255,0.8); margin-right: 50px;">Текущий пользователь: <strong>Загрузка...</strong></div>
                </div>

                <!-- Вкладки -->
                <div class="admin-tabs">
                    <button class="admin-tab-btn active" onclick="switchAdminTab('users')">Пользователи</button>
                    <button class="admin-tab-btn" onclick="switchAdminTab('nko-applications')">Заявки НКО</button>
                    <button class="admin-tab-btn" onclick="switchAdminTab('verified-nko')">Верифицированные НКО</button>
                    <button class="admin-tab-btn" onclick="switchAdminTab('cities')">Города и НКО</button>
                    <button class="admin-tab-btn" onclick="switchAdminTab('statistics')">Статистика</button>
                </div>

                <!-- Сообщения -->
                <div id="adminMessage" class="admin-message" style="display: none;"></div>

                <!-- Вкладка пользователей -->
                <div id="tab-users" class="admin-tab-content active">
                    <h2 style="color: white; margin-bottom: 20px;">Управление пользователями</h2>

                    <div id="adminLoading" class="admin-loading" style="display: none;">
                        <div class="loading-spinner"></div>
                        <p>Загрузка пользователей...</p>
                    </div>

                    <div class="users-table-container">
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
                                <tr>
                                    <td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                                        Загрузка пользователей...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Новая вкладка заявок НКО -->
                <div id="tab-nko-applications" class="admin-tab-content">
                    <h2 style="color: white; margin-bottom: 20px;">Заявки на регистрацию НКО</h2>
                    <div id="nkoApplicationsContainer">
                        <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                            Загрузка заявок...
                        </div>
                    </div>
                </div>

                <!-- Новая вкладка верифицированных НКО -->
                <div id="tab-verified-nko" class="admin-tab-content">
                    <h2 style="color: white; margin-bottom: 20px;">Верифицированные НКО</h2>
                    <div id="verifiedNkoContainer">
                        <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                            Загрузка данных...
                        </div>
                    </div>
                </div>

                <!-- Вкладка городов и НКО -->
                <div id="tab-cities" class="admin-tab-content">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="color: white; margin: 0;">Управление городами и НКО</h2>
                        <button class="admin-btn-primary" onclick="showAddCityForm()">
                            Добавить объект
                        </button>
                    </div>

                    <!-- Форма добавления объекта -->
                    <div id="addCityForm" class="admin-form" style="display: none; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="color: white; margin-top: 0;">Добавить новый объект</h3>

                        <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 15px;">
                            <div class="form-group" style="flex: 1;">
                                <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Тип объекта</label>
                                <select id="newObjectType" class="form-control" onchange="toggleNkoFields()"
                                       style="width: 100%; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.1); color: white;">
                                    <option value="city">Город Росатома</option>
                                    <option value="nko">НКО организация</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex: 1;">
                                <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Название</label>
                                <input type="text" id="newCityName" class="form-control" placeholder="Название города или организации" 
                                       style="width: 100%; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.1); color: white;">
                            </div>
                        </div>

                        <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 15px;">
                            <div class="form-group" style="flex: 1;">
                                <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Регион</label>
                                <input type="text" id="newCityRegion" class="form-control" placeholder="Регион расположения"
                                       style="width: 100%; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.1); color: white;">
                            </div>
                            <div class="form-group" style="flex: 1; display: none;" id="nkoTypeField">
                                <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Тип НКО</label>
                                <select id="newNkoType" class="form-control"
                                       style="width: 100%; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.1); color: white;">
                                    <option value="">Выберите тип</option>
                                    <option value="Социальная защита">Социальная защита</option>
                                    <option value="Экология и устойчивое развитие">Экология и устойчивое развитие</option>
                                    <option value="Здоровье и спорт">Здоровье и спорт</option>
                                    <option value="Культура и образование">Культура и образование</option>
                                    <option value="Местное сообщество и развитие территорий">Местное сообщество и развитие территорий</option>
                                    <option value="Защита животных">Защита животных</option>
                                    <option value="Другое">Другое</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 15px;">
                            <div class="form-group" style="flex: 1;">
                                <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Широта</label>
                                <input type="number" id="newCityLat" class="form-control" step="0.000001" placeholder="55.7558" value="55.7558"
                                       style="width: 100%; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.1); color: white;">
                            </div>
                            <div class="form-group" style="flex: 1;">
                                <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Долгота</label>
                                <input type="number" id="newCityLon" class="form-control" step="0.000001" placeholder="37.6173" value="37.6173"
                                       style="width: 100%; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.1); color: white;">
                            </div>
                        </div>

                        <!-- Поля для НКО -->
                        <div id="nkoFields" style="display: none;">
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Описание деятельности</label>
                                <textarea id="newNkoDescription" class="form-control" rows="3" placeholder="Описание деятельности организации"
                                          style="width: 100%; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.1); color: white;"></textarea>
                            </div>

                            <div class="form-group" style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Основная деятельность</label>
                                <textarea id="newNkoActivities" class="form-control" rows="2" placeholder="Основные направления деятельности"
                                          style="width: 100%; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.1); color: white;"></textarea>
                            </div>

                            <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 15px;">
                                <div class="form-group" style="flex: 1;">
                                    <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Социальные сети</label>
                                    <input type="text" id="newNkoSocial" class="form-control" placeholder="Ссылки на соц. сети"
                                           style="width: 100%; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.1); color: white;">
                                </div>
                                <div class="form-group" style="flex: 1;">
                                    <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Целевая аудитория</label>
                                    <input type="text" id="newNkoAudience" class="form-control" placeholder="Целевая аудитория"
                                           style="width: 100%; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.1); color: white;">
                                </div>
                            </div>

                            <div class="form-group" style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">План мероприятий</label>
                                <textarea id="newNkoPlan" class="form-control" rows="3" placeholder="План мероприятий на год"
                                          style="width: 100%; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.1); color: white;"></textarea>
                            </div>
                        </div>

                        <div class="form-actions" style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" class="admin-btn-secondary" onclick="hideAddCityForm()"
                                    style="background: #6b7280; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                                Отмена
                            </button>
                            <button type="button" class="admin-btn-primary" onclick="addNewObject()"
                                    style="background: #4a90e2; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                                Добавить объект
                            </button>
                        </div>
                    </div>

                    <div id="citiesTableContainer">
                        <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                            Загрузка городов и НКО...
                        </div>
                    </div>
                </div>

                <!-- Вкладка статистики -->
                <div id="tab-statistics" class="admin-tab-content">
                    <h2 style="color: white; margin-bottom: 20px;">Статистика платформы</h2>

                    <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
                        <div class="stat-card" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; text-align: center;">
                            <div class="stat-number" style="font-size: 24px; font-weight: bold; color: #4a90e2;" id="statsCities">0</div>
                            <div class="stat-label" style="color: rgba(255,255,255,0.8); font-size: 14px;">Городов</div>
                        </div>
                        <div class="stat-card" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; text-align: center;">
                            <div class="stat-number" style="font-size: 24px; font-weight: bold; color: #4ecdc4;" id="statsNko">0</div>
                            <div class="stat-label" style="color: rgba(255,255,255,0.8); font-size: 14px;">НКО</div>
                        </div>
                        <div class="stat-card" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; text-align: center;">
                            <div class="stat-number" style="font-size: 24px; font-weight: bold; color: #45b7d1;" id="statsProjects">0</div>
                            <div class="stat-label" style="color: rgba(255,255,255,0.8); font-size: 14px;">Проектов</div>
                        </div>
                        <div class="stat-card" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; text-align: center;">
                            <div class="stat-number" style="font-size: 24px; font-weight: bold; color: #ff6b6b;" id="statsVolunteers">0</div>
                            <div class="stat-label" style="color: rgba(255,255,255,0.8); font-size: 14px;">Волонтёров</div>
                        </div>
                    </div>

                    <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px;">
                        <h3 style="color: white; margin-top: 0;">Информация о системе</h3>
                        <div style="color: rgba(255,255,255,0.8);">
                            <p><strong>Всего объектов:</strong> <span id="totalObjects">0</span> (городов: <span id="totalCities">0</span>, НКО: <span id="totalNko">0</span>)</p>
                            <p><strong>Активных объектов:</strong> <span id="activeObjects">0</span></p>
                            <p><strong>Последнее обновление:</strong> <span id="lastUpdate">-</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Уведомления toast -->
    <div id="toast" class="toast"></div>

    <script src="js/gigascript.js"></script>
    <script src="js/map.js"></script>
    
    <?php if (!empty($success_message) || !empty($error_message)): ?>
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            <?php if (!empty($success_message)): ?>
                showToast('Успех', <?php echo json_encode($success_message); ?>);
            <?php endif; ?>
            <?php if (!empty($error_message)): ?>
                showToast('Ошибка', <?php echo json_encode($error_message); ?>);
            <?php endif; ?>
        }, 500);
    });
    </script>
    <?php endif; ?>

</body>
</html>