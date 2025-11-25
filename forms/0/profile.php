<?php
// forms/profile.php
session_start();

// Корректные пути для папки forms
require_once __DIR__ . '/../php/db.php';
require_once __DIR__ . '/../php/functions.php';

// Проверяем авторизацию
$is_logged_in = false;
$user = null;

if (isset($_COOKIE['auth_key'])) {
    $auth_key = $_COOKIE['auth_key'];
    $stmt = $conn->prepare("SELECT id, login, name, surname FROM users WHERE auth_key = ?");
    $stmt->bind_param("s", $auth_key);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    
    if ($user) {
        $is_logged_in = true;
    }
}

// Если пользователь не авторизован, перенаправляем на главную
if (!$is_logged_in) {
    header("Location: ../index.php");
    exit;
}
?>

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Профиль пользователя - Карта добрых дел Росатома</title>
    
    <!-- Подключаем стили с корректными путями -->
    <link rel="stylesheet" href="../styles/gigamain.css">
    <link rel="stylesheet" href="../styles/map.css">
    
    <!-- Шрифты -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link href="https://fonts-online.ru/fonts/nexa" rel="stylesheet">
</head>
<body class="accessibility-normal">
    <!-- Header -->
    <header class="header">
        <div class="container">
            <div class="header-content">
                <!-- Логотип слева -->
                <div class="logo">
                    <div class="logo-icon">
                        <img src="../img/logo.png" alt="РОСАТОМ" width="258.33" height="52">
                    </div>
                </div>

                <!-- Навигационное меню -->
                <nav class="nav">
                    <a href="../index.php" class="nav-link">ГЛАВНАЯ</a>
                    <a href="../index.php#how-it-works" class="nav-link">КАК ПОМОЧЬ</a>
                    <a href="../index.php#map-section" class="nav-link">КАРТА</a>
                    <a href="../index.php#projects" class="nav-link">ПРОЕКТЫ</a>
                </nav>

                <!-- Блок пользователя -->
                <div class="user-controls">
                    <?php if ($is_logged_in): ?>
                        <div class="user-info">
                            <span class="user-profile-btn">
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
                            </span>
                            <a href="../php/exit.php" class="btn-login">Выйти</a>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
        <div class="container">
            <div class="profile-page">
                <!-- Заголовок страницы -->
                <div class="page-header">
                    <h1 class="page-title">Профиль пользователя</h1>
                    <p class="page-subtitle">Управление вашими данными и проектами</p>
                </div>

                <!-- Форма профиля -->
                <div class="profile-card">
                    <form id="profileForm" class="profile-form">
                        <!-- Контейнер с прокруткой -->
                        <div class="profile-scrollable">
                            <!-- Основная информация -->
                            <div class="profile-section">
                                <h3 class="section-title">Основная информация</h3>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label for="profileName">Имя *</label>
                                        <input type="text" id="profileName" name="name" required 
                                               value="<?php echo htmlspecialchars($user['name'] ?? ''); ?>" 
                                               placeholder="Ваше имя">
                                    </div>
                                    <div class="form-group">
                                        <label for="profileSurname">Фамилия *</label>
                                        <input type="text" id="profileSurname" name="surname" required 
                                               value="<?php echo htmlspecialchars($user['surname'] ?? ''); ?>" 
                                               placeholder="Ваша фамилия">
                                    </div>
                                    <div class="form-group full-width">
                                        <label for="profileEmail">Email *</label>
                                        <input type="email" id="profileEmail" name="login" required 
                                               value="<?php echo htmlspecialchars($user['login'] ?? ''); ?>" 
                                               placeholder="Ваш email" readonly 
                                               style="background: rgba(255,255,255,0.1);">
                                        <small style="color: rgba(255,255,255,0.6); margin-top: 5px; display: block;">
                                            Email нельзя изменить
                                        </small>
                                    </div>
                                </div>
                            </div>

                            <!-- Информация о НКО -->
                            <div class="profile-section" id="nkoProfileSection">
                                <h3 class="section-title">Информация об НКО</h3>
                                
                                <div id="profileNkoHint" class="nko-hint" style="display: none;">
                                    <div class="hint-content">
                                        <strong>Вы ещё не зарегистрировали НКО</strong>
                                        <p>Заполните все обязательные поля, чтобы создать запись об организации</p>
                                    </div>
                                </div>

                                <div class="form-grid">
                                    <div class="form-group full-width">
                                        <label for="profileNkoName">Название организации *</label>
                                        <input type="text" id="profileNkoName" name="nko_name" 
                                               placeholder="Название вашей организации">
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="profileNkoCategory">Категория *</label>
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
                                    
                                    <div class="form-group full-width">
                                        <label for="profileNkoDescription">Описание деятельности *</label>
                                        <textarea id="profileNkoDescription" name="nko_description" rows="3" 
                                                  placeholder="Опишите основную деятельность организации"></textarea>
                                    </div>
                                    
                                    <div class="form-group full-width">
                                        <label for="profileNkoActivities">Функционал волонтеров *</label>
                                        <textarea id="profileNkoActivities" name="nko_activities" rows="3" 
                                                  placeholder="Опишите чем могут заниматься волонтеры"></textarea>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="profileNkoPhone">Контактный телефон</label>
                                        <input type="tel" id="profileNkoPhone" name="nko_phone" 
                                               placeholder="+7 (XXX) XXX-XX-XX">
                                    </div>
                                    
                                    <div class="form-group full-width">
                                        <label for="profileNkoAddress">Адрес</label>
                                        <textarea id="profileNkoAddress" name="nko_address" rows="2" 
                                                  placeholder="Адрес организации"></textarea>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="profileNkoWebsite">Веб-сайт</label>
                                        <input type="url" id="profileNkoWebsite" name="nko_website" 
                                               placeholder="https://example.com">
                                    </div>
                                    
                                    <div class="form-group full-width">
                                        <label for="profileNkoSocial">Социальные сети</label>
                                        <textarea id="profileNkoSocial" name="nko_social" rows="2" 
                                                  placeholder="Ссылки на социальные сети (каждая с новой строки)"></textarea>
                                        <small style="color: rgba(255,255,255,0.6); margin-top: 5px; display: block;">
                                            Укажите ссылки через запятую или с новой строки
                                        </small>
                                    </div>
                                    
                                    <div class="form-group full-width">
                                        <label for="profileNkoLogo">Логотип организации</label>
                                        <input type="file" id="profileNkoLogo" name="nko_logo" accept="image/*">
                                        <div id="profileNkoLogoPreview" class="logo-preview" style="display: none;">
                                            <img src="" alt="Предпросмотр логотипа">
                                            <button type="button" class="remove-logo-btn" onclick="removeLogoPreview()">×</button>
                                        </div>
                                        <small style="color: rgba(255,255,255,0.6); margin-top: 5px; display: block;">
                                            Рекомендуемый размер: 200x200px, форматы: JPG, PNG, SVG
                                        </small>
                                    </div>
                                </div>
                            </div>

                            <!-- Проекты пользователя -->
                            <div class="profile-section" id="userProjectsSection">
                                <div class="section-header">
                                    <h3 class="section-title">Мои проекты</h3>
                                    <a href="../index.php#projects" class="btn-text">Создать новый проект</a>
                                </div>
                                <div id="projectsList" class="projects-list">
                                    <div class="loading-state">
                                        <div class="loading-spinner"></div>
                                        <p>Загрузка проектов...</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Кнопки действий -->
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="window.location.href='../index.php'">
                                Назад на главную
                            </button>
                            <button type="submit" class="btn-primary">
                                Сохранить изменения
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-bottom">
                <p class="copyright">© 2025 404 Sleep Not Found. Проект Росатома и ВИТИ НИЯУ МИФИ</p>
                <img src="../img/Cat2.png" class="footer-image" alt="Декоративное изображение">
            </div>
        </div>
    </footer>

    <!-- Toast для уведомлений -->
    <div id="toast" class="toast"></div>

    <!-- Подключаем скрипты с корректными путями -->
    <script src="../js/gigascript.js"></script>
    
    <script>
    // Специфичные функции для страницы профиля
    function removeLogoPreview() {
        const preview = document.getElementById('profileNkoLogoPreview');
        const fileInput = document.getElementById('profileNkoLogo');
        
        if (preview) {
            preview.style.display = 'none';
            preview.querySelector('img').src = '';
        }
        
        if (fileInput) {
            fileInput.value = '';
        }
    }

    // Предпросмотр логотипа
    document.getElementById('profileNkoLogo')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('profileNkoLogoPreview');
                const img = preview.querySelector('img');
                img.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // Загрузка данных профиля при загрузке страницы
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Загрузка страницы профиля...');
        
        // Загружаем данные профиля
        loadProfileData();
        
        // Обработчик формы
        document.getElementById('profileForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleProfileFormSubmit(this);
        });
    });

    // Загрузка данных профиля
    async function loadProfileData() {
        try {
            const response = await fetch('../php/get_profile.php');
            const data = await response.json();
            
            if (data.success) {
                fillProfileForm(data);
            } else {
                showToast('Ошибка', data.message || 'Ошибка загрузки профиля');
            }
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
            showToast('Ошибка', 'Не удалось загрузить данные профиля');
        }
    }

    // Обработчик отправки формы профиля
    async function handleProfileFormSubmit(form) {
        const submitBtn = form.querySelector('.btn-primary');
        const originalText = submitBtn.textContent;
        
        submitBtn.textContent = 'Сохранение...';
        submitBtn.disabled = true;

        try {
            // 1) Сохраняем основные данные пользователя
            const profileFormData = new FormData();
            profileFormData.append('name', document.getElementById('profileName').value.trim());
            profileFormData.append('surname', document.getElementById('profileSurname').value.trim());
            profileFormData.append('login', document.getElementById('profileEmail').value.trim());

            const profileResp = await fetch('../php/save_profile.php', {
                method: 'POST',
                body: profileFormData
            });
            const profileData = await profileResp.json();

            if (!profileData.success) {
                showToast('Ошибка', profileData.message || 'Ошибка при сохранении профиля');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                return;
            }

            // 2) Сохраняем данные НКО
            const nkoFormData = new FormData();
            nkoFormData.append('name', document.getElementById('profileNkoName').value.trim());
            nkoFormData.append('category', document.getElementById('profileNkoCategory').value);
            nkoFormData.append('description', document.getElementById('profileNkoDescription').value.trim());
            nkoFormData.append('activities', document.getElementById('profileNkoActivities').value.trim());
            nkoFormData.append('phone', document.getElementById('profileNkoPhone').value.trim());
            nkoFormData.append('address', document.getElementById('profileNkoAddress').value.trim());
            nkoFormData.append('website', document.getElementById('profileNkoWebsite').value.trim());
            nkoFormData.append('social_links', document.getElementById('profileNkoSocial').value.trim());
            
            // Логотип
            const logoInput = document.getElementById('profileNkoLogo');
            if (logoInput && logoInput.files && logoInput.files[0]) {
                nkoFormData.append('logo', logoInput.files[0]);
            }

            const nkoResp = await fetch('../php/save_nko.php', {
                method: 'POST',
                body: nkoFormData
            });

            const nkoData = await nkoResp.json();

            if (nkoData.success) {
                showToast('Успех', nkoData.message || 'Данные сохранены');
                
                // Обновляем предпросмотр логотипа если нужно
                if (nkoData.logo_path) {
                    const preview = document.getElementById('profileNkoLogoPreview');
                    const img = preview.querySelector('img');
                    img.src = nkoData.logo_path;
                    preview.style.display = 'block';
                }
                
                // Перезагружаем данные профиля
                setTimeout(() => {
                    loadProfileData();
                }, 1000);
                
            } else {
                showToast('Ошибка', nkoData.message || 'Не удалось сохранить данные НКО');
            }

        } catch (error) {
            console.error('Ошибка сохранения:', error);
            showToast('Ошибка', 'Ошибка соединения с сервером');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    // Функция заполнения формы
    function fillProfileForm(data) {
        if (!data.user) return;
        
        // Основные данные
        document.getElementById('profileName').value = data.user.name || '';
        document.getElementById('profileSurname').value = data.user.surname || '';
        document.getElementById('profileEmail').value = data.user.login || '';
        
        // Данные НКО
        if (data.nko) {
            document.getElementById('profileNkoName').value = data.nko.name || '';
            document.getElementById('profileNkoCategory').value = data.nko.category || '';
            document.getElementById('profileNkoDescription').value = data.nko.description || '';
            document.getElementById('profileNkoActivities').value = data.nko.activities || '';
            document.getElementById('profileNkoPhone').value = data.nko.phone || '';
            document.getElementById('profileNkoAddress').value = data.nko.address || '';
            document.getElementById('profileNkoWebsite').value = data.nko.website || '';
            document.getElementById('profileNkoSocial').value = data.nko.social_links || '';
            
            // Скрываем подсказку
            document.getElementById('profileNkoHint').style.display = 'none';
            
            // Показываем логотип если есть
            if (data.nko.logo_path) {
                const preview = document.getElementById('profileNkoLogoPreview');
                const img = preview.querySelector('img');
                img.src = data.nko.logo_path;
                preview.style.display = 'block';
            }
        } else {
            // Показываем подсказку если НКО нет
            document.getElementById('profileNkoHint').style.display = 'block';
        }
        
        // Проекты
        if (data.projects) {
            loadUserProjects(data.projects);
        }
    }

    // Функция загрузки проектов
    function loadUserProjects(projects) {
        const projectsList = document.getElementById('projectsList');
        if (!projectsList) return;
        
        if (projects.length === 0) {
            projectsList.innerHTML = `
                <div class="empty-state">
                    <p>У вас пока нет созданных проектов</p>
                    <a href="../index.php#projects" class="btn-primary">Создать первый проект</a>
                </div>
            `;
            return;
        }
        
        let projectsHTML = `
            <div class="projects-grid">
                <p class="projects-count">Всего проектов: <strong>${projects.length}</strong></p>
        `;
        
        projects.forEach(project => {
            const statusBadge = project.status === 'СРОЧНО' ? 
                '<span class="badge badge-urgent">СРОЧНО</span>' : '';
            
            const typeBadge = project.type === 'СОЦ.ПРОЕКТ' ? 
                '<span class="badge badge-social">Социальный</span>' : 
                project.type === 'ЭКОЛОГИЯ' ? 
                '<span class="badge badge-ecology">Экология</span>' : 
                '<span class="badge badge-animals">Животные</span>';
            
            projectsHTML += `
                <div class="project-item">
                    <div class="project-header">
                        <div class="project-badges">
                            ${statusBadge}
                            ${typeBadge}
                        </div>
                        <h4 class="project-title">${escapeHtml(project.header)}</h4>
                    </div>
                    <div class="project-info">
                        <span class="project-location">📍 ${escapeHtml(project.location)}</span>
                        <span class="project-date">📅 ${escapeHtml(project.date)}</span>
                    </div>
                    <div class="project-actions">
                        <button type="button" class="btn-small" onclick="viewProject(${project.id})">
                            Просмотреть
                        </button>
                    </div>
                </div>
            `;
        });
        
        projectsHTML += '</div>';
        projectsList.innerHTML = projectsHTML;
    }

    // Вспомогательная функция
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Функция просмотра проекта
    function viewProject(projectId) {
        // Редирект на главную страницу к проектам
        window.location.href = `../index.php#projects`;
    }

    // Функция показа уведомлений
    function showToast(title, message) {
        // Используем функцию из gigascript.js или создаем свою
        if (window.showToast) {
            window.showToast(title, message);
        } else {
            // Простая реализация тоста
            const toast = document.getElementById('toast');
            if (toast) {
                toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-description">${message}</div>`;
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 3000);
            }
        }
    }
    </script>

    <style>
    /* Стили для страницы профиля */
    .profile-page {
        max-width: 1000px;
        margin: 0 auto;
        padding: 40px 20px;
    }

    .page-header {
        text-align: center;
        margin-bottom: 40px;
    }

    .page-title {
        font-family: 'Nexa', sans-serif;
        font-size: 2.5rem;
        font-weight: bold;
        color: white;
        margin-bottom: 10px;
    }

    .page-subtitle {
        font-size: 1.1rem;
        color: rgba(255, 255, 255, 0.8);
    }

    .profile-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 30px;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .profile-form {
        display: flex;
        flex-direction: column;
        gap: 30px;
    }

    .profile-scrollable {
        max-height: 70vh;
        overflow-y: auto;
        padding-right: 10px;
    }

    .profile-scrollable::-webkit-scrollbar {
        width: 6px;
    }

    .profile-scrollable::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
    }

    .profile-scrollable::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
    }

    .profile-section {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        padding: 25px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .section-title {
        font-family: 'Nexa', sans-serif;
        font-size: 1.5rem;
        color: white;
        margin-bottom: 20px;
        border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 10px;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
    }

    .form-group.full-width {
        grid-column: 1 / -1;
    }

    .form-group label {
        font-weight: 500;
        margin-bottom: 8px;
        color: rgba(255, 255, 255, 0.9);
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
        padding: 12px 15px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        font-family: 'Roboto', sans-serif;
        font-size: 14px;
        transition: all 0.3s ease;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: #4a90e2;
        background: rgba(255, 255, 255, 0.15);
    }

    .form-group textarea {
        resize: vertical;
        min-height: 80px;
    }

    .nko-hint {
        background: #fff3cd;
        border: 1px solid #ffeeba;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 20px;
    }

    .hint-content {
        color: #856404;
    }

    .hint-content strong {
        display: block;
        margin-bottom: 5px;
    }

    .logo-preview {
        position: relative;
        margin-top: 10px;
        display: inline-block;
    }

    .logo-preview img {
        max-height: 80px;
        border-radius: 6px;
        border: 2px solid rgba(255, 255, 255, 0.2);
    }

    .remove-logo-btn {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #ff4757;
        color: white;
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .projects-list {
        min-height: 100px;
    }

    .loading-state {
        text-align: center;
        padding: 40px;
        color: rgba(255, 255, 255, 0.7);
    }

    .loading-spinner {
        width: 30px;
        height: 30px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top: 3px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px;
    }

    .empty-state {
        text-align: center;
        padding: 40px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .projects-grid {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }

    .projects-count {
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 15px;
        font-size: 14px;
    }

    .project-item {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 15px;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .project-header {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 10px;
    }

    .project-badges {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
    }

    .project-title {
        flex: 1;
        color: white;
        font-size: 16px;
        margin: 0;
    }

    .project-info {
        display: flex;
        gap: 15px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 10px;
    }

    .project-actions {
        display: flex;
        justify-content: flex-end;
    }

    .btn-small {
        padding: 6px 12px;
        font-size: 12px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .btn-small:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .form-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .btn-primary, .btn-secondary {
        padding: 12px 24px;
        border: none;
        border-radius: 6px;
        font-family: 'Roboto', sans-serif;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .btn-primary {
        background: #4a90e2;
        color: white;
    }

    .btn-primary:hover {
        background: #357abd;
    }

    .btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .btn-text {
        background: none;
        border: none;
        color: #4a90e2;
        cursor: pointer;
        text-decoration: none;
        font-size: 14px;
    }

    .btn-text:hover {
        text-decoration: underline;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    /* Адаптивность */
    @media (max-width: 768px) {
        .profile-page {
            padding: 20px 10px;
        }

        .page-title {
            font-size: 2rem;
        }

        .profile-card {
            padding: 20px;
        }

        .form-grid {
            grid-template-columns: 1fr;
        }

        .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
        }

        .form-actions {
            flex-direction: column;
            gap: 10px;
        }

        .form-actions button {
            width: 100%;
        }
    }
    </style>
</body>
</html>