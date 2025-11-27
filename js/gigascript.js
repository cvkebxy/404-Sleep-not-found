// Объединенный файл скриптов для платформы волонтерства

let currentPage = 1;
let totalPages = 1;
let deleteInProgress = false;
let formHandlerInitialized = false;
let accessibilityMode = false;
let citiesManagementInitialized = false;

// Инициализация счетчиков при загрузке
function initCounters() {
    console.log('Инициализация счетчиков...');
    updateStatsCounters();
}

// Функция для обработки ссылок в описаниях проектов
function processLinksInProjects() {
    const descriptions = document.querySelectorAll('.project-description');
    
    descriptions.forEach(desc => {
        // Проверяем, не обработан ли уже этот элемент
        if (!desc.classList.contains('links-processed')) {
            // Обрабатываем ссылки в тексте
            desc.innerHTML = desc.innerHTML.replace(
                /(https?:\/\/[^\s<]+)/g, 
                '<a href="$1" target="_blank" rel="noopener noreferrer" class="project-link">$1</a>'
            );
            // Помечаем как обработанный
            desc.classList.add('links-processed');
        }
    });
    
    console.log('Обработано ссылок в проектах:', descriptions.length);
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
    initCardsManagement();
    initPagination();
    initCreateCardForm();
    initNotificationSystem();

    // 3. Загрузка данных
    loadInitialCards();

    // 4. Инициализация счетчиков 
    initCounters();

    // 5. Анимации
    initAnimations();
    
    // Инициализация карты
    if (typeof initMap === 'function') {
        initMap().catch(error => {
            console.error('Ошибка инициализации карты:', error);
        });
    }
    
    // 6. Обновление статистики на главной
    updateMainPageStats();
    
    // 7. Инициализация поиска и фильтров
    initSearchSystem();
    
    // Инициализируем флаг для проверки наличия данных НКО
    window.profileHasNkoData = false;
    
    const logoInput = document.getElementById('profileNkoLogo');
    if (logoInput) {
        logoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById('profileNkoLogoPreview');
                    const img = preview.querySelector('img');
                    img.src = e.target.result;
                    preview.style.display = 'inline-block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    const addCityModal = document.getElementById('addCityModal');
    if (addCityModal) {
        addCityModal.addEventListener('hidden.bs.modal', function() {
            // Очищаем форму
            const form = document.getElementById('add-city-form');
            if (form) {
                form.reset();
            }
            
            // Очищаем ошибки
            clearFieldError('city-name');
            clearFieldError('city-region');
            clearFieldError('city-latitude');
            clearFieldError('city-longitude');
        });
    }
    
    const saveBtn = document.getElementById('profileSaveBtn');
    const resubmitBtn = document.getElementById('profileResubmitBtn');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveProfileChanges);
    }
    
    if (resubmitBtn) {
        resubmitBtn.addEventListener('click', resubmitNkoApplication);
    }
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
                joinProject(parseInt(cardId), button);
            }
            return;
        }
    });
}

// Основная функция AJAX пагинации
async function changeCardPage(page) {
    return new Promise(async (resolve, reject) => {
        console.log('Загрузка страницы:', page);
        
        if (page < 1 || page > totalPages || page === currentPage) {
            resolve(false);
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
                
                resolve(true);
            } else {
                throw new Error('Неверный формат ответа от сервера');
            }
            
        } catch (error) {
            console.error('Ошибка загрузки карточек:', error);
            showToast('Ошибка', 'Не удалось загрузить карточки');
            reject(error);
        } finally {
            hideLoadingIndicator();
        }
    });
}

// Инициализация обработчиков для новых карточек
function initCardsEventHandlers() {
    // Обработчики для кнопок "Помочь"
    document.querySelectorAll('.btn-help').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const cardId = this.getAttribute('data-card-id');
            if (cardId && !this.disabled) {
                joinProject(parseInt(cardId), this);
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
    
    // Для подсветки ссылок
    processLinksInProjects();
    
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
            
            processLinksInProjects(); 
            
            updatePaginationButtons();
            initCardsEventHandlers();
            initDeleteButtons();
            
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

// Функции для админ-панели
function switchAdminTab(tabName) {
    console.log('Переключение на вкладку:', tabName);
    
    // Скрываем все вкладки
    document.querySelectorAll('.admin-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Убираем активный класс у всех кнопок
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показываем выбранную вкладку
    const tabElement = document.getElementById('tab-' + tabName);
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    // Активируем кнопку
    const activeBtn = document.querySelector(`.admin-tab-btn[onclick*="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Загружаем данные для вкладки
    switch(tabName) {
        case 'users':
            loadAdminUsers();
            break;
        case 'cities':
            loadAdminCities();
            break;
        case 'statistics':
            loadAdminStatistics();
            break;
    }
}

// Загрузка пользователей
async function loadAdminUsers() {
    try {
        console.log('Загрузка пользователей для админ-панели...');
        
        const tableBody = document.getElementById('adminUsersTable');
        if (!tableBody) {
            console.error('Элемент adminUsersTable не найден');
            return;
        }

        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px;">
                    <div class="loading-spinner-small"></div>
                    <p>Загрузка пользователей...</p>
                </td>
            </tr>
        `;

        const response = await fetch('php/admin_ajax.php?action=get_users');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Данные пользователей:', data);
        
        if (data.status === 'success' && data.users) {
            if (data.users.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                            Пользователи не найдены
                        </td>
                    </tr>
                `;
            } else {
                tableBody.innerHTML = data.users.map(user => `
                    <tr>
                        <td>${user.id}</td>
                        <td>${escapeHtml(user.login)}</td>
                        <td>${escapeHtml(user.name || '')}</td>
                        <td>${escapeHtml(user.surname || '')}</td>
                        <td>
                            ${user.roles ? user.roles.split(',').map(role => `
                                <span class="role-badge role-${role.trim()}" style="display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 10px; margin: 2px; background: ${getRoleColor(role.trim())}; color: white;">
                                    ${role.trim()}
                                </span>
                            `).join('') : '<span style="color: rgba(255,255,255,0.5);">нет ролей</span>'}
                        </td>
                        <td>${formatDate(user.created_at)}</td>
                        <td>
                            <div class="admin-action-buttons">
                                <button class="admin-btn-small admin-btn-primary" onclick="adminAssignRole(${user.id}, 'admin')" 
                                        ${user.roles && user.roles.includes('admin') ? 'disabled' : ''}>
                                    Админ
                                </button>
                                <button class="admin-btn-small admin-btn-success" onclick="adminAssignRole(${user.id}, 'nko')"
                                        ${user.roles && user.roles.includes('nko') ? 'disabled' : ''}>
                                    НКО
                                </button>
                                <button class="admin-btn-small" onclick="adminAssignRole(${user.id}, 'user')"
                                        style="background: #6b7280; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;"
                                        ${user.roles && user.roles.includes('user') ? 'disabled' : ''}>
                                    Пользователь
                                </button>
                                ${!user.is_current ? `
                                <button class="admin-btn-small admin-btn-danger" onclick="adminDeleteUser(${user.id})" 
                                        style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                                    Удалить
                                </button>
                                ` : '<span style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 12px 12px;">Текущий</span>'}
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
            
            showAdminMessage('Данные пользователей загружены', 'success');
            
        } else {
            throw new Error(data.message || 'Неизвестная ошибка');
        }
        
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        const tableBody = document.getElementById('adminUsersTable');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #ef4444;">
                        Ошибка загрузки: ${error.message}
                    </td>
                </tr>
            `;
        }
        showAdminMessage('Ошибка загрузки пользователей: ' + error.message, 'error');
    }
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
                                    '<button class="btn-small btn-danger" onclick="adminDeleteUser(' + user.id + ')">Удалить</button>'
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

// Назначение роли
async function adminAssignRole(userId, role) {
    if (!confirm(`Назначить роль "${role}" пользователю?`)) return;
    
    try {
        console.log(`Назначение роли ${role} пользователю ${userId}`);
        
        const response = await fetch('php/admin_ajax.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=assign_role&user_id=${userId}&role=${role}`
        });
        
        const data = await response.json();
        console.log('Ответ назначения роли:', data);
        
        if (data.status === 'success') {
            showAdminMessage(data.message, 'success');
            // Перезагружаем список пользователей
            setTimeout(() => loadAdminUsers(), 500);
        } else {
            showAdminMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка назначения роли:', error);
        showAdminMessage('Ошибка соединения с сервером: ' + error.message, 'error');
    }
}

// Удаление пользователя
async function adminDeleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя? Это действие нельзя отменить.')) return;
    
    try {
        console.log(`Удаление пользователя ${userId}`);
        
        const response = await fetch('php/admin_ajax.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=delete_user&user_id=${userId}`
        });
        
        const data = await response.json();
        console.log('Ответ удаления пользователя:', data);
        
        if (data.status === 'success') {
            showAdminMessage(data.message, 'success');
            // Перезагружаем список пользователей
            setTimeout(() => loadAdminUsers(), 500);
        } else {
            showAdminMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        showAdminMessage('Ошибка соединения с сервером: ' + error.message, 'error');
    }
}

// Загрузка статистики
async function loadAdminStatistics() {
    try {
        console.log('Загрузка статистики для админ-панели...');
        
        const response = await fetch('php/get_stats.php');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            document.getElementById('statsCities').textContent = stats.cities || 0;
            document.getElementById('statsNko').textContent = stats.nko || 0;
            document.getElementById('statsProjects').textContent = stats.projects || 0;
            document.getElementById('statsVolunteers').textContent = stats.volunteers || 0;
            
            console.log('Статистика загружена:', stats);
        } else {
            throw new Error(data.message || 'Ошибка загрузки статистики');
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        showAdminMessage('Ошибка загрузки статистики: ' + error.message, 'error');
    }
}

// Загрузка городов
async function loadAdminCities() {
    try {
        console.log('Загрузка городов для админ-панели...');
        
        const container = document.getElementById('citiesTableContainer');
        if (!container) {
            console.error('Элемент citiesTableContainer не найден');
            return;
        }

        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7);">
                <div class="loading-spinner-small"></div>
                <p>Загрузка городов и НКО...</p>
            </div>
        `;

        // Загружаем все объекты (города и НКО)
        const response = await fetch('php/get_cities.php?action=get_all_with_nko');
        const data = await response.json();
        
        if (data.success && data.cities && data.cities.length > 0) {
            let html = `
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Название / Тип</th>
                            <th>Регион</th>
                            <th>Координаты</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            data.cities.forEach(city => {
                const isCity = city.object_type === 'city';
                const typeBadge = isCity ? 
                    '<span class="status-badge status-active">Город</span>' : 
                    `<span class="status-badge" style="background: #8b5cf6;">${city.nko_type || 'НКО'}</span>`;
                
                html += `
                    <tr>
                        <td>${city.id}</td>
                        <td>
                            <strong>${escapeHtml(city.name)}</strong>
                            <div style="margin-top: 4px;">${typeBadge}</div>
                        </td>
                        <td>${escapeHtml(city.region || '-')}</td>
                        <td>
                            <small>${parseFloat(city.latitude).toFixed(6)}, ${parseFloat(city.longitude).toFixed(6)}</small>
                        </td>
                        <td>
                            <span class="status-badge ${city.is_active ? 'status-active' : 'status-inactive'}" 
                                  style="padding: 4px 8px; border-radius: 12px; font-size: 11px; background: ${city.is_active ? '#10b981' : '#6b7280'}; color: white;">
                                ${city.is_active ? 'Активен' : 'Неактивен'}
                            </span>
                        </td>
                        <td>
                            <div class="admin-action-buttons">
                                <button class="admin-btn-small admin-btn-primary" 
                                        onclick="adminShowOnMap(${city.id})"
                                        style="background: #4a90e2; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin: 2px;"
                                        title="Показать на карте">
                                    Показать
                                </button>
                                <button class="admin-btn-small" 
                                        onclick="adminToggleCityStatus(${city.id}, ${city.is_active ? 0 : 1})"
                                        style="background: #6b7280; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin: 2px;"
                                        title="${city.is_active ? 'Деактивировать' : 'Активировать'}">
                                    ${city.is_active ? 'Деакт.' : 'Актив.'}
                                </button>
                                <button class="admin-btn-small admin-btn-danger" 
                                        onclick="adminDeleteCity(${city.id})"
                                        style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin: 2px;"
                                        title="Удалить">
                                    Удалить
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                    Города и НКО не найдены.
                </div>
            `;
        }
        
        showAdminMessage('Данные городов и НКО загружены', 'success');
        
    } catch (error) {
        console.error('Ошибка загрузки городов:', error);
        const container = document.getElementById('citiesTableContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    Ошибка загрузки: ${error.message}
                </div>
            `;
        }
        showAdminMessage('Ошибка загрузки городов и НКО: ' + error.message, 'error');
    }
}

// Функция просмотра деталей объекта
function showCityDetails(cityId) {
    // Временно используем данные из таблицы
    const row = document.querySelector(`tr:has(button[onclick="showCityDetails(${cityId})"])`);
    if (!row) return;
    
    const cells = row.cells;
    const name = cells[1].querySelector('strong').textContent;
    const type = cells[1].querySelector('.status-badge').textContent.trim();
    const region = cells[2].textContent;
    const coords = cells[3].textContent;
    const socialLinks = cells[4].innerHTML;
    
    let details = `
        <h3>${escapeHtml(name)}</h3>
        <p><strong>Тип:</strong> ${type}</p>
        <p><strong>Регион:</strong> ${escapeHtml(region)}</p>
        <p><strong>Координаты:</strong> ${escapeHtml(coords)}</p>
    `;
    
    if (socialLinks !== '—') {
        details += `<p><strong>Социальные сети:</strong> ${socialLinks}</p>`;
    }
    
    details += `<p style="margin-top: 15px; color: rgba(255,255,255,0.7);">Полная информация будет доступна после импорта данных</p>`;
    
    // Показываем модальное окно с деталями
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); display: flex; align-items: center; 
        justify-content: center; z-index: 10000;
    `;
    modal.innerHTML = `
        <div style="background: #1a1a1a; padding: 20px; border-radius: 10px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: white;">Детальная информация</h3>
                <button onclick="this.closest('div').parentElement.remove()" 
                        style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">
                    ×
                </button>
            </div>
            <div style="color: white;">
                ${details}
            </div>
            <div style="margin-top: 20px; text-align: right;">
                <button class="btn-primary" onclick="this.closest('div').parentElement.parentElement.remove()">
                    Закрыть
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Функция для показа объекта на карте
async function adminShowOnMap(cityId) {
    try {
        // Получаем данные объекта
        const response = await fetch(`php/get_cities.php?action=get_city&city_id=${cityId}`);
        const data = await response.json();
        
        if (!data.success || !data.city) {
            showAdminMessage('Объект не найден', 'error');
            return;
        }
        
        const city = data.city;
        const cityName = city.name;
        
        // Закрываем админ-панель
        closeAdminModal();
        
        // Ждем пока анимация закрытия завершится
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Проверяем доступность карты
        if (!window.rosatomMap || !window.rosatomMap.map) {
            showToast('Ошибка', 'Карта не загружена. Пожалуйста, подождите...');
            return;
        }
        
        const objectId = city.object_type === 'city' ? 'city_' + cityId : 'nko_' + cityId;
        const coordinates = [parseFloat(city.latitude), parseFloat(city.longitude)];
        
        // Центрируем карту на объекте
        window.rosatomMap.map.setCenter(coordinates, 12, {
            duration: 500
        });
        
        // Прокручиваем к секции карты
        scrollToMapSection();
        
        // Пытаемся открыть балун объекта
        setTimeout(() => {
            if (window.rosatomMap.objectManager) {
                try {
                    window.rosatomMap.objectManager.objects.balloon.open(objectId);
                } catch (balloonError) {
                    console.log('Не удалось открыть балун, но карта центрирована');
                }
            }
        }, 1000);
        
        showToast('Карта', `"${cityName}" показан на карте`);
        
    } catch (error) {
        console.error('Ошибка показа объекта на карте:', error);
        showToast('Ошибка', 'Не удалось показать объект на карте');
    }
}

// Прямое отображение города на карте
async function showCityOnMapDirectly(city) {
    // Проверяем доступность карты
    if (!window.rosatomMap || !window.rosatomMap.map) {
        showAdminMessage('Карта не инициализирована. Пожалуйста, подождите...', 'info');
        
        // Пытаемся инициализировать карту
        if (typeof initMap === 'function') {
            try {
                await initMap();
                // Даем карте время на инициализацию
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                showAdminMessage('Не удалось загрузить карту', 'error');
                return;
            }
        } else {
            showAdminMessage('Карта недоступна', 'error');
            return;
        }
    }
    
    // Проверяем координаты
    if (!city.latitude || !city.longitude || isNaN(city.latitude) || isNaN(city.longitude)) {
        showAdminMessage('Неверные координаты города', 'error');
        return;
    }
    
    try {
        const coordinates = [parseFloat(city.latitude), parseFloat(city.longitude)];
        
        console.log('Центрируем карту на:', coordinates, 'для города:', city.name);
        
        // Сначала закрываем админ-панель
        if (typeof closeAdminModal === 'function') {
            closeAdminModal();
        }
        
        // Ждем пока модальное окно закроется
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Центрируем карту на городе
        window.rosatomMap.map.setCenter(coordinates, 12, {
            duration: 500
        });
        
        // Прокручиваем к карте
        scrollToMapSection();
        
        // Пытаемся открыть балун города
        const cityObjectId = 'city_' + city.id;
        setTimeout(() => {
            if (window.rosatomMap.objectManager) {
                try {
                    window.rosatomMap.objectManager.objects.balloon.open(cityObjectId);
                    console.log('Балун города открыт:', cityObjectId);
                } catch (balloonError) {
                    console.log('Не удалось открыть балун, но карта центрирована');
                }
            }
        }, 1000);
        
        showAdminMessage(`Город "${city.name}" показан на карте`, 'success');
        
    } catch (error) {
        console.error('Ошибка отображения города на карте:', error);
        showAdminMessage('Ошибка отображения на карте: ' + error.message, 'error');
    }
}

// Прокрутка к секции карты
function scrollToMapSection() {
    const mapSection = document.getElementById('map');
    if (!mapSection) {
        console.log('Секция карты не найдена');
        return;
    }
    
    // Ждем пока страница полностью обновится после закрытия модального окна
    setTimeout(() => {
        try {
            // Получаем позицию с учетом текущего скролла
            const rect = mapSection.getBoundingClientRect();
            const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
            const offset = window.pageYOffset + rect.top - headerHeight - 20;
            
            console.log('Прокручиваем к карте:', {
                currentScroll: window.pageYOffset,
                rectTop: rect.top,
                headerHeight: headerHeight,
                finalOffset: offset
            });
            
            window.scrollTo({
                top: offset,
                behavior: 'smooth'
            });
        } catch (error) {
            console.error('Ошибка прокрутки к карте:', error);
        }
    }, 200);
}

// Функция переключения статуса города
async function adminToggleCityStatus(cityId, newStatus) {
    try {
        // Получаем данные города
        const cities = await getCitiesData();
        const city = cities.find(c => c.id == cityId);
        
        if (!city) {
            showAdminMessage('Город не найден', 'error');
            return;
        }

        const action = newStatus ? 'активировать' : 'деактивировать';
        const cityName = city.name;
        
        if (!confirm(`Вы уверены, что хотите ${action} город "${cityName}"?`)) {
            return;
        }

        console.log(`${action} город:`, cityId, cityName);

        // Отправляем запрос на сервер
        const formData = new FormData();
        formData.append('city_id', cityId);
        formData.append('is_active', newStatus);

        const response = await fetch('php/get_cities.php?action=toggle_city_status', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            const statusText = newStatus ? 'активирован' : 'деактивирован';
            showAdminMessage(`Город "${cityName}" успешно ${statusText}`, 'success');
            
            // Обновляем интерфейс
            await updateCityInterface(cityId, newStatus, cityName);
            
        } else {
            showAdminMessage(data.message || 'Ошибка изменения статуса', 'error');
        }

    } catch (error) {
        console.error('Ошибка изменения статуса города:', error);
        showAdminMessage('Ошибка: ' + error.message, 'error');
    }
}

// Обновление интерфейса после изменения статуса
async function updateCityInterface(cityId, newStatus, cityName) {
    try {
        // 1. Перезагружаем таблицу городов
        setTimeout(() => loadAdminCities(), 500);
        
        // 2. Обновляем карту только если она инициализирована
        if (window.rosatomMap && window.rosatomMap.objectManager) {
            const cityObjectId = 'city_' + cityId;
            
            if (newStatus) {
                // Если активировали - добавляем город на карту
                const cityData = await getCityData(cityId);
                if (cityData) {
                    // Проверяем, не добавлен ли уже город
                    const existingObject = window.rosatomMap.objectManager.objects.getById(cityObjectId);
                    if (!existingObject) {
                        window.rosatomMap.addCityToMap(cityData);
                    }
                }
            } else {
                // Если деактивировали - убираем с карты
                // Ждем немного чтобы карта успела обновиться
                setTimeout(() => {
                    if (window.rosatomMap) {
                        window.rosatomMap.removeObject(cityObjectId);
                    }
                }, 300);
            }
        }
        
        // 3. Обновляем статистику
        if (typeof updateStatsCounters === 'function') {
            setTimeout(() => updateStatsCounters(), 1000);
        }
    } catch (error) {
        console.error('Ошибка при обновлении интерфейса:', error);
    }
}

// Функция для удаления города
async function adminDeleteCity(cityId) {
    try {
        // Получаем данные города
        const response = await fetch(`php/get_cities.php?action=get_city&city_id=${cityId}`);
        const cityData = await response.json();
        
        const cityName = cityData.success ? cityData.city.name : 'город';
        
        if (!confirm(`Вы уверены, что хотите удалить "${cityName}"? Это действие нельзя отменить.`)) {
            return;
        }

        console.log('Удаление объекта:', cityId);

        const formData = new FormData();
        formData.append('city_id', cityId);

        const deleteResponse = await fetch('php/get_cities.php?action=delete_city', {
            method: 'POST',
            body: formData
        });

        const data = await deleteResponse.json();

        if (data.success) {
            showAdminMessage(`Объект "${cityName}" успешно удален`, 'success');
            
            // Перезагружаем список объектов
            setTimeout(() => loadAdminCities(), 500);
            
            // Обновляем статистику
            setTimeout(() => updateStatsCounters(), 1000);
            
            // Удаляем с карты
            if (window.rosatomMap) {
                const objectId = cityData.city.object_type === 'city' ? 'city_' + cityId : 'nko_' + cityId;
                setTimeout(() => {
                    window.rosatomMap.removeObject(objectId);
                }, 300);
            }
        } else {
            showAdminMessage(data.message || 'Ошибка удаления объекта', 'error');
        }

    } catch (error) {
        console.error('Ошибка удаления объекта:', error);
        showAdminMessage('Ошибка удаления объекта: ' + error.message, 'error');
    }
}

// Прямое удаление города
async function deleteCityDirectly(cityId, cityName = 'город') {
    try {
        const formData = new FormData();
        formData.append('city_id', cityId);

        const response = await fetch('php/get_cities.php?action=delete_city', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showAdminMessage(`Город "${cityName}" успешно удален`, 'success');
            // Перезагружаем список городов
            setTimeout(() => loadAdminCities(), 500);
            
            // Обновляем статистику
            if (typeof loadAdminStatistics === 'function') {
                setTimeout(() => loadAdminStatistics(), 1000);
            }
            
            // Обновляем карту если город был на ней
            if (window.rosatomMap) {
                const cityObjectId = 'city_' + cityId;
                setTimeout(() => {
                    window.rosatomMap.removeObject(cityObjectId);
                }, 300);
            }
        } else {
            showAdminMessage(data.message || 'Ошибка удаления города', 'error');
        }
    } catch (error) {
        console.error('Ошибка удаления города:', error);
        showAdminMessage('Не удалось удалить город', 'error');
    }
}

// Функция добавления нового города
async function addNewCity() {
    try {
        // Валидация формы
        if (!validateCityForm()) {
            return;
        }
        
        // Получаем данные формы
        const name = document.getElementById('newCityName').value.trim();
        const region = document.getElementById('newCityRegion').value.trim();
        const latitude = parseFloat(document.getElementById('newCityLat').value);
        const longitude = parseFloat(document.getElementById('newCityLon').value);
        
        // Показываем индикатор загрузки
        const submitBtn = document.querySelector('#addCityForm .admin-btn-primary[onclick="addNewCity()"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Добавление...';
        submitBtn.disabled = true;
        
        // Отправляем данные на сервер
        const formData = new FormData();
        formData.append('name', name);
        formData.append('region', region);
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);
        formData.append('object_type', 'city');
        formData.append('description', 'Город присутствия ГК Росатом');
        
        const response = await fetch('php/get_cities.php?action=add_city', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAdminMessage(data.message, 'success');
            
            // Скрываем форму и показываем кнопку
            hideAddCityForm();
            
            // Обновляем таблицу городов
            setTimeout(() => loadAdminCities(), 500);
            
            // Обновляем статистику
            if (typeof updateStatsCounters === 'function') {
                setTimeout(() => updateStatsCounters(), 1000);
            }
            
        } else {
            showAdminMessage(data.message, 'error');
        }
        
    } catch (error) {
        console.error('Ошибка при добавлении города:', error);
        showAdminMessage('Ошибка при добавлении города: ' + error.message, 'error');
    } finally {
        // Восстанавливаем кнопку
        const submitBtn = document.querySelector('#addCityForm .admin-btn-primary[onclick="addNewCity()"]');
        if (submitBtn) {
            submitBtn.textContent = 'Добавить город';
            submitBtn.disabled = false;
        }
    }
}

// Удаление объекта с карты 
function removeObjectFromMap(objectId) {
    if (window.rosatomMap && window.rosatomMap.objectManager) {
        try {
            const object = window.rosatomMap.objectManager.objects.getById(objectId);
            if (object) {
                window.rosatomMap.objectManager.remove(objectId);
                console.log('Объект удален с карты:', objectId);
            } else {
                console.log('Объект не найден на карте для удаления:', objectId);
            }
        } catch (error) {
            console.error('Ошибка при удалении объекта с карты:', error);
        }
    }
}

// Функция для получения данных 1 города
async function getCityData(cityId) {
    try {
        const response = await fetch(`php/get_cities.php?action=get_city&city_id=${cityId}`);
        const data = await response.json();
        return data.success ? data.city : null;
    } catch (error) {
        console.error('Ошибка получения данных города:', error);
        return null;
    }
}

// Функция для получения данных городов
async function getCitiesData() {
    try {
        const response = await fetch('php/get_cities.php?action=get_all_for_admin');
        const data = await response.json();
        return data.success ? data.cities : [];
    } catch (error) {
        console.error('Ошибка получения данных городов:', error);
        return [];
    }
}

// Функции для управления формой добавления города
function showAddCityForm() {
    const form = document.getElementById('addCityForm');
    const button = document.querySelector('[onclick="showAddCityForm()"]');
    
    if (form) {
        // Плавное появление формы
        form.style.display = 'block';
        setTimeout(() => {
            form.style.opacity = '1';
            form.style.transform = 'translateY(0)';
        }, 10);
        
        // Скрываем кнопку "Добавить город"
        if (button) {
            button.style.display = 'none';
        }
        
        // Фокусируемся на первом поле
        const firstInput = form.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function hideAddCityForm() {
    const form = document.getElementById('addCityForm');
    const button = document.querySelector('[onclick="showAddCityForm()"]');
    
    if (form) {
        // Плавное скрытие формы
        form.style.opacity = '0';
        form.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            form.style.display = 'none';
            clearAddCityForm();
            
            // Показываем кнопку "Добавить город"
            if (button) {
                button.style.display = 'inline-block';
            }
        }, 300);
    }
}

function clearAddCityForm() {
    const fields = {
        'newCityName': '',
        'newCityRegion': '',
        'newCityLat': '55.7558',
        'newCityLon': '37.6173'
    };
    
    Object.keys(fields).forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.value = fields[fieldId];
            // Сбрасываем стили ошибок если есть
            element.style.borderColor = '';
            element.style.backgroundColor = '';
            
            // Очищаем сообщения об ошибках
            clearFieldError(fieldId);
        }
    });
    
    // Дополнительно скрываем все сообщения об ошибках
    const errorMessages = document.querySelectorAll('.field-error');
    errorMessages.forEach(error => error.remove());
}

// Дополнительная функция для валидации формы
function validateCityForm() {
    let isValid = true;
    
    // Очищаем предыдущие ошибки
    clearFieldError('newCityName');
    clearFieldError('newCityRegion'); 
    clearFieldError('newCityLat');
    clearFieldError('newCityLon');
    
    // Проверяем название города
    const name = document.getElementById('newCityName').value.trim();
    if (!name) {
        showFieldError('newCityName', 'Название города обязательно');
        isValid = false;
    }
    
    // Проверяем регион
    const region = document.getElementById('newCityRegion').value.trim();
    if (!region) {
        showFieldError('newCityRegion', 'Название региона обязательно');
        isValid = false;
    }
    
    // Проверяем координаты
    const latitude = parseFloat(document.getElementById('newCityLat').value);
    const longitude = parseFloat(document.getElementById('newCityLon').value);
    
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        showFieldError('newCityLat', 'Введите корректную широту (-90 до 90)');
        isValid = false;
    }
    
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        showFieldError('newCityLon', 'Введите корректную долготу (-180 до 180)');
        isValid = false;
    }
    
    return isValid;
}

// Функция показа ошибки поля
function showFieldError(fieldName, message) {
    const field = document.getElementById(fieldName);
    
    // Проверяем существование поля
    if (!field) {
        console.error('Поле не найдено:', fieldName);
        return;
    }
    
    let errorElement = document.getElementById(fieldName + '-error');
    
    // Создаем элемент ошибки если не существует
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = fieldName + '-error';
        errorElement.className = 'field-error';
        errorElement.style.color = '#ef4444';
        errorElement.style.fontSize = '12px';
        errorElement.style.marginTop = '4px';
        
        // Добавляем после поля
        if (field.parentNode) {
            field.parentNode.appendChild(errorElement);
        }
    }
    
    // Применяем стили к полю
    field.style.borderColor = '#ef4444';
    field.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
    
    // Устанавливаем сообщение
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Функция очистки ошибок полей
function clearFieldError(fieldName) {
    const field = document.getElementById(fieldName);
    const errorElement = document.getElementById(fieldName + '-error');
    
    // Проверяем существование поля перед обращением к его свойствам
    if (field) {
        field.style.borderColor = '';
        field.style.backgroundColor = '';
    }
    
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

// Функция показа сообщений в админке
function showAdminMessage(message, type = 'info') {
    // Создаем элемент сообщения
    const messageEl = document.createElement('div');
    messageEl.className = `admin-message admin-message-${type}`;
    messageEl.innerHTML = `
        <div style="padding: 12px 16px; border-radius: 6px; margin: 10px 0; 
                    background: ${type === 'success' ? '#d1fae5' : type === 'error' ? '#fee2e2' : '#dbeafe'}; 
                    color: ${type === 'success' ? '#065f46' : type === 'error' ? '#991b1b' : '#1e40af'}; 
                    border: 1px solid ${type === 'success' ? '#a7f3d0' : type === 'error' ? '#fecaca' : '#bfdbfe'};">
            ${message}
        </div>
    `;
    
    // Ищем контейнер внутри админ-панели
    const adminModal = document.getElementById('adminModal');
    let targetContainer = null;
    
    if (adminModal) {
        // Ищем контейнер для сообщений внутри админки
        targetContainer = adminModal.querySelector('#adminMessage') || 
                         adminModal.querySelector('.admin-modal-content') || 
                         adminModal;
    }
    
    // Если не нашли подходящий контейнер в админке, используем body
    if (!targetContainer) {
        targetContainer = document.body;
    }
    
    // Добавляем сообщение в начало выбранного контейнера
    targetContainer.prepend(messageEl);
    
    // Автоматически удаляем через 3 сек
    setTimeout(() => {
        if (messageEl && messageEl.parentNode) {
            messageEl.remove();
        }
    }, 3000);
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
    } catch (e) {
        return dateString;
    }
}

function getRoleColor(role) {
    const colors = {
        'admin': '#ff6b6b',
        'nko': '#4ecdc4', 
        'user': '#45b7d1'
    };
    return colors[role] || '#6b7280';
}

// Инициализация админ-панели при открытии
function initAdminModal() {
    console.log('Инициализация админ-панели');
    
    // Загружаем данные текущего пользователя
    const userInfo = document.querySelector('.user-profile-btn');
    if (userInfo) {
        const currentUserEl = document.getElementById('adminCurrentUser');
        if (currentUserEl) {
            currentUserEl.innerHTML = `Текущий пользователь: <strong>${userInfo.textContent.trim()}</strong>`;
        }
    }
    
    loadAdminUsers();
    loadAdminStatistics();
    
    console.log('Админ-панель инициализирована без CitiesManagement');
}

// Функция открытия админ-панели
function openAdminModal() {
    const modal = document.getElementById('adminModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Инициализируем данные
        setTimeout(() => {
            initAdminModal();
        }, 100);
        
        console.log('Админ-панель открыта');
    }
}

// Функция закрытия админ-панели
function closeAdminModal() {
    const modal = document.getElementById('adminModal');
    if (modal && modal.classList.contains('show')) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        console.log('Админ-панель закрыта');
    }
}


// ФУНКЦИИ ДЛЯ ФОРМЫ ДОБАВЛЕНИЯ ОБЪЕКТОВ НА КАРТУ

// Переключение полей формы в зависимости от типа объекта
function toggleNkoFields() {
    const objectType = document.getElementById('newObjectType').value;
    const nkoFields = document.getElementById('nkoFields');
    const nkoTypeField = document.getElementById('nkoTypeField');
    
    if (objectType === 'nko') {
        nkoFields.style.display = 'block';
        nkoTypeField.style.display = 'block';
    } else {
        nkoFields.style.display = 'none';
        nkoTypeField.style.display = 'none';
    }
}

// Добавление нового объекта (города или НКО)
async function addNewObject() {
    try {
        // Валидация формы
        if (!validateObjectForm()) {
            return;
        }
        
        // Получаем данные формы с проверками
        const objectType = document.getElementById('newObjectType')?.value || 'city';
        const name = document.getElementById('newCityName')?.value.trim() || '';
        const region = document.getElementById('newCityRegion')?.value.trim() || '';
        const latitude = parseFloat(document.getElementById('newCityLat')?.value || 0);
        const longitude = parseFloat(document.getElementById('newCityLon')?.value || 0);
        
        // Показываем индикатор загрузки
        const submitBtn = document.querySelector('#addCityForm .admin-btn-primary[onclick="addNewObject()"]');
        if (!submitBtn) {
            console.error('Кнопка отправки не найдена');
            return;
        }
        
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Добавление...';
        submitBtn.disabled = true;
        
        // Подготавливаем данные для отправки
        const formData = new FormData();
        formData.append('name', name);
        formData.append('region', region);
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);
        formData.append('object_type', objectType);
        
        // Добавляем данные для НКО если это НКО
        if (objectType === 'nko') {
            formData.append('nko_type', document.getElementById('newNkoType')?.value || '');
            formData.append('description', document.getElementById('newNkoDescription')?.value.trim() || '');
            formData.append('nko_activities', document.getElementById('newNkoActivities')?.value.trim() || '');
            formData.append('social_links', document.getElementById('newNkoSocial')?.value.trim() || '');
            formData.append('target_audience', document.getElementById('newNkoAudience')?.value.trim() || '');
            formData.append('yearly_plan', document.getElementById('newNkoPlan')?.value.trim() || '');
        } else {
            // Для города
            formData.append('description', 'Город присутствия ГК Росатом');
        }
        
        console.log('Отправка данных:', {
            name, region, latitude, longitude, objectType
        });
        
        // Отправляем данные на сервер
        const response = await fetch('php/get_cities.php?action=add_city', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        console.log('Ответ сервера:', data);
        
        if (data.success) {
            showAdminMessage(data.message, 'success');
            
            // Скрываем форму
            hideAddCityForm();
            
            // Обновляем таблицу объектов
            setTimeout(() => loadAdminCities(), 500);
            
            // Обновляем статистику
            setTimeout(() => updateStatsCounters(), 1000);
            
            // Обновляем карту если объект добавлен
            if (data.city && window.rosatomMap) {
                setTimeout(() => {
                    window.rosatomMap.addCityToMap(data.city);
                }, 1000);
            }
            
        } else {
            showAdminMessage(data.message || 'Ошибка при добавлении объекта', 'error');
        }
        
    } catch (error) {
        console.error('Ошибка при добавлении объекта:', error);
        showAdminMessage('Ошибка при добавлении объекта: ' + error.message, 'error');
    } finally {
        // Восстанавливаем кнопку
        const submitBtn = document.querySelector('#addCityForm .admin-btn-primary[onclick="addNewObject()"]');
        if (submitBtn) {
            submitBtn.textContent = 'Добавить объект';
            submitBtn.disabled = false;
        }
    }
}

// Валидация формы добавления объекта
function validateObjectForm() {
    let isValid = true;
    
    // Очищаем предыдущие ошибки только для существующих полей
    const fieldsToClear = ['newCityName', 'newCityRegion', 'newCityLat', 'newCityLon'];
    if (document.getElementById('newObjectType')?.value === 'nko') {
        fieldsToClear.push('newNkoType', 'newNkoDescription');
    }
    
    fieldsToClear.forEach(fieldName => {
        clearFieldError(fieldName);
    });
    
    // Проверяем название
    const name = document.getElementById('newCityName')?.value.trim();
    if (!name) {
        showFieldError('newCityName', 'Название обязательно');
        isValid = false;
    }
    
    // Проверяем регион
    const region = document.getElementById('newCityRegion')?.value.trim();
    if (!region) {
        showFieldError('newCityRegion', 'Регион обязателен');
        isValid = false;
    }
    
    // Проверяем координаты
    const latitude = parseFloat(document.getElementById('newCityLat')?.value || 0);
    const longitude = parseFloat(document.getElementById('newCityLon')?.value || 0);
    
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        showFieldError('newCityLat', 'Введите корректную широту (-90 до 90)');
        isValid = false;
    }
    
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        showFieldError('newCityLon', 'Введите корректную долготу (-180 до 180)');
        isValid = false;
    }
    
    // Дополнительная валидация для НКО
    const objectType = document.getElementById('newObjectType')?.value;
    if (objectType === 'nko') {
        const nkoType = document.getElementById('newNkoType')?.value;
        if (!nkoType) {
            showFieldError('newNkoType', 'Тип НКО обязателен');
            isValid = false;
        }
        
        const description = document.getElementById('newNkoDescription')?.value.trim();
        if (!description) {
            showFieldError('newNkoDescription', 'Описание деятельности обязательно');
            isValid = false;
        }
    }
    
    return isValid;
}

// Показать ошибку поля
function showFieldError(fieldName, message) {
    const field = document.getElementById(fieldName);
    
    if (!field) {
        console.error('Поле не найдено:', fieldName);
        return;
    }
    
    let errorElement = document.getElementById(fieldName + '-error');
    
    // Создаем элемент ошибки если не существует
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = fieldName + '-error';
        errorElement.className = 'field-error';
        errorElement.style.color = '#ef4444';
        errorElement.style.fontSize = '12px';
        errorElement.style.marginTop = '4px';
        
        // Добавляем после поля
        if (field.parentNode) {
            field.parentNode.appendChild(errorElement);
        }
    }
    
    // Применяем стили к полю только если у него есть style
    if (field.style) {
        field.style.borderColor = '#ef4444';
        field.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
    }
    
    // Устанавливаем сообщение
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Очистить ошибку поля
function clearFieldError(fieldName) {
    const field = document.getElementById(fieldName);
    const errorElement = document.getElementById(fieldName + '-error');
    
    if (field) {
        field.style.borderColor = '';
        field.style.backgroundColor = '';
    }
    
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

// Показать форму добавления объекта
function showAddCityForm() {
    const form = document.getElementById('addCityForm');
    const button = document.querySelector('[onclick="showAddCityForm()"]');
    
    if (form) {
        // Плавное появление формы
        form.style.display = 'block';
        setTimeout(() => {
            form.style.opacity = '1';
            form.style.transform = 'translateY(0)';
        }, 10);
        
        // Скрываем кнопку "Добавить город"
        if (button) {
            button.style.display = 'none';
        }
        
        // Фокусируемся на первом поле
        const firstInput = form.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

// Скрыть форму добавления объекта
function hideAddCityForm() {
    const form = document.getElementById('addCityForm');
    const button = document.querySelector('[onclick="showAddCityForm()"]');
    
    if (form) {
        // Плавное скрытие формы
        form.style.opacity = '0';
        form.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            form.style.display = 'none';
            clearObjectForm(); 
            
            // Показываем кнопку "Добавить город"
            if (button) {
                button.style.display = 'inline-block';
            }
        }, 300);
    }
}

// Очистка формы объекта
function clearObjectForm() {
    const fields = {
        'newObjectType': 'city',
        'newCityName': '',
        'newCityRegion': '',
        'newCityLat': '55.7558',
        'newCityLon': '37.6173',
        'newNkoType': '',
        'newNkoDescription': '',
        'newNkoActivities': '',
        'newNkoSocial': '',
        'newNkoAudience': '',
        'newNkoPlan': ''
    };
    
    Object.keys(fields).forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            if (element.type === 'select-one') {
                element.value = fields[fieldId];
            } else {
                element.value = fields[fieldId];
            }
            // Сбрасываем стили ошибок
            element.style.borderColor = '';
            element.style.backgroundColor = '';
            
            // Очищаем сообщения об ошибках
            clearFieldError(fieldId);
        }
    });
    
    // Скрываем поля НКО
    const nkoFields = document.getElementById('nkoFields');
    const nkoTypeField = document.getElementById('nkoTypeField');
    if (nkoFields) nkoFields.style.display = 'none';
    if (nkoTypeField) nkoTypeField.style.display = 'none';
    
    // Дополнительно скрываем все сообщения об ошибках
    const errorMessages = document.querySelectorAll('.field-error');
    errorMessages.forEach(error => error.remove());
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

// Функция загрузки данных профиля
window.loadProfileData = async function() {
    try {
        console.log("Загрузка данных профиля...");
        
        const response = await fetch('php/get_profile.php');
        const data = await response.json();
        
        if (data.success) {
            fillProfileForm(data);
            updateNkoSectionStatus(data.nko); 
        } else {
            showToast('Ошибка', data.message);
        }
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        showToast('Ошибка', 'Не удалось загрузить данные профиля');
    }
}

// Функция переключения секции НКО
window.toggleNkoSection = function() {
    const content = document.getElementById('nkoSectionContent');
    const toggleIcon = document.querySelector('.nko-toggle-icon');
    
    if (content.style.display === 'none' || !content.classList.contains('open')) {
        // Открываем секцию
        content.style.display = 'block';
        setTimeout(() => {
            content.classList.add('open');
            toggleIcon.classList.add('open');
        }, 10);
    } else {
        // Закрываем секцию
        content.classList.remove('open');
        toggleIcon.classList.remove('open');
        setTimeout(() => {
            content.style.display = 'none';
        }, 400);
    }
}

// Функция заполнения формы профиля
function fillProfileForm(data) {
    if (!data.user) return;
    
    // Сохраняем исходные данные для сравнения
    window.originalProfileData = {
        name: data.user.name || '',
        surname: data.user.surname || '',
        login: data.user.login || ''
    };
    
    // Заполняем основные поля
    document.getElementById('profileName').value = data.user.name || '';
    document.getElementById('profileSurname').value = data.user.surname || '';
    document.getElementById('profileEmail').value = data.user.login || '';
    
    // Заполняем данные НКО если есть
    if (data.nko) {
        window.profileHasNkoData = true;
        
        // Сохраняем исходные данные НКО
        window.originalNkoData = {
            nko_name: data.nko.name || '',
            nko_category: data.nko.category || '',
            nko_description: data.nko.description || '',
            nko_activities: data.nko.activities || '',
            nko_phone: data.nko.phone || '',
            nko_address: data.nko.address || '',
            nko_website: data.nko.website || '',
            nko_social: data.nko.social_links || ''
        };
        
        document.getElementById('profileNkoName').value = data.nko.name || '';
        document.getElementById('profileNkoCategory').value = data.nko.category || '';
        document.getElementById('profileNkoDescription').value = data.nko.description || '';
        document.getElementById('profileNkoActivities').value = data.nko.activities || '';
        document.getElementById('profileNkoPhone').value = data.nko.phone || '';
        document.getElementById('profileNkoAddress').value = data.nko.address || '';
        document.getElementById('profileNkoWebsite').value = data.nko.website || '';
        document.getElementById('profileNkoSocial').value = data.nko.social_links || '';
        
        // Обновляем статус НКО
        updateNkoSectionStatus(data.nko);
        
        // Показываем логотип если есть
        if (data.nko.logo_path) {
            const preview = document.getElementById('profileNkoLogoPreview');
            if (preview) {
                const img = preview.querySelector('img');
                if (img) img.src = data.nko.logo_path;
                preview.style.display = 'block';
                
                // Фиксируем позиционирование
                setTimeout(fixLogoPreviewPosition, 100);
            }
        }
    } else {
        window.profileHasNkoData = false;
        window.originalNkoData = {};
        // Сбрасываем статус НКО
        updateNkoSubmitButton(null);
        // Показываем подсказку
        document.getElementById('profileNkoHint').style.display = 'block';
    }
    
    // Загружаем проекты пользователя
    if (data.projects && typeof loadUserProjects === 'function') {
        loadUserProjects(data.projects);
    }
}

// Функция для обновления статуса секции НКО
function updateNkoSectionStatus(nkoData) {
    if (!nkoData) return;
    
    const nkoSection = document.getElementById('nkoProfileSection');
    const nkoHeader = document.querySelector('.nko-section-header');
    const nkoHint = document.getElementById('profileNkoHint');
    const resubmitBtn = document.getElementById('profileResubmitBtn');
    
    if (!nkoSection || !nkoHeader) return;
    
    // Удаляем старые статус-бейджи
    const oldBadge = nkoHeader.querySelector('.nko-status-badge');
    if (oldBadge) {
        oldBadge.remove();
    }
    
    // Создаем новый статус-бейдж
    let statusBadge = '';
    let statusClass = '';
    
    switch(nkoData.status) {
        case 'pending':
            statusBadge = 'На модерации';
            statusClass = 'nko-status-pending';
            break;
        case 'approved':
            statusBadge = 'Одобрено';
            statusClass = 'nko-status-approved';
            break;
        case 'rejected':
            statusBadge = 'Отклонено';
            statusClass = 'nko-status-rejected';
            break;
    }
    
    if (statusBadge) {
        const badgeHtml = `
            <span class="nko-status-badge ${statusClass}">
                ${statusBadge}
                ${nkoData.status === 'rejected' && nkoData.moderation_comment ? 
                  `<span class="rejection-reason" title="${escapeHtml(nkoData.moderation_comment)}">ⓘ</span>` : ''}
            </span>
        `;
        
        // Добавляем бейдж в заголовок
        nkoHeader.insertAdjacentHTML('beforeend', badgeHtml);
    }
    
    // Обновляем кнопки
    updateNkoSubmitButton(nkoData.status);
    
    // Показываем/скрываем подсказку
    if (nkoHint) {
        if (nkoData.status === 'rejected') {
            nkoHint.style.display = 'block';
            nkoHint.innerHTML = `
                <div class="hint-content rejected-hint">
                    <strong>Заявка отклонена</strong>
                    ${nkoData.moderation_comment ? 
                      `<p>Причина: ${escapeHtml(nkoData.moderation_comment)}</p>` : 
                      '<p>Исправьте данные и отправьте заявку повторно</p>'}
                    <p>После исправлений нажмите "Отправить заявку повторно"</p>
                </div>
            `;
            
            // Показываем кнопку повторной отправки
            if (resubmitBtn) {
                resubmitBtn.style.display = 'inline-block';
            }
        } else if (nkoData.status === 'pending') {
            nkoHint.style.display = 'block';
            nkoHint.innerHTML = `
                <div class="hint-content pending-hint">
                    <strong>Заявка на рассмотрении</strong>
                    <p>Ваша заявка находится на модерации. Ожидайте решения администратора.</p>
                    <p>Вы можете сохранить изменения, но не можете отправить новую заявку.</p>
                </div>
            `;
            
            // Скрываем кнопку повторной отправки
            if (resubmitBtn) {
                resubmitBtn.style.display = 'none';
            }
        } else if (nkoData.status === 'approved') {
            nkoHint.style.display = 'none';
            // Скрываем кнопку повторной отправки
            if (resubmitBtn) {
                resubmitBtn.style.display = 'none';
            }
        } else {
            nkoHint.style.display = 'none';
        }
    }
    
    console.log('Статус НКО обновлен:', nkoData.status);
}

// Функция для принудительного обновления статуса НКО
function forceUpdateNkoStatus(status) {
    const nkoData = {
        status: status,
        moderation_comment: null
    };
    updateNkoSectionStatus(nkoData);
}

// Функция для обновления кнопки отправки
function updateNkoSubmitButton(status) {
    const saveBtn = document.getElementById('profileSaveBtn');
    const resubmitBtn = document.getElementById('profileResubmitBtn');
    
    if (!saveBtn || !resubmitBtn) return;
    
    switch(status) {
        case 'pending':
            saveBtn.textContent = 'Сохранить изменения';
            saveBtn.disabled = false;
            saveBtn.style.display = 'inline-block';
            
            resubmitBtn.style.display = 'none';
            break;
            
        case 'approved':
            saveBtn.textContent = 'Сохранить изменения';
            saveBtn.disabled = false;
            saveBtn.style.display = 'inline-block';
            
            resubmitBtn.style.display = 'none';
            break;
            
        case 'rejected':
            saveBtn.textContent = 'Сохранить изменения';
            saveBtn.disabled = false;
            saveBtn.style.display = 'inline-block';
            
            resubmitBtn.textContent = 'Отправить заявку повторно';
            resubmitBtn.disabled = false;
            resubmitBtn.style.display = 'inline-block';
            break;
            
        default:
            saveBtn.textContent = 'Сохранить изменения';
            saveBtn.disabled = false;
            saveBtn.style.display = 'inline-block';
            
            resubmitBtn.style.display = 'none';
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

// Загрузка данных НКО
window.loadNkoData = async function() {
    try {
        const response = await fetch('php/get_nko.php');
        const data = await response.json();
        
        if (data.success) {
            if (data.nko) {
                // Сохраняем данные НКО в глобальной переменной для использования в форме карточки
                window.currentNkoData = data.nko;
                
                // Обновляем статус кнопки в профиле, если открыта форма профиля
                const submitBtn = document.querySelector('#nkoForm .auth-submit, .profile-form-actions .profile-btn-primary');
                if (submitBtn && data.nko.status) {
                    switch(data.nko.status) {
                        case 'pending':
                            submitBtn.textContent = 'Обновить данные НКО (ожидает модерации)';
                            submitBtn.disabled = true;
                            break;
                        case 'approved':
                            submitBtn.textContent = 'Обновить данные НКО (одобрено)';
                            submitBtn.disabled = false;
                            break;
                        case 'rejected':
                            submitBtn.textContent = 'Отправить заявку повторно';
                            submitBtn.disabled = false;
                            submitBtn.classList.add('resubmit-btn');
                            showToast('Внимание', 'Ваша НКО не прошла модерацию. Причина: ' + (data.nko.moderation_comment || 'не указана'));
                            break;
                    }
                }
            } else {
                window.currentNkoData = null;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки данных НКО:', error);
        window.currentNkoData = null;
    }
}

// Функция для заполнения названия НКО в форме создания карточки
window.loadNkoDataForCard = function() {
    // Если данные НКО уже загружены, используем их
    if (window.currentNkoData && window.currentNkoData.name) {
        const cardSubText = document.getElementById('cardSubText');
        if (cardSubText) {
            cardSubText.value = window.currentNkoData.name;
        }
    } else {
        // Иначе загружаем данные НКО
        loadNkoData().then(() => {
            if (window.currentNkoData && window.currentNkoData.name) {
                const cardSubText = document.getElementById('cardSubText');
                if (cardSubText) {
                    cardSubText.value = window.currentNkoData.name;
                }
            }
        });
    }
}

// Обработчик формы регистрации
document.getElementById('registerForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const form = this;
    const submitBtn = form.querySelector('.auth-submit');
    const originalText = submitBtn.textContent;
    
    // Показываем загрузку
    submitBtn.textContent = 'Регистрация...';
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData(form);
        formData.append('doGo', 'true'); // Добавляем флаг отправки формы
        
        const response = await fetch('php/register.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        // Показываем уведомление
        showToast(data.status === 'success' ? 'Успех' : 'Ошибка', data.message);
        
        if (data.status === 'success') {
            // Закрываем модальное окно
            setTimeout(() => {
                closeRegModal();
            }, 2000);
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Ошибка соединения с сервером');
    } finally {
        // Восстанавливаем кнопку
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Обработчик формы авторизации
document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const form = this;
    const submitBtn = form.querySelector('.auth-submit');
    const originalText = submitBtn.textContent;
    
    // Показываем загрузку
    submitBtn.textContent = 'Вход...';
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData(form);
        
        const response = await fetch('php/auth.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        // Показываем уведомление
        showToast(data.status === 'success' ? 'Успех' : 'Ошибка', data.message);
        
        if (data.status === 'success') {
            // Закрываем модальное окно и перезагружаем страницу
            setTimeout(() => {
                closeAuthModal();
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }, 500);
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Ошибка соединения с сервером');
    } finally {
        // Восстанавливаем кнопку
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Обработчик формы профиля
document.getElementById('profileForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const form = this;
    const submitBtn = form.querySelector('.profile-btn-primary');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Сохранение...';
    submitBtn.disabled = true;

    try {
        const formData = new FormData(form);
        const hasBasicChanges = hasBasicInfoChanged(formData);
        const hasNkoChanges = hasNkoInfoChanged(formData);
        
        if (!hasBasicChanges && !hasNkoChanges) {
            showNotification('Информация', 'Нет изменений для сохранения', 'info');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }

        let successCount = 0;
        let errorMessage = '';

        // Сохраняем основные данные
        if (hasBasicChanges) {
            const basicResult = await saveBasicProfileInfo(formData);
            if (basicResult.success) {
                successCount++;
            } else {
                errorMessage = basicResult.message;
            }
        }

        // Сохраняем данные НКО
        if (hasNkoChanges && !errorMessage) {
            const nkoResult = await saveNkoProfileInfo(formData);
            if (nkoResult.success) {
                successCount++;
                if (nkoResult.new_nko_count && !window.profileHasNkoData) {
                    updateCounterDisplay('.stat-card:nth-child(2) .stat-number', nkoResult.new_nko_count);
                }
            } else {
                errorMessage = nkoResult.message;
            }
        }

        // Показываем результат в уведомлениях
        if (errorMessage) {
            showNotification('Ошибка', errorMessage, 'error');
        } else if (successCount > 0) {
            showNotification('Успех', 'Данные успешно сохранены', 'success');
            if (typeof loadProfileData === 'function') loadProfileData();
        }

    } catch (err) {
        console.error('Ошибка сохранения профиля:', err);
        showNotification('Ошибка', 'Ошибка соединения с сервером', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        setTimeout(fixLogoPreviewPosition, 500);
    }
});

// Функция проверки изменений в основной информации
function hasBasicInfoChanged(formData) {
    const currentName = document.getElementById('profileName').value.trim();
    const currentSurname = document.getElementById('profileSurname').value.trim();
    const currentEmail = document.getElementById('profileEmail').value.trim();
    
    // Сравниваем с исходными значениями (можно сохранять их при загрузке)
    const originalName = window.originalProfileData?.name || '';
    const originalSurname = window.originalProfileData?.surname || '';
    const originalEmail = window.originalProfileData?.login || '';
    
    return currentName !== originalName || 
           currentSurname !== originalSurname || 
           currentEmail !== originalEmail;
}

// Функция проверки изменений в данных НКО
function hasNkoInfoChanged(formData) {
    const nkoFields = [
        'nko_name', 'nko_category', 'nko_description', 'nko_activities',
        'nko_phone', 'nko_address', 'nko_website', 'nko_social'
    ];
    
    // Проверяем файл логотипа
    const logoInput = document.getElementById('profileNkoLogo');
    const hasLogoChange = logoInput && logoInput.files.length > 0;
    
    // Проверяем текстовые поля
    for (let field of nkoFields) {
        const currentValue = formData.get(field)?.toString().trim() || '';
        const originalValue = window.originalNkoData?.[field] || '';
        if (currentValue !== originalValue) {
            return true;
        }
    }
    
    return hasLogoChange;
}

// Функция сохранения основной информации
async function saveBasicProfileInfo(formData) {
    const basicData = new FormData();
    basicData.append('name', formData.get('name') || '');
    basicData.append('surname', formData.get('surname') || '');
    basicData.append('login', formData.get('login') || '');

    const response = await fetch('php/save_profile.php', {
        method: 'POST',
        body: basicData
    });
    
    return await response.json();
}

// Функция сохранения изменений профиля 
async function saveProfileChanges() {
    const form = document.getElementById('profileForm');
    if (!form) return;

    const submitBtn = document.getElementById('profileSaveBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Сохранение...';
    submitBtn.disabled = true;

    try {
        const formData = new FormData(form);
        const hasBasicChanges = hasBasicInfoChanged(formData);
        const hasNkoChanges = hasNkoInfoChanged(formData);
        
        if (!hasBasicChanges && !hasNkoChanges) {
            showNotification('Информация', 'Нет изменений для сохранения', 'info');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }

        let successCount = 0;
        let errorMessage = '';

        // Сохраняем основные данные
        if (hasBasicChanges) {
            const basicResult = await saveBasicProfileInfo(formData);
            if (basicResult.success) {
                successCount++;
            } else {
                errorMessage = basicResult.message;
            }
        }

        // Сохраняем данные НКО (без флага повторной отправки)
        if (hasNkoChanges && !errorMessage) {
            const response = await fetch('php/save_nko.php', {
                method: 'POST',
                body: formData
            });
            const nkoResult = await response.json();
            
            if (nkoResult.success) {
                successCount++;
                if (nkoResult.new_nko_count && !window.profileHasNkoData) {
                    updateCounterDisplay('.stat-card:nth-child(2) .stat-number', nkoResult.new_nko_count);
                }
                
                // Если статус изменился на pending, обновляем интерфейс
                if (nkoResult.status === 'pending') {
                    forceUpdateNkoStatus('pending');
                }
            } else {
                errorMessage = nkoResult.message;
            }
        }

        // Показываем результат
        if (errorMessage) {
            showNotification('Ошибка', errorMessage, 'error');
        } else if (successCount > 0) {
            showNotification('Успех', 'Данные успешно сохранены', 'success');
            // Обновляем данные профиля
            if (typeof loadProfileData === 'function') loadProfileData();
        }

    } catch (err) {
        console.error('Ошибка сохранения профиля:', err);
        showNotification('Ошибка', 'Ошибка соединения с сервером', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        setTimeout(fixLogoPreviewPosition, 500);
    }
}

// Функция повторной отправки заявки НКО
async function resubmitNkoApplication() {
    const form = document.getElementById('profileForm');
    if (!form) return;

    if (!confirm('Вы уверены, что хотите отправить заявку на повторную модерацию?')) {
        return;
    }

    const submitBtn = document.getElementById('profileResubmitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Отправка...';
    submitBtn.disabled = true;

    try {
        const formData = new FormData(form);
        
        // Добавляем флаг повторной отправки
        formData.append('is_resubmit', '1');
        
        // Валидация обязательных полей
        const requiredFields = [
            'nko_name',
            'nko_category', 
            'nko_description',
            'nko_activities'
        ];

        let isValid = true;
        for (let field of requiredFields) {
            const value = formData.get(field)?.toString().trim();
            if (!value) {
                showFieldError(field, 'Это поле обязательно для заполнения');
                isValid = false;
            } else {
                clearFieldError(field);
            }
        }

        if (!isValid) {
            showNotification("Ошибка", "Заполните все обязательные поля!", 'error');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }

        // Отправляем данные на модерацию
        const response = await fetch('php/save_nko.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Успех', data.message, 'success');
            
            // Немедленно обновляем интерфейс
            forceUpdateNkoStatus('pending');
            
            // Скрываем кнопку повторной отправки
            submitBtn.style.display = 'none';
            
            // Обновляем данные профиля для синхронизации
            setTimeout(() => {
                if (typeof loadProfileData === 'function') {
                    loadProfileData();
                }
            }, 1000);
            
        } else {
            showNotification('Ошибка', data.message || 'Не удалось отправить заявку', 'error');
        }

    } catch (err) {
        console.error('Ошибка отправки заявки:', err);
        showNotification('Ошибка', 'Ошибка соединения с сервером', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        setTimeout(fixLogoPreviewPosition, 500);
    }
}

// Функция сохранения данных НКО
async function saveNkoProfileInfo(formData, sendForModeration = false) {
    const nkoData = new FormData();
    
    // Добавляем все поля НКО
    const nkoFields = {
        'nko_name': 'name',
        'nko_category': 'category', 
        'nko_description': 'description',
        'nko_activities': 'activities',
        'nko_phone': 'phone',
        'nko_address': 'address',
        'nko_website': 'website',
        'nko_social': 'social_links'
    };
    
    for (const [formField, serverField] of Object.entries(nkoFields)) {
        const value = formData.get(formField) || '';
        nkoData.append(serverField, value);
    }
    
    // Добавляем флаг модерации
    if (sendForModeration) {
        nkoData.append('send_for_moderation', '1');
    }
    
    // Добавляем файл логотипа если есть
    const logoInput = document.getElementById('profileNkoLogo');
    if (logoInput && logoInput.files.length > 0) {
        nkoData.append('logo', logoInput.files[0]);
    }

    const response = await fetch('php/save_nko.php', {
        method: 'POST',
        body: nkoData
    });
    
    return await response.json();
}

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

// Функция для отправки данных НКО из профиля
window.saveNkoFromProfile = function () {
    const form = document.getElementById('profileForm');
    if (!form) return;

    const formData = new FormData(form);
    
    // Проверка обязательных полей
    const requiredFields = [
        'nko_name',
        'nko_category', 
        'nko_description',
        'nko_activities'
    ];

    let isValid = true;
    for (let field of requiredFields) {
        const value = formData.get(field)?.toString().trim();
        if (!value) {
            showFieldError(field, 'Это поле обязательно для заполнения');
            isValid = false;
        } else {
            clearFieldError(field);
        }
    }

    if (!isValid) {
        showToast("Ошибка", "Заполните все обязательные поля!");
        return;
    }

    // Показываем индикатор загрузки
    const submitBtn = form.querySelector('.profile-btn-primary');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Отправка...';
    submitBtn.disabled = true;

    // Отправляем данные
    fetch("php/save_nko.php", {
        method: "POST",
        body: formData,
        credentials: "include"
    })
    .then(response => response.json())
    .then(data => {
        console.log("Ответ save_nko.php:", data);

        if (data.success) {
            showToast("Успех", data.message);
            
            // Обновляем данные профиля
            if (typeof loadProfileData === 'function') {
                setTimeout(() => loadProfileData(), 1000);
            }
            
            // Если вернулся новый логотип — показываем в профиле
            if (data.logo_path) {
                const preview = document.getElementById("profileNkoLogoPreview");
                if (preview) {
                    const img = preview.querySelector('img');
                    if (img) img.src = data.logo_path;
                    preview.style.display = "block";
                }
            }
        } else {
            showToast("Ошибка", data.message || "Не удалось сохранить данные НКО");
        }
    })
    .catch(error => {
        console.error(error);
        showToast("Ошибка", "Произошла ошибка подключения");
    })
    .finally(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        setTimeout(fixLogoPreviewPosition, 500);
    });
};

// Функция для фиксации позиционирования превью логотипа
function fixLogoPreviewPosition() {
    const preview = document.getElementById('profileNkoLogoPreview');
    if (preview) {
        preview.classList.add('fixed');
    }
    if (preview && preview.style.display !== 'none') {
        // Принудительно устанавливаем правильные стили
        preview.style.position = 'relative';
        preview.style.display = 'inline-block';
        preview.style.marginTop = '10px';
        
        // Принудительно обновляем позиционирование кнопки удаления
        const removeBtn = preview.querySelector('.remove-logo-btn');
        if (removeBtn) {
            removeBtn.style.position = 'absolute';
            removeBtn.style.top = '-8px';
            removeBtn.style.right = '-8px';
            removeBtn.style.zIndex = '10';
        }
    }
}


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
            // Получаем данные напрямую из DOM элементов на главной странице
            const statsElements = {
                projects: document.querySelector('.stat-card:nth-child(3) .stat-number'),
                volunteers: document.querySelector('.stat-card:nth-child(4) .stat-number'),
                cities: document.querySelector('.stat-card:nth-child(1) .stat-number'),
                organizations: document.querySelector('.stat-card:nth-child(2) .stat-number')
            };

            // Извлекаем значения из DOM
            this.counters = {
                projects: this.extractNumber(statsElements.projects?.textContent, 300),
                volunteers: this.extractNumber(statsElements.volunteers?.textContent, 5202),
                cities: this.extractNumber(statsElements.cities?.textContent, 32),
                organizations: this.extractNumber(statsElements.organizations?.textContent, 130)
            };

            console.log('Статистика загружена из DOM:', this.counters);

        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
            // Используем значения по умолчанию
            this.counters = {
                projects: 300,
                volunteers: 5202,
                cities: 32,
                organizations: 130
            };
        }
    }

    // Вспомогательная функция для извлечения чисел из текста
    extractNumber(text, defaultValue = 0) {
        if (!text) return defaultValue;
        
        // Удаляем все нецифровые символы и форматирование
        const number = parseInt(text.toString().replace(/[^\d]/g, ''));
        return isNaN(number) ? defaultValue : number;
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

        // Слушаем добавление новых объектов в админке
        document.addEventListener('cityAdded', () => {
            this.incrementCounter('cities');
        });

        document.addEventListener('nkoAdded', () => {
            this.incrementCounter('organizations');
        });

        // Слушаем удаление объектов
        document.addEventListener('cityRemoved', () => {
            this.decrementCounter('cities');
        });

        document.addEventListener('nkoRemoved', () => {
            this.decrementCounter('organizations');
        });
    }

    incrementCounter(counterName) {
        if (this.counters[counterName] !== undefined) {
            this.counters[counterName]++;
            this.updateCounterDisplay(counterName);
            
            // Обновляем данные на сервере (если нужно)
            this.updateServerCounter(counterName);
        }
    }

    decrementCounter(counterName) {
        if (this.counters[counterName] !== undefined && this.counters[counterName] > 0) {
            this.counters[counterName]--;
            this.updateCounterDisplay(counterName);
            
            // Обновляем данные на сервере (если нужно)
            this.updateServerCounter(counterName);
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
        const currentValue = this.extractNumber(element.textContent, 0);
        
        // Если значение не изменилось, не анимируем
        if (currentValue === newValue) return;
        
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

    // Метод для обновления счетчиков при изменении данных в админке
    async refreshCounters() {
        await this.loadRealCounters();
        this.updateCounters();
    }

    // Метод для обновления счетчика на сервере 
    async updateServerCounter(counterName) {
        console.log(`Счетчик ${counterName} обновлен:`, this.counters[counterName]);
    }

    // Публичные методы для внешнего использования
    addProject() {
        this.incrementCounter('projects');
        document.dispatchEvent(new CustomEvent('cardCreated'));
    }

    addVolunteer() {
        this.incrementCounter('volunteers');
        document.dispatchEvent(new CustomEvent('volunteerJoined'));
    }

    addCity() {
        this.incrementCounter('cities');
        document.dispatchEvent(new CustomEvent('cityAdded'));
    }

    addOrganization() {
        this.incrementCounter('organizations');
        document.dispatchEvent(new CustomEvent('nkoAdded'));
    }

    removeCity() {
        this.decrementCounter('cities');
        document.dispatchEvent(new CustomEvent('cityRemoved'));
    }

    removeOrganization() {
        this.decrementCounter('organizations');
        document.dispatchEvent(new CustomEvent('nkoRemoved'));
    }

    // Получить текущие значения счетчиков
    getCounters() {
        return { ...this.counters };
    }

    // Установить конкретные значения счетчиков
    setCounters(newCounters) {
        Object.keys(newCounters).forEach(counter => {
            if (this.counters[counter] !== undefined) {
                this.counters[counter] = newCounters[counter];
            }
        });
        this.updateCounters();
    }
}

// Инициализация менеджера счетчиков
const countersManager = new CountersManager();
window.countersManager = countersManager;

// Функция для обновления счетчиков извне (например, после действий в админке)
function refreshStatsCounters() {
    if (window.countersManager) {
        window.countersManager.refreshCounters();
    }
}

function toggleCategoryDropdown(dropdownId) {
    const dropdown = document.getElementById(`${dropdownId}-dropdown`);
    
    // Закрываем другие открытые dropdown
    document.querySelectorAll('.category-dropdown-menu').forEach(menu => {
        if (menu.id !== `${dropdownId}-dropdown`) {
            menu.classList.remove('show');
        }
    });
    
    dropdown.classList.toggle('show');
    
    // Закрываем все подкатегории при открытии/закрытии основного меню
    if (!dropdown.classList.contains('show')) {
        hideAllSubcategories();
    }
}

function showSubcategories(category, dropdownId) {
    // Скрываем предыдущие подкатегории
    hideAllSubcategories();
    
    // Показываем выбранные подкатегории
    const subcategories = document.getElementById(`${category}-subcategories`);
    if (subcategories) {
        subcategories.classList.add('show');
    }
}

function hideAllSubcategories() {
    document.querySelectorAll('.subcategory-menu').forEach(menu => {
        menu.classList.remove('show');
    });
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
    
    // Показываем крестик если выбран не стандартный текст
    if (displayText !== getDefaultText(dropdownId)) {
        showClearButton(dropdownId, displayText);
    } else {
        hideClearButton(dropdownId);
    }
    
    // Закрываем меню
    document.getElementById(`${dropdownId}-dropdown`).classList.remove('show');
    hideAllSubcategories();
    
    // Показываем уведомление о выборе фильтра
    showToast('Фильтр выбран', `Выбрано: ${displayText}. Нажмите "Применить фильтры" для поиска.`, 'info');
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

function getDefaultText(dropdownId) {
    switch(dropdownId) {
        case 'categories': return 'Все категории';
        case 'help-type': return 'Тип помощи';
        case 'participation': return 'Формат участия';
        case 'regularity': return 'Регулярность';
        default: return 'Выбрать';
    }
}
        
// Функция фильтрации проектов (надо доработать)
function filterProjects(dropdownId, category, subcategory) {
    console.log(`Фильтрация [${dropdownId}]: ${category} - ${subcategory}`);
}

// Предпросмотр логотипа в профиле
document.getElementById('profileNkoLogo')?.addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const preview = document.getElementById('profileNkoLogoPreview');
        preview.src = url;
        preview.style.display = 'block';
    }
});

// Функция для удаления превью логотипа
function removeLogoPreview() {
    const preview = document.getElementById('profileNkoLogoPreview');
    const fileInput = document.getElementById('profileNkoLogo');
    
    if (preview) {
        preview.style.display = 'none';
        const img = preview.querySelector('img');
        if (img) img.src = '';
    }
    
    if (fileInput) {
        fileInput.value = '';
    }
}

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

// Функция очистки ошибок полей
function clearFieldError(fieldName) {
    const field = document.getElementById(fieldName);
    const errorElement = document.getElementById(fieldName + '-error');
    
    // Проверяем существование поля перед обращением к его свойствам
    if (field && field.style) {
        field.style.borderColor = '';
        field.style.backgroundColor = '';
    }
    
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

// Новая функция для инициализации доступности
function initAccessibility() {
    console.log('Инициализация доступности...');
    
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
    document.getElementById('registerBtn')?.addEventListener('click', openRegisterModal);
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
    document.getElementById('closeRegModal')?.addEventListener('click', closeRegModal);
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
            hideAllSubcategories();
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
            const activeModals = document.querySelectorAll('.auth-modal.show', '.reg-modal.show');
            if (activeModals.length > 0) {
                const activeModal = activeModals[0];
                if (activeModal.id === 'authModal') closeAuthModal();
                else if (activeModal.id === 'regModal') closeRegModal();
                else if (activeModal.id === 'profileModal') closeProfileModal();
                else if (activeModal.id === 'createCardModal') closeCreateCardModal();
                else if (activeModal.id === 'adminModal') closeAdminModal();
            }
            
            // Закрываем панель доступности
            const accessibilityPanel = document.getElementById('accessibilityPanel');
            if (accessibilityPanel && accessibilityPanel.classList.contains('show')) {
                closeAccessibilityPanel();
            }
        }
    });

    // Обработчики для accessibility кнопок
    document.querySelectorAll('.scheme-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const scheme = this.getAttribute('data-scheme');
            if (scheme) {
                changeColorScheme(scheme);
            }
        });
    });

    // Обработчики для кнопок управления размером шрифта
    document.querySelectorAll('.size-controls button').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.textContent;
            if (action === 'A-') changeFontSize('smaller');
            else if (action === 'A') changeFontSize('normal');
            else if (action === 'A+') changeFontSize('larger');
        });
    });

    // Обработчики для кнопок межстрочного интервала
    document.querySelectorAll('.spacing-controls button').forEach(btn => {
        btn.addEventListener('click', function() {
            const spacing = this.textContent.toLowerCase();
            if (spacing === 'обычный') changeLineHeight('normal');
            else if (spacing === 'увеличенный') changeLineHeight('large');
        });
    });

    // Обработчики для кнопок шрифта
    document.querySelectorAll('.font-controls button').forEach(btn => {
        btn.addEventListener('click', function() {
            const font = this.textContent.toLowerCase();
            if (font === 'стандартный') changeFontFamily('standard');
            else if (font === 'для дислексии') changeFontFamily('dyslexic');
        });
    });

    // Кнопка сброса настроек доступности
    const resetBtn = document.querySelector('.reset-btn');
    if (resetBtn) {
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

// Инициализация обработчиков модальных окон
function initModalHandlers() {
    console.log("Инициализация обработчиков модальных окон...");
    
    // Проверяем существование элементов
    console.log("accessibilityBtn:", document.getElementById('accessibilityBtn'));
    console.log("footerAccessibilityBtn:", document.getElementById('footerAccessibilityBtn'));
    console.log("loginBtn:", document.getElementById('loginBtn'));
    console.log("registerBtn:", document.getElementById('registerBtn'));
    console.log("profileBtn:", document.getElementById('profileBtn'));
    
    // Обработчики для кнопок открытия модальных окон
    document.getElementById('accessibilityBtn')?.addEventListener('click', toggleAccessibilityMode);
    document.getElementById('footerAccessibilityBtn')?.addEventListener('click', toggleAccessibilityMode);
    document.getElementById('loginBtn')?.addEventListener('click', openAuthModal);
    document.getElementById('registerBtn')?.addEventListener('click', openRegisterModal);
    document.getElementById('profileBtn')?.addEventListener('click', openProfileModal);
    
    // Обработчики для кнопок закрытия
    document.getElementById('closeAuthModal')?.addEventListener('click', closeAuthModal);
    document.getElementById('closeRegModal')?.addEventListener('click', closeRegModal);
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

// Функции для модальных окон авторизации
function openAuthModal() {
    console.log('openAuthModal called');
    closeRegModal(); 
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        if (typeof applyAccessibilityToModal === 'function') {
            applyAccessibilityToModal(modal);
        }
    }
}

function openRegisterModal() {
    console.log('openRegisterModal called');
    closeAuthModal(); 
    const modal = document.getElementById('regModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        // Убедитесь что эта функция существует
        if (typeof applyAccessibilityToModal === 'function') {
            applyAccessibilityToModal(modal);
        }
    }
}

// Функция для регистрации НКО через профиль
function openNkoRegistration() {
    console.log('Opening profile for NKO registration');
    
    // Проверяем авторизацию пользователя
    const isLoggedIn = document.body.getAttribute('data-logged-in') === 'true';
    const authKey = getCookie('auth_key');
    
    if (!isLoggedIn || !authKey) {
        // Пользователь не авторизован - открываем форму входа
        console.log('User not logged in, opening auth modal');
        openAuthModal();
        
        // Показываем уведомление
        showNotification(
            'Требуется авторизация', 
            'Войдите в аккаунт или зарегистрируйтесь для регистрации НКО', 
            'info',
            3000
        );
        
        return;
    }
    
    // Пользователь авторизован - продолжаем оригинальную логику
    console.log('User is logged in, opening profile for NKO registration');
    
    // Закрываем другие модальные окна если открыты
    closeAuthModal();
    closeRegModal();
    closeCreateCardModal();
    
    // Открываем профиль
    openProfileModal();
    
    // Ждем пока профиль откроется и загрузится
    setTimeout(() => {
        // Открываем секцию НКО
        const nkoSection = document.getElementById('nkoSectionContent');
        const nkoHeader = document.querySelector('.nko-section-header');
        const nkoToggleIcon = document.querySelector('.nko-toggle-icon');
        
        if (nkoSection && nkoHeader) {
            // Открываем секцию если она закрыта
            if (nkoSection.style.display === 'none' || !nkoSection.classList.contains('open')) {
                // Используем существующую функцию переключения
                if (typeof toggleNkoSection === 'function') {
                    toggleNkoSection();
                } else {
                    // Альтернатива если функция не существует
                    nkoSection.style.display = 'block';
                    setTimeout(() => {
                        nkoSection.classList.add('open');
                        if (nkoToggleIcon) nkoToggleIcon.classList.add('open');
                    }, 10);
                }
            }
            
            // Подсвечиваем заголовок секции НКО
            highlightNkoSection();
        }
    }, 700);
}

// Функция для регистрации НКО через профиль
function openNkoRegistration() {
    console.log('Opening profile for NKO registration');
    
    // Простая и надежная проверка авторизации
    const isLoggedIn = document.body.getAttribute('data-logged-in') === 'true';
    
    if (!isLoggedIn) {
        // Пользователь не авторизован
        openAuthModal();
        showNotification(
            'Требуется авторизация', 
            'Войдите в аккаунт или зарегистрируйтесь для регистрации НКО', 
            'info',
            3000
        );
        return;
    }
    
    // Пользователь авторизован - открываем профиль с НКО
    console.log('User is logged in, opening profile for NKO registration');
    
    // Закрываем другие модальные окна
    closeAuthModal();
    closeRegModal();
    closeCreateCardModal();
    
    // Открываем профиль
    openProfileModal();
    
    // Ждем и открываем секцию НКО
    setTimeout(() => {
        const nkoSection = document.getElementById('nkoSectionContent');
        const nkoHeader = document.querySelector('.nko-section-header');
        const nkoToggleIcon = document.querySelector('.nko-toggle-icon');
        
        if (nkoSection && nkoHeader) {
            // Открываем секцию если она закрыта
            if (nkoSection.style.display === 'none' || !nkoSection.classList.contains('open')) {
                // Используем существующую функцию переключения
                if (typeof toggleNkoSection === 'function') {
                    toggleNkoSection();
                } else {
                    // Альтернатива если функция не существует
                    nkoSection.style.display = 'block';
                    setTimeout(() => {
                        nkoSection.classList.add('open');
                        if (nkoToggleIcon) nkoToggleIcon.classList.add('open');
                    }, 10);
                }
            }
            
            // Подсвечиваем заголовок секции НКО
            highlightNkoSection();
        }
    }, 700);
}

// Функция подсветки секции НКО (если еще не существует)
function highlightNkoSection() {
    const nkoHeader = document.querySelector('.nko-section-header');
    if (!nkoHeader) return;
    
    // Добавляем класс подсветки
    nkoHeader.classList.add('highlighted');
    
    // Прокручиваем к секции НКО
    const profileScrollable = document.querySelector('.profile-scrollable');
    if (profileScrollable) {
        const nkoSection = document.getElementById('nkoProfileSection');
        if (nkoSection) {
            const offset = nkoSection.offsetTop - 20;
            profileScrollable.scrollTo({
                top: offset,
                behavior: 'smooth'
            });
        }
    }
    
    setTimeout(() => {
        nkoHeader.classList.remove('highlighted');
    }, 700);
}

// Функции для модального окна профиля
function openProfileModal() {
    console.log("Открытие модального окна профиля");
    const modal = document.getElementById('profileModal');
    if (!modal) {
        console.error("Модальное окно профиля не найдено!");
        return;
    }
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Загружаем данные профиля
    setTimeout(() => {
        if (typeof window.loadProfileData === 'function') {
            window.loadProfileData();
        }
    }, 100);
    
    applyAccessibilityToModal(modal);
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal && modal.classList.contains('show')) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Функция для открытия модального окна создания карточки
function openCreateCardModal() {
    const modal = document.getElementById('createCardModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Применяем настройки доступности
        applyAccessibilityToModal(modal);
        
        // Инициализируем форму создания карточки
        setTimeout(() => {
            initCreateCardForm();
        }, 100);
    }
    
    loadNkoDataForCard();
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

// Закрытие модалки авторизации
function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal && modal.classList.contains('show')) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        resetAuthForms();
    }
}

// Закрытие модалки регистрации
function closeRegModal() {
    const modal = document.getElementById('regModal');
    if (modal && modal.classList.contains('show')) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        resetAuthForms();
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
function resetAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
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
                
                // Применяем доступность к форме
                applyAccessibilityToModal(document.getElementById('authModal'));
                applyAccessibilityToModal(document.getElementById('regModal'));
                
                // Прокручиваем к верху формы
                dialog.scrollTop = 0;
            }, 50);
        }
    }, 300);
}

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
        
        processLinksInProjects(); 
        
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
            // Обновляем счетчики в админке
            document.getElementById('statsCities').textContent = stats.cities || 0;
            document.getElementById('statsNko').textContent = stats.nko || 0;
            document.getElementById('statsProjects').textContent = stats.projects || 0;
            document.getElementById('statsVolunteers').textContent = stats.volunteers || 0;
            
            // Обновляем общие счетчики
            document.getElementById('totalObjects').textContent = (stats.cities || 0) + (stats.nko || 0);
            document.getElementById('totalCities').textContent = stats.cities || 0;
            document.getElementById('totalNko').textContent = stats.nko || 0;
            document.getElementById('activeObjects').textContent = (stats.cities || 0) + (stats.nko || 0);
            document.getElementById('lastUpdate').textContent = new Date().toLocaleString('ru-RU');
        }
    } catch (error) {
        console.error('Ошибка обновления статистики:', error);
    }
}

// Обновление статистики на главной странице
async function updateMainPageStats() {
    try {
        const response = await fetch('php/get_stats.php');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            // Здесь можно обновить статистику в hero секции если нужно
            console.log('Статистика загружена:', stats);
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Инициализация кнопок удаления - ДЕЛЕГИРОВАНИЕ СОБЫТИЙ
function initDeleteButtons() {
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
        
        // Показываем уведомление 
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

// Вспомогательные функции
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Функция для просмотра проекта когда нажимаешь на мини версию карточки в профиле
function viewProject(projectId) {
    console.log('Просмотр проекта:', projectId);
    
    // 1. Закрываем модальное окно профиля
    closeProfileModal();
    
    // 2. Показываем уведомление о поиске
    showToast('Поиск проекта', 'Ищем проект на карте...', 'info');
    
    // 3. Ждем закрытия модального окна и начинаем поиск
    setTimeout(() => {
        searchAndHighlightProject(projectId);
    }, 400);
}

// Основная функция поиска и подсветки проекта
async function searchAndHighlightProject(projectId) {
    try {
        console.log('Поиск проекта ID:', projectId);
        
        // Сначала проверяем на текущей странице
        const currentProject = document.querySelector(`.project-card[data-card-id="${projectId}"]`);
        
        if (currentProject) {
            // Проект на текущей странице - подсвечиваем
            console.log('Проект найден на текущей странице');
            scrollToSection('projects');
            setTimeout(() => highlightProject(projectId), 800);
            return;
        }
        
        // Если проекта нет на текущей странице, ищем его страницу
        showToast('Поиск', 'Определяем страницу проекта...', 'info');
        
        const pageInfo = await findProjectPage(projectId);
        
        if (pageInfo.success) {
            // Переходим на нужную страницу
            await changeCardPage(pageInfo.page);
            
            // Ждем загрузки и подсвечиваем проект
            await waitForProjectAndHighlight(projectId);
            
        } else {
            throw new Error(pageInfo.message || 'Проект не найден');
        }
        
    } catch (error) {
        console.error('Ошибка поиска проекта:', error);
        handleProjectSearchError(projectId, error);
    }
}

// Функция поиска страницы проекта
async function findProjectPage(projectId) {
    try {
        const response = await fetch(`php/get_project_page.php?project_id=${projectId}`);
        
        if (!response.ok) {
            throw new Error('Ошибка сервера');
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('Ошибка запроса страницы проекта:', error);
        
        // Альтернативный метод: перебор страниц
        return await findProjectByBruteForce(projectId);
    }
}

// Альтернативный метод поиска перебором страниц
async function findProjectByBruteForce(projectId) {
    console.log('Используем перебор страниц для поиска проекта');
    
    // Сохраняем текущую страницу
    const originalPage = currentPage;
    let foundPage = null;
    
    // Проверяем первую страницу
    if (await checkPageForProject(1, projectId)) {
        foundPage = 1;
    } else {
        // Если не на первой, ищем по другим страницам
        for (let page = 2; page <= totalPages; page++) {
            showToast('Поиск', `Проверяем страницу ${page}...`, 'info');
            
            if (await checkPageForProject(page, projectId)) {
                foundPage = page;
                break;
            }
            
            // Небольшая задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
    
    if (foundPage) {
        return { success: true, page: foundPage };
    } else {
        return { success: false, message: 'Проект не найден на всех страницах' };
    }
}

// Проверка конкретной страницы на наличие проекта
async function checkPageForProject(page, projectId) {
    try {
        const response = await fetch(`php/get_cards_ajax.php?card_page=${page}`);
        const data = await response.json();
        
        if (data.success && data.html) {
            // Создаем временный элемент для проверки HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data.html;
            
            // Проверяем есть ли проект в этом HTML
            const projectExists = tempDiv.querySelector(`[data-card-id="${projectId}"]`);
            return !!projectExists;
        }
        return false;
    } catch (error) {
        console.error(`Ошибка проверки страницы ${page}:`, error);
        return false;
    }
}

// Ожидание появления проекта и его подсветка
async function waitForProjectAndHighlight(projectId) {
    return new Promise((resolve) => {
        console.log('Ожидаем появление проекта после загрузки страницы...');
        
        let attempts = 0;
        const maxAttempts = 20; 
        
        const checkInterval = setInterval(() => {
            attempts++;
            const project = document.querySelector(`.project-card[data-card-id="${projectId}"]`);
            
            if (project) {
                clearInterval(checkInterval);
                console.log('Проект появился, подсвечиваем...');
                
                // Прокручиваем к секции проектов если нужно
                scrollToSection('projects');
                
                // Подсвечиваем проект
                setTimeout(() => {
                    highlightProject(projectId);
                    resolve(true);
                }, 500);
                
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.log('Проект не появился после загрузки страницы');
                showToast('Ошибка', 'Проект не найден после перехода на страницу');
                resolve(false);
            }
        }, 250);
    });
}

// Функция подсветки проекта
function highlightProject(projectId) {
    const projectCard = document.querySelector(`.project-card[data-card-id="${projectId}"]`);
    
    if (!projectCard) {
        console.log('Проект не найден для подсветки');
        return;
    }
    
    // Добавляем класс подсветки
    projectCard.classList.add('project-highlighted');
    
    // Плавно прокручиваем к проекту
    const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
    const projectPosition = projectCard.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = projectPosition - headerHeight - 20;
    
    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
    
    setTimeout(() => {
        projectCard.classList.remove('project-highlighted');
    }, 1000);
    
    showToast('Проект найден!', 'Проект выделен на странице', 'success');
}

// Обработка ошибок поиска
function handleProjectSearchError(projectId, error) {
    console.error('Ошибка поиска проекта:', error);
    
    // Прокручиваем к проектам и показываем сообщение
    scrollToSection('projects');
    
    setTimeout(() => {
        showToast(
            'Проект не найден', 
            'Используйте поиск или просмотрите другие страницы', 
            'error'
        );
    }, 1000);
}

// Базовая функция инициализации карты (заглушка)
function initMap() {
    return new Promise((resolve) => {
        console.log('Инициализация карты...');
        // Здесь должна быть реальная инициализация карты
        setTimeout(resolve, 100);
    });
}

// ==================== Заявки НКО для админ-панели ====================

// Функции для работы с заявками НКО
async function loadNkoApplications() {
    try {
        const response = await fetch('php/admin_nko_ajax.php?action=get_nko_applications');
        const data = await response.json();
        
        if (data.status === 'success') {
            displayNkoApplications(data.applications);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Ошибка загрузки заявок НКО:', error);
        showAdminMessage('Ошибка загрузки заявок НКО: ' + error.message, 'error');
    }
}

async function loadVerifiedNko() {
    try {
        const response = await fetch('php/admin_nko_ajax.php?action=get_verified_nko');
        const data = await response.json();
        
        if (data.status === 'success') {
            displayVerifiedNko(data.nko_list);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Ошибка загрузки верифицированных НКО:', error);
        showAdminMessage('Ошибка загрузки НКО: ' + error.message, 'error');
    }
}

function displayNkoApplications(applications) {
    const container = document.getElementById('nkoApplicationsContainer');
    if (!container) return;
    
    if (applications.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                Нет заявок на рассмотрении
            </div>
        `;
        return;
    }
    
    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Название</th>
                    <th>Пользователь</th>
                    <th>Категория</th>
                    <th>Контакты</th>
                    <th>Дата подачи</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    applications.forEach(app => {
        html += `
            <tr>
                <td>${app.id}</td>
                <td>
                    <strong>${escapeHtml(app.name)}</strong>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 4px;">
                        ${escapeHtml(app.description.substring(0, 100))}...
                    </div>
                </td>
                <td>
                    ${escapeHtml(app.name || '')} ${escapeHtml(app.surname || '')}
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7);">${escapeHtml(app.login)}</div>
                </td>
                <td>${escapeHtml(app.category)}</td>
                <td>
                    <div style="font-size: 12px;">
                        ${app.phone ? `📞 ${escapeHtml(app.phone)}<br>` : ''}
                        ${app.website ? `🌐 ${escapeHtml(app.website)}` : ''}
                    </div>
                </td>
                <td>${formatDate(app.created_at)}</td>
                <td>
                    <div class="admin-action-buttons">
                        <button class="admin-btn-small admin-btn-success" 
                                onclick="approveNkoApplication(${app.id}, ${app.user_id})">
                            Одобрить
                        </button>
                        <button class="admin-btn-small admin-btn-danger" 
                                onclick="showRejectModal(${app.id})">
                            Отклонить
                        </button>
                        <button class="admin-btn-small admin-btn-primary" 
                                onclick="showNkoDetails(${app.id})">
                            Подробнее
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function displayVerifiedNko(nkoList) {
    const container = document.getElementById('verifiedNkoContainer');
    if (!container) return;
    
    if (nkoList.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                Нет верифицированных НКО
            </div>
        `;
        return;
    }
    
    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Название</th>
                    <th>Пользователь</th>
                    <th>Категория</th>
                    <th>Контакты</th>
                    <th>Дата одобрения</th>
                    <th>Статус</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    nkoList.forEach(nko => {
        html += `
            <tr>
                <td>${nko.id}</td>
                <td>
                    <strong>${escapeHtml(nko.name)}</strong>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 4px;">
                        ${escapeHtml(nko.description.substring(0, 100))}...
                    </div>
                </td>
                <td>
                    ${escapeHtml(nko.name || '')} ${escapeHtml(nko.surname || '')}
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7);">${escapeHtml(nko.login)}</div>
                </td>
                <td>${escapeHtml(nko.category)}</td>
                <td>
                    <div style="font-size: 12px;">
                        ${nko.phone ? `📞 ${escapeHtml(nko.phone)}<br>` : ''}
                        ${nko.website ? `🌐 ${escapeHtml(nko.website)}` : ''}
                    </div>
                </td>
                <td>${formatDate(nko.updated_at)}</td>
                <td>
                    <span class="status-badge status-active">Одобрена</span>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function approveNkoApplication(nkoId, userId) {
    if (!confirm('Вы уверены, что хотите одобрить эту заявку НКО?')) return;
    
    try {
        const response = await fetch('php/admin_nko_ajax.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=approve_nko&nko_id=${nkoId}&user_id=${userId}`
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showAdminMessage(data.message, 'success');
            // Перезагружаем список заявок
            setTimeout(() => loadNkoApplications(), 500);
        } else {
            showAdminMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка одобрения НКО:', error);
        showAdminMessage('Ошибка одобрения НКО: ' + error.message, 'error');
    }
}

function showRejectModal(nkoId) {
    const comment = prompt('Укажите причину отклонения заявки:');
    if (comment !== null) {
        rejectNkoApplication(nkoId, comment);
    }
}

async function rejectNkoApplication(nkoId, comment) {
    try {
        const response = await fetch('php/admin_nko_ajax.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=reject_nko&nko_id=${nkoId}&comment=${encodeURIComponent(comment)}`
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showAdminMessage(data.message, 'success');
            // Перезагружаем список заявок
            setTimeout(() => loadNkoApplications(), 500);
        } else {
            showAdminMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка отклонения НКО:', error);
        showAdminMessage('Ошибка отклонения НКО: ' + error.message, 'error');
    }
}

function showNkoDetails(nkoId) {
    // Показываем индикатор загрузки
    const loadingToast = showNotification('Загрузка', 'Загружаем информацию о НКО...', 'info', 0);
    
    // Загружаем данные НКО с сервера
    fetch(`php/get_nko_details.php?nko_id=${nkoId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка сети');
            }
            return response.json();
        })
        .then(data => {
            closeNotification(loadingToast);
            if (data.status === 'success') {
                displayNkoDetailsModal(data.nko);
            } else {
                showAdminMessage('Ошибка загрузки данных НКО: ' + data.message, 'error');
            }
        })
        .catch(error => {
            closeNotification(loadingToast);
            console.error('Ошибка:', error);
            showAdminMessage('Ошибка загрузки данных НКО: ' + error.message, 'error');
        });
}

function displayNkoDetailsModal(nkoData) {
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'nko-details-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    `;

    // Форматируем данные для отображения
    const formatField = (value, defaultValue = 'Не указано') => {
        return value && value.trim() !== '' ? value : `<span style="color: #6b7280; font-style: italic;">${defaultValue}</span>`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Не указано';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
    };

    const getStatusBadge = (status) => {
        const statuses = {
            'pending': {text: 'На рассмотрении', class: 'status-pending'},
            'approved': {text: 'Одобрено', class: 'status-approved'},
            'rejected': {text: 'Отклонено', class: 'status-rejected'}
        };
        const statusInfo = statuses[status] || {text: status, class: 'status-unknown'};
        return `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
    };

    // Создаем содержимое модального окна в стиле админ-панели
    modal.innerHTML = `
        <div class="admin-container" style="
            background: linear-gradient(180deg, #259789 0%, #6CACE4 100%);
            border-radius: 12px;
            padding: 0;
            max-width: 900px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            color: white;
            border: 1px solid rgba(255,255,255,0.1);
        ">
            <!-- Заголовок как в админ-панели -->
            <div class="admin-header" style="
                padding: 25px 30px 20px 30px;
                margin-bottom: 0;
            ">
                <div>
                    <h2 style="margin: 0 0 12px 0; color: white; font-size: 24px; font-family: 'Roboto', sans-serif;">
                        ${escapeHtml(nkoData.name)}
                    </h2>
                    <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                        ${getStatusBadge(nkoData.status)}
                        <span style="color: rgba(255,255,255,0.7); font-size: 14px;">
                            ID: ${nkoData.id}
                        </span>
                        <span style="color: rgba(255,255,255,0.7); font-size: 14px;">
                            Подана: ${formatDate(nkoData.created_at)}
                        </span>
                    </div>
                </div>
                <button onclick="this.closest('.nko-details-modal').remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 5px;
                    border-radius: 4px;
                    transition: background 0.2s;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                " onmouseover="this.style.background='rgba(255,255,255,0.1)'" 
                   onmouseout="this.style.background='none'">
                    ×
                </button>
            </div>

            <!-- Основное содержимое -->
            <div style="padding: 0 30px 30px 30px;">
                <div style="display: grid; gap: 20px;">

                    <!-- Информация о пользователе -->
                    <div class="info-section">
                        <h3 style="color: white; margin: 0 0 15px 0; font-size: 16px; font-family: 'Roboto', sans-serif;">
                            Информация о пользователе
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                            <div>
                                <strong style="color: rgba(255,255,255,0.9);">Логин:</strong><br>
                                <span style="color: rgba(255,255,255,0.8);">${escapeHtml(nkoData.login)}</span>
                            </div>
                            <div>
                                <strong style="color: rgba(255,255,255,0.9);">Имя и фамилия:</strong><br>
                                <span style="color: rgba(255,255,255,0.8);">${formatField(nkoData.name + ' ' + nkoData.surname, 'Не указано')}</span>
                            </div>
                            <div>
                                <strong style="color: rgba(255,255,255,0.9);">Email:</strong><br>
                                <span style="color: rgba(255,255,255,0.8);">${escapeHtml(nkoData.login)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Основная информация об НКО -->
                    <div class="info-section">
                        <h3 style="color: white; margin: 0 0 15px 0; font-size: 16px; font-family: 'Roboto', sans-serif;">
                            Основная информация
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                            <div>
                                <strong style="color: rgba(255,255,255,0.9);">Категория:</strong><br>
                                <span style="color: rgba(255,255,255,0.8);">${formatField(nkoData.category)}</span>
                            </div>
                            <div>
                                <strong style="color: rgba(255,255,255,0.9);">Телефон:</strong><br>
                                <span style="color: rgba(255,255,255,0.8);">${formatField(nkoData.phone)}</span>
                            </div>
                            <div>
                                <strong style="color: rgba(255,255,255,0.9);">Веб-сайт:</strong><br>
                                ${nkoData.website ? `<a href="${escapeHtml(nkoData.website)}" target="_blank" style="color: white; text-decoration: none;">${escapeHtml(nkoData.website)}</a>` : formatField(nkoData.website)}
                            </div>
                        </div>
                        <div style="margin-top: 15px;">
                            <strong style="color: rgba(255,255,255,0.9);">Адрес:</strong><br>
                            <span style="color: rgba(255,255,255,0.8);">${formatField(nkoData.address)}</span>
                        </div>
                    </div>

                    <!-- Описание деятельности -->
                    <div class="info-section">
                        <h3 style="color: white; margin: 0 0 15px 0; font-size: 16px; font-family: 'Roboto', sans-serif;">
                            Описание деятельности
                        </h3>
                        <div style="
                            background: rgba(255,255,255,0.05);
                            padding: 15px;
                            border-radius: 8px;
                            border-left: 4px solid #4a90e2;
                            color: rgba(255,255,255,0.9);
                            line-height: 1.5;
                        ">
                            ${formatField(nkoData.description, 'Описание не предоставлено')}
                        </div>
                    </div>

                    <!-- Функционал волонтеров -->
                    <div class="info-section">
                        <h3 style="color: white; margin: 0 0 15px 0; font-size: 16px; font-family: 'Roboto', sans-serif;">
                            Функционал волонтеров
                        </h3>
                        <div style="
                            background: rgba(255,255,255,0.05);
                            padding: 15px;
                            border-radius: 8px;
                            border-left: 4px solid #4a90e2;
                            color: rgba(255,255,255,0.9);
                            line-height: 1.5;
                        ">
                            ${formatField(nkoData.activities, 'Функционал не описан')}
                        </div>
                    </div>

                    <!-- Социальные сети -->
                    ${nkoData.social_links ? `
                    <div class="info-section">
                        <h3 style="color: white; margin: 0 0 15px 0; font-size: 16px; font-family: 'Roboto', sans-serif;">
                            Социальные сети
                        </h3>
                        <div style="
                            background: rgba(255,255,255,0.05);
                            padding: 15px;
                            border-radius: 8px;
                            border-left: 4px solid #4a90e2;
                            color: rgba(255,255,255,0.9);
                            line-height: 1.5;
                        ">
                            ${nkoData.social_links.split(',').map(link => {
                                const trimmedLink = link.trim();
                                return trimmedLink ? `
                                    <div style="margin-bottom: 8px; display: flex; align-items: center;">
                                        <a href="${escapeHtml(trimmedLink)}" target="_blank" 
                                           style="color: white; text-decoration: none; word-break: break-all;"
                                           onmouseover="this.style.textDecoration='underline'"
                                           onmouseout="this.style.textDecoration='none'">
                                            ${escapeHtml(trimmedLink)}
                                        </a>
                                    </div>
                                ` : '';
                            }).join('')}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Логотип -->
                    ${nkoData.logo_path ? `
                    <div class="info-section">
                        <h3 style="color: white; margin: 0 0 15px 0; font-size: 16px; font-family: 'Roboto', sans-serif;">
                            Логотип организации
                        </h3>
                        <div style="text-align: center;">
                            <img src="${escapeHtml(nkoData.logo_path)}" 
                                 alt="Логотип ${escapeHtml(nkoData.name)}"
                                 style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                        </div>
                    </div>
                    ` : ''}

                    <!-- Комментарий модерации (если есть) -->
                    ${nkoData.moderation_comment ? `
                    <div class="info-section">
                        <h3 style="color: #ef4444; margin: 0 0 15px 0; font-size: 16px; font-family: 'Roboto', sans-serif;">
                            Комментарий модератора
                        </h3>
                        <div style="
                            background: rgba(239,68,68,0.1);
                            padding: 15px;
                            border-radius: 8px;
                            border-left: 4px solid #ef4444;
                            color: #fca5a5;
                            line-height: 1.5;
                        ">
                            ${escapeHtml(nkoData.moderation_comment)}
                        </div>
                    </div>
                    ` : ''}
                </div>

                <!-- Кнопки действий в стиле админ-панели -->
                <div style="
                    margin-top: 25px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                    flex-wrap: wrap;
                ">
                    ${nkoData.status === 'pending' ? `
                    <button onclick="approveNkoApplication(${nkoData.id}, ${nkoData.user_id}); this.closest('.nko-details-modal').remove()" 
                            class="admin-btn-success admin-btn-small"
                            style="padding: 10px 20px; font-size: 14px;">
                        Одобрить
                    </button>
                    <button onclick="showRejectModal(${nkoData.id}); this.closest('.nko-details-modal').remove()" 
                            class="admin-btn-danger admin-btn-small"
                            style="padding: 10px 20px; font-size: 14px;">
                        Отклонить
                    </button>
                    ` : ''}
                    <button onclick="this.closest('.nko-details-modal').remove()" 
                            class="admin-btn-secondary admin-btn-small"
                            style="padding: 10px 20px; font-size: 14px;">
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    `;

    // Добавляем модальное окно на страницу
    document.body.appendChild(modal);

    // Закрытие по клику вне области
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Закрытие по ESC
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Обновить функцию switchAdminTab
function switchAdminTab(tabName) {
    console.log('Переключение на вкладку:', tabName);
    
    // Скрываем все вкладки
    document.querySelectorAll('.admin-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Убираем активный класс у всех кнопок
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показываем выбранную вкладку
    const tabElement = document.getElementById('tab-' + tabName);
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    // Активируем кнопку
    const activeBtn = document.querySelector(`.admin-tab-btn[onclick*="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Загружаем данные для вкладки
    switch(tabName) {
        case 'users':
            loadAdminUsers();
            break;
        case 'nko-applications':
            loadNkoApplications();
            break;
        case 'verified-nko':
            loadVerifiedNko();
            break;
        case 'cities':
            loadAdminCities();
            break;
        case 'statistics':
            loadAdminStatistics();
            break;
    }
}

// ==================== ПОИСК ИЗ СТРОКИ ПОИСКА ====================

// Инициализация поиска
function initSearchSystem() {
    console.log('Инициализация системы поиска...');
    
    // Обработчик поиска из строки
    const searchInput = document.querySelector('.search-input-large');
    const searchIcon = document.querySelector('.search-icon');
    
    if (searchInput) {
        // Поиск по Enter
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performTextSearch(this.value.trim());
            }
        });
        
        // Делаем иконку лупы кликабельной кнопкой
        if (searchIcon) {
            searchIcon.classList.add('search-icon-clickable');
            searchIcon.style.cursor = 'pointer';
            searchIcon.addEventListener('click', function() {
                performTextSearch(searchInput.value.trim());
            });
            searchIcon.setAttribute('title', 'Найти проекты');
        }
    }
    
    // Создаем кнопку применения фильтров при загрузке
    showApplyFiltersButton();
    
    // Инициализация фильтров с крестиками
    initFilters();
}

// Поиск по тексту из строки поиска
async function performTextSearch(query) {
    if (!query) {
        showNotification('Поиск', 'Введите поисковый запрос', 'info');
        return;
    }
    
    try {
        showLoadingIndicator();
        
        console.log('Выполнение поиска по запросу:', query);
        
        const response = await fetch(`php/search_projects.php?q=${encodeURIComponent(query)}&page=1`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Результаты поиска:', data);
        
        if (data.success) {
            if (data.projects.length > 0) {
                displayTextSearchResults(data, query);
                showNotification('Поиск завершен', `Найдено ${data.total} проектов`, 'success');
            } else {
                displayTextSearchResults(data, query);
                showNotification('Поиск', 'По вашему запросу ничего не найдено', 'info');
            }
        } else {
            throw new Error(data.message || 'Ошибка поиска');
        }
        
    } catch (error) {
        console.error('Ошибка поиска:', error);
        showNotification('Ошибка поиска', 'Не удалось выполнить поиск. Попробуйте позже.', 'error');
    } finally {
        hideLoadingIndicator();
    }
}

// Отображение результатов текстового поиска
function displayTextSearchResults(data, query) {
    const container = document.getElementById('projectsContainer');
    if (!container) {
        console.error('Контейнер projectsContainer не найден');
        return;
    }
    
    let html = `
        <div class="search-results-header">
            <h2 class="section-title">РЕЗУЛЬТАТЫ ПОИСКА</h2>
            <div class="search-info">
                <p>Найдено проектов: <strong>${data.total}</strong> по запросу: "${escapeHtml(query)}"</p>
                <button class="btn-text" onclick="clearSearch()">← Вернуться ко всем проектам</button>
            </div>
        </div>
    `;
    
    if (data.projects && data.projects.length > 0) {
        html += '<div class="projects-grid" id="projectsGrid">';
        
        data.projects.forEach(project => {
            html += createProjectCardHTML(project);
        });
        
        html += '</div>';
        
        // Пагинация для результатов поиска
        if (data.total_pages > 1) {
            html += createSearchPagination(data, query);
        }
    } else {
        html += `
            <div class="no-results-message">
                <p>По запросу "${escapeHtml(query)}" ничего не найдено.</p>
                <p>Попробуйте изменить поисковый запрос или посмотрите все проекты.</p>
                <button class="btn-primary" onclick="clearSearch()">Показать все проекты</button>
            </div>
        `;
    }
    
    // Сохраняем состояние поиска
    window.currentSearch = {
        query: query,
        data: data,
        isActive: true,
        searchType: 'text'
    };
    
    // Обновляем контент
    container.innerHTML = html;
    
    // Инициализируем обработчики
    processLinksInProjects(); 
    initCardsEventHandlers();
    initDeleteButtons();
    
    // Подсвечиваем результаты
    highlightTextSearchResults(query);
}

// Подсветка результатов текстового поиска
function highlightTextSearchResults(query) {
    if (!query) return;
    
    const cards = document.querySelectorAll('.project-card');
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    
    cards.forEach((card, index) => {
        let hasMatch = false;
        const textContent = card.textContent.toLowerCase();
        
        // Проверяем совпадения по всем терминам
        for (const term of searchTerms) {
            if (textContent.includes(term)) {
                hasMatch = true;
                break;
            }
        }
        
        if (hasMatch) {
            // Используем тот же класс подсветки, что и в профиле
            card.classList.add('highlighted');
            
            // Автоматически прокручиваем к первому результату
            if (index === 0) {
                setTimeout(() => {
                    scrollToProjectCard(card);
                }, 500);
            }
        }
    });
    
    if (cards.length > 0) {
        showToast('Поиск завершен', `Найдено ${cards.length} проектов`, 'success');
    }
}

// Создание пагинации для поиска
function createSearchPagination(data, query) {
    let html = '<div class="pagination search-pagination">';
    
    // Кнопка "Назад"
    if (data.current_page > 1) {
        html += `<button class="pagination-btn prev-btn" onclick="loadSearchPage(${data.current_page - 1}, '${escapeHtml(query)}')">← Назад</button>`;
    }
    
    // Номера страниц
    for (let i = 1; i <= data.total_pages; i++) {
        html += `<button class="pagination-btn ${i === data.current_page ? 'active' : ''}" 
                         onclick="loadSearchPage(${i}, '${escapeHtml(query)}')">${i}</button>`;
    }
    
    // Кнопка "Вперед"
    if (data.current_page < data.total_pages) {
        html += `<button class="pagination-btn next-btn" onclick="loadSearchPage(${data.current_page + 1}, '${escapeHtml(query)}')">Вперед →</button>`;
    }
    
    html += '</div>';
    return html;
}

// Загрузка страницы поиска
async function loadSearchPage(page, query) {
    try {
        showLoadingIndicator();
        
        const response = await fetch(`php/search_projects.php?q=${encodeURIComponent(query)}&page=${page}`);
        const data = await response.json();
        
        if (data.success) {
            displayTextSearchResults(data, query);
            scrollToProjectsSection();
        } else {
            throw new Error(data.message || 'Ошибка загрузки страницы');
        }
        
    } catch (error) {
        console.error('Ошибка загрузки страницы поиска:', error);
        showToast('Ошибка', 'Не удалось загрузить страницу', 'error');
    } finally {
        hideLoadingIndicator();
    }
}

// Показать кнопку применения фильтров
function showApplyFiltersButton() {
    const searchForm = document.querySelector('.search-form');
    if (!searchForm) return;
    
    // Проверяем, есть ли уже кнопка
    let applyBtn = document.querySelector('.apply-filters-btn');
    
    if (!applyBtn) {
        applyBtn = document.createElement('button');
        applyBtn.type = 'button';
        applyBtn.className = 'apply-filters-btn btn-primary';
        applyBtn.textContent = 'Применить фильтры';
        applyBtn.onclick = applyAllFilters;
        
        // Создаем контейнер для центрирования кнопки
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'apply-filters-container';
        buttonContainer.appendChild(applyBtn);
        
        // Добавляем после контейнера с фильтрами
        const filtersContainer = document.querySelector('.search-filters');
        if (filtersContainer) {
            // Добавляем после всех фильтров
            filtersContainer.parentNode.insertBefore(buttonContainer, filtersContainer.nextSibling);
        }
    }
    
    // Всегда показываем кнопку
    applyBtn.style.display = 'block';
}

// Применить все выбранные фильтры
function applyAllFilters() {
    console.log('Применение всех фильтров');
    
    // Собираем все выбранные фильтры
    const activeFilters = getActiveFilters();
    
    if (activeFilters.length === 0) {
        showToast('Фильтры', 'Не выбрано ни одного фильтра', 'info');
        return;
    }
    
    // Создаем поисковый запрос из всех активных фильтров
    const searchQuery = activeFilters.map(filter => filter.searchQuery).join(' ');
    
    console.log('Поисковый запрос из фильтров:', searchQuery);
    
    // Выполняем поиск
    performTextSearch(searchQuery);
}

// Получить все активные фильтры
function getActiveFilters() {
    const activeFilters = [];
    const dropdowns = ['categories', 'help-type', 'participation', 'regularity'];
    
    dropdowns.forEach(dropdownId => {
        const toggle = document.querySelector(`#${dropdownId}-dropdown`).previousElementSibling;
        const toggleText = toggle.querySelector('span');
        const defaultText = getDefaultText(dropdownId);
        
        // Если фильтр изменен (не стандартный текст)
        if (toggleText && toggleText.textContent !== defaultText) {
            const filterData = getFilterSearchQuery(dropdownId, toggleText.textContent);
            if (filterData) {
                activeFilters.push(filterData);
            }
        }
    });
    
    return activeFilters;
}

// Получить поисковый запрос для фильтра
function getFilterSearchQuery(dropdownId, displayText) {
    // Сопоставляем отображаемый текст с поисковыми запросами
    const filterMap = {
        'categories': {
            'Помощь детям': 'дети помощь детям школьники образование',
            'Помощь пожилым': 'пожилые пенсионеры ветераны забота',
            'Все социальные': 'социальный помощь поддержка семья',
            'Уборка территорий': 'уборка очистка мусор экология территория',
            'Озеленение': 'озеленение посадка деревья растения саженцы',
            'Все экологические': 'экология природа окружающая среда'
        },
        'help-type': {
            'Волонтёрство': 'волонтер помощь участие доброволец',
            'Пожертвования': 'пожертвование деньги сбор финансы',
            'Экспертиза': 'эксперт консультация профессионал знания',
            'Наставничество': 'наставник обучение ментор куратор'
        },
        'participation': {
            'Онлайн': 'онлайн дистанционный интернет',
            'Офлайн': 'офлайн лично встреча',
            'Гибрид': 'гибрид смешанный'
        },
        'regularity': {
            'Регулярная помощь': 'регулярный постоянный систематический',
            'Разовое участие': 'разовый единовременный акция',
            'Постоянная поддержка': 'постоянный непрерывный долгосрочный'
        }
    };
    
    if (filterMap[dropdownId] && filterMap[dropdownId][displayText]) {
        return {
            dropdownId: dropdownId,
            displayText: displayText,
            searchQuery: filterMap[dropdownId][displayText]
        };
    }
    
    return null;
}

// Инициализация фильтров с крестиками
function initFilters() {
    console.log('Инициализация фильтров с крестиками...');
    
    // Обработчики для фильтров категорий
    document.addEventListener('click', function(e) {
        // Фильтрация по категориям
        if (e.target.classList.contains('subcategory-item')) {
            const match = e.target.getAttribute('onclick').match(/selectSubcategory\('([^']+)',\s*'([^']+)',\s*'([^']+)'\)/);
            if (match) {
                const category = match[1];
                const subcategory = match[2];
                const dropdownId = match[3];
                // Только выбираем фильтр, не применяем
                selectSubcategory(category, subcategory, dropdownId);
            }
        }
        
        // Сброс фильтра по крестику
        if (e.target.classList.contains('clear-filter-btn')) {
            e.stopPropagation(); // Предотвращаем всплытие
            const dropdownId = e.target.closest('.category-dropdown').querySelector('.category-dropdown-menu').id.replace('-dropdown', '');
            clearFilter(dropdownId);
        }
    });
    
    // Добавляем крестики к существующим фильтрам
    addClearButtonsToFilters();
}

// Добавление крестиков к фильтрам
function addClearButtonsToFilters() {
    const filterToggles = document.querySelectorAll('.category-toggle');
    
    filterToggles.forEach(toggle => {
        // Проверяем, нет ли уже крестика
        if (!toggle.querySelector('.clear-filter-btn')) {
            const clearBtn = document.createElement('span');
            clearBtn.className = 'clear-filter-btn';
            clearBtn.innerHTML = '×';
            clearBtn.title = 'Сбросить фильтр';
            clearBtn.style.display = 'none'; // Изначально скрыт
            
            toggle.appendChild(clearBtn);
        }
    });
}

// Показать крестик на активном фильтре
function showClearButton(dropdownId, displayText) {
    const toggle = document.querySelector(`#${dropdownId}-dropdown`).previousElementSibling;
    const clearBtn = toggle.querySelector('.clear-filter-btn');
    
    if (clearBtn && displayText !== getDefaultText(dropdownId)) {
        clearBtn.style.display = 'inline-block';
    }
}

// Скрыть крестик
function hideClearButton(dropdownId) {
    const toggle = document.querySelector(`#${dropdownId}-dropdown`).previousElementSibling;
    const clearBtn = toggle.querySelector('.clear-filter-btn');
    
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
}

// Сброс всех фильтров
function clearAllFilters() {
    console.log('Сброс всех фильтров');
    
    // Сбрасываем текст всех тогглов на значения по умолчанию
    const dropdowns = ['categories', 'help-type', 'participation', 'regularity'];
    
    dropdowns.forEach(dropdownId => {
        const toggle = document.querySelector(`#${dropdownId}-dropdown`).previousElementSibling;
        const toggleText = toggle.querySelector('span');
        
        if (toggleText) {
            toggleText.textContent = getDefaultText(dropdownId);
            hideClearButton(dropdownId);
        }
    });
    
    // Закрываем все выпадающие меню
    document.querySelectorAll('.category-dropdown-menu').forEach(menu => {
        menu.classList.remove('show');
    });
    hideAllSubcategories();
    
    // Показываем все проекты
    clearSearch();
    
    showToast('Фильтры', 'Все фильтры сброшены', 'success');
}

// Сброс конкретного фильтра
function clearFilter(dropdownId) {
    const toggle = document.querySelector(`#${dropdownId}-dropdown`).previousElementSibling;
    const toggleText = toggle.querySelector('span');
    
    if (toggleText) {
        toggleText.textContent = getDefaultText(dropdownId);
        hideClearButton(dropdownId);
        
        // Закрываем меню
        document.getElementById(`${dropdownId}-dropdown`).classList.remove('show');
        hideAllSubcategories();
        
        showToast('Фильтр сброшен', `Фильтр "${getDefaultText(dropdownId)}" сброшен`, 'info');
    }
}

// Проверка, все ли фильтры в состоянии по умолчанию
function areAllFiltersDefault() {
    const dropdowns = ['categories', 'help-type', 'participation', 'regularity'];
    
    return dropdowns.every(dropdownId => {
        const toggle = document.querySelector(`#${dropdownId}-dropdown`).previousElementSibling;
        const toggleText = toggle.querySelector('span');
        return toggleText && toggleText.textContent === getDefaultText(dropdownId);
    });
}

// Применение фильтра категорий
function applyCategoryFilter(category, subcategory, dropdownId) {
    console.log('Применение фильтра:', category, subcategory, dropdownId);
    
    let searchQuery = '';
    
    // Создаем поисковый запрос на основе категории
    switch(dropdownId) {
        case 'categories':
            switch(category) {
                case 'social':
                    switch(subcategory) {
                        case 'children':
                            searchQuery = 'дети помощь детям школьники образование';
                            break;
                        case 'elderly':
                            searchQuery = 'пожилые пенсионеры ветераны забота';
                            break;
                        case 'all':
                            searchQuery = 'социальный помощь поддержка семья';
                            break;
                    }
                    break;
                case 'ecology':
                    switch(subcategory) {
                        case 'cleanup':
                            searchQuery = 'уборка очистка мусор экология территория';
                            break;
                        case 'planting':
                            searchQuery = 'озеленение посадка деревья растения саженцы';
                            break;
                        case 'all':
                            searchQuery = 'экология природа окружающая среда';
                            break;
                    }
                    break;
            }
            break;
            
        case 'help-type':
            switch(category) {
                case 'volunteering':
                    searchQuery = 'волонтер помощь участие доброволец';
                    break;
                case 'donations':
                    searchQuery = 'пожертвование деньги сбор финансы';
                    break;
                case 'expertise':
                    searchQuery = 'эксперт консультация профессионал знания';
                    break;
                case 'mentoring':
                    searchQuery = 'наставник обучение ментор куратор';
                    break;
            }
            break;
            
        case 'participation':
            switch(category) {
                case 'online':
                    searchQuery = 'онлайн дистанционный интернет';
                    break;
                case 'offline':
                    searchQuery = 'офлайн лично встреча';
                    break;
                case 'hybrid':
                    searchQuery = 'гибрид смешанный';
                    break;
            }
            break;
            
        case 'regularity':
            switch(category) {
                case 'regular':
                    searchQuery = 'регулярный постоянный систематический';
                    break;
                case 'one-time':
                    searchQuery = 'разовый единовременный акция';
                    break;
                case 'ongoing':
                    searchQuery = 'постоянный непрерывный долгосрочный';
                    break;
            }
            break;
    }
    
    if (searchQuery) {
        performTextSearch(searchQuery);
    }
}

// Очистка поиска
function clearSearch() {
    window.currentSearch = null;
    loadInitialCards();
}

// Альтернативная версия - используем данные из DOM
function isAdmin(userId) {
    try {
        const userInfo = document.querySelector('.user-info');
        if (userInfo && userInfo.textContent.includes('admin')) {
            return true;
        }
        
        // Проверяем наличие кнопки админ-панели
        const adminBtn = document.querySelector('.btn-admin-panel');
        if (adminBtn && adminBtn.style.display !== 'none') {
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

function isNkoUser(userId) {
    try {
        // Проверяем есть ли у пользователя возможность создавать проекты
        const createProjectBtn = document.querySelector('.btn-primary[onclick*="openCreateCardModal"]');
        if (createProjectBtn && !createProjectBtn.disabled) {
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking NKO status:', error);
        return false;
    }
}

// Создание HTML для карточки проекта
function createProjectCardHTML(project) {
    const isLoggedIn = document.body.getAttribute('data-logged-in') === 'true';
    const userId = document.body.getAttribute('data-user-id') || '0';
    
    // Безопасная проверка прав удаления
    let canDelete = false;
    try {
        canDelete = isLoggedIn && (isAdmin(userId) || (isNkoUser(userId) && project.created_by == userId));
    } catch (error) {
        console.error('Error checking delete permissions:', error);
        canDelete = false;
    }
    
    return `
        <div class="project-card" data-card-id="${project.id}">
            ${canDelete ? `
            <button class="delete-card-btn" title="Удалить проект" data-card-id="${project.id}">
                ×
            </button>
            ` : ''}

            <div class="project-card-content">
                <div class="project-badges">
                    ${project.status ? `<span class="badge badge-urgent">${escapeHtml(project.status)}</span>` : ''}
                    ${project.type === 'СОЦ.ПРОЕКТ' ? '<span class="badge badge-social">Социальный</span>' : 
                      project.type === 'ЭКОЛОГИЯ' ? '<span class="badge badge-ecology">Экология</span>' : 
                      project.type === 'ЖИВОТНЫЕ' ? '<span class="badge badge-animals">Животные</span>' : ''}
                </div>

                <h3 class="project-title">${escapeHtml(project.header)}</h3>
                <div class="project-location">${escapeHtml(project.location)}</div>
                <p class="project-description">${escapeHtml(project.main_text)}</p>

                <div class="project-meta">
                    <div class="meta-item">
                        <span>${project.current_participants}/${project.max_participants} участников</span>
                    </div>
                    <div class="meta-item">
                        <span>${escapeHtml(project.date)}</span>
                    </div>
                </div>

                <div class="project-footer">
                    <div class="project-org">
                        ${project.nko_name ? `
                            ${getNkoLinkHTML(project)}
                        ` : `
                            <span class="project-org-text">${escapeHtml(project.sub_text)}</span>
                        `}
                    </div>

                    ${isLoggedIn ? `
                        <button class="btn-help" 
                                data-card-id="${project.id}"
                                ${project.is_joined > 0 ? 'disabled' : ''}>
                            ${project.is_joined > 0 ? 'Вы участвуете' : 'Помочь'}
                        </button>
                    ` : `
                        <button class="btn-help" onclick="openAuthModal()">
                            Войти чтобы помочь
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
}

// Вспомогательная функция для ссылок НКО
function getNkoLinkHTML(project) {
    let nkoLink = '';
    if (project.nko_website) {
        nkoLink = project.nko_website;
    } else if (project.nko_social_links) {
        const links = project.nko_social_links.split(',');
        nkoLink = links[0].trim();
    }
    
    return nkoLink ? `
        <a href="${escapeHtml(nkoLink)}" 
           target="_blank" 
           class="nko-link"
           onclick="event.stopPropagation();">
            ${escapeHtml(project.nko_name)}
        </a>
    ` : `
        <span class="nko-name">
            ${escapeHtml(project.nko_name)}
        </span>
    `;
}

// ==================== СИСТЕМА УВЕДОМЛЕНИЙ В ПРАВОМ НИЖНЕМ УГЛУ ====================

// Инициализация системы уведомлений
function initNotificationSystem() {
    // Создаем контейнер для уведомлений если его нет
    if (!document.getElementById('notificationContainer')) {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }
}

// Показать уведомление в правом нижнем углу
function showNotification(title, message, type = 'info', duration = 3000) {
    // Инициализируем систему если нужно
    initNotificationSystem();
    
    const container = document.getElementById('notificationContainer');
    const notificationId = 'notification-' + Date.now();
    
    const colors = {
        success: { bg: '#10b981', text: '#ffffff' },
        error: { bg: '#ef4444', text: '#ffffff' },
        warning: { bg: '#f59e0b', text: '#ffffff' },
        info: { bg: '#3b82f6', text: '#ffffff' }
    };
    
    const color = colors[type] || colors.info;
    
    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.style.cssText = `
        background: ${color.bg};
        color: ${color.text};
        padding: 16px;
        margin-bottom: 10px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        pointer-events: auto;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease;
        max-width: 400px;
        font-family: 'Roboto', sans-serif;
        position: relative;
    `;
    
    notification.innerHTML = `
        <div style="padding-right: 25px;">
            <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">${title}</div>
            <div style="font-size: 13px; opacity: 0.9;">${message}</div>
        </div>
        <button onclick="closeNotification('${notificationId}')" 
                style="position: absolute; top: 8px; right: 8px; background: none; border: none; color: white; cursor: pointer; font-size: 16px; padding: 0; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
            ×
        </button>
    `;
    
    container.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 10);
    
    // Автоматическое закрытие
    if (duration > 0) {
        setTimeout(() => {
            closeNotification(notificationId);
        }, duration);
    }
    
    return notificationId;
}

// Закрыть уведомление
function closeNotification(notificationId) {
    const notification = document.getElementById(notificationId);
    if (notification) {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

// Обновляем старую функцию showToast для совместимости
function showToast(title, message, type = 'info') {
    return showNotification(title, message, type, 3000);
}

// Экспортируем функции для глобального использования
window.loadAdminCities = loadAdminCities;
window.showCityDetails = showCityDetails;
window.openAdminModal = openAdminModal;
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
window.openRegisterModal = openRegisterModal;
window.openProfileModal = openProfileModal;
window.openNkoRegistration = openNkoRegistration;
window.highlightNkoSection = highlightNkoSection;
window.performTextSearch = performTextSearch;
window.clearSearch = clearSearch;
window.loadSearchPage = loadSearchPage;
window.initSearchSystem = initSearchSystem;
window.closeAuthModal = closeAuthModal;
window.closeRegModal = closeRegModal;
window.closeProfileModal = closeProfileModal;
window.closeAdminModal = closeAdminModal;
window.switchAuthForm = switchAuthForm;
window.toggleCategoryDropdown = toggleCategoryDropdown;
window.showSubcategories = showSubcategories;
window.selectSubcategory = selectSubcategory;
window.filterProjects = filterProjects;
window.initProfileScroll = function() {
    // Функция для инициализации скролла в профиле
    console.log('Инициализация скролла профиля');
};
// Функции для управления объектами
window.toggleNkoFields = toggleNkoFields;
window.addNewObject = addNewObject;
window.showAddCityForm = showAddCityForm;
window.hideAddCityForm = hideAddCityForm;
window.clearObjectForm = clearObjectForm;
window.addNewCity = addNewCity;
// Функции для заявок НКО в админ-панели
window.loadNkoApplications = loadNkoApplications;
window.loadVerifiedNko = loadVerifiedNko;
window.approveNkoApplication = approveNkoApplication;
window.rejectNkoApplication = rejectNkoApplication;
window.showNkoDetails = showNkoDetails;