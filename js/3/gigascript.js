// Объединенный файл скриптов для платформы волонтерства

let currentPage = 1;
let totalPages = 1;

// Инициализация счетчиков при загрузке
function initCounters() {
    console.log('Инициализация счетчиков...');
    updateStatsCounters();
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log("Инициализация приложения...");

    // 1. Парсинг URL и пагинация
    const urlParams = new URLSearchParams(window.location.search);
    currentPage = parseInt(urlParams.get('card_page')) || 1;
    console.log('Текущая страница:', currentPage);

    // 2. Базовая инициализация
    initFormValidation();
    initAccessibility();
    initEventListeners();
    initModalHandlers();
    initGlobalEventHandlers();

    // 3. Загрузка данных
    loadInitialCards();

    // 4. Инициализация счетчиков (с проверками)
    initCounters();

    // 5. Анимации
    initAnimations();
    
    // Инициализация карты
    if (document.getElementById('map')) {
        initMap().catch(error => {
            console.error('Ошибка инициализации карты:', error);
        });
    }
    
    // Инициализируем флаг для проверки наличия данных НКО
    window.profileHasNkoData = false;
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

// Загрузка данных для админ-панели
async function loadAdminData() {
    try {
        console.log('Загрузка данных админ-панели...');
        
        const adminLoading = document.getElementById('adminLoading');
        const adminUsersTable = document.getElementById('adminUsersTable');
        const totalUsers = document.getElementById('totalUsers');
        
        if (adminLoading) adminLoading.style.display = 'block';
        if (adminUsersTable) adminUsersTable.innerHTML = '';
        
        const response = await fetch('php/admin_ajax.php?action=get_users');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Данные админ-панели:', data);
        
        if (data.status === 'success' && data.users) {
            // Обновляем счетчик пользователей
            if (totalUsers) {
                totalUsers.textContent = data.users.length;
            }
            
            // Заполняем таблицу
            if (adminUsersTable) {
                if (data.users.length === 0) {
                    adminUsersTable.innerHTML = `
                        <tr>
                            <td colspan="8" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                                Пользователи не найдены
                            </td>
                        </tr>
                    `;
                } else {
                    adminUsersTable.innerHTML = data.users.map(user => `
                        <tr>
                            <td>${user.id}</td>
                            <td>${escapeHtml(user.login)}</td>
                            <td>${escapeHtml(user.name || '')}</td>
                            <td>${escapeHtml(user.surname || '')}</td>
                            <td>
                                ${user.roles ? user.roles.split(',').map(role => `
                                    <span class="role-badge role-${role}">${role}</span>
                                `).join('') : ''}
                            </td>
                            <td>${formatDate(user.created_at)}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn-small btn-primary" onclick="adminAssignRole(${user.id}, 'admin')" 
                                            ${user.roles && user.roles.includes('admin') ? 'disabled' : ''}>
                                        Админ
                                    </button>
                                    <button class="btn-small btn-success" onclick="adminAssignRole(${user.id}, 'nko')"
                                            ${user.roles && user.roles.includes('nko') ? 'disabled' : ''}>
                                        НКО
                                    </button>
                                    <button class="btn-small btn-secondary" onclick="adminAssignRole(${user.id}, 'user')"
                                            ${user.roles && user.roles.includes('user') ? 'disabled' : ''}>
                                        Пользователь
                                    </button>
                                </div>
                            </td>
                            <td>
                                ${user.is_current ? 
                                    '<span style="color: rgba(255,255,255,0.5);">Текущий пользователь</span>' : 
                                    `<button class="btn-small btn-danger" onclick="adminDeleteUser(${user.id})">Удалить</button>`
                                }
                            </td>
                        </tr>
                    `).join('');
                }
            }
            
            showAdminMessage('Данные успешно загружены', 'success');
            
        } else {
            showAdminMessage('Ошибка загрузки: ' + (data.message || 'Неизвестная ошибка'), 'error');
        }
        
    } catch (error) {
        console.error('Ошибка загрузки админ-данных:', error);
        showAdminMessage('Ошибка соединения с сервером: ' + error.message, 'error');
    } finally {
        const adminLoading = document.getElementById('adminLoading');
        if (adminLoading) adminLoading.style.display = 'none';
    }
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
            // Обновляем счетчик НКО если это новая регистрация
            if (nkoData.new_nko_count && !window.profileHasNkoData) {
                updateCounterDisplay('.stat-card:nth-child(2) .stat-number', nkoData.new_nko_count);
            }
            
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

// Новая функция для инициализации доступности
function initAccessibility() {
    console.log('Инициализация доступности...');
    
    // Применяем настройки к уже открытым модальным окнам
    //applyAccessibilityToModal(modal);
    
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
function hideAllSubcategories() {
    document.querySelectorAll('.subcategory-menu').forEach(menu => {
        menu.classList.remove('show');
    });
}

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
    
    // Обработчики для кнопок закрытия
    document.getElementById('closeAuthModal')?.addEventListener('click', closeAuthModal);
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
    
    console.log("Обработчики модальных окон инициализированы");
}

// Функция для панели доступности
function toggleAccessibilityMode() {
    const panel = document.getElementById('accessibilityPanel');
    if (!panel) {
        console.error('Панель доступности не найдена!');
        return;
    }
    
    const isShowing = panel.classList.contains('show');
    
    if (!isShowing) {
        panel.classList.add('show');
        document.body.style.overflow = 'hidden';
        console.log('Панель доступности открыта');
    } else {
        panel.classList.remove('show');
        document.body.style.overflow = '';
        console.log('Панель доступности закрыта');
    }
    
    // Обновляем глобальную переменную
    accessibilityMode = !isShowing;
}

// Функция закрытия панели доступности
function closeAccessibilityPanel() {
    const panel = document.getElementById('accessibilityPanel');
    if (panel) {
        panel.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Функции для модальных окон авторизации
function openAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Сбрасываем формы при открытии
    resetForms();
    
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

    // Копируем accessibility-классы с <html>
    const accessibilityClasses = Array.from(document.documentElement.classList)
        .filter(cls => cls.startsWith('accessibility-'));

    // Применяем классы
    modal.classList.add(...accessibilityClasses);

    // Применяем inline-стили для надежности
    const root = document.documentElement;

    modal.style.fontSize = root.classList.contains('accessibility-large-font') ? '18px'
        : root.classList.contains('accessibility-larger-font') ? '20px'
        : '';

    modal.style.lineHeight = root.classList.contains('accessibility-large-line-height') ? '1.8' : '';
    modal.style.fontFamily = root.classList.contains('accessibility-dyslexic-font')
        ? 'Comic Sans MS, Arial, sans-serif'
        : '';

    // Применяем к внутренним элементам
    const innerElements = modal.querySelectorAll('.auth-dialog, .auth-form');

    innerElements.forEach(el => {
        el.className = el.className.replace(/accessibility-\S+/g, '');
        el.classList.add(...accessibilityClasses);

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

function closeAdminModal() {
    const modal = document.getElementById('adminModal');
    if (modal && modal.classList.contains('show')) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
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
async function joinProject(cardId, buttonElement) {
    try {
        // Блокируем кнопку на время запроса
        buttonElement.disabled = true;
        const originalText = buttonElement.textContent;
        buttonElement.innerHTML = '<div class="loading-spinner-small"></div> Загрузка...';
        
        const response = await fetch('php/join_project.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `card_id=${cardId}`
        });
        const data = await response.json();
        
        if (data.success) {
            // Обновляем интерфейс
            buttonElement.textContent = 'Вы участвуете';
            buttonElement.disabled = true;
            buttonElement.style.background = '#64748b';
            
            // Обновляем счетчик участников в карточке
            const cardElement = buttonElement.closest('.project-card');
            if (cardElement) {
                const participantsElement = cardElement.querySelector('.meta-item span');
                if (participantsElement) {
                    const parts = participantsElement.textContent.split('/');
                    if (parts.length === 2) {
                        const current = parseInt(parts[0]) + 1;
                        const max = parseInt(parts[1]);
                        participantsElement.textContent = `${current}/${max}`;
                    }
                }
            }
            
            // Обновляем общий счетчик волонтеров на странице
            if (data.new_volunteers_count) {
                updateCounterDisplay('.stat-card:nth-child(4) .stat-number', data.new_volunteers_count);
            }
            
            showToast('Успех', data.message);
            
        } else {
            buttonElement.textContent = originalText;
            buttonElement.disabled = false;
            showToast('Ошибка', data.message);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        buttonElement.textContent = originalText;
        buttonElement.disabled = false;
        showToast('Ошибка', 'Ошибка соединения с сервером');
    }
}

// Функция для обновления отображения счетчика
function updateCounterDisplay(selector, newValue) {
    const element = document.querySelector(selector);
    if (element) {
        animateCounter(element, newValue);
    } else {
        console.warn('Element not found for selector:', selector);
    }
}

// Анимация счетчика
function animateCounter(element, newValue) {
    if (!element) {
        console.error('Element is null in animateCounter');
        return;
    }
    
    const currentText = element.textContent || '0';
    const currentValue = parseInt(currentText.replace(/\D/g, '')) || 0;
    
    if (currentValue === newValue) return;
    
    const duration = 1000;
    const steps = 20;
    const stepValue = (newValue - currentValue) / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
        if (!element) {
            clearInterval(timer);
            return;
        }
        
        currentStep++;
        const value = Math.round(currentValue + (stepValue * currentStep));
        element.textContent = value.toLocaleString();

        if (currentStep >= steps) {
            element.textContent = newValue.toLocaleString();
            clearInterval(timer);
        }
    }, duration / steps);
}

// Функция для обновления всех счетчиков статистики
async function updateStatsCounters() {
    try {
        const response = await fetch('php/get_stats.php');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            
            // Обновляем счетчики в статистике
            const statCards = document.querySelectorAll('.stat-card');
            statCards.forEach((card, index) => {
                const numberElement = card.querySelector('.stat-number');
                if (numberElement) {
                    let value;
                    switch(index) {
                        case 0: value = stats.cities; break;
                        case 1: value = stats.nko; break;
                        case 2: value = stats.projects; break;
                        case 3: value = stats.volunteers; break;
                        default: value = 0;
                    }
                    if (value !== undefined) {
                        // Просто устанавливаем значение
                        numberElement.textContent = value.toLocaleString();
                    }
                }
            });
            
            console.log('Счетчики обновлены:', stats);
        }
    } catch (error) {
        console.error('Ошибка обновления счетчиков:', error);
    }
}

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

// Инициализация формы создания карточки
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
            // Обновляем счетчик проектов
            if (data.new_projects_count) {
                updateCounterDisplay('.stat-card:nth-child(3) .stat-number', data.new_projects_count);
            }
            
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
function closeCreateCardModal() {
    const modal = document.getElementById('createCardModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        
        // Сбрасываем форму
        const form = document.getElementById('createCardForm');
        if (form) {
            form.reset();
        }
    }
}

// Пересчитываем высоту при ресайзе окна
window.addEventListener('resize', function() {
    if (document.getElementById('profileModal')?.classList.contains('show')) {
        if (typeof window.initProfileScroll === 'function') {
            window.initProfileScroll();
        }
    }
});

        
        
        
// Функции для админ-панели в модалке
function switchAdminTab(tabName) {
    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Убираем активный класс у всех кнопок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показываем выбранную вкладку
    const targetTab = document.getElementById('tab-' + tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Активируем кнопку
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Загружаем данные для выбранной вкладки
    if (tabName === 'users') {
        loadAdminUsers();
    } else if (tabName === 'cities') {
        loadAdminCities();
    } else if (tabName === 'statistics') {
        loadAdminStatistics();
    }
}
        
// Загрузка пользователей
async function loadAdminUsers() {
    try {
        console.log('Загрузка пользователей для админ-панели...');
        const response = await fetch('php/admin_ajax.php?action=get_users');
        const data = await response.json();
        
        console.log('Данные пользователей:', data);
        
        if (data.status === 'success' && data.users) {
            const tbody = document.getElementById('usersTableBody');
            if (tbody) {
                if (data.users.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                                Пользователи не найдены
                            </td>
                        </tr>
                    `;
                } else {
                    tbody.innerHTML = data.users.map(user => `
                        <tr>
                            <td>${user.id}</td>
                            <td>${escapeHtml(user.login)}</td>
                            <td>${escapeHtml(user.name || '')}</td>
                            <td>${escapeHtml(user.surname || '')}</td>
                            <td>
                                ${user.roles ? user.roles.split(',').map(role => '
                                    <span class="role-badge role-${role}">${role}</span>
                                ').join('') : ''}
                            </td>
                            <td>${formatDate(user.created_at)}</td>
                            <td class="action-buttons">
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="action" value="assign_role">
                                    <input type="hidden" name="user_id" value="${user.id}">
                                    <button type="submit" name="role" value="admin" class="btn-small btn-primary" 
                                            ${user.roles && user.roles.includes('admin') ? 'disabled' : ''}>Админ</button>
                                    <button type="submit" name="role" value="nko" class="btn-small btn-success"
                                            ${user.roles && user.roles.includes('nko') ? 'disabled' : ''}>НКО</button>
                                    <button type="submit" name="role" value="user" class="btn-small btn-secondary"
                                            ${user.roles && user.roles.includes('user') ? 'disabled' : ''}>Пользователь</button>
                                </form>
                                ${!user.is_current ? '
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="action" value="delete_user">
                                    <input type="hidden" name="user_id" value="${user.id}">
                                    <button type="submit" class="btn-small btn-danger" 
                                            onclick="return confirm('Вы уверены, что хотите удалить этого пользователя?')">Удалить</button>
                                </form>
                                ' : ''}
                            </td>
                        </tr>
                    ').join('');
                }
            }
        } else {
            showAdminMessage('Ошибка загрузки пользователей: ' + (data.message || 'Неизвестная ошибка'), 'error');
        }
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        showAdminMessage('Ошибка соединения с сервером: ' + error.message, 'error');
    }
}

// Загрузка городов
async function loadAdminCities() {
    try {
        console.log('Загрузка городов для админ-панели...');
        const response = await fetch('php/get_cities.php?action=get_all');
        const data = await response.json();
        
        console.log('Данные городов:', data);
        
        if (data.success && data.cities) {
            const tbody = document.getElementById('citiesTable');
            if (tbody) {
                if (data.cities.length === 0) {
                    tbody.innerHTML = '
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                                Города не найдены. Добавьте первый город!
                            </td>
                        </tr>
                    ';
                } else {
                    tbody.innerHTML = data.cities.map(city => '
                        <tr>
                            <td>${city.id}</td>
                            <td>
                                <strong>${escapeHtml(city.name)}</strong>
                                ${city.region ? '<br><small style="color: rgba(255,255,255,0.6);">${escapeHtml(city.region)}</small>' : ''}
                            </td>
                            <td>${escapeHtml(city.region || '-')}</td>
                            <td>
                                <small>${parseFloat(city.latitude).toFixed(6)}, ${parseFloat(city.longitude).toFixed(6)}</small>
                            </td>
                            <td>
                                <span class="status-badge ${city.is_active ? 'status-active' : 'status-inactive'}">
                                    ${city.is_active ? 'Активен' : 'Неактивен'}
                                </span>
                            </td>
                            <td class="action-buttons">
                                <button class="btn-small btn-primary" onclick="centerOnCity(${city.id})" title="Показать на карте">
                                    📍
                                </button>
                                <button class="btn-small btn-secondary" onclick="toggleCityStatus(${city.id}, ${city.is_active ? 0 : 1})" title="${city.is_active ? 'Деактивировать' : 'Активировать'}">
                                    ${city.is_active ? '❌' : '✅'}
                                </button>
                                <button class="btn-small btn-danger" onclick="deleteCity(${city.id})" title="Удалить">
                                    🗑️
                                </button>
                            </td>
                        </tr>
                    ').join('');
                }
            }
        } else {
            showAdminMessage('Ошибка загрузки городов: ' + (data.message || 'Неизвестная ошибка'), 'error');
        }
    } catch (error) {
        console.error('Ошибка загрузки городов:', error);
        showAdminMessage('Ошибка соединения с сервером: ' + error.message, 'error');
    }
}

// Загрузка статистики
async function loadAdminStatistics() {
    try {
        console.log('Загрузка статистики для админ-панели...');
        const response = await fetch('php/get_stats.php');
        const data = await response.json();
        
        console.log('Данные статистики:', data);
        
        if (data.success) {
            if (document.getElementById('statsCities')) {
                document.getElementById('statsCities').textContent = data.stats.cities;
            }
            if (document.getElementById('statsNko')) {
                document.getElementById('statsNko').textContent = data.stats.nko;
            }
            if (document.getElementById('statsProjects')) {
                document.getElementById('statsProjects').textContent = data.stats.projects;
            }
            if (document.getElementById('statsVolunteers')) {
                document.getElementById('statsVolunteers').textContent = data.stats.volunteers;
            }
        } else {
            showAdminMessage('Ошибка загрузки статистики: ' + (data.message || 'Неизвестная ошибка'), 'error');
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        showAdminMessage('Ошибка соединения с сервером: ' + error.message, 'error');
    }
}

// Функции для работы с городами
function showAddCityForm() {
    const form = document.getElementById('addCityForm');
    if (form) {
        form.style.display = 'block';
    }
}

function hideAddCityForm() {
    const form = document.getElementById('addCityForm');
    if (form) {
        form.style.display = 'none';
        // Очищаем форму
        document.getElementById('newCityName').value = '';
        document.getElementById('newCityRegion').value = '';
        document.getElementById('newCityLat').value = '55.7558';
        document.getElementById('newCityLon').value = '37.6173';
    }
}

async function addNewCity() {
    const name = document.getElementById('newCityName').value.trim();
    const region = document.getElementById('newCityRegion').value.trim();
    const lat = parseFloat(document.getElementById('newCityLat').value);
    const lon = parseFloat(document.getElementById('newCityLon').value);

    if (!name) {
        showAdminMessage('Введите название города', 'error');
        return;
    }

    if (isNaN(lat) || isNaN(lon)) {
        showAdminMessage('Введите корректные координаты', 'error');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('region', region);
        formData.append('latitude', lat);
        formData.append('longitude', lon);

        const response = await fetch('php/get_cities.php?action=add_city', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showAdminMessage(data.message, 'success');
            hideAddCityForm();
            loadAdminCities();
            
            // Обновляем статистику если нужно
            if (data.new_cities_count) {
                loadAdminStatistics();
            }
        } else {
            showAdminMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка добавления города:', error);
        showAdminMessage('Ошибка соединения с сервером', 'error');
    }
}

async function toggleCityStatus(cityId, newStatus) {
    const action = newStatus ? 'активировать' : 'деактивировать';
    if (!confirm(`Вы уверены, что хотите ${action} этот город?`)) {
        return;
    }

    try {
        const formData = new FormData();
        formData.append('city_id', cityId);
        formData.append('is_active', newStatus);

        const response = await fetch('php/get_cities.php?action=toggle_city_status', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showAdminMessage(data.message, 'success');
            loadAdminCities();
        } else {
            showAdminMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка изменения статуса города:', error);
        showAdminMessage('Не удалось изменить статус города', 'error');
    }
}

async function deleteCity(cityId) {
    if (!confirm('Вы уверены, что хотите удалить этот город? Это действие нельзя отменить.')) {
        return;
    }

    try {
        const formData = new FormData();
        formData.append('city_id', cityId);

        const response = await fetch('php/get_cities.php?action=delete_city', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showAdminMessage(data.message, 'success');
            loadAdminCities();
            
            // Обновляем статистику если нужно
            if (data.new_cities_count) {
                loadAdminStatistics();
            }
        } else {
            showAdminMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка удаления города:', error);
        showAdminMessage('Не удалось удалить город', 'error');
    }
}

// функция открытия админ-панели
function openAdminModal() {
    const modal = document.getElementById('adminModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Устанавливаем данные текущего пользователя
        const userInfo = document.querySelector('.user-profile-btn');
        if (userInfo) {
            window.currentUserName = userInfo.textContent.trim();
        }
        
        const currentUserEl = document.getElementById('adminCurrentUser');
        if (currentUserEl && window.currentUserName) {
            currentUserEl.innerHTML = `Текущий пользователь: <strong>${window.currentUserName}</strong>`;
        }
        
        // Загружаем данные при открытии
        setTimeout(() => {
            loadAdminUsers();
            loadAdminStatistics();
        }, 100);
        
        console.log('Админ-панель открыта');
    }
}

function closeAdminModal() {
    const modal = document.getElementById('adminModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Вспомогательные функции
function showAdminMessage(message, type) {
    const messageEl = document.getElementById('adminMessage');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `admin-message ${type}`;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Функции для кнопок статистики
function refreshAdminStatistics() {
    loadAdminStatistics();
    showAdminMessage('Статистика обновлена', 'success');
}

function exportStatistics() {
    showAdminMessage('Экспорт данных запущен', 'info');
    // Здесь можно добавить функциональность экспорта
}

function openSystemLogs() {
    showAdminMessage('Просмотр системных логов', 'info');
    // Здесь можно добавить функциональность просмотра логов
}

function centerOnCity(cityId) {
    // Эта функция будет работать если карта инициализирована
    if (window.rosatomMap) {
        window.rosatomMap.centerOnObject('city_' + cityId);
        showAdminMessage('Карта центрирована на выбранном городе', 'info');
    } else {
        showAdminMessage('Карта не инициализирована', 'error');
    }
}

// Инициализация админ-панели при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log('Админ-панель инициализирована');
    
    // Добавляем обработчики для форм в админ-панели
    const usersTable = document.getElementById('usersTableBody');
    if (usersTable) {
        usersTable.addEventListener('submit', async function(e) {
            if (e.target.tagName === 'FORM') {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const action = formData.get('action');
                const userId = formData.get('user_id');
                
                if (action === 'assign_role') {
                    const role = e.submitter?.value || formData.get('role');
                    await adminAssignRole(userId, role);
                } else if (action === 'delete_user') {
                    await adminDeleteUser(userId);
                }
            }
        });
    }
});

// Функции для работы с пользователями через AJAX
async function adminAssignRole(userId, role) {
    try {
        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('role', role);
        
        const response = await fetch('php/admin_ajax.php?action=assign_role', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showAdminMessage(data.message, 'success');
            // Перезагружаем данные
            loadAdminUsers();
        } else {
            showAdminMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка назначения роли:', error);
        showAdminMessage('Ошибка соединения с сервером', 'error');
    }
}

async function adminDeleteUser(userId) {
    try {
        const formData = new FormData();
        formData.append('user_id', userId);
        
        const response = await fetch('php/admin_ajax.php?action=delete_user', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showAdminMessage(data.message, 'success');
            // Перезагружаем данные
            loadAdminUsers();
        } else {
            showAdminMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        showAdminMessage('Ошибка соединения с сервером', 'error');
    }
}
        
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
window.openProfileModal = openProfileModal;
window.openAdminModal = openAdminModal;
window.closeAuthModal = closeAuthModal;
window.closeProfileModal = closeProfileModal;
window.closeAdminModal = closeAdminModal;
window.switchAuthForm = switchAuthForm;
window.toggleCategoryDropdown = toggleCategoryDropdown;
window.showSubcategories = showSubcategories;
window.selectSubcategory = selectSubcategory;
window.filterProjects = filterProjects;
