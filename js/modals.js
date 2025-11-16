// modals.js - исправленная версия с правильным закрытием по ESC

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

function openCreateCardModal() {
    const modal = document.getElementById('createCardModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // НЕ сбрасываем форму при открытии
    applyAccessibilityToModal(modal);
}

function openAdminModal() {
    const modal = document.getElementById('adminModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Загружаем данные администратора
    if (typeof loadAdminData === 'function') {
        loadAdminData();
    }
    
    applyAccessibilityToModal(modal);
}

// Функция применения доступности к модальному окну
function applyAccessibilityToModal(modal) {
    // Копируем классы доступности с html элемента
    const accessibilityClasses = Array.from(document.documentElement.classList).filter(
        cls => cls.startsWith('accessibility-')
    );
    
    // Удаляем старые классы доступности
    modal.className = modal.className.replace(/accessibility-\S+/g, '');
    
    // Добавляем текущие классы доступности
    modal.classList.add(...accessibilityClasses);
    
    // Также применяем к внутренним элементам модального окна
    const dialog = modal.querySelector('.auth-dialog');
    const form = modal.querySelector('.auth-form');
    
    if (dialog) {
        dialog.className = dialog.className.replace(/accessibility-\S+/g, '');
        dialog.classList.add(...accessibilityClasses);
    }
    
    if (form) {
        form.className = form.className.replace(/accessibility-\S+/g, '');
        form.classList.add(...accessibilityClasses);
    }
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
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    if (!dialog) return;
    
    // Определяем, какая форма активируется
    const isRegister = targetForm === 'register';
    
    // 1. Сначала скрываем текущую активную форму
    const activeForm = document.querySelector('.auth-form.active');
    if (activeForm) {
        activeForm.style.opacity = '0';
        activeForm.style.transform = 'translateY(-20px)';
    }
    
    // 2. Обновляем активные табы
    tabBtns.forEach(btn => btn.classList.remove('active'));
    const targetTab = document.querySelector(`.tab-btn[data-tab="${targetForm}"]`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // 3. Анимируем изменение высоты диалога
    if (isRegister) {
        dialog.classList.add('large');
    } else {
        dialog.classList.remove('large');
    }
    
    // 4. После завершения анимации скрытия, переключаем формы
    setTimeout(() => {
        // Скрываем все формы
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        
        // Показываем целевую форму
        const targetFormElement = document.getElementById(`${targetForm}Form`);
        if (targetFormElement) {
            targetFormElement.classList.add('active');
            
            // 5. Показываем новую форму с анимацией
            setTimeout(() => {
                targetFormElement.style.opacity = '1';
                targetFormElement.style.transform = 'translateY(0)';
                
                // Применяем доступность к новой форме
                applyAccessibilityToModal(document.getElementById('authModal'));
                
                // Прокручиваем к верху формы
                dialog.scrollTop = 0;
            }, 100);
        }
    }, 300);
}

// Закрытие модального окна при клике вне его
document.addEventListener('DOMContentLoaded', function() {
    // Обработчики для клика вне модального окна
    document.getElementById('authModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeAuthModal();
        }
    });

    document.getElementById('nkoModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeNkoModal();
        }
    });

    document.getElementById('profileModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeProfileModal();
        }
    });

    document.getElementById('createCardModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeCreateCardModal();
        }
    });

    document.getElementById('adminModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeAdminModal();
        }
    });

    // Обновляем обработчики табов
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            switchAuthForm(tab);
        });
    });
});

// Обработчик ESC для всех модальных окон - ИСПРАВЛЕННАЯ ВЕРСИЯ
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Закрываем активное модальное окно
        const activeModals = document.querySelectorAll('.auth-modal.show');
        if (activeModals.length > 0) {
            const activeModal = activeModals[0];
            
            // Закрываем конкретное модальное окно без сброса данных
            if (activeModal.id === 'authModal') {
                closeAuthModal(); // Эта сбрасывает только формы авторизации
            } else if (activeModal.id === 'nkoModal') {
                closeNkoModal(); // Эта НЕ сбрасывает форму
            } else if (activeModal.id === 'profileModal') {
                closeProfileModal(); // Эта НЕ сбрасывает форму
            } else if (activeModal.id === 'createCardModal') {
                closeCreateCardModal(); // Эта сбрасывает только форму создания карточки
            } else if (activeModal.id === 'adminModal') {
                closeAdminModal(); // Эта НЕ сбрасывает данные
            }
        }
        
        // Закрываем панель доступности
        const accessibilityPanel = document.getElementById('accessibilityPanel');
        if (accessibilityPanel && accessibilityPanel.classList.contains('show')) {
            closeAccessibilityPanel();
        }
    }
});

// Обработчик формы создания карточки
document.getElementById('createCardForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    try {
        const submitBtn = this.querySelector('.auth-submit');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Создание...';
        submitBtn.disabled = true;
        
        const response = await fetch('php/create_card.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        showToast(data.status === 'success' ? 'Успех' : 'Ошибка', data.message);
        
        if (data.status === 'success') {
            setTimeout(() => {
                closeCreateCardModal();
                // Перезагружаем карточки
                if (typeof changeCardPage === 'function') {
                    changeCardPage(1);
                }
            }, 1500);
        }
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Ошибка соединения с сервером');
        
        const submitBtn = this.querySelector('.auth-submit');
        submitBtn.textContent = 'Опубликовать проект';
        submitBtn.disabled = false;
    }
});

// Обработчик формы НКО
document.getElementById('nkoForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    try {
        const submitBtn = this.querySelector('.auth-submit');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Сохранение...';
        submitBtn.disabled = true;
        
        const response = await fetch('php/save_nko.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        showToast(data.success ? 'Успех' : 'Ошибка', data.message);
        
        if (data.success) {
            setTimeout(() => {
                closeNkoModal();
            }, 1500);
        }
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Ошибка соединения с сервером');
        
        const submitBtn = this.querySelector('.auth-submit');
        submitBtn.textContent = 'ЗАРЕГИСТРИРОВАТЬ НКО';
        submitBtn.disabled = false;
    }
});