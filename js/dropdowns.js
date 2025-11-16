// dropdowns.js - управление выпадающими списками категорий

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