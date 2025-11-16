// navigation.js - исправленная версия с AJAX пагинацией

let currentPage = 1;
let totalPages = 1;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    currentPage = parseInt(urlParams.get('card_page')) || 1;
    
    console.log('Текущая страница:', currentPage);
    
    // Загружаем карточки при загрузке страницы
    loadInitialCards();
    initGlobalEventHandlers();
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

// Обновление контента
function updateContent(newHTML, page) {
    const container = document.getElementById('projectsContainer');
    if (!container) return;
    
    container.style.opacity = '0';
    container.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
        container.innerHTML = newHTML;
        updatePaginationButtons();
        initCardsEventHandlers();
        
        setTimeout(() => {
            container.style.opacity = '1';
        }, 50);
        
    }, 300);
}

// Инициализация обработчиков для новых карточек
function initCardsEventHandlers() {
    // Обработчики для кнопок "Помочь"
    document.querySelectorAll('.btn-help').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const cardId = this.getAttribute('data-card-id');
            if (cardId && !this.disabled) {
                joinProject(parseInt(cardId));
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

// Обновление кнопок пагинации
function updatePaginationButtons() {
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    if (prevBtn) {
        prevBtn.style.display = currentPage > 1 ? 'block' : 'none';
    }
    
    if (nextBtn) {
        nextBtn.style.display = currentPage < totalPages ? 'block' : 'none';
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

// Экспортируем функции
window.changeCardPage = changeCardPage;
window.scrollToSection = scrollToSection;
window.toggleFilter = toggleFilter;
window.joinProject = joinProject;
window.showToast = showToast;