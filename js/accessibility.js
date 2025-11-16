// accessibility.js - функционал для слабовидящих

// Объявляем глобальную переменную для отслеживания состояния
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
    applyAccessibilityToModals();
    
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
    applyAccessibilityToModals();
    
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
    applyAccessibilityToModals();
    
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
    applyAccessibilityToModals();
    
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

function applyAccessibilityToModals() {
    // Применяем настройки доступности ко всем модальным окнам
    const modals = document.querySelectorAll('.auth-modal, .auth-dialog, .auth-form');
    modals.forEach(modal => {
        // Копируем классы с html элемента на модальные окна
        modal.className = modal.className.replace(/accessibility-\S+/g, '');
        modal.classList.add(...document.documentElement.classList);
        
        // Применяем стили напрямую
        if (document.documentElement.classList.contains('accessibility-large-font')) {
            modal.style.fontSize = '18px';
        } else if (document.documentElement.classList.contains('accessibility-larger-font')) {
            modal.style.fontSize = '20px';
        } else {
            modal.style.fontSize = '';
        }
        
        if (document.documentElement.classList.contains('accessibility-large-line-height')) {
            modal.style.lineHeight = '1.8';
        } else {
            modal.style.lineHeight = '';
        }
        
        if (document.documentElement.classList.contains('accessibility-dyslexic-font')) {
            modal.style.fontFamily = 'Comic Sans MS, Arial, sans-serif';
        } else {
            modal.style.fontFamily = '';
        }
    });
}

function resetAccessibilitySettings() {
    // Сбрасываем все настройки на html элементе и body
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

// Инициализация доступности при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log('Инициализация доступности...');
    
    // Применяем настройки к уже открытым модальным окнам
    applyAccessibilityToModals();
    
    // Добавляем обработчики событий для кнопок доступности
    const accessibilityBtns = document.querySelectorAll('.accessibility-btn, .footer-accessibility-btn');
    
    accessibilityBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Клик по кнопке доступности');
            toggleAccessibilityMode();
        });
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
    document.querySelectorAll('.size-controls button').forEach(btn => {
        btn.addEventListener('click', function() {
            const size = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            changeFontSize(size);
            
            // Обновляем активные кнопки размера
            document.querySelectorAll('.size-controls button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Обработчики для кнопок цветовых схем
    document.querySelectorAll('.color-schemes button').forEach(btn => {
        btn.addEventListener('click', function() {
            const scheme = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            changeColorScheme(scheme);
        });
    });
    
    // Обработчики для кнопок межстрочного интервала
    document.querySelectorAll('.spacing-controls button').forEach(btn => {
        btn.addEventListener('click', function() {
            const height = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            changeLineHeight(height);
            
            // Обновляем активные кнопки интервала
            document.querySelectorAll('.spacing-controls button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Обработчики для кнопок шрифта
    document.querySelectorAll('.font-controls button').forEach(btn => {
        btn.addEventListener('click', function() {
            const font = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            changeFontFamily(font);
            
            // Обновляем активные кнопки шрифта
            document.querySelectorAll('.font-controls button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Закрытие панели при клике вне её области
    document.addEventListener('click', function(e) {
        const panel = document.getElementById('accessibilityPanel');
        const accessibilityBtn = document.getElementById('accessibilityBtn');
        const footerAccessibilityBtn = document.getElementById('footerAccessibilityBtn');
        
        if (panel && panel.classList.contains('show') && 
            !panel.contains(e.target) && 
            e.target !== accessibilityBtn && 
            e.target !== footerAccessibilityBtn &&
            !accessibilityBtn.contains(e.target) &&
            !footerAccessibilityBtn.contains(e.target)) {
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
});

// Также добавляем глобальную функцию showToast если её нет
if (typeof showToast === 'undefined') {
    function showToast(title, message) {
        console.log('Toast:', title, '-', message);
        // Создаем простой toast если функция не определена
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.className = 'toast show';
            setTimeout(() => {
                toast.className = toast.className.replace('show', '');
            }, 3000);
        }
    }
}

// Делаем функции глобально доступными
window.toggleAccessibilityMode = toggleAccessibilityMode;
window.closeAccessibilityPanel = closeAccessibilityPanel;
window.changeFontSize = changeFontSize;
window.changeLineHeight = changeLineHeight;
window.changeFontFamily = changeFontFamily;
window.changeColorScheme = changeColorScheme;
window.resetAccessibilitySettings = resetAccessibilitySettings;