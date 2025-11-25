
/*! gigascript.monolith.js - Final monolithic build
    - Contains: core, auth, profile, nko, cards, map, pagination, modals, stats
    - Excludes: admin-panel inline functions (admin_panel.php provides its own JS)
    - Generated: final build
*/
(function(window, document){
'use strict';
// Safe namespace
if (window.Giga && window.Giga.__finalLoaded) { console.warn('gigascript.monolith already loaded'); return; }
window.Giga = window.Giga || {};
window.Giga.__finalLoaded = true;

// Объединенный файл скриптов для платформы волонтерства

let currentPage = 1;
let totalPages = 1;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log("Инициализация приложения...");

    // 1. Парсинг URL и пагинация
    const urlParams = new URLSearchParams(window.location.search);
    currentPage = parseInt(urlParams.get('card_page')) || 1;
    console.log('Текущая страница:', currentPage);

    // 2. Базовая инициализация (модалки, валидация, доступность, пагинация)
    initFormValidation();
    initAccessibility();
    initEventListeners();
    initModalHandlers();
    initGlobalEventHandlers();

    // 3. Загрузка данных
    loadInitialCards();

    // 4. Карта (отложенная инициализация, т.к. требует YMaps)
    if (window.ymaps && typeof ymaps.ready === 'function' && typeof initMap === 'function') {
        ymaps.ready(initMap);
    } else {
        console.log('Ожидаем загрузку Yandex Maps API...');
        window.addEventListener('load', function(){ if (typeof initMap === 'function') initMap(); });
    }

    // 5. Счетчики
    if (typeof countersManager !== 'undefined') {
        countersManager.init();
    }

    // 6. Анимации (уже после контента)
    initAnimations();
    
    // Инициализируем флаг для проверки наличия данных НКО
});

// Глобальные обработчики
function initGlobalEventHandlers() {
    document.addEventListener('click', function(e) {
        // Кнопки пагинации
        if (e.target.classList.contains('pagination-btn')) {
            e.preventDefault();
            const page = parseInt(e.target.textContent);
            if (!isNaN(page) && page !== currentPage) {
                changeCardPage(page);
            }
            return;
        }
        
        // Кнопка "Назад"
        if (e.target.classList.contains('prev-btn') || e.target.closest('.prev-btn')) {
            e.preventDefault();
            if (currentPage > 1) {
                changeCardPage(currentPage - 1);
            }
            return;
        }
        
        // Кнопка "Вперед"
        if (e.target.classList.contains('next-btn') || e.target.closest('.next-btn')) {
            e.preventDefault();
            if (currentPage < totalPages) {
                changeCardPage(currentPage + 1);
            }
            return;
        }
        
        // Кнопки "Помочь"
        if (e.target.classList.contains('btn-help') || e.target.closest('.btn-help')) {
            e.preventDefault();
            const button = e.target.classList.contains('btn-help') ? e.target : e.target.closest('.btn-help');
            const cardId = button.getAttribute('data-card-id');
            if (cardId && !button.disabled) {
                joinProject(parseInt(cardId));
            }
            return;
        }
    });
}

// Основная функция AJAX пагинации
async function changeCardPage(page) {
    console.log('Загрузка страницы:', page);
    
    if (page < 1 || page > totalPages || page === currentPage) {
        return;
    }
    
    try {
        showLoadingIndicator();
        
        const response = await fetch(`php/get_cards_ajax.php?card_page=${page}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Данные от сервера:', data);
        
        if (data.success && data.html) {
            updateContent(data.html, page);
            currentPage = data.current_page || page;
            totalPages = data.total_pages || totalPages;
            
            updateURL(page);
            scrollToProjectsSection();
            
        } else {
            throw new Error('Неверный формат ответа от сервера');
        }
        
    } catch (error) {
        console.error('Ошибка загрузки карточек:', error);
        showToast('Ошибка', 'Не удалось загрузить карточки');
    } finally {
        hideLoadingIndicator();
    }
}

// Инициализация обработчиков для новых карточек
function initCardsEventHandlers() {
    // Обработчики для кнопок "Помочь"
    document.querySelectorAll('.btn-help').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const cardId = this.getAttribute('data-card-id');
            if (cardId && !this.disabled) {
                joinProject(parseInt(cardId), this); // ← передаём кнопку!
            }
        });
    });

    // Обработчики для кнопок пагинации
    document.querySelectorAll('.pagination-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.textContent);
            if (!isNaN(page) && page !== currentPage) {
                changeCardPage(page);
            }
        });
    });

    // Обработчики для кнопок "Назад/Вперед"
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (currentPage > 1) {
                changeCardPage(currentPage - 1);
            }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (currentPage < totalPages) {
                changeCardPage(currentPage + 1);
            }
        });
    }
}

// Показать индикатор загрузки
function showLoadingIndicator() {
    const container = document.getElementById('projectsContainer');
    if (!container) return;
    
    const spinner = document.createElement('div');
    spinner.id = 'loadingSpinner';
    spinner.innerHTML = '<div style="text-align: center; color: white; font-family: Roboto, sans-serif; padding: 40px;"><div style="width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div><p>Загрузка проектов...</p></div>';
    spinner.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 100;';
    
    container.style.position = 'relative';
    container.appendChild(spinner);
}

// Скрыть индикатор загрузки
function hideLoadingIndicator() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.remove();
    }
}

// Обновить URL
function updateURL(page) {
    const url = new URL(window.location.href);
    
    if (page === 1) {
        url.searchParams.delete('card_page');
    } else {
        url.searchParams.set('card_page', page);
    }
    
    window.history.pushState({ page: page }, '', url.toString());
}

// Прокрутить к секции проектов
function scrollToProjectsSection() {
    const projectsSection = document.getElementById('projects');
    if (projectsSection) {
        const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
        const offset = projectsSection.offsetTop - headerHeight - 20;
        
        window.scrollTo({
            top: offset,
            behavior: 'smooth'
        });
    }
}

// Остальные функции
function scrollToSection(id) {
    const element = document.getElementById(id);
    if (element) {
        const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerHeight - 20;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

function toggleFilter(button, filterType) {
    const activeClass = `active-${filterType}`;
    
    if (button.classList.contains(activeClass)) {
        button.classList.remove(activeClass);
    } else {
        document.querySelectorAll('.filter-badge').forEach(btn => {
            btn.classList.remove('active-social', 'active-ecology');
        });
        button.classList.add(activeClass);
    }
}

async function joinProject(cardId) {
    const isLoggedIn = document.body.dataset.loggedIn === 'true';
    
    if (!isLoggedIn) {
        showToast('Ошибка', 'Для участия необходимо войти в систему');
        openAuthModal();
        return;
    }

    try {
        const response = await fetch('php/join_project.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `card_id=${cardId}`
        });
        
        const data = await response.json();
        
        showToast(data.success ? 'Успех' : 'Ошибка', data.message);
        
        if (data.success) {
            const button = document.querySelector(`.btn-help[data-card-id="${cardId}"]`);
            const participantsSpan = document.querySelector(`.project-card[data-card-id="${cardId}"] .participants-count`);
            
            if (button) {
                button.textContent = 'Вы участвуете';
                button.disabled = true;
            }
            
            if (participantsSpan) {
                const currentText = participantsSpan.textContent;
                const parts = currentText.split('/');
                if (parts.length === 2) {
                    const current = parseInt(parts[0]) + 1;
                    const max = parts[1];
                    participantsSpan.textContent = `${current}/${max} участников`;
                }
            }
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Ошибка соединения с сервером');
    }
}

// Загрузка карточек при инициализации страницы
async function loadInitialCards() {
    console.log('Загрузка начальных карточек...');
    
    try {
        const response = await fetch(`php/get_cards_ajax.php?card_page=${currentPage}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.html) {
            document.getElementById('projectsContainer').innerHTML = data.html;
            currentPage = data.current_page || currentPage;
            totalPages = data.total_pages || totalPages;
            
            updatePaginationButtons();
            initCardsEventHandlers();
            
            console.log('Карточки успешно загружены');
        } else {
            throw new Error('Неверный формат ответа от сервера');
        }
        
    } catch (error) {
        console.error('Ошибка загрузки карточек:', error);
        document.getElementById('projectsContainer').innerHTML = `
            <div style="text-align: center; color: white; padding: 40px;">
                <p>Ошибка загрузки проектов. Пожалуйста, обновите страницу.</p>
            </div>
        `;
    }
}

let accessibilityMode = false;

function toggleAccessibilityMode() {
    const panel = document.getElementById('accessibilityPanel');
    if (!panel) {
        console.error('Панель доступности не найдена!');
        return;
    }
    
    accessibilityMode = !accessibilityMode;
    
    if (accessibilityMode) {
        panel.classList.add('show');
        document.body.style.overflow = 'hidden';
        console.log('Панель доступности открыта');
    } else {
        panel.classList.remove('show');
        document.body.style.overflow = '';
        console.log('Панель доступности закрыта');
    }
}

// Добавляем отдельную функцию для закрытия панели
function closeAccessibilityPanel() {
    const panel = document.getElementById('accessibilityPanel');
    if (panel) {
        panel.classList.remove('show');
        document.body.style.overflow = '';
        accessibilityMode = false;
    }
}

function changeFontSize(size) {
    // Удаляем все классы размера шрифта с html и body
    document.documentElement.classList.remove('accessibility-large-font', 'accessibility-larger-font');
    document.body.classList.remove('accessibility-large-font', 'accessibility-larger-font');
    
    // Удаляем inline стили
    document.documentElement.style.fontSize = '';
    document.body.style.fontSize = '';
    
    switch(size) {
        case 'smaller':
            // Стандартный размер - ничего не делаем
            break;
        case 'normal':
            document.documentElement.classList.add('accessibility-large-font');
            document.body.classList.add('accessibility-large-font');
            break;
        case 'larger':
            document.documentElement.classList.add('accessibility-larger-font');
            document.body.classList.add('accessibility-larger-font');
            break;
    }
    
    // Принудительно применяем стили ко всем элементам
    applyFontSizeToAllElements(size);
    
    // Применяем к модальным окнам
    applyAccessibilityToModal(modal);
    
    console.log('Размер текста изменён:', size);
}

function changeLineHeight(height) {
    document.documentElement.classList.remove('accessibility-large-line-height');
    document.body.classList.remove('accessibility-large-line-height');
    
    // Удаляем inline стили
    document.documentElement.style.lineHeight = '';
    document.body.style.lineHeight = '';
    
    if (height === 'large') {
        document.documentElement.classList.add('accessibility-large-line-height');
        document.body.classList.add('accessibility-large-line-height');
    }
    
    // Принудительно применяем межстрочный интервал ко всем элементам
    applyLineHeightToAllElements(height);
    
    // Применяем к модальным окнам
    applyAccessibilityToModal(modal);
    
    console.log('Межстрочный интервал изменён:', height);
}

function changeFontFamily(font) {
    document.documentElement.classList.remove('accessibility-dyslexic-font');
    document.body.classList.remove('accessibility-dyslexic-font');
    
    // Удаляем inline стили
    document.documentElement.style.fontFamily = '';
    document.body.style.fontFamily = '';
    
    if (font === 'dyslexic') {
        document.documentElement.classList.add('accessibility-dyslexic-font');
        document.body.classList.add('accessibility-dyslexic-font');
    }
    
    // Принудительно применяем шрифт ко всем элементам
    applyFontFamilyToAllElements(font);
    
    // Применяем к модальным окнам
    applyAccessibilityToModal(modal);
    
    console.log('Шрифт изменён:', font);
}

function changeColorScheme(scheme) {
    // Удаляем все классы цветовых схем
    document.documentElement.classList.remove('accessibility-high-contrast', 'accessibility-dark');
    document.body.classList.remove('accessibility-high-contrast', 'accessibility-dark');
    
    switch(scheme) {
        case 'normal':
            // Обычная схема - ничего не делаем
            break;
        case 'contrast':
            document.documentElement.classList.add('accessibility-high-contrast');
            document.body.classList.add('accessibility-high-contrast');
            break;
        case 'dark':
            document.documentElement.classList.add('accessibility-dark');
            document.body.classList.add('accessibility-dark');
            break;
    }
    
    // Применяем к модальным окнам
    applyAccessibilityToModal(modal);
    
    // Обновляем активные кнопки
    document.querySelectorAll('.scheme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-scheme') === scheme) {
            btn.classList.add('active');
        }
    });
    
    console.log('Цветовая схема изменена:', scheme);
}

// Функции для принудительного применения стилей ко всем элементам
function applyFontSizeToAllElements(size) {
    const elements = document.querySelectorAll('*');
    elements.forEach(element => {
        switch(size) {
            case 'smaller':
                element.style.fontSize = '';
                break;
            case 'normal':
                element.style.fontSize = '18px';
                break;
            case 'larger':
                element.style.fontSize = '20px';
                break;
        }
    });
}

function applyLineHeightToAllElements(height) {
    const elements = document.querySelectorAll('*');
    elements.forEach(element => {
        if (height === 'large') {
            element.style.lineHeight = '1.8';
        } else {
            element.style.lineHeight = '';
        }
    });
}

function applyFontFamilyToAllElements(font) {
    const elements = document.querySelectorAll('*');
    elements.forEach(element => {
        if (font === 'dyslexic') {
            element.style.fontFamily = 'Comic Sans MS, Arial, sans-serif';
        } else {
            element.style.fontFamily = '';
        }
    });
}

// Сбрасываем все настройки на html элементе и body
function resetAccessibilitySettings() {
    document.documentElement.className = '';
    document.body.className = '';
    
    // Сбрасываем inline стили у html и body
    document.documentElement.style.fontSize = '';
    document.documentElement.style.lineHeight = '';
    document.documentElement.style.fontFamily = '';
    document.body.style.fontSize = '';
    document.body.style.lineHeight = '';
    document.body.style.fontFamily = '';
    
    // Сбрасываем inline стили у всех элементов
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
        element.style.fontSize = '';
        element.style.lineHeight = '';
        element.style.fontFamily = '';
    });
    
    // Сбрасываем модальные окна
    const modals = document.querySelectorAll('.auth-modal, .auth-dialog, .auth-form');
    modals.forEach(modal => {
        modal.className = modal.className.replace(/accessibility-\S+/g, '');
        modal.style.fontSize = '';
        modal.style.lineHeight = '';
        modal.style.fontFamily = '';
    });
    
    // Сбрасываем активные кнопки
    document.querySelectorAll('.scheme-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Сбрасываем активные кнопки размера шрифта
    document.querySelectorAll('.size-controls button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Сбрасываем активные кнопки межстрочного интервала
    document.querySelectorAll('.spacing-controls button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Сбрасываем активные кнопки шрифта
    document.querySelectorAll('.font-controls button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    console.log('Все настройки сброшены');
    showToast('Настройки доступности', 'Все настройки сброшены');
}

function openAdminModal() {
    const modal = document.getElementById('adminModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    applyAccessibilityToModal(modal);
    loadAdminData();
}

function closeAdminModal() {
    const modal = document.getElementById('adminModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// Загрузка данных для админ панели
async function loadAdminData() {
    const tableBody = document.getElementById('adminUsersTable');
    const loading = document.getElementById('adminLoading');
    const totalUsers = document.getElementById('totalUsers');
    
    tableBody.innerHTML = '';
    loading.style.display = 'block';
    
    try {
        const response = await fetch('php/admin_ajax.php?action=get_users');
        const data = await response.json();
        
        if (data.status === 'success') {
            renderUsersTable(data.users);
            totalUsers.textContent = data.users.length;
        } else {
            showAdminMessage('Ошибка загрузки данных: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showAdminMessage('Ошибка соединения с сервером', 'error');
    } finally {
        loading.style.display = 'none';
    }
}

// Рендер таблицы пользователей
function renderUsersTable(users) {
    const tableBody = document.getElementById('adminUsersTable');
    
    if (users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                    Пользователи не найдены
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${escapeHtml(user.login)}</td>
            <td>${escapeHtml(user.name || '')}</td>
            <td>${escapeHtml(user.surname || '')}</td>
            <td>
                ${user.roles ? user.roles.split(',').map(role => `
                    <span class="role-badge role-${role}">${role}</span>
                `).join('') : '<span style="color: rgba(255,255,255,0.5);">нет ролей</span>'}
            </td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="role-controls">
                    <div class="role-section">
                        <span class="role-section-label">Назначить роль:</span>
                        <button class="role-btn add" onclick="adminAssignRole(${user.id}, 'admin')" ${user.roles && user.roles.includes('admin') ? 'disabled' : ''}>
                            + Админ
                        </button>
                        <button class="role-btn add" onclick="adminAssignRole(${user.id}, 'nko')" ${user.roles && user.roles.includes('nko') ? 'disabled' : ''}>
                            + НКО
                        </button>
                        <button class="role-btn add" onclick="adminAssignRole(${user.id}, 'user')" ${user.roles && user.roles.includes('user') ? 'disabled' : ''}>
                            + Пользователь
                        </button>
                    </div>
                    <div class="role-section">
                        <span class="role-section-label">Убрать роль:</span>
                        <button class="role-btn remove" onclick="adminRemoveRole(${user.id}, 'admin')" ${user.roles && user.roles.includes('admin') ? '' : 'disabled'}>
                            - Админ
                        </button>
                        <button class="role-btn remove" onclick="adminRemoveRole(${user.id}, 'nko')" ${user.roles && user.roles.includes('nko') ? '' : 'disabled'}>
                            - НКО
                        </button>
                        <button class="role-btn remove" onclick="adminRemoveRole(${user.id}, 'user')" ${user.roles && user.roles.includes('user') ? '' : 'disabled'}>
                            - Пользователь
                        </button>
                    </div>
                </div>
            </td>
            <td>
                <div class="admin-actions">
                    <button class="delete-btn" onclick="adminDeleteUser(${user.id})" ${user.is_current ? 'disabled' : ''}>
                        Удалить
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Функции управления ролями
async function adminAssignRole(userId, role) {
    if (!confirm(`Назначить роль "${role}" пользователю?`)) return;
    
    try {
        const response = await fetch('php/admin_ajax.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=assign_role&user_id=${userId}&role=${role}`
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showAdminMessage(data.message, 'success');
            loadAdminData(); // Перезагружаем данные
        } else {
            showAdminMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showAdminMessage('Ошибка соединения с сервером', 'error');
    }
}

async function adminRemoveRole(userId, role) {
    if (!confirm(`Убрать роль "${role}" у пользователя?`)) return;
    
    try {
        const response = await fetch('php/admin_ajax.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=remove_role&user_id=${userId}&role=${role}`
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showAdminMessage(data.message, 'success');
            loadAdminData(); // Перезагружаем данные
        } else {
            showAdminMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showAdminMessage('Ошибка соединения с сервером', 'error');
    }
}

async function adminDeleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
    
    try {
        const response = await fetch('php/admin_ajax.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=delete_user&user_id=${userId}`
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showAdminMessage(data.message, 'success');
            loadAdminData(); // Перезагружаем данные
        } else {
            showAdminMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showAdminMessage('Ошибка соединения с сервером', 'error');
    }
}

// Вспомогательные функции
function showAdminMessage(message, type) {
    const messageEl = document.getElementById('adminMessage');
    messageEl.textContent = message;
    messageEl.className = `admin-message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function initAnimations() {
    initScrollAnimations();
    initParallax();
    initCardsAnimation();
}

// Анимация появления элементов при скролле
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Добавляем анимацию появления для карточек
    document.querySelectorAll('.stat-card, .step-card, .project-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// Анимация для карточек при AJAX-загрузке
function initCardsAnimation() {
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

// Функция для плавной смены контента при AJAX-пагинации
function animateContentChange(container, newHTML, callback) {
    // Плавное исчезновение
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    setTimeout(() => {
        // Замена контента
        container.innerHTML = newHTML;
        
        // Плавное появление
        setTimeout(() => {
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
            
            // Реинициализируем анимации
            initScrollAnimations();
            initCardsAnimation();
            
            // Вызываем callback если есть
            if (callback) callback();
        }, 50);
    }, 300);
}

// Параллакс эффекты
function initParallax() {
    // Параллакс для фоновых линий
    document.addEventListener('scroll', () => {
        const backgroundSvg = document.querySelector('.background-svg');
        if (backgroundSvg) {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.3;
            backgroundSvg.style.transform = `translateY(${rate}px)`;
        }
    });

    // Параллакс для декоративных линий
    document.addEventListener('scroll', () => {
        const lines = document.querySelectorAll('.decorative-lines');
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        lines.forEach((line, index) => {
            line.style.transform = `translateY(${rate * (index + 1) * 0.3}px)`;
        });
    });
}

// AJAX обработка формы входа
document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    console.log("Отправка формы входа");
    const formData = new FormData(this);
    
    try {
        const response = await fetch('php/auth.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        console.log("Ответ сервера:", data);
        
        showToast(data.status === 'success' ? 'Успех' : 'Ошибка', data.message);
        
        if (data.status === 'success') {
            setTimeout(() => {
                console.log("Перезагрузка страницы...");
                location.reload();
            }, 1500);
        }
    } catch (error) {
        console.error("Ошибка:", error);
        showToast('Ошибка', 'Ошибка соединения с сервером');
    }
});

// AJAX обработка формы регистрации
document.getElementById('registerForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    try {
        const response = await fetch('php/register.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        showToast(data.status === 'success' ? 'Успех' : 'Ошибка', data.message);
        
        // ТОЛЬКО при успешной регистрации переключаем на форму входа
        if (data.status === 'success') {
            setTimeout(() => {
                switchAuthForm('login');
                document.getElementById('loginEmail').value = document.getElementById('registerEmail').value;
                document.getElementById('registerForm').reset();
            }, 1500);
        }
        // При ошибке форма остается открытой
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Ошибка соединения с сервером');
    }
});

// Улучшенная загрузка данных профиля
window.loadProfileData = async function() {
    try {
        console.log("Загрузка данных профиля...");
        
        // Показываем индикатор загрузки в секции проектов
        const projectsList = document.getElementById('projectsList');
        if (projectsList) {
            projectsList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7);">
                    <div class="loading-spinner" style="width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
                    Загрузка проектов...
                </div>
            `;
        }
        
        const response = await fetch('php/get_profile.php');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Данные профиля:", data);
        
        if (data.success) {
            fillProfileForm(data);
        } else {
            showToast('Ошибка', data.message);
        }
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        showToast('Ошибка', 'Не удалось загрузить данные профиля');
        
        // Показываем ошибку в секции проектов
        const projectsList = document.getElementById('projectsList');
        if (projectsList) {
            projectsList.innerHTML = `
                <p style="color: #ff6b6b; text-align: center; padding: 20px;">
                    Ошибка загрузки проектов
                </p>
            `;
        }
    }
}

window.initProfileScroll = function() {
    const scrollable = document.querySelector('.profile-scrollable');
    const dialog = document.querySelector('#profileModal .auth-dialog.xlarge');
    if (!scrollable || !dialog) return;

    // ✅ Рассчитываем высоту динамически:
    // Высота диалога минус:
    // - высота крестика (≈50px)
    // - высота табов (≈60px)
    // - высота кнопки «Сохранить» (≈60px)
    // - отступы (≈40px)
    const availableHeight = dialog.clientHeight - 50 - 60 - 60 - 40;
    
    scrollable.style.maxHeight = Math.max(200, availableHeight) + 'px';
    scrollable.style.overflowY = 'auto';
    
    console.log('initProfileScroll: dialog height =', dialog.clientHeight, ', scrollable maxHeight =', scrollable.style.maxHeight);
};

// Функция заполнения полей профиля
window.fillProfileForm = function(data) {
    console.log("Заполнение формы профиля данными:", data);

    // Основные поля
    document.getElementById('profileName').value = data.user.name || '';
    document.getElementById('profileSurname').value = data.user.surname || '';
    document.getElementById('profileEmail').value = data.user.login || '';

    // Блок НКО
    const nkoSection = document.getElementById('nkoProfileSection');
    const hint = document.getElementById('profileNkoHint');
    const logoPreview = document.getElementById('profileNkoLogoPreview');

    if (!nkoSection) return;

    // Показываем секцию в любом случае (даже если НКО нет)
    nkoSection.style.display = 'block';

    if (data.nko) {
        // Данные существуют -> показываем данные НКО

        hint.style.display = 'none';

        document.getElementById('profileNkoName').value = data.nko.name || '';
        document.getElementById('profileNkoCategory').value = data.nko.category || '';
        document.getElementById('profileNkoDescription').value = data.nko.description || '';
        document.getElementById('profileNkoActivities').value = data.nko.activities || '';
        document.getElementById('profileNkoPhone').value = data.nko.phone || '';
        document.getElementById('profileNkoAddress').value = data.nko.address || '';
        document.getElementById('profileNkoWebsite').value = data.nko.website || '';
        document.getElementById('profileNkoSocial').value = data.nko.social_links || '';

        // Предпросмотр логотипа
        if (data.nko.logo_path) {
            logoPreview.src = data.nko.logo_path;
            logoPreview.style.display = 'block';
        } else {
            logoPreview.style.display = 'none';
        }

        // Показываем уведомления о статусе НКО
        if (data.nko.status === 'pending') {
            showToast('Информация', 'Ваша НКО ожидает модерации');
        } else if (data.nko.status === 'approved') {
            showToast('Успех', 'Ваша НКО прошла модерацию и отображается на карте');
        } else if (data.nko.status === 'rejected') {
            showToast('Внимание', 'НКО не прошла модерацию. Причина: ' + (data.nko.moderation_comment || 'не указана'));
        }

    } else {
        // Данных НКО нет -> показываем пустые поля + подсказку

        hint.style.display = 'block';

        document.getElementById('profileNkoName').value = '';
        document.getElementById('profileNkoCategory').value = '';
        document.getElementById('profileNkoDescription').value = '';
        document.getElementById('profileNkoActivities').value = '';
        document.getElementById('profileNkoPhone').value = '';
        document.getElementById('profileNkoAddress').value = '';
        document.getElementById('profileNkoWebsite').value = '';
        document.getElementById('profileNkoSocial').value = '';

        logoPreview.style.display = 'none';
    }

    // Загружаем проекты
    loadUserProjects(data.projects || []);
};


// Улучшенная функция загрузки проектов
window.loadUserProjects = function(projects) {
    const projectsList = document.getElementById('projectsList');
    if (!projectsList) {
        console.error('Элемент projectsList не найден!');
        return;
    }
    
    console.log('Загрузка проектов:', projects);
    
    if (projects.length === 0) {
        projectsList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.05); border-radius: 8px;">
                <p style="margin: 0;">У вас пока нет созданных проектов</p>
            </div>
        `;
        return;
    }
    
    let projectsHTML = `
        <div class="user-projects-list">
            <p style="color: rgba(255,255,255,0.8); margin-bottom: 15px; font-size: 14px;">
                Всего проектов: <strong>${projects.length}</strong>
            </p>
    `;
    
    projects.forEach(project => {
        const statusBadge = project.status === 'СРОЧНО' ? 
            '<span class="badge badge-urgent" style="font-size: 10px; padding: 2px 6px;">СРОЧНО</span>' : '';
        
        const typeBadge = project.type === 'СОЦ.ПРОЕКТ' ? 
            '<span class="badge badge-social" style="font-size: 10px; padding: 2px 6px;">Социальный</span>' : 
            project.type === 'ЭКОЛОГИЯ' ? 
            '<span class="badge badge-ecology" style="font-size: 10px; padding: 2px 6px;">Экология</span>' : 
            '<span class="badge badge-animals" style="font-size: 10px; padding: 2px 6px;">Животные</span>';
        
        projectsHTML += `
            <div class="user-project-item" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px; background: rgba(255,255,255,0.08); border-radius: 6px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                        ${statusBadge}
                        ${typeBadge}
                        <strong style="color: white; font-family: 'Roboto', sans-serif; font-size: 14px;">${escapeHtml(project.header)}</strong>
                    </div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7);">
                        📍 ${escapeHtml(project.location)} | 📅 ${escapeHtml(project.date)}
                    </div>
                </div>
                <button type="button" onclick="viewProject(${project.id})" class="btn-text" style="font-size: 11px; padding: 6px 12px; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; background: rgba(255,255,255,0.1); white-space: nowrap;">
                    Просмотреть
                </button>
            </div>
        `;
    });
    
    projectsHTML += '</div>';
    projectsList.innerHTML = projectsHTML;
}

// Функция для просмотра проекта
window.viewProject = function(projectId) {
    closeProfileModal();
    
    setTimeout(() => {
        const projectElement = document.querySelector(`.project-card[data-card-id="${projectId}"]`);
        if (projectElement) {
            projectElement.scrollIntoView({ behavior: 'smooth' });
            projectElement.style.boxShadow = '0 0 0 3px rgba(74, 144, 226, 0.5)';
            projectElement.style.transform = 'scale(1.02)';
            setTimeout(() => {
                projectElement.style.boxShadow = '';
                projectElement.style.transform = '';
            }, 3000);
        } else {
            if (typeof changeCardPage === 'function') {
                changeCardPage(1);
                setTimeout(() => {
                    const projectElement = document.querySelector(`.project-card[data-card-id="${projectId}"]`);
                    if (projectElement) {
                        projectElement.scrollIntoView({ behavior: 'smooth' });
                        projectElement.style.boxShadow = '0 0 0 3px rgba(74, 144, 226, 0.5)';
                        projectElement.style.transform = 'scale(1.02)';
                        setTimeout(() => {
                            projectElement.style.boxShadow = '';
                            projectElement.style.transform = '';
                        }, 3000);
                    }
                }, 1000);
            }
        }
    }, 500);
}

// Экранирование HTML
window.escapeHtml = function(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Улучшенная загрузка данных НКО
window.loadNkoData = async function() {
    try {
        const response = await fetch('php/get_nko.php');
        const data = await response.json();
        
        if (data.success) {
            if (data.nko) {
                // Заполняем форму данными НКО
                document.getElementById('nkoName').value = data.nko.name || '';
                document.getElementById('nkoCategory').value = data.nko.category || '';
                document.getElementById('nkoDescription').value = data.nko.description || '';
                document.getElementById('nkoActivities').value = data.nko.activities || '';
                document.getElementById('nkoPhone').value = data.nko.phone || '';
                document.getElementById('nkoAddress').value = data.nko.address || '';
                document.getElementById('nkoWebsite').value = data.nko.website || '';
                document.getElementById('nkoSocial').value = data.nko.social_links || '';
                
                // Показываем статус
                const submitBtn = document.querySelector('#nkoForm .auth-submit');
                if (data.nko.status === 'pending') {
                    submitBtn.textContent = 'Обновить данные НКО (ожидает модерации)';
                } else if (data.nko.status === 'approved') {
                    submitBtn.textContent = 'Обновить данные НКО (одобрено)';
                } else if (data.nko.status === 'rejected') {
                    submitBtn.textContent = 'Обновить данные НКО (отклонено)';
                    showToast('Внимание', 'Ваша НКО не прошла модерацию. Причина: ' + (data.nko.moderation_comment || 'не указана'));
                }
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки данных НКО:', error);
    }
}

// Обработчик формы профиля
document.getElementById('profileForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const form = this;
    const submitBtn = form.querySelector('.auth-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Сохранение...';
    submitBtn.disabled = true;

    try {
        // 1) Сохраняем основные данные пользователя (name, surname, login) через save_profile.php
        const profileFormData = new FormData();
        profileFormData.append('name', document.getElementById('profileName').value.trim());
        profileFormData.append('surname', document.getElementById('profileSurname').value.trim());
        profileFormData.append('login', document.getElementById('profileEmail').value.trim());

        const profileResp = await fetch('php/save_profile.php', {
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

        // 2) Подготовка данных НКО (FormData — чтобы поддержать файл)
        const nkoFormData = new FormData();
        nkoFormData.append('name', document.getElementById('profileNkoName').value.trim());
        nkoFormData.append('category', document.getElementById('profileNkoCategory').value);
        nkoFormData.append('description', document.getElementById('profileNkoDescription').value.trim());
        nkoFormData.append('activities', document.getElementById('profileNkoActivities').value.trim());
        nkoFormData.append('phone', document.getElementById('profileNkoPhone').value.trim());
        nkoFormData.append('address', document.getElementById('profileNkoAddress').value.trim());
        nkoFormData.append('website', document.getElementById('profileNkoWebsite').value.trim());
        nkoFormData.append('social_links', document.getElementById('profileNkoSocial').value.trim());
        // файл (если выбран)
        const logoInput = document.getElementById('profileNkoLogo');
        if (logoInput && logoInput.files && logoInput.files[0]) {
            nkoFormData.append('logo', logoInput.files[0]);
        }

        // Уточним: есть ли в профиле данные НКО (установлено при загрузке)
        const hasExistingNkoData = window.profileHasNkoData || false;

        // Валидация: если НКО ещё нет в БД — требуем заполнение обязательных полей
        if (!hasExistingNkoData) {
            const missing = [];
            if (!nkoFormData.get('name')) missing.push('название');
            if (!nkoFormData.get('category')) missing.push('категория');
            if (!nkoFormData.get('description')) missing.push('описание');
            if (!nkoFormData.get('activities')) missing.push('функционал волонтеров');

            if (missing.length > 0) {
                showToast('Ошибка', 'Заполните все поля: ' + missing.join(', '));
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                return;
            }
        }

        // 3) Отправляем данные НКО на сервер
        const nkoResp = await fetch('php/save_nko.php', {
            method: 'POST',
            body: nkoFormData
            // не нужно явно выставлять заголовок — браузер поставит multipart/form-data
        });

        const nkoData = await nkoResp.json();

        if (nkoData.success) {
            showToast('Успех', nkoData.message || 'Данные сохранены');
            // Если сервер вернул путь до лого — обновим предпросмотр
            if (nkoData.logo_path) {
                const preview = document.getElementById('profileNkoLogoPreview');
                if (preview) {
                    preview.src = nkoData.logo_path;
                    preview.style.display = 'block';
                }
            }
            // Обновим флаг и перезагрузим профиль
            window.profileHasNkoData = true;
            setTimeout(() => {
                closeProfileModal();
                if (typeof loadProfileData === 'function') loadProfileData();
            }, 800);
        } else {
            showToast('Ошибка', nkoData.message || 'Не удалось сохранить данные НКО');
        }

    } catch (err) {
        console.error('Ошибка сохранения профиля/НКО:', err);
        showToast('Ошибка', 'Ошибка соединения с сервером');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});


// Резервная функция для загрузки профиля
window.loadProfileDataDirect = async function() {
    try {
        console.log("Прямая загрузка данных профиля...");
        const response = await fetch('php/get_profile.php');
        const data = await response.json();
        
        if (data.success) {
            // Заполняем форму напрямую
            document.getElementById('profileName').value = data.user.name || '';
            document.getElementById('profileSurname').value = data.user.surname || '';
            document.getElementById('profileEmail').value = data.user.login || '';
            
            // Загружаем проекты
            if (data.projects && data.projects.length > 0) {
                loadUserProjects(data.projects);
            }
        }
    } catch (error) {
        console.error('Ошибка прямой загрузки:', error);
    }
}

// Сохранение НКО из профиля
window.saveNkoFromProfile = function () {

    const isNew = !window.profileHasNkoData;

    // Проверка на обязательные поля при создании
    if (isNew) {
        const requiredFields = [
            'profileNkoName',
            'profileNkoCategory',
            'profileNkoDescription',
            'profileNkoActivities'
        ];

        for (let f of requiredFields) {
            if (!document.getElementById(f).value.trim()) {
                showToast("Ошибка", "Заполните все обязательные поля!");
                return;
            }
        }
    }

    const formData = new FormData();
    formData.append('name', document.getElementById('profileNkoName').value);
    formData.append('category', document.getElementById('profileNkoCategory').value);
    formData.append('description', document.getElementById('profileNkoDescription').value);
    formData.append('activities', document.getElementById('profileNkoActivities').value);
    formData.append('phone', document.getElementById('profileNkoPhone').value);
    formData.append('address', document.getElementById('profileNkoAddress').value);
    formData.append('website', document.getElementById('profileNkoWebsite').value);
    formData.append('social_links', document.getElementById('profileNkoSocial').value);

    // ЛОГОТИП из формы профиля
    const logoInput = document.getElementById('profileNkoLogo');
    if (logoInput && logoInput.files.length > 0) {
        formData.append("logo", logoInput.files[0]);
    }

    fetch("php/save_nko.php", {
        method: "POST",
        body: formData,
        credentials: "include"
    })
        .then(r => r.json())
        .then(res => {
            console.log("Ответ save_nko.php:", res);

            if (res.success) {
                showToast("Успех", res.message);

                // Если вернулся новый логотип — показать в профиле
                if (res.logo_path) {
                    const preview = document.getElementById("profileNkoLogoPreview");
                    preview.src = res.logo_path;
                    preview.style.display = "block";
                }

                loadProfile(); // обновляем форму
            } else {
                showToast("Ошибка", res.message || "Не удалось сохранить данные НКО");
            }
        })
        .catch(err => {
            console.error(err);
            showToast("Ошибка", "Произошла ошибка подключения");
        });
};

class CountersManager {
    constructor() {
        this.counters = {
            projects: 0,
            volunteers: 0,
            cities: 0,
            organizations: 0
        };
        this.init();
    }

    async init() {
        await this.loadRealCounters();
        this.setupEventListeners();
    }

    async loadRealCounters() {
        try {
            const response = await fetch('php/get_stats.php');
            const data = await response.json();
            
            if (data.success) {
                this.counters = data.stats;
                this.updateCounters();
            }
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
            // Используем значения по умолчанию
            this.counters = {
                projects: 300,
                volunteers: 5202,
                cities: 32,
                organizations: 130
            };
            this.updateCounters();
        }
    }

    setupEventListeners() {
        // Слушаем создание новых карточек
        document.addEventListener('cardCreated', () => {
            this.incrementCounter('projects');
        });

        // Слушаем участие в проектах
        document.addEventListener('volunteerJoined', () => {
            this.incrementCounter('volunteers');
        });
    }

    incrementCounter(counterName) {
        if (this.counters[counterName] !== undefined) {
            this.counters[counterName]++;
            this.updateCounterDisplay(counterName);
        }
    }

    updateCounterDisplay(counterName) {
        const elements = {
            projects: '.stat-card:nth-child(3) .stat-number',
            volunteers: '.stat-card:nth-child(4) .stat-number',
            cities: '.stat-card:nth-child(1) .stat-number',
            organizations: '.stat-card:nth-child(2) .stat-number'
        };

        const element = document.querySelector(elements[counterName]);
        if (element) {
            this.animateCounter(element, this.counters[counterName]);
        }
    }

    animateCounter(element, newValue) {
        const currentValue = parseInt(element.textContent.replace(/\D/g, '')) || 0;
        const duration = 1000;
        const steps = 20;
        const stepValue = (newValue - currentValue) / steps;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const value = Math.round(currentValue + (stepValue * currentStep));
            element.textContent = value.toLocaleString();

            if (currentStep >= steps) {
                element.textContent = newValue.toLocaleString();
                clearInterval(timer);
            }
        }, duration / steps);
    }

    updateCounters() {
        Object.keys(this.counters).forEach(counter => {
            this.updateCounterDisplay(counter);
        });
    }

    addProject() {
        this.incrementCounter('projects');
        document.dispatchEvent(new CustomEvent('cardCreated'));
    }

    addVolunteer() {
        this.incrementCounter('volunteers');
        document.dispatchEvent(new CustomEvent('volunteerJoined'));
    }
}

// Инициализация менеджера счетчиков
const countersManager = new CountersManager();
window.countersManager = countersManager;

function toggleCategoryDropdown(dropdownId) {
    const dropdown = document.getElementById(`${dropdownId}-dropdown`);
    
    // Закрываем другие открытые dropdown
    document.querySelectorAll('.category-dropdown-menu').forEach(menu => {
        if (menu.id !== `${dropdownId}-dropdown`) {
            menu.classList.remove('show');
        }
    });
    
    dropdown.classList.toggle('show');
    currentDropdown = dropdownId;
    
    // Закрываем все подкатегории при открытии/закрытии основного меню
    if (!dropdown.classList.contains('show')) {
        hideAllSubcategories();
        currentDropdown = null;
    }
}

function showSubcategories(category, dropdownId) {
    // Скрываем предыдущие подкатегории
    hideAllSubcategories();
    
    // Показываем выбранные подкатегории
    const subcategories = document.getElementById(`${category}-subcategories`);
    if (subcategories) {
        subcategories.classList.add('show');
        currentSubcategory = category;
        currentDropdown = dropdownId;
    }
}

function hideAllSubcategories() {
    document.querySelectorAll('.subcategory-menu').forEach(menu => {
        menu.classList.remove('show');
    });
    currentSubcategory = null;
}

function selectSubcategory(category, subcategory, dropdownId) {
    const toggle = document.querySelector(`#${dropdownId}-dropdown`).previousElementSibling.querySelector('span');
    let displayText = getDefaultText(dropdownId);
    
    // Устанавливаем текст в зависимости от выбранной подкатегории
    switch(dropdownId) {
        case 'categories':
            displayText = getCategoryText(category, subcategory);
            break;
        case 'help-type':
            displayText = getHelpTypeText(category, subcategory);
            break;
        case 'participation':
            displayText = getParticipationText(category, subcategory);
            break;
        case 'regularity':
            displayText = getRegularityText(category, subcategory);
            break;
    }
    
    toggle.textContent = displayText;
    
    // Закрываем меню
    document.getElementById(`${dropdownId}-dropdown`).classList.remove('show');
    hideAllSubcategories();
    currentDropdown = null;
    
    // Здесь можно добавить фильтрацию проектов
    filterProjects(dropdownId, category, subcategory);
    
    // Показываем уведомление
    showToast('Фильтр применён', `Выбрано: ${displayText}`);
}

// Вспомогательные функции для текста категорий
function getCategoryText(category, subcategory) {
    switch(category) {
        case 'social':
            switch(subcategory) {
                case 'children': return 'Помощь детям';
                case 'elderly': return 'Помощь пожилым';
                case 'all': return 'Все социальные';
            }
            break;
        case 'ecology':
            switch(subcategory) {
                case 'cleanup': return 'Уборка территорий';
                case 'planting': return 'Озеленение';
                case 'all': return 'Все экологические';
            }
            break;
    }
    return 'Все категории';
}

function getHelpTypeText(category, subcategory) {
    switch(category) {
        case 'volunteering': return 'Волонтёрство';
        case 'donations': return 'Пожертвования';
        case 'expertise': return 'Экспертиза';
        case 'mentoring': return 'Наставничество';
    }
    return 'Тип помощи';
}

function getParticipationText(category, subcategory) {
    switch(category) {
        case 'online': return 'Онлайн';
        case 'offline': return 'Офлайн';
        case 'hybrid': return 'Гибрид';
    }
    return 'Формат участия';
}

function getRegularityText(category, subcategory) {
    switch(category) {
        case 'regular': return 'Регулярная помощь';
        case 'one-time': return 'Разовое участие';
        case 'ongoing': return 'Постоянная поддержка';
    }
    return 'Регулярность';
}

// Функция фильтрации проектов (заглушка)
function filterProjects(dropdownId, category, subcategory) {
    console.log(`Фильтрация [${dropdownId}]: ${category} - ${subcategory}`);
    // Здесь добавьте логику фильтрации ваших проектов
}

// Предпросмотр логотипа в профиле
document.getElementById('profileNkoLogo').addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const preview = document.getElementById('profileNkoLogoPreview');
        preview.src = url;
        preview.style.display = 'block';
    }
});


// Валидация форм
function initFormValidation() {
    console.log("Инициализация валидации форм...");
    
    // Валидация телефона в реальном времени
    document.getElementById('nkoPhone')?.addEventListener('blur', function(e) {
        const phone = e.target.value.trim();
        if (phone && !validatePhone(phone)) {
            showFieldError(this, 'Введите корректный номер телефона');
        } else {
            clearFieldError(this);
        }
    });

    // Валидация URL в реальном времени
    document.getElementById('nkoWebsite')?.addEventListener('blur', function(e) {
        const url = e.target.value.trim();
        if (url && !validateURL(url)) {
            showFieldError(this, 'Введите корректный URL сайта');
        } else {
            clearFieldError(this);
        }
    });

    // Автоматическое форматирование телефона
    document.getElementById('nkoPhone')?.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.startsWith('7') || value.startsWith('8')) {
            value = value.substring(1);
        }
        
        let formattedValue = '';
        if (value.length > 0) {
            formattedValue = '+7 (';
            if (value.length > 3) {
                formattedValue += value.substring(0, 3) + ') ' + value.substring(3, 6);
                if (value.length > 6) {
                    formattedValue += '-' + value.substring(6, 8);
                    if (value.length > 8) {
                        formattedValue += '-' + value.substring(8, 10);
                    }
                }
            } else {
                formattedValue += value;
            }
        }
        
        e.target.value = formattedValue;
    });
}

// Валидация телефона
function validatePhone(phone) {
    const phoneRegex = /^(\+7|7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
    return phone === '' || phoneRegex.test(phone);
}

// Валидация URL
function validateURL(url) {
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    return url === '' || urlRegex.test(url);
}

function showFieldError(field, message) {
    clearFieldError(field);
    field.style.borderColor = '#FF4757';
    field.style.background = 'rgba(255, 71, 87, 0.1)';
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.color = '#FF4757';
    errorDiv.style.fontSize = '12px';
    errorDiv.style.marginTop = '5px';
    errorDiv.style.fontFamily = 'Roboto, sans-serif';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(field) {
    field.style.borderColor = '';
    field.style.background = '';
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}


// --- Unified Yandex Map Initialization ---
if (window.ymaps) {
    ymaps.ready(initMap);
} else {
    window.addEventListener("load", () => {
        if (window.ymaps) ymaps.ready(initMap);
    });
}
// --- End Map Init ---
function initMap() {
    if (typeof ymaps === 'undefined') {
        console.error('Yandex Maps API не загружена');
        return;
    }

    ymaps.ready(function() {
        console.log('Yandex Maps API загружена');
        
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Элемент карты не найден');
            return;
        }

        try {
            const map = new ymaps.Map("map", {
                center: [55.76, 37.64],
                zoom: 4,
                controls: ["zoomControl"]
            });

            const objectManager = new ymaps.ObjectManager({
                clusterize: true,
                gridSize: 64
            });

            map.geoObjects.add(objectManager);

            const typePresets = {
                "Город присутствия ГК Росатом": "islands#blueCircleIcon",
                "Социальная защита": "islands#blueDotIcon",
                "Экология и устойчивое развитие": "islands#greenDotIcon",
                "Здоровье и спорт": "islands#orangeDotIcon",
                "Культура и образование": "islands#purpleDotIcon",
                "Местное сообщество и развитие территорий": "islands#darkGreenDotIcon",
                "Защита животных": "islands#pinkDotIcon",
                "Другое": "islands#grayDotIcon"
            };

            // Загружаем данные из CSV
            Papa.parse("data/nko.csv", {
                download: true,
                header: true,
                delimiter: ";",
                complete: function(results) {
                    const rawData = results.data;
                    const points = [];

                    rawData.forEach((row, index) => {
                        const lat = parseFloat(row["Широта"]);
                        const lon = parseFloat(row["Долгота"]);
                        const name = row["Подпись"]?.trim();
                        const desc = row["Описание"]?.trim();

                        if (!lat || !lon || !name) return;

                        let type = "Другое";
                        let description = "";

                        if (desc.includes("Город присутствия ГК Росатом")) {
                            type = "Город присутствия ГК Росатом";
                            description = type;
                        } else {
                            const match = desc.match(/Деятельность НКО:\s*(.*?)(\.|\n|$)/);
                            if (match) type = match[1].trim();
                            description = desc.replace(/Деятельность НКО:\s*.*?(\.|\n)?/, "").trim();
                        }

                        points.push({
                            type: "Feature",
                            id: index + 1,
                            geometry: {
                                type: "Point",
                                coordinates: [lat, lon]
                            },
                            properties: {
                                balloonContent: `<strong>${name}</strong><br>${description}`,
                                clusterCaption: name,
                                hintContent: name,
                                type: type,
                                name: name,
                                description: description
                            },
                            options: {
                                preset: typePresets[type] || "islands#grayDotIcon"
                            }
                        });
                    });

                    objectManager.add({ type: "FeatureCollection", features: points });

                    // Добавляем фильтрацию
                    const types = [...new Set(points.map(p => p.properties.type))];
                    const listBoxItems = types.map(type => new ymaps.control.ListBoxItem({
                        data: { content: type },
                        state: { selected: false }
                    }));

                    const listBoxControl = new ymaps.control.ListBox({
                        data: { content: "Фильтр", title: "Фильтр по типу" },
                        items: listBoxItems,
                        state: {
                            expanded: false,
                            filters: listBoxItems.reduce((acc, item) => {
                                acc[item.data.get("content")] = item.isSelected();
                                return acc;
                            }, {})
                        }
                    });

                    map.controls.add(listBoxControl);

                    listBoxControl.events.add(["select", "deselect"], function (e) {
                        const item = e.get("target");
                        const filters = ymaps.util.extend({}, listBoxControl.state.get("filters"));
                        filters[item.data.get("content")] = item.isSelected();
                        listBoxControl.state.set("filters", filters);
                    });

                    const monitor = new ymaps.Monitor(listBoxControl.state);
                    monitor.add("filters", function (filters) {
                        objectManager.setFilter(obj => filters[obj.properties.type]);
                    });

                    // Добавляем поиск
                    const searchControl = new ymaps.control.SearchControl({
                        options: {
                            provider: new CustomSearchProvider(points),
                            noPlacemark: true,
                            resultsPerPage: 5
                        }
                    });

                    map.controls.add(searchControl, { float: "right" });

                    searchControl.events.add("resultshow", function (e) {
                        const index = e.get("index");
                        const results = searchControl.getResultsArray();
                        const result = results[index];
                        if (!result) return;

                        const coords = result.geometry.getCoordinates();
                        map.setCenter(coords, 10, { duration: 300 });

                        const found = points.find(p => {
                            const c = p.geometry.coordinates;
                            return Math.abs(c[0] - coords[0]) < 1e-6 && Math.abs(c[1] - coords[1]) < 1e-6;
                        });

                        if (found) objectManager.objects.balloon.open(found.id);
                    });
                }
            });

            // Кастомный поисковый провайдер
            function CustomSearchProvider(points) {
                this.points = points;
            }

            CustomSearchProvider.prototype.geocode = function(request, options) {
                const deferred = new ymaps.vow.defer();
                const geoObjects = new ymaps.GeoObjectCollection();
                const offset = options.skip || 0;
                const limit  = options.results || 20;

                const q = String(request || "").toLowerCase().trim();

                const filtered = this.points.filter(p => {
                    return (
                        (p.properties.name && p.properties.name.toLowerCase().includes(q)) ||
                        (p.properties.type && p.properties.type.toLowerCase().includes(q)) ||
                        (p.properties.description && p.properties.description.toLowerCase().includes(q))
                    );
                }).slice(offset, offset + limit);

                filtered.forEach(p => {
                    geoObjects.add(new ymaps.Placemark(p.geometry.coordinates, {
                        name: p.properties.name,
                        description: p.properties.type,
                        balloonContentBody: `<strong>${p.properties.name}</strong><br>${p.properties.description}`,
                        boundedBy: [p.geometry.coordinates, p.geometry.coordinates]
                    }));
                });

                deferred.resolve({
                    geoObjects: geoObjects,
                    metaData: {
                        geocoder: {
                            request: request,
                            found: geoObjects.getLength(),
                            results: limit,
                            skip: offset
                        }
                    }
                });

                return deferred.promise();
            };

            console.log('Карта успешно инициализирована с данными из CSV');

        } catch (error) {
            console.error('Ошибка при создании карты:', error);
        }
    });
}

// Новая функция для инициализации доступности
function initAccessibility() {
    console.log('Инициализация доступности...');
    
    // Применяем настройки к уже открытым модальным окнам
    applyAccessibilityToModal(modal);
    
    // Используем делегирование событий для кнопок доступности
    document.addEventListener('click', function(e) {
        // Проверяем клик по кнопке доступности или её дочерним элементам
        if (e.target.closest('.accessibility-btn') || 
            e.target.closest('.footer-accessibility-btn') ||
            e.target.id === 'accessibilityBtn' || 
            e.target.id === 'footerAccessibilityBtn') {
            
            e.preventDefault();
            e.stopPropagation();
            console.log('Клик по кнопке доступности');
            toggleAccessibilityMode();
        }
    });
    
    // Обработчики для кнопок внутри панели доступности
    const closePanelBtn = document.querySelector('.close-panel');
    if (closePanelBtn) {
        closePanelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeAccessibilityPanel();
        });
    }
    
    const resetBtn = document.querySelector('.reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function(e) {
            e.preventDefault();
            resetAccessibilitySettings();
        });
    }
    
    // Обработчики для кнопок размера шрифта
    document.addEventListener('click', function(e) {
        if (e.target.closest('.size-controls button')) {
            const button = e.target.closest('.size-controls button');
            const size = button.textContent;
            if (size === 'A-') changeFontSize('smaller');
            else if (size === 'A') changeFontSize('normal');
            else if (size === 'A+') changeFontSize('larger');
            
            // Обновляем активные кнопки размера
            document.querySelectorAll('.size-controls button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
        }
    });
    
    // Обработчики для кнопок цветовых схем
    document.addEventListener('click', function(e) {
        if (e.target.closest('.color-schemes button')) {
            const button = e.target.closest('.color-schemes button');
            const scheme = button.getAttribute('data-scheme');
            if (scheme) {
                changeColorScheme(scheme);
            }
        }
    });
    
    // Обработчики для кнопок межстрочного интервала
    document.addEventListener('click', function(e) {
        if (e.target.closest('.spacing-controls button')) {
            const button = e.target.closest('.spacing-controls button');
            const height = button.textContent.toLowerCase();
            if (height === 'обычный') changeLineHeight('normal');
            else if (height === 'увеличенный') changeLineHeight('large');
            
            // Обновляем активные кнопки интервала
            document.querySelectorAll('.spacing-controls button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
        }
    });
    
    // Обработчики для кнопок шрифта
    document.addEventListener('click', function(e) {
        if (e.target.closest('.font-controls button')) {
            const button = e.target.closest('.font-controls button');
            const font = button.textContent.toLowerCase();
            if (font === 'стандартный') changeFontFamily('standard');
            else if (font === 'для дислексии') changeFontFamily('dyslexic');
            
            // Обновляем активные кнопки шрифта
            document.querySelectorAll('.font-controls button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
        }
    });
    
    // Закрытие панели при клике вне её области
    document.addEventListener('click', function(e) {
        const panel = document.getElementById('accessibilityPanel');
        if (panel && panel.classList.contains('show') && 
            !panel.contains(e.target) && 
            !e.target.closest('.accessibility-btn') && 
            !e.target.closest('.footer-accessibility-btn')) {
            closeAccessibilityPanel();
        }
    });
    
    // Закрытие панели при нажатии Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAccessibilityPanel();
        }
    });
    
    console.log('Инициализация доступности завершена');
}

// Базовые слушатели событий
function initEventListeners() {
    console.log("Инициализация слушателей событий...");
    
    // Обработчики для кнопок открытия модальных окон
    document.getElementById('accessibilityBtn')?.addEventListener('click', toggleAccessibilityMode);
    document.getElementById('footerAccessibilityBtn')?.addEventListener('click', toggleAccessibilityMode);
    document.getElementById('loginBtn')?.addEventListener('click', openAuthModal);
    document.getElementById('profileBtn')?.addEventListener('click', openProfileModal);
    document.getElementById('nkoBtn')?.addEventListener('click', openNkoModal);
    
    // Кнопка создания проекта
    const createProjectBtn = document.querySelector('.btn-primary[onclick*="openCreateCardModal"]');
    if (createProjectBtn) {
        createProjectBtn.addEventListener('click', openCreateCardModal);
    }
    
    // Кнопка админ-панели
    const adminBtn = document.querySelector('.admin-btn');
    if (adminBtn) {
        adminBtn.addEventListener('click', openAdminModal);
    }
    
    // Обработчики для кнопок закрытия
    document.getElementById('closeAuthModal')?.addEventListener('click', closeAuthModal);
    document.getElementById('closeNkoModal')?.addEventListener('click', closeNkoModal);
    document.getElementById('closeProfileModal')?.addEventListener('click', closeProfileModal);
    document.getElementById('closeAccessibilityPanel')?.addEventListener('click', closeAccessibilityPanel);

    // Закрытие выпадающих меню при клике вне их
    document.addEventListener('click', function(event) {
        const dropdowns = document.querySelectorAll('.category-dropdown');
        let clickedInside = false;
        
        dropdowns.forEach(dropdown => {
            if (dropdown.contains(event.target)) {
                clickedInside = true;
            }
        });
        
        if (!clickedInside) {
            document.querySelectorAll('.category-dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });
            if (typeof hideAllSubcategories === 'function') {
                hideAllSubcategories();
            }
        }
    });

    // Smooth scroll для anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Закрытие модальных окон по ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Закрываем активное модальное окно
            const activeModals = document.querySelectorAll('.auth-modal.show');
            if (activeModals.length > 0) {
                const activeModal = activeModals[0];
                if (activeModal.id === 'authModal' && typeof closeAuthModal === 'function') closeAuthModal();
                else if (activeModal.id === 'nkoModal' && typeof closeNkoModal === 'function') closeNkoModal();
                else if (activeModal.id === 'profileModal' && typeof closeProfileModal === 'function') closeProfileModal();
                else if (activeModal.id === 'createCardModal' && typeof closeCreateCardModal === 'function') closeCreateCardModal();
                else if (activeModal.id === 'adminModal' && typeof closeAdminModal === 'function') closeAdminModal();
            }
            
            // Закрываем панель доступности
            const accessibilityPanel = document.getElementById('accessibilityPanel');
            if (accessibilityPanel && accessibilityPanel.classList.contains('show') && typeof closeAccessibilityPanel === 'function') {
                closeAccessibilityPanel();
            }
        }
    });

    // Обработчики для accessibility кнопок
    document.querySelectorAll('.scheme-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const scheme = this.getAttribute('data-scheme');
            if (scheme && typeof changeColorScheme === 'function') {
                changeColorScheme(scheme);
            }
        });
    });
    
    // Обработчики для кнопок фильтров карты
    document.querySelectorAll('.filter-badge').forEach(btn => {
        btn.addEventListener('click', function() {
            if (typeof toggleFilter === 'function') {
                const filterType = this.classList.contains('active-social') ? 'social' : 'ecology';
                toggleFilter(this, filterType);
            }
        });
    });

    // Обработчики для кнопок управления размером шрифта
    document.querySelectorAll('.size-controls button').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.textContent;
            if (action === 'A-' && typeof changeFontSize === 'function') changeFontSize('smaller');
            else if (action === 'A' && typeof changeFontSize === 'function') changeFontSize('normal');
            else if (action === 'A+' && typeof changeFontSize === 'function') changeFontSize('larger');
        });
    });

    // Обработчики для кнопок межстрочного интервала
    document.querySelectorAll('.spacing-controls button').forEach(btn => {
        btn.addEventListener('click', function() {
            const spacing = this.textContent.toLowerCase();
            if (spacing === 'обычный' && typeof changeLineHeight === 'function') changeLineHeight('normal');
            else if (spacing === 'увеличенный' && typeof changeLineHeight === 'function') changeLineHeight('large');
        });
    });

    // Обработчики для кнопок шрифта
    document.querySelectorAll('.font-controls button').forEach(btn => {
        btn.addEventListener('click', function() {
            const font = this.textContent.toLowerCase();
            if (font === 'стандартный' && typeof changeFontFamily === 'function') changeFontFamily('standard');
            else if (font === 'для дислексии' && typeof changeFontFamily === 'function') changeFontFamily('dyslexic');
        });
    });

    // Кнопка сброса настроек доступности
    const resetBtn = document.querySelector('.reset-btn');
    if (resetBtn && typeof resetAccessibilitySettings === 'function') {
        resetBtn.addEventListener('click', resetAccessibilitySettings);
    }

    console.log("Все обработчики событий инициализированы");
}

// Toast уведомления
function showToast(title, message) {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.error("Toast элемент не найден!");
        return;
    }
    toast.innerHTML = '<div class="toast-title">' + title + '</div><div class="toast-description">' + message + '</div>';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Вспомогательные функции
function getDefaultText(dropdownId) {
    switch(dropdownId) {
        case 'categories': return 'Все категории';
        case 'help-type': return 'Тип помощи';
        case 'participation': return 'Формат участия';
        case 'regularity': return 'Регулярность';
        default: return 'Выбрать';
    }
}

// Функция для скрытия всех подкатегорий


// Инициализация обработчиков модальных окон
function initModalHandlers() {
    console.log("Инициализация обработчиков модальных окон...");
    
    // Проверяем существование элементов
    console.log("accessibilityBtn:", document.getElementById('accessibilityBtn'));
    console.log("footerAccessibilityBtn:", document.getElementById('footerAccessibilityBtn'));
    console.log("loginBtn:", document.getElementById('loginBtn'));
    console.log("profileBtn:", document.getElementById('profileBtn'));
    console.log("nkoBtn:", document.getElementById('nkoBtn'));
    
    // Обработчики для кнопок открытия модальных окон
    document.getElementById('accessibilityBtn')?.addEventListener('click', toggleAccessibilityMode);
    document.getElementById('footerAccessibilityBtn')?.addEventListener('click', toggleAccessibilityMode);
    document.getElementById('loginBtn')?.addEventListener('click', openAuthModal);
    document.getElementById('profileBtn')?.addEventListener('click', openProfileModal);
    document.getElementById('nkoBtn')?.addEventListener('click', openNkoModal);
    
    // Обработчики для кнопок закрытия
    document.getElementById('closeAuthModal')?.addEventListener('click', closeAuthModal);
    document.getElementById('closeNkoModal')?.addEventListener('click', closeNkoModal);
    document.getElementById('closeProfileModal')?.addEventListener('click', closeProfileModal);
    document.getElementById('closeAccessibilityPanel')?.addEventListener('click', closeAccessibilityPanel);
    
    // Обработчики для accessibility кнопок
    document.querySelectorAll('.scheme-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Проверяем что функция существует
            if (typeof changeColorScheme === 'function') {
                changeColorScheme(this.getAttribute('data-scheme'));
            }
        });
    });
    
    // Обработчики для кнопок фильтров карты
    document.querySelectorAll('.filter-badge').forEach(btn => {
        btn.addEventListener('click', function() {
            // Проверяем что функция существует
            if (typeof toggleFilter === 'function') {
                toggleFilter(this, this.classList.contains('active-social') ? 'social' : 'ecology');
            }
        });
    });
    
    console.log("Обработчики модальных окон инициализированы");
}

// Функция для панели доступности


// Функция закрытия панели доступности


// Функции для модальных окон авторизации
function openAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Сбрасываем формы при открытии
    resetForms();
    
    applyAccessibilityToModal(modal);
}

function openNkoModal() {
    const modal = document.getElementById('nkoModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Загружаем данные НКО и НЕ сбрасываем форму
    if (typeof window.loadNkoData === 'function') {
        window.loadNkoData();
    }
    
    applyAccessibilityToModal(modal);
}

function openProfileModal() {
    console.log("Открытие модального окна профиля");
    const modal = document.getElementById('profileModal');
    if (!modal) {
        console.error("Модальное окно профиля не найдено!");
        return;
    }
    
    // Показываем модальное окно
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Загружаем данные и инициализируем скролл
    setTimeout(() => {
        // Проверяем доступность функций
        if (typeof window.loadProfileData === 'function') {
            console.log("Функция loadProfileData найдена, запускаем...");
            window.loadProfileData();
        } else {
            console.error("Функция loadProfileData не найдена! Пробуем резервный метод...");
            // Пытаемся загрузить данные напрямую
            if (typeof window.loadProfileDataDirect === 'function') {
                window.loadProfileDataDirect();
            } else {
                showToast('Ошибка', 'Функция загрузки профиля не найдена');
            }
        }
        
        // Инициализируем скролл с задержкой
        setTimeout(() => {
            if (typeof window.initProfileScroll === 'function') {
                window.initProfileScroll();
            }
        }, 500);
    }, 100);
    
    applyAccessibilityToModal(modal);
}

// Функция для открытия модального окна создания карточки
function openCreateCardModal() {
    const modal = document.getElementById('createCardModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Применяем настройки доступности
        if (typeof applyAccessibilityToModal === 'function') {
            applyAccessibilityToModal(modal);
        }
        
        // Инициализируем форму создания карточки
        setTimeout(() => {
            if (typeof initCreateCardForm === 'function') {
                initCreateCardForm();
            }
        }, 100);
    }
}



// Функция применения доступности к модальному окну
function applyAccessibilityToModal(modal) {
    // Удаляем старые классы доступности
    modal.className = modal.className.replace(/accessibility-\S+/g, '');
    
    // Копируем все accessibility-классы с <html>
    const accessibilityClasses = Array.from(document.documentElement.classList).filter(
        cls => cls.startsWith('accessibility-')
    );
    modal.classList.add(...accessibilityClasses);
    
    // Применяем inline-стили для надёжности
    const root = document.documentElement;
    if (root.classList.contains('accessibility-large-font')) {
        modal.style.fontSize = '18px';
    } else if (root.classList.contains('accessibility-larger-font')) {
        modal.style.fontSize = '20px';
    } else {
        modal.style.fontSize = '';
    }

    if (root.classList.contains('accessibility-large-line-height')) {
        modal.style.lineHeight = '1.8';
    } else {
        modal.style.lineHeight = '';
    }

    if (root.classList.contains('accessibility-dyslexic-font')) {
        modal.style.fontFamily = 'Comic Sans MS, Arial, sans-serif';
    } else {
        modal.style.fontFamily = '';
    }
    
    // Также применяем ко всем дочерним auth-dialog и auth-form
    const innerElements = modal.querySelectorAll('.auth-dialog, .auth-form');
    innerElements.forEach(el => {
        el.className = el.className.replace(/accessibility-\S+/g, '');
        el.classList.add(...accessibilityClasses);
        
        // Те же стили
        el.style.fontSize = modal.style.fontSize;
        el.style.lineHeight = modal.style.lineHeight;
        el.style.fontFamily = modal.style.fontFamily;
    });
}

// Закрытие модальных окон - ИСПРАВЛЕННАЯ ВЕРСИЯ
function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal && modal.classList.contains('show')) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        // Сбрасываем формы ТОЛЬКО при закрытии
        resetForms();
    }
}

function closeNkoModal() {
    const modal = document.getElementById('nkoModal');
    if (modal && modal.classList.contains('show')) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        // НЕ сбрасываем форму НКО при закрытии
    }
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal && modal.classList.contains('show')) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        // НЕ сбрасываем форму профиля при закрытии
    }
}

function closeCreateCardModal() {
    const modal = document.getElementById('createCardModal');
    if (modal && modal.classList.contains('show')) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        // Сбрасываем форму создания карточки при закрытии
        const form = document.getElementById('createCardForm');
        if (form) {
            form.reset();
        }
    }
}



// Сбрасываем ТОЛЬКО формы авторизации
function resetForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
    
    // Сбрасываем анимационные стили
    document.querySelectorAll('.auth-form').forEach(form => {
        form.style.opacity = '';
        form.style.transform = '';
    });
    
    // Сбрасываем высоту диалога
    const dialog = document.querySelector('.auth-dialog');
    if (dialog) {
        dialog.classList.remove('large');
    }
    
    // Активируем форму входа по умолчанию
    switchAuthForm('login');
}

function switchAuthForm(targetForm) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const dialog = document.querySelector('.auth-dialog');
    
    if (!dialog) return;
    
    // Определяем, какая форма активируется
    const isRegister = targetForm === 'register';
    
    // 1. Сначала скрываем текущую активную форму
    const activeForm = document.querySelector('.auth-form.active');
    if (activeForm) {
        activeForm.style.opacity = '0';
        activeForm.style.transform = isRegister ? 'translateX(-20px)' : 'translateX(20px)';
    }
    
    // 2. Изменяем размер диалога для регистрации
    if (isRegister) {
        dialog.classList.add('large');
    } else {
        dialog.classList.remove('large');
    }
    
    // 3. После завершения анимации скрытия, переключаем формы
    setTimeout(() => {
        // Скрываем все формы
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        
        // Показываем целевую форму
        const targetFormElement = document.getElementById(`${targetForm}Form`);
        if (targetFormElement) {
            targetFormElement.classList.add('active');
            
            // 4. Показываем новую форму с анимацией
            setTimeout(() => {
                targetFormElement.style.opacity = '1';
                targetFormElement.style.transform = 'translateX(0)';
                
                // Применяем доступность к новой форме
                applyAccessibilityToModal(document.getElementById('authModal'));
                
                // Прокручиваем к верху формы
                dialog.scrollTop = 0;
            }, 50);
        }
    }, 300);
}

let deleteInProgress = false;
let formHandlerInitialized = false;

// Инициализация управления карточками
function initCardsManagement() {
    const projectsHeader = document.querySelector('.projects-header');
    if (projectsHeader) {
        window.totalPages = parseInt(projectsHeader.getAttribute('data-total-pages')) || 1;
        window.currentPage = getCurrentPageFromURL();
    }
    
    initHelpButtons();
    initDeleteButtons();
}

// Обновление контента с анимацией
function updateContent(newHTML, page) {
    const container = document.getElementById('projectsContainer');
    if (!container) {
        console.error('Контейнер projectsContainer не найден!');
        return;
    }
    
    console.log('Обновление контента для страницы:', page);
    
    // Анимация исчезновения
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    setTimeout(() => {
        // Заменяем весь контент в контейнере
        container.innerHTML = newHTML;
        
        // Переинициализируем обработчики
        updatePaginationButtons();
        initCardsEventHandlers();
        initDeleteButtons();
        
        // Анимация появления
        setTimeout(() => {
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 50);
        
    }, 300);
}

// Обновление кнопок пагинации
// Обновление кнопок пагинации
function updatePaginationButtons() {
    console.log('Обновление кнопок пагинации. Текущая страница:', currentPage, 'Всего страниц:', totalPages);

    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');

    if (prevBtn) {
        prevBtn.style.display = currentPage > 1 ? 'inline-block' : 'none';
    }
    if (nextBtn) {
        nextBtn.style.display = currentPage < totalPages ? 'inline-block' : 'none';
    }

    // Обновляем класс .active у номерных кнопок
    document.querySelectorAll('.pagination-btn').forEach(btn => {
        const pageNum = parseInt(btn.textContent, 10);
        btn.classList.toggle('active', pageNum === currentPage);
        // НЕ добавляем обработчики — делегирование уже покрывает это в initGlobalEventHandlers()
    });
}

// Получение текущей страницы из URL
function getCurrentPageFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return parseInt(urlParams.get('card_page')) || 1;
}

// Инициализация пагинации
function initPagination() {
    // Обработчики для кнопок пагинации (делегирование событий)
    document.addEventListener('click', function(e) {
        // Кнопки с номерами страниц
        if (e.target.classList.contains('pagination-btn') && !e.target.classList.contains('active')) {
            e.preventDefault();
            const page = parseInt(e.target.textContent);
            if (!isNaN(page)) {
                changeCardPage(page);
            }
        }
        
        // Кнопка "Назад"
        if (e.target.classList.contains('prev-btn') || e.target.closest('.prev-btn')) {
            e.preventDefault();
            if (currentPage > 1) {
                changeCardPage(currentPage - 1);
            }
        }
        
        // Кнопка "Вперед"
        if (e.target.classList.contains('next-btn') || e.target.closest('.next-btn')) {
            e.preventDefault();
            if (currentPage < totalPages) {
                changeCardPage(currentPage + 1);
            }
        }
    });
}

// Инициализация кнопок помощи
function initHelpButtons() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-help') && !e.target.disabled) {
            const cardId = e.target.getAttribute('data-card-id');
            if (cardId) {
                joinProject(parseInt(cardId), e.target);
            }
        }
    });
}

// Участие в проекте
async 

// Инициализация кнопок удаления - ДЕЛЕГИРОВАНИЕ СОБЫТИЙ
function initDeleteButtons() {
    // Удаляем старые обработчики чтобы избежать дублирования
    document.removeEventListener('click', handleDeleteClick);
    
    // Добавляем новый обработчик
    document.addEventListener('click', handleDeleteClick);
}

// Единый обработчик для кликов удаления
function handleDeleteClick(e) {
    // Проверяем клик по кнопке удаления или её дочерним элементам
    const deleteBtn = e.target.closest('.delete-card-btn');
    if (deleteBtn && !deleteInProgress) {
        e.preventDefault();
        e.stopPropagation();
        
        const cardElement = deleteBtn.closest('.project-card');
        if (cardElement) {
            const cardId = cardElement.getAttribute('data-card-id');
            if (cardId) {
                deleteCard(cardId, cardElement);
            }
        }
    }
}

// Глобальная функция для удаления карточки
window.deleteCard = async function(cardId, cardElement) {
    // Защита от множественных вызовов
    if (deleteInProgress) {
        console.log('Удаление уже в процессе, игнорируем вызов');
        return;
    }
    
    console.log('deleteCard вызвана с ID:', cardId);
    
    if (!cardElement) {
        cardElement = document.querySelector(`.project-card[data-card-id="${cardId}"]`);
    }
    
    if (!cardElement) {
        console.error('Карточка не найдена:', cardId);
        return;
    }
    
    if (!confirm('Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить.')) {
        return;
    }
    
    deleteInProgress = true; // Устанавливаем флаг
    
    try {
        const deleteBtn = cardElement.querySelector('.delete-card-btn');
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<div class="loading-spinner-small"></div>';
        }
        
        console.log('Отправка запроса на удаление карточки:', cardId);
        
        const response = await fetch('php/delete_card.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `card_id=${cardId}`
        });
        
        const data = await response.json();
        console.log('Ответ сервера:', data);
        
        // Показываем уведомление ТОЛЬКО ОДИН РАЗ
        if (!cardElement._toastShown) {
            showToast(data.status === 'success' ? 'Успех' : 'Ошибка', data.message);
            cardElement._toastShown = true;
        }
        
        if (data.status === 'success') {
            // Анимация удаления карточки
            cardElement.style.transition = 'all 0.3s ease';
            cardElement.style.opacity = '0';
            cardElement.style.transform = 'scale(0.8) translateY(20px)';
            
            setTimeout(() => {
                cardElement.remove();
                
                // Проверяем, остались ли карточки
                const remainingCards = document.querySelectorAll('.project-card');
                console.log('Осталось карточек:', remainingCards.length);
                
                if (remainingCards.length === 0) {
                    // Перезагружаем страницу для обновления списка
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            }, 300);
        } else {
            // Восстанавливаем кнопку при ошибке
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '×';
            }
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Ошибка соединения с сервером');
        
        const deleteBtn = cardElement?.querySelector('.delete-card-btn');
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '×';
        }
    } finally {
        // Сбрасываем флаг независимо от результата
        setTimeout(() => {
            deleteInProgress = false;
        }, 1000);
    }
};

// Инициализация формы создания карточки (ОДИН РАЗ)
function initCreateCardForm() {
    if (formHandlerInitialized) {
        console.log('Форма создания карточки уже инициализирована');
        return;
    }
    
    const createCardForm = document.getElementById('createCardForm');
    if (createCardForm) {
        console.log('Инициализация формы создания карточки');
        
        createCardForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleCreateCardForm(this);
        });
        
        formHandlerInitialized = true;
    } else {
        console.log('Форма создания карточки не найдена');
    }
}

// Обработчик отправки формы создания карточки
async function handleCreateCardForm(form) {
    const formData = new FormData(form);
    
    try {
        const submitBtn = form.querySelector('.auth-submit');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Создание...';
        submitBtn.disabled = true;
        
        console.log('Отправка данных формы:', Object.fromEntries(formData));
        
        const response = await fetch('php/create_card.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        console.log('Ответ сервера:', data);
        
        showToast(data.status === 'success' ? 'Успех' : 'Ошибка', data.message);
        
        if (data.status === 'success') {
            // Закрываем модальное окно
            closeCreateCardModal();
            
            // Очищаем форму
            form.reset();
            
            // Перезагружаем страницу через короткую задержку
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Ошибка соединения с сервером');
        
        const submitBtn = form.querySelector('.auth-submit');
        submitBtn.textContent = 'Опубликовать проект';
        submitBtn.disabled = false;
    }
}

// Функция для закрытия модального окна создания карточки


// Пересчитываем высоту при ресайзе окна
window.addEventListener('resize', function() {
    if (document.getElementById('profileModal')?.classList.contains('show')) {
        if (typeof window.initProfileScroll === 'function') {
            window.initProfileScroll();
        }
    }
});
        
// Обработчики для кнопок навигации
document.addEventListener('click', function(e) {
    if (e.target.matches('.nav-link')) {
        e.preventDefault();
        const sectionId = e.target.getAttribute('data-section-id');
        if (sectionId) {
            scrollToSection(sectionId);
        }
    }
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initCardsManagement();
    initPagination();
    initCreateCardForm();
});

// Экспортируем функции для глобального использования
window.changeCardPage = changeCardPage;
window.joinProject = joinProject;
window.openCreateCardModal = openCreateCardModal;
window.closeCreateCardModal = closeCreateCardModal;
window.deleteCard = deleteCard;
window.toggleAccessibilityMode = toggleAccessibilityMode;
window.closeAccessibilityPanel = closeAccessibilityPanel;
window.changeFontSize = changeFontSize;
window.changeLineHeight = changeLineHeight;
window.changeFontFamily = changeFontFamily;
window.changeColorScheme = changeColorScheme;
window.resetAccessibilitySettings = resetAccessibilitySettings;
window.scrollToSection = scrollToSection;
window.toggleFilter = toggleFilter;
window.showToast = showToast;
window.hideAllSubcategories = hideAllSubcategories;
window.getDefaultText = getDefaultText;
window.openAuthModal = openAuthModal;
window.openNkoModal = openNkoModal;
window.openProfileModal = openProfileModal;
window.openAdminModal = openAdminModal;
window.closeAuthModal = closeAuthModal;
window.closeNkoModal = closeNkoModal;
window.closeProfileModal = closeProfileModal;
window.closeAdminModal = closeAdminModal;
window.switchAuthForm = switchAuthForm;
window.toggleCategoryDropdown = toggleCategoryDropdown;
window.showSubcategories = showSubcategories;
window.selectSubcategory = selectSubcategory;
window.filterProjects = filterProjects;
window.adminAssignRole = adminAssignRole;
window.adminRemoveRole = adminRemoveRole;
window.adminDeleteUser = adminDeleteUser;

// --- Unified Pagination Initialization ---
function initPagination() {
    if (typeof renderPagination === "function") {
        renderPagination();
    }
}
// --- End Pagination Init ---



// --- Profile & NKO Module (Variant A: strict) ---
(function(){
    // State
    let profileData = null;
    let nkoData = null;

    // Helpers
    function el(id){ return document.getElementById(id); }
    function q(selector){ return document.querySelector(selector); }
    function showToast(title, msg){ if (typeof window.showToast === 'function') { window.showToast(title, msg); } else alert(title + '\\n' + msg); }

    // Load profile (user + projects + nko) from server
    async function loadProfileData() {
        try {
            const res = await fetch('/php/get_profile.php', { credentials: 'same-origin' });
            const json = await res.json();
            if (!json || !json.success) {
                throw new Error(json && json.message ? json.message : 'Ошибка загрузки профиля');
            }
            profileData = json.user || null;
            nkoData = json.nko || null;
            profileData.projects = json.projects || [];
            return { profile: profileData, nko: nkoData };
        } catch (err) {
            console.error('loadProfileData error', err);
            throw err;
        }
    }

    // loadNkoProfileData is kept for compatibility (calls get_nko if needed)
    async function loadNkoProfileData() {
        try {
            // Prefer server-provided nko from get_profile; otherwise call get_nko.php
            if (nkoData !== null) return nkoData;
            const res = await fetch('/php/get_nko.php', { credentials: 'same-origin' });
            const json = await res.json();
            if (!json || !json.success) return null;
            nkoData = json.nko || null;
            return nkoData;
        } catch (err) {
            console.error('loadNkoProfileData error', err);
            return null;
        }
    }

    function updateProfileUI() {
        // Basic user fields
        if (!profileData) return;
        const nameEl = el('profileName');
        const surnameEl = el('profileSurname');
        const emailEl = el('profileEmail');
        if (nameEl) nameEl.value = profileData.name || '';
        if (surnameEl) surnameEl.value = profileData.surname || '';
        if (emailEl) emailEl.value = profileData.login || '';

        // NKO block
        const nkoSection = el('nkoProfileSection');
        const nkoHint = el('profileNkoHint');
        const nkoName = el('profileNkoName');
        const nkoCategory = el('profileNkoCategory');
        const nkoDescription = el('profileNkoDescription');
        const nkoActivities = el('profileNkoActivities');
        const nkoPhone = el('profileNkoPhone');
        const nkoAddress = el('profileNkoAddress');
        const nkoWebsite = el('profileNkoWebsite');
        const nkoSocial = el('profileNkoSocial');
        const nkoLogoPreview = el('profileNkoLogoPreview');

        if (!nkoSection) return;

        if (!nkoData) {
            // No NKO registered
            if (nkoHint) {
                nkoHint.style.display = 'block';
                nkoHint.textContent = 'Вы ещё не зарегистрировали НКО. Заполните все поля, чтобы создать запись.';
            }
            // clear fields
            if (nkoName) nkoName.value = '';
            if (nkoCategory) nkoCategory.value = '';
            if (nkoDescription) nkoDescription.value = '';
            if (nkoActivities) nkoActivities.value = '';
            if (nkoPhone) nkoPhone.value = '';
            if (nkoAddress) nkoAddress.value = '';
            if (nkoWebsite) nkoWebsite.value = '';
            if (nkoSocial) nkoSocial.value = '';
            if (nkoLogoPreview) { nkoLogoPreview.style.display = 'none'; nkoLogoPreview.src = ''; }
        } else {
            // Has NKO - check status mapping between PHP ('pending'|'approved'|'rejected') and UI ('moderation' etc)
            const status = (nkoData.status || '').toLowerCase();
            if (status === 'pending' || status === 'moderation') {
                if (nkoHint) {
                    nkoHint.style.display = 'block';
                    nkoHint.textContent = 'Ваша НКО на модерации. Администратор проверяет данные.';
                }
                // Fill readonly fields but disable edits to prevent resubmission if desired
                if (nkoName) nkoName.value = nkoData.name || '';
                if (nkoCategory) nkoCategory.value = nkoData.category || '';
                if (nkoDescription) nkoDescription.value = nkoData.description || '';
                if (nkoActivities) nkoActivities.value = nkoData.activities || '';
                if (nkoPhone) nkoPhone.value = nkoData.phone || '';
                if (nkoAddress) nkoAddress.value = nkoData.address || '';
                if (nkoWebsite) nkoWebsite.value = nkoData.website || '';
                if (nkoSocial) nkoSocial.value = nkoData.social_links || '';
                if (nkoLogoPreview && nkoData.logo_path) { nkoLogoPreview.src = '/' + nkoData.logo_path; nkoLogoPreview.style.display = 'block'; }
            } else if (status === 'approved') {
                if (nkoHint) nkoHint.style.display = 'none';
                // populate fields for editing
                if (nkoName) nkoName.value = nkoData.name || '';
                if (nkoCategory) nkoCategory.value = nkoData.category || '';
                if (nkoDescription) nkoDescription.value = nkoData.description || '';
                if (nkoActivities) nkoActivities.value = nkoData.activities || '';
                if (nkoPhone) nkoPhone.value = nkoData.phone || '';
                if (nkoAddress) nkoAddress.value = nkoData.address || '';
                if (nkoWebsite) nkoWebsite.value = nkoData.website || '';
                if (nkoSocial) nkoSocial.value = nkoData.social_links || '';
                if (nkoLogoPreview && nkoData.logo_path) { nkoLogoPreview.src = '/' + nkoData.logo_path; nkoLogoPreview.style.display = 'block'; }
            } else if (status === 'rejected') {
                if (nkoHint) {
                    nkoHint.style.display = 'block';
                    nkoHint.textContent = 'Данные НКО отклонены модератором: ' + (nkoData.moderation_comment || '');
                }
            } else {
                // fallback: show existing data
                if (nkoHint) nkoHint.style.display = 'none';
                if (nkoName) nkoName.value = nkoData.name || '';
            }
        }

        // User projects list
        const projectsList = el('projectsList');
        if (projectsList) {
            projectsList.innerHTML = '';
            const projects = profileData.projects || [];
            if (projects.length === 0) {
                projectsList.innerHTML = '<p>У вас пока нет проектов.</p>';
            } else {
                const ul = document.createElement('div');
                ul.className = 'user-projects-grid';
                projects.forEach(p => {
                    const item = document.createElement('div');
                    item.className = 'user-project-item';
                    item.innerHTML = '<strong>' + (p.header || '') + '</strong> <div class="small-meta">' + (p.location || '') + ' • ' + (p.date || '') + '</div>';
                    ul.appendChild(item);
                });
                projectsList.appendChild(ul);
            }
        }
    }

    // Modal open/close
    function openProfileModal() {
        // Load data then display modal
        loadProfileData()
            .then(() => loadNkoProfileData())
            .then(() => {
                updateProfileUI();
                const modal = el('profileModal');
                if (modal) modal.style.display = 'block';
                document.body.classList.add('modal-open');
            })
            .catch(err => {
                console.error('Ошибка при открытии профиля', err);
                showToast('Ошибка', err.message || 'Не удалось загрузить профиль');
            });
    }

    function closeProfileModal() {
        const modal = el('profileModal');
        if (modal) modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }

    // Save profile changes (user fields)
    async function saveProfileChanges(ev) {
        ev && ev.preventDefault();
        const name = el('profileName')?.value || '';
        const surname = el('profileSurname')?.value || '';
        const login = el('profileEmail')?.value || '';
        try {
            const fd = new FormData();
            fd.append('name', name);
            fd.append('surname', surname);
            fd.append('login', login);
            const res = await fetch('/php/save_profile.php', { method: 'POST', body: fd, credentials: 'same-origin' });
            const json = await res.json();
            if (json && json.success) {
                showToast('Успех', json.message || 'Профиль обновлён');
                // reload local state
                await loadProfileData();
                updateProfileUI();
                return;
            } else {
                throw new Error(json && json.message ? json.message : 'Ошибка при сохранении профиля');
            }
        } catch (err) {
            console.error('saveProfileChanges error', err);
            showToast('Ошибка', err.message || 'Ошибка при сохранении профиля');
        }
    }

    // Save NKO (handles create or update) - submits form with file support
    async function saveNkoForm(ev) {
        ev && ev.preventDefault();
        const form = el('nkoForm');
        if (!form) return;
        const fd = new FormData(form);
        try {
            const res = await fetch('/php/save_nko.php', { method: 'POST', body: fd, credentials: 'same-origin' });
            const json = await res.json();
            if (json && json.success) {
                showToast('Успех', json.message || 'Данные НКО сохранены');
                // refresh state and UI
                await loadProfileData();
                await loadNkoProfileData();
                updateProfileUI();
                return;
            } else {
                throw new Error(json && json.message ? json.message : 'Ошибка при сохранении НКО');
            }
        } catch (err) {
            console.error('saveNkoForm error', err);
            showToast('Ошибка', err.message || 'Не удалось сохранить НКО');
        }
    }

    // Attach listeners on DOM ready for modal buttons and form submits
    document.addEventListener('DOMContentLoaded', function() {
        // expose to global for inline onclicks in PHP templates
        window.openProfileModal = openProfileModal;
        window.closeProfileModal = closeProfileModal;

        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', function(e){
                e.preventDefault();
                openProfileModal();
            });
        }

        const profileForm = document.getElementById('profileForm');
        if (profileForm) profileForm.addEventListener('submit', saveProfileChanges);

        const nkoForm = document.getElementById('nkoForm');
        if (nkoForm) nkoForm.addEventListener('submit', saveNkoForm);

        // preview logo when chosen
        const logoInput = document.getElementById('profileNkoLogo');
        if (logoInput) {
            logoInput.addEventListener('change', function() {
                const preview = document.getElementById('profileNkoLogoPreview');
                const file = this.files && this.files[0];
                if (file && preview) {
                    const url = URL.createObjectURL(file);
                    preview.src = url;
                    preview.style.display = 'block';
                }
            });
        }

        // Close modal when clicking outside dialog (simple behaviour)
        document.addEventListener('click', function(e){
            const modal = document.getElementById('profileModal');
            if (!modal) return;
            if (modal.style.display === 'block') {
                const dialog = modal.querySelector('.auth-dialog');
                if (dialog && !dialog.contains(e.target) && !e.target.closest('#profileBtn')) {
                    closeProfileModal();
                }
            }
        });
    });

})();
// --- End Profile & NKO Module ---



// --- STABLE INTEGRATION MODULE ---
(function(){
    'use strict';

    // Idempotent checks to avoid redeclaration in case file is injected twice
    if (window.__GIGASCRIPT_STABLE_LOADED) return;
    window.__GIGASCRIPT_STABLE_LOADED = true;

    // Small helper utilities
    const $ = selector => document.querySelector(selector);
    const $$ = selector => Array.from(document.querySelectorAll(selector));
    const on = (el, ev, selOrHandler, handlerIfSel) => {
        // delegated if selector provided
        if (typeof selOrHandler === 'string') {
            const sel = selOrHandler, handler = handlerIfSel;
            el.addEventListener(ev, function(e){
                const target = e.target.closest(sel);
                if (target && el.contains(target)) handler.call(target, e);
            });
        } else {
            el.addEventListener(ev, selOrHandler);
        }
    };
    const ajaxJSON = (url, opts={}) => fetch(url, Object.assign({credentials:'same-origin'}, opts)).then(r=>r.json());

    // --- Heavy DOM optimizations ---
    // Render lists using DocumentFragment to reduce reflows
    function renderList(container, items, renderer) {
        container.innerHTML = '';
        const frag = document.createDocumentFragment();
        for (const item of items) {
            const node = renderer(item);
            frag.appendChild(node);
        }
        container.appendChild(frag);
    }

    // --- Cards Module (loading, pagination, join, delete) ---
    const CardsModule = (function(){
        let currentPage = 1;
        let pageSize = 6;
        let totalPages = 1;

        async function loadCards(page=1) {
            // Use existing server endpoint get_card_ajax.php (if present) or rely on server-rendered initial HTML
            const url = '/php/get_card_ajax.php?page=' + page + '&page_size=' + pageSize;
            try {
                const json = await ajaxJSON(url);
                if (!json || !json.success) {
                    // fallback: nothing to do
                    return json;
                }
                totalPages = json.total_pages || 1;
                currentPage = page;
                return json;
            } catch (e) {
                console.error('loadCards error', e);
                return null;
            }
        }

        function renderCardsGrid(cards) {
            const grid = document.getElementById('projectsGrid');
            if (!grid) return;
            renderList(grid, cards, (card) => {
                const el = document.createElement('div');
                el.className = 'project-card';
                el.setAttribute('data-card-id', card.id || '');
                const can_delete = card.can_delete ? true : false;
                el.innerHTML = `
                    ${can_delete ? '<button class="delete-card-btn" title="Удалить проект" data-card-id="'+(card.id||'')+'">×</button>' : ''}
                    <div class="project-card-content">
                      <div class="project-badges">${card.status?'<span class="badge badge-urgent">'+card.status+'</span>':''}${card.type?'<span class="badge">'+card.type+'</span>':''}</div>
                      <h3 class="project-title">${escapeHtml(card.header||'')}</h3>
                      <div class="project-location">${escapeHtml(card.location||'')}</div>
                      <p class="project-description">${escapeHtml(card.main_text||'')}</p>
                      <div class="project-meta"><div class="meta-item"><span>${card.current_participants||0}/${card.max_participants||0}</span></div><div class="meta-item"><span>${escapeHtml(card.date||'')}</span></div></div>
                      <div class="project-footer"><div class="project-org">${escapeHtml(card.sub_text||'')}</div>
                        ${card.is_joined ? '<button class="btn-help" disabled>Вы участвуете</button>' : (window.isUserLoggedIn ? '<button class="btn-help" data-card-id="'+(card.id||'')+'">Помочь</button>' : '<button class="btn-help" onclick="openAuthModal()">Войти чтобы помочь</button>')}
                      </div>
                    </div>`;
                return el;
            });
        }

        function renderPaginationControls(totalPagesCount, current) {
            const pag = document.getElementById('paginationBottom') || document.querySelector('.pagination-controls');
            if (!pag) return;
            // If server already output buttons, keep them but attach handlers. Here we will ensure simple page buttons.
            const container = document.createElement('div');
            container.className = 'pagination';
            for (let i=1;i<=totalPagesCount;i++) {
                const btn = document.createElement('button');
                btn.className = 'pagination-btn'+(i===current?' active':'');
                btn.textContent = i;
                btn.dataset.page = i;
                container.appendChild(btn);
            }
            // replace existing pagination if exists
            const existing = document.getElementById('paginationBottom');
            if (existing && existing.parentNode) existing.parentNode.replaceChild(container, existing);
            else pag.innerHTML = ''; pag.appendChild(container);
        }

        async function goToPage(page) {
            const json = await loadCards(page);
            if (!json || !json.cards) return;
            renderCardsGrid(json.cards);
            renderPaginationControls(json.total_pages || 1, page);
        }

        async function init() {
            // Attach delegated handlers for join and delete to container to reduce per-card listeners
            const container = document.getElementById('projectsContainer') || document.body;
            on(container, 'click', '.btn-help', async function(e){
                const cardId = this.dataset.cardId || this.getAttribute('data-card-id');
                if (!cardId) return;
                // disable button immediately to avoid double clicks
                this.disabled = true;
                try {
                    const res = await fetch('/php/join_project.php', {method:'POST', credentials:'same-origin', body: new URLSearchParams({card_id:cardId})});
                    const json = await res.json();
                    if (json && json.success) {
                        showToast('Успех', json.message || 'Вы присоединились');
                        // refresh cards for current page
                        await goToPage(currentPage);
                    } else {
                        throw new Error(json && json.message ? json.message : 'Ошибка присоединения');
                    }
                } catch (err) {
                    console.error('join error', err);
                    showToast('Ошибка', err.message || 'Не удалось присоединиться');
                    this.disabled = false;
                }
            });

            on(container, 'click', '.delete-card-btn', async function(e){
                e.preventDefault();
                const cardId = this.dataset.cardId || this.getAttribute('data-card-id');
                if (!cardId) return;
                if (!confirm('Удалить проект?')) return;
                try {
                    const res = await fetch('/php/delete_card.php', {method:'POST', credentials:'same-origin', body: new URLSearchParams({card_id:cardId})});
                    const json = await res.json();
                    if (json && json.success) {
                        showToast('Успех', json.message || 'Карточка удалена');
                        await goToPage(currentPage);
                    } else {
                        throw new Error(json && json.message ? json.message : 'Ошибка удаления');
                    }
                } catch (err) {
                    console.error('delete error', err);
                    showToast('Ошибка', err.message || 'Не удалось удалить карточку');
                }
            });

            // pagination clicks
            document.addEventListener('click', function(e){
                const btn = e.target.closest('.pagination-btn');
                if (!btn) return;
                const page = parseInt(btn.dataset.page || btn.textContent, 10);
                if (!page) return;
                goToPage(page);
            });

            // initial try to use server-rendered HTML - else load via AJAX
            if (document.getElementById('projectsGrid') && document.querySelectorAll('#projectsGrid .project-card').length>0) {
                // server-rendered, attach handlers only
            } else {
                // load first page via AJAX
                await goToPage(1);
            }
        }

        return { init, goToPage };
    })();

    // --- Auth Module ---
    const AuthModule = (function(){
        function openAuthModal(){ const m = document.getElementById('authModal'); if (m) m.style.display='block'; }
        function closeAuthModal(){ const m = document.getElementById('authModal'); if (m) m.style.display='none'; }
        async function login(form) {
            try {
                const fd = new FormData(form);
                const res = await fetch('/php/auth.php', {method:'POST', credentials:'same-origin', body: fd});
                const json = await res.json();
                if (json && json.success) {
                    showToast('Успех', 'Вход выполнен');
                    location.reload();
                } else {
                    throw new Error(json && json.message ? json.message : 'Ошибка входа');
                }
            } catch (e) { console.error('login error', e); showToast('Ошибка', e.message||'Ошибка входа'); }
        }
        async function register(form) {
            try {
                const fd = new FormData(form);
                const res = await fetch('/php/register.php', {method:'POST', credentials:'same-origin', body: fd});
                const json = await res.json();
                if (json && json.success) {
                    showToast('Успех', 'Регистрация успешна');
                    location.reload();
                } else throw new Error(json && json.message ? json.message : 'Ошибка регистрации');
            } catch (e) { console.error('register error', e); showToast('Ошибка', e.message||'Ошибка регистрации'); }
        }
        function switchAuthForm(which) {
            const loginForm = document.getElementById('loginForm');
            const regForm = document.getElementById('registerForm');
            if (!loginForm || !regForm) return;
            if (which==='register') { loginForm.classList.remove('active'); regForm.classList.add('active'); }
            else { regForm.classList.remove('active'); loginForm.classList.add('active'); }
        }
        // expose
        window.openAuthModal = openAuthModal;
        window.closeAuthModal = closeAuthModal;
        window.switchAuthForm = switchAuthForm;
        // attach submit handlers
        document.addEventListener('DOMContentLoaded', function(){
            const loginForm = document.getElementById('loginForm');
            if (loginForm) loginForm.addEventListener('submit', function(e){ e.preventDefault(); login(this); });
            const regForm = document.getElementById('registerForm');
            if (regForm) regForm.addEventListener('submit', function(e){ e.preventDefault(); register(this); });
            // auth modal close buttons (already inline, but resilient)
            $$('.close-dialog').forEach(b=>b.addEventListener('click', ()=>{ $$('.auth-modal').forEach(m=>m.style.display='none'); }));
        });

        return { openAuthModal, closeAuthModal, switchAuthForm };
    })();

    // --- Admin Module ---
    const AdminModule = (function(){
        async function loadUsers() {
            try {
                const json = await ajaxJSON('/php/admin_ajax.php?action=get_users');
                if (json && json.success && Array.isArray(json.users)) {
                    const tbody = document.getElementById('adminUsersTable');
                    if (!tbody) return;
                    tbody.innerHTML = '';
                    const frag = document.createDocumentFragment();
                    json.users.forEach(u=>{
                        const tr = document.createElement('tr');
                        tr.innerHTML = `<td>${u.id}</td><td>${escapeHtml(u.login)}</td><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.surname)}</td><td>${escapeHtml(u.roles||'')}</td><td>${escapeHtml(u.created_at||'')}</td><td><button class="assign-role-btn" data-user="${u.id}">Назначить роль</button> <button class="remove-role-btn" data-user="${u.id}">Убрать роль</button></td><td><button class="delete-user-btn" data-user="${u.id}">Удалить</button></td>`;
                        frag.appendChild(tr);
                    });
                    tbody.appendChild(frag);
                }
            } catch (e) { console.error('loadUsers', e); }
        }
        async function assignRole(userId, role) {
            await ajaxJSON('/php/admin_ajax.php?action=assign_role', {method:'POST', body: new URLSearchParams({user_id:userId, role:role})});
            await loadUsers();
        }
        async function removeRole(userId, role) {
            await ajaxJSON('/php/admin_ajax.php?action=remove_role', {method:'POST', body: new URLSearchParams({user_id:userId, role:role})});
            await loadUsers();
        }
        async function deleteUser(userId) {
            if (!confirm('Удалить пользователя?')) return;
            await ajaxJSON('/php/admin_ajax.php?action=delete_user', {method:'POST', body: new URLSearchParams({user_id:userId})});
            await loadUsers();
        }
        document.addEventListener('click', function(e){
            const as = e.target.closest('.assign-role-btn');
            if (as) { assignRole(as.dataset.user, 'nko'); }
            const rs = e.target.closest('.remove-role-btn');
            if (rs) { removeRole(rs.dataset.user, 'nko'); }
            const del = e.target.closest('.delete-user-btn');
            if (del) { deleteUser(del.dataset.user); }
        });
        return { loadUsers };
    })();

    // --- Utilities ---
    function showToast(title, msg) {
        if (typeof window.showToast === 'function') return window.showToast(title, msg);
        const t = document.getElementById('toast');
        if (!t) { alert(title + '\\n' + msg); return; }
        t.textContent = (title?title+': ':'') + msg;
        t.style.opacity = 1;
        setTimeout(()=>{ t.style.opacity = 0; }, 3000);
    }
    function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; }); }

    // Expose some flags
    window.isUserLoggedIn = document.body.dataset.loggedIn === 'true';

    // --- Central init: orchestrates modules to avoid race conditions ---
    async function initAll() {
        try {
            // 1. DOM ready tasks (attach light handlers)
            // accessibility/initHandlers are likely in base file; call if present
            if (typeof initAccessibility === 'function') initAccessibility();

            // 2. Initialize cards (renders first page)
            await CardsModule.init();

            // 3. Initialize profile module (we exposed openProfileModal earlier in profile module)
            if (typeof window.openProfileModal === 'function') {
                // prefetch profile data silently to warm cache
                try { fetch('/php/get_profile.php', {credentials:'same-origin'}); } catch(e){}
            }

            // 4. Initialize admin panel if admin present
            if (document.querySelector('.admin-panel-content')) {
                AdminModule.loadUsers();
            }

            // 5. Initialize map safely: prefer ymaps.ready if available
            if (window.ymaps && typeof ymaps.ready === 'function' && typeof initMap === 'function') {
                ymaps.ready(initMap);
            } else {
                // fallback: try to init after load
                window.addEventListener('load', function(){ if (window.ymaps && typeof ymaps.ready === 'function' && typeof initMap === 'function') ymaps.ready(initMap); });
            }

            // 6. Init pagination UI if function provided
            if (typeof initPagination === 'function') initPagination();

            // 7. Other inits
            if (typeof initAnimations === 'function') initAnimations();
            if (typeof initGlobalEventHandlers === 'function') initGlobalEventHandlers();

            console.log('gigascript: initAll completed');
        } catch (e) {
            console.error('initAll error', e);
        }
    }

    // Run initAll on DOMContentLoaded, but ensure it's not racing with other listeners
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        setTimeout(initAll, 0);
    }

})(); // end stable module
// --- END STABLE INTEGRATION MODULE ---

// end of monolith
})(window, document);
