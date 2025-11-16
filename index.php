<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
$page_title = "Карта добрых дел Росатома";
$current_page_name = "index"; // переименовали переменную

// ПОДКЛЮЧАЕМ БАЗУ ДАННЫХ И ФУНКЦИИ ВНЕ ЗАВИСИМОСТИ ОТ АВТОРИЗАЦИИ
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
    <link rel="stylesheet" href="styles/main.css">
    <link rel="stylesheet" href="styles/header.css">
    <link rel="stylesheet" href="styles/footer.css">
    <link rel="stylesheet" href="styles/accessibility.css">
    <link rel="stylesheet" href="styles/toast.css">
    
    <!-- Компоненты -->
    <link rel="stylesheet" href="styles/components/buttons.css">
    <link rel="stylesheet" href="styles/components/cards.css">
    <link rel="stylesheet" href="styles/components/forms.css">
    <link rel="stylesheet" href="styles/components/modals.css">
    <link rel="stylesheet" href="styles/components/admin.css">
    
    <!-- Секции -->
    <link rel="stylesheet" href="styles/sections/hero.css">
    <link rel="stylesheet" href="styles/sections/how-it-works.css">
    <link rel="stylesheet" href="styles/sections/map.css">
    <link rel="stylesheet" href="styles/sections/search.css">
    <link rel="stylesheet" href="styles/sections/projects.css">
    <link rel="stylesheet" href="styles/sections/news.css">
    
    <!-- Адаптивность -->
    <link rel="stylesheet" href="styles/responsive.css">
</head>
<body class="accessibility-normal" data-logged-in="<?php echo $is_logged_in ? 'true' : 'false'; ?>">
    <!-- Header -->
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <div class="logo-icon">
                        <img src="img/logo.png" alt="РОСАТОМ" width="258.33" height="52">
                    </div>
                </div>

                <!-- В навигации -->
<nav class="nav">
    <a href="#hero" class="nav-link">ГЛАВНАЯ</a>
    <a href="#how-it-works" class="nav-link">КАК ПОМОЧЬ</a>
    <a href="#map-section" class="nav-link">КАРТА</a>
    <a href="#projects" class="nav-link">ПРОЕКТЫ</a>

    <?php if ($is_logged_in): ?>
        <button class="nav-link nko-btn" id="nkoBtn" onclick="openNkoModal()" style="background: none; border: none; color: white; cursor: pointer;">
            НКО
        </button>
    <?php endif; ?>
    
    <!-- В навигации -->
    <?php if ($is_logged_in && is_admin($user_id)): ?>
        <button class="nav-link admin-btn" onclick="openAdminModal()" style="background: none; border: none; color: #ff6b6b; cursor: pointer; font-weight: bold;">
            АДМИН ПАНЕЛЬ
        </button>
    <?php endif; ?>

    <button class="accessibility-btn" id="accessibilityBtn" onclick="toggleAccessibilityMode()" title="Версия для слабовидящих">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 5C7 5 2.73 8.11 1 12.5c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5z"></path>
        </svg>
    </button>
</nav>

                <?php if ($is_logged_in): ?>
                    <div class="user-info" style="display: flex; align-items: center; gap: 15px;">
                        <?php
                        if ($user['login'] === 'admin') {
                            $display_name = 'Администратор';
                        } else {
                            $full_name = '';
                            if (!empty($user['name'])) {
                                $full_name = $user['name'];
                                if (!empty($user['surname'])) {
                                    $full_name .= ' ' . $user['surname'];
                                }
                            } else {
                                $full_name = $user['login'];
                            }
                            $display_name = $full_name;
                        }
                        ?>
                        <button class="user-profile-btn" id="profileBtn" onclick="openProfileModal()" style="background: none; border: none; color: white; cursor: pointer; font-family: 'Nexa', sans-serif; font-size: 20px;">
                            <?php echo htmlspecialchars($display_name); ?>
                        </button>
                        <button class="btn-login" onclick="window.location.href='php/exit.php'">Выйти</button>
                    </div>
                <?php else: ?>
                    <button class="btn-login" id="loginBtn" onclick="openAuthModal()">ВОЙТИ</button>
                <?php endif; ?>
            </div>
        </div>
    </header>

    <!-- Accessibility Panel -->
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

    <!-- Main Content с градиентным фоном -->
    <main class="main-content">
        <div class="background-line">
            <img src="img/Vector%204.svg" alt="Фоновая линия" class="svg-background">
        </div>
        
        <!-- Hero Section -->
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
                $stats = get_all_stats();
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
        
        <!-- How It Works Section -->
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

        <!-- Interactive Map Section -->
        <section id="map-section" class="map-section">
            <div class="container">
                <div class="map-card">
                    <div class="map-header">
                        <h2 class="section-title">ИНТЕРАКТИВНАЯ КАРТА</h2>
                    </div>
                    <div class="map-container">
                        <div id="map"></div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Search Section -->
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

        <!-- Projects Section -->
        <section id="projects" class="projects-section">
            <div class="container">
                <div id="projectsContainer">
                    <!-- Сюда будет загружаться контент через AJAX -->
                    <div class="projects-header" data-total-pages="<?php echo $total_pages; ?>">
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
                                    <button class="delete-card-btn" onclick="deleteCard(<?php echo $card['id']; ?>)" title="Удалить проект">
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
                                            <div class="project-org"><?php echo htmlspecialchars($card['sub_text']); ?></div>
                                            <?php if ($is_logged_in) { ?>
                                                <button class="btn-help" onclick="joinProject(<?php echo $card['id']; ?>)">
                                                    Помочь
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

                    <?php if ($total_pages > 1) { ?>
                        <div class="pagination" id="paginationBottom">
                            <?php for ($i = 1; $i <= $total_pages; $i++) { ?>
                                <button class="pagination-btn <?php echo $i == $card_page ? 'active' : ''; ?>">
                                    <?php echo $i; ?>
                                </button>
                            <?php } ?>
                        </div>
                    <?php } ?>
                </div>
            </div>
        </section>
        
        
        <!-- News Section -->
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
        
        <!-- Добавить в index.php после секции projects -->
        <?php if ($is_logged_in && (is_admin($user_id) || is_nko($user_id))): ?>
        <div class="container" style="text-align: center; margin: 40px 0;">
            <button class="btn-primary" onclick="openCreateCardModal()">+ Добавить новый проект</button>
        </div>
        <?php endif; ?>
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
                        <li><a href="#">Все проекты</a></li>
                        <li><a href="#">Срочные</a></li>
                        <li><a href="#">Онлайн-помощь</a></li>
                        <li><a href="#">Для детей</a></li>
                        <li><a href="#">НКО</a></li>
                    </ul>
                </div>

                <div class="footer-column">
                    <h3 class="footer-title">Помощь</h3>
                    <ul class="footer-links">
                        <li><a href="#">Регистрация НКО</a></li>
                        <li><a href="#">Документы</a></li>
                        <li><a href="#">Помощь</a></li>
                        <li><a href="#">Частые вопросы</a></li>
                    </ul>
                </div>

                <div class="footer-column">
                    <h3 class="footer-title">Контакты</h3>
                    <ul class="footer-links">
                        <li><a href="#">Обратная связь</a></li>
                        <li><a href="#">Политика</a></li>
                        <li><a href="#">конфиденциальности</a></li>
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
    
        <!-- Модальные окна авторизации -->
    <div id="authModal" class="auth-modal">
        <div class="auth-dialog">
            <button class="close-dialog" id="closeAuthModal" onclick="closeAuthModal()">×</button>

            <div class="auth-tabs">
                <button class="tab-btn active" data-tab="login">Вход</button>
                <button class="tab-btn" data-tab="register">Регистрация</button>
            </div>

            <!-- Форма входа -->
            <form id="loginForm" class="auth-form active" action="php/auth.php" method="POST">
                <h2>Вход в аккаунт</h2>
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
                <button type="submit" class="auth-submit">Войти</button>
                <p class="auth-switch">Нет аккаунта? <a href="#" onclick="switchAuthForm('register')">Зарегистрироваться</a></p>
            </form>

            <!-- Форма регистрации -->
            <form id="registerForm" class="auth-form" action="php/register.php" method="POST">
                <h2>Регистрация</h2>
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
                    <input type="email" id="registerEmail" name="login" required placeholder="Ваш email">
                </div>
                <div class="form-group">
                    <label for="registerPassword">Пароль</label>
                    <input type="password" id="registerPassword" name="password" required placeholder="Придумайте пароль">
                </div>
                <div class="form-group">
                    <label for="registerConfirm">Подтвердите пароль</label>
                    <input type="password" id="registerConfirm" name="confirm" required placeholder="Повторите пароль">
                </div>
                <button type="submit" class="auth-submit">Зарегистрироваться</button>
                <p class="auth-switch">Уже есть аккаунт? <a href="#" onclick="switchAuthForm('login')">Войти</a></p>
            </form>
        </div>
    </div>
    
    <!-- Модальное окно НКО -->
    <div id="nkoModal" class="auth-modal">
        <div class="auth-dialog large">
            <button class="close-dialog" id="closeNkoModal" onclick="closeNkoModal()">×</button>

            <div class="auth-tabs">
                <button class="tab-btn active" data-tab="nko-register">Регистрация НКО</button>
            </div>

            <form id="nkoForm" class="auth-form active" enctype="multipart/form-data">
                <h2>РЕГИСТРАЦИЯ НКО</h2>

                <div class="form-group">
                    <label for="nkoName">НАЗВАНИЕ ОРГАНИЗАЦИИ</label>
                    <input type="text" id="nkoName" name="name" required placeholder="Введите название организации">
                </div>

                <div class="form-group">
                    <label for="nkoCategory">КАТЕГОРИЯ/НАПРАВЛЕНИЕ ДЕЯТЕЛЬНОСТИ</label>
                    <select id="nkoCategory" name="category" required>
                        <option value="" disabled selected>Выберите категорию</option>
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
                    <label for="nkoDescription">КРАТКОЕ ОПИСАНИЕ ДЕЯТЕЛЬНОСТИ</label>
                    <textarea id="nkoDescription" name="description" required placeholder="Опишите основную деятельность организации (2-3 предложения)" rows="3"></textarea>
                </div>

                <div class="form-group">
                    <label for="nkoActivities">ФУНКЦИОНАЛ ВОЛОНТЕРОВ</label>
                    <textarea id="nkoActivities" name="activities" required placeholder="Опишите чем могут заниматься волонтеры в вашей организации" rows="3"></textarea>
                </div>

                <div class="form-group">
                    <label for="nkoPhone">КОНТАКТНЫЙ ТЕЛЕФОН</label>
                    <input type="tel" id="nkoPhone" name="phone" placeholder="+7 (XXX) XXX-XX-XX">
                </div>

                <div class="form-group">
                    <label for="nkoAddress">АДРЕС</label>
                    <textarea id="nkoAddress" name="address" placeholder="Введите адрес организации" rows="2"></textarea>
                </div>

                <div class="form-group">
                    <label for="nkoWebsite">ВЕБ-САЙТ</label>
                    <input type="url" id="nkoWebsite" name="website" placeholder="https://example.com">
                </div>

                <div class="form-group">
                    <label for="nkoSocial">СОЦИАЛЬНЫЕ СЕТИ</label>
                    <textarea id="nkoSocial" name="social_links" placeholder="Ссылки на социальные сети (каждая с новой строки)" rows="2"></textarea>
                </div>

                <div class="form-group">
                    <label for="nkoLogo">ЛОГОТИП ОРГАНИЗАЦИИ</label>
                    <input type="file" id="nkoLogo" name="logo" accept="image/*">
                </div>

                <button type="submit" class="auth-submit">ЗАРЕГИСТРИРОВАТЬ НКО</button>
            </form>
        </div>
    </div>

    <!-- Модальное окно профиля -->
    <div id="profileModal" class="auth-modal">
        <div class="auth-dialog xlarge">
            <button class="close-dialog" id="closeProfileModal" onclick="closeProfileModal()">×</button>

            <div class="auth-tabs">
                <button class="tab-btn active" data-tab="profile">Профиль пользователя</button>
            </div>

            <form id="profileForm" class="auth-form active">
                <h2>Профиль пользователя</h2>

                <!-- Контейнер с прокруткой ВНУТРИ формы -->
                <div class="profile-scrollable">
                    <!-- Основная информация -->
                    <div class="profile-section">
                        <h3>Основная информация</h3>
                        <div class="form-group">
                            <label for="profileName">Имя *</label>
                            <input type="text" id="profileName" name="name" required placeholder="Ваше имя">
                        </div>
                        <div class="form-group">
                            <label for="profileSurname">Фамилия *</label>
                            <input type="text" id="profileSurname" name="surname" required placeholder="Ваша фамилия">
                        </div>
                        <div class="form-group">
                            <label for="profileEmail">Email *</label>
                            <input type="email" id="profileEmail" name="login" required placeholder="Ваш email" readonly style="background: rgba(255,255,255,0.1);">
                        </div>
                    </div>

                    <!-- Информация о НКО -->
                    <div class="profile-section" id="nkoProfileSection">
                        <h3>Информация об НКО</h3>
                        <div class="form-group">
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
                            <label for="profileNkoDescription">Описание деятельности</label>
                            <textarea id="profileNkoDescription" name="nko_description" rows="3" placeholder="Опишите основную деятельность организации"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="profileNkoActivities">Функционал волонтеров</label>
                            <textarea id="profileNkoActivities" name="nko_activities" rows="3" placeholder="Опишите чем могут заниматься волонтеры"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="profileNkoPhone">Контактный телефон</label>
                            <input type="tel" id="profileNkoPhone" name="nko_phone" placeholder="+7 (XXX) XXX-XX-XX">
                        </div>
                        <div class="form-group">
                            <label for="profileNkoAddress">Адрес</label>
                            <textarea id="profileNkoAddress" name="nko_address" rows="2" placeholder="Адрес организации"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="profileNkoWebsite">Веб-сайт</label>
                            <input type="url" id="profileNkoWebsite" name="nko_website" placeholder="https://example.com">
                        </div>
                        <div class="form-group">
                            <label for="profileNkoSocial">Социальные сети</label>
                            <textarea id="profileNkoSocial" name="nko_social" rows="2" placeholder="Ссылки на социальные сети (каждая с новой строки)"></textarea>
                        </div>
                    </div>

                    <!-- Проекты пользователя -->
                    <div class="profile-section" id="userProjectsSection">
                        <h3>Мои проекты</h3>
                        <div id="projectsList">
                            <!-- Проекты будут загружены через JavaScript -->
                        </div>
                    </div>
                </div>

                <!-- Кнопка ВНЕ контейнера с прокруткой -->
                <button type="submit" class="auth-submit">Сохранить изменения</button>
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
                <h2>Создание нового проекта</h2>

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

                <div class="form-group">
                    <label for="cardSubText">Подпись</label>
                    <input type="text" id="cardSubText" name="sub_text" required placeholder="Краткая подпись">
                </div>

                <button type="submit" class="auth-submit">Опубликовать проект</button>
            </form>
        </div>
    </div>
    
    <!-- Модальное окно администратора -->
    <div id="adminModal" class="auth-modal">
        <div class="auth-dialog xlarge">
            <button class="close-dialog" onclick="closeAdminModal()">×</button>

            <div class="auth-tabs">
                <button class="tab-btn active">Панель администратора</button>
            </div>  

            <div class="admin-panel-content">
                <div class="admin-header">
                    <h2>Управление пользователями</h2>
                    <div class="admin-stats">
                        <span>Всего пользователей: <strong id="totalUsers">0</strong></span>
                    </div>
                </div>

                <!-- Сообщения -->
                <div id="adminMessage" class="admin-message" style="display: none;"></div>

                <!-- Таблица пользователей -->
                <div class="users-table-container">
                    <table class="admin-users-table">
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
                </div>

                <!-- Индикатор загрузки -->
                <div id="adminLoading" class="admin-loading">
                    <div class="loading-spinner"></div>
                    <p>Загрузка данных...</p>
                </div>
            </div>
        </div>
    </div>
    
    
    <!-- Toast для уведомлений -->
    <div id="toast" class="toast"></div>

    <!-- Основные скрипты -->
    <script src="js/navigation.js"></script>
    <script src="js/main.js"></script>
    <script src="js/modals.js"></script>
    <script src="js/forms.js"></script>
    <script src="js/dropdowns.js"></script>
    <script src="js/animations.js"></script>
    <script src="js/api.js"></script>
    <script src="js/accessibility.js"></script>
    <script src="js/admin-panel.js"></script>
    <script src="js/cards-management.js"></script>
    
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
    
    <script>
    // Отладочный скрипт для проверки работы удаления
    document.addEventListener('DOMContentLoaded', function() {
        console.log('=== DEBUG: Инициализация удаления карточек ===');

        // Проверяем наличие кнопок удаления
        const deleteButtons = document.querySelectorAll('.delete-card-btn');
        console.log('Найдено кнопок удаления:', deleteButtons.length);

        deleteButtons.forEach((btn, index) => {
            const cardId = btn.getAttribute('data-card-id') || btn.closest('.project-card')?.getAttribute('data-card-id');
            console.log(`Кнопка ${index + 1}:`, {
                element: btn,
                cardId: cardId,
                onclick: btn.getAttribute('onclick'),
                classes: btn.className
            });

            // Добавляем обработчик для тестирования
            btn.addEventListener('click', function(e) {
                console.log('Клик по кнопке удаления:', {
                    cardId: cardId,
                    event: e
                });
            });
        });

        // Проверяем доступность функции deleteCard
        console.log('Функция deleteCard доступна:', typeof deleteCard === 'function');
    });
    </script>
</body>
</html>