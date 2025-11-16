// cards-management.js - полная логика управления карточками

// Используем существующие глобальные переменные
if (typeof currentPage === 'undefined') {
    window.currentPage = 1;
}
if (typeof totalPages === 'undefined') {
    window.totalPages = 1;
}

let deleteInProgress = false; // Флаг для предотвращения множественных вызовов
let formHandlerInitialized = false; // Флаг для отслеживания инициализации формы

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initCardsManagement();
    initPagination();
    initCreateCardForm(); // Инициализируем форму создания карточки ОДИН РАЗ
});

// Инициализация управления карточками
function initCardsManagement() {
    // Получаем данные о пагинации
    const projectsHeader = document.querySelector('.projects-header');
    if (projectsHeader) {
        window.totalPages = parseInt(projectsHeader.getAttribute('data-total-pages')) || 1;
        window.currentPage = getCurrentPageFromURL();
    }
    
    // Инициализируем обработчики для кнопок помощи
    initHelpButtons();
    
    // Инициализируем обработчики для кнопок удаления - ТОЛЬКО ОДИН РАЗ
    initDeleteButtons();
}

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

// Глобальная функция для удаления карточки (ОБЪЯВЛЕНА ТОЛЬКО ОДИН РАЗ)
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
        
// Инициализация пагинации
function initPagination() {
    document.addEventListener('click', function(e) {
        // Обработка кнопок с номерами страниц
        if (e.target.classList.contains('pagination-btn') && !e.target.classList.contains('active')) {
            const page = parseInt(e.target.textContent);
            if (!isNaN(page)) {
                changeCardPage(page);
            }
        }
        
        // Обработка кнопки "Назад"
        if (e.target.classList.contains('prev-btn') || e.target.closest('.prev-btn')) {
            e.preventDefault();
            if (currentPage > 1) {
                changeCardPage(currentPage - 1);
            }
        }
        
        // Обработка кнопки "Вперед"
        if (e.target.classList.contains('next-btn') || e.target.closest('.next-btn')) {
            e.preventDefault();
            if (currentPage < totalPages) {
                changeCardPage(currentPage + 1);
            }
        }
    });
}

// Получение текущей страницы из URL
function getCurrentPageFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return parseInt(urlParams.get('card_page')) || 1;
}

// Смена страницы карточек через AJAX
async function changeCardPage(page) {
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    
    // Показываем индикатор загрузки
    const projectsGrid = document.getElementById('projectsGrid');
    const projectsContainer = document.getElementById('projectsContainer');
    
    if (projectsGrid) {
        projectsGrid.innerHTML = '<div style="text-align: center; padding: 40px; color: white;"><div class="loading-spinner"></div><p>Загрузка проектов...</p></div>';
    }
    
    try {
        const response = await fetch('php/get_cards_ajax.php?card_page=${page}');
        const data = await response.json();
        
        if (data.success) {
            if (projectsContainer) {
                projectsContainer.innerHTML = data.html;
            }
            updateURL(page);
            initCardsManagement(); // Переинициализируем обработчики
        } else {
            showToast('Ошибка', 'Не удалось загрузить проекты');
        }
    } catch (error) {
        console.error('Ошибка загрузки карточек:', error);
        showToast('Ошибка', 'Ошибка соединения с сервером');
    }
}

// Обновление URL
function updateURL(page) {
    const url = new URL(window.location);
    if (page === 1) {
        url.searchParams.delete('card_page');
    } else {
        url.searchParams.set('card_page', page);
    }
    window.history.replaceState({}, '', url);
}

// Инициализация кнопок помощи
function initHelpButtons() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-help') && !e.target.disabled) {
            const cardId = e.target.closest('.project-card')?.getAttribute('data-card-id');
            if (cardId) {
                joinProject(cardId, e.target);
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
            
            // Обновляем счетчик участников
            const cardElement = buttonElement.closest('.project-card');
            if (cardElement) {
                const participantsCount = cardElement.querySelector('.participants-count');
                if (participantsCount) {
                    const parts = participantsCount.textContent.split('/');
                    if (parts.length === 2) {
                        const current = parseInt(parts[0]) + 1;
                        const max = parts[1].split(' ')[0]; // Убираем " участников"
                        participantsCount.textContent = `${current}/${max} участников`;
                    }
                }
            }
            
            // ОБНОВЛЯЕМ СЧЕТЧИК ВОЛОНТЕРОВ
            if (typeof countersManager !== 'undefined') {
                countersManager.addVolunteer();
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

// Экспортируем функции для глобального использования
window.changeCardPage = changeCardPage;
window.joinProject = joinProject;
window.openCreateCardModal = openCreateCardModal;
window.closeCreateCardModal = closeCreateCardModal;