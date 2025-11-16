// forms.js - обработка форм и валидация

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