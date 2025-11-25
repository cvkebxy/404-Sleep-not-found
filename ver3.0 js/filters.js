// filters.js - categories & filters moved from legacy code
(function(window){
"use strict";

const Filters = (function(){
    let currentDropdown = null;
    let currentSubcategory = null;

    function toggleCategoryDropdown(dropdownId){
        const dropdown = document.getElementById(`${dropdownId}-dropdown`);
        if (!dropdown) return;
        document.querySelectorAll('.category-dropdown-menu').forEach(menu => {
            if (menu.id !== `${dropdownId}-dropdown`) menu.classList.remove('show');
        });
        dropdown.classList.toggle('show');
        currentDropdown = dropdown.classList.contains('show') ? dropdownId : null;
        if (!dropdown.classList.contains('show')) hideAllSubcategories();
    }

    function showSubcategories(category, dropdownId){
        hideAllSubcategories();
        const sub = document.getElementById(`${category}-subcategories`);
        if (sub) { sub.classList.add('show'); currentSubcategory = category; currentDropdown = dropdownId; }
    }

    function hideAllSubcategories(){
        document.querySelectorAll('.subcategory-menu').forEach(m=>m.classList.remove('show'));
        currentSubcategory = null;
    }

    function selectSubcategory(category, subcategory, dropdownId){
        const toggle = document.querySelector(`#${dropdownId}-dropdown`)?.previousElementSibling?.querySelector('span');
        let displayText = Helpers.getDefaultText(dropdownId);
        // small mapping (same as original)
        if (dropdownId === 'categories') displayText = getCategoryText(category, subcategory);
        if (dropdownId === 'help-type') displayText = getHelpTypeText(category, subcategory);
        if (dropdownId === 'participation') displayText = getParticipationText(category, subcategory);
        if (dropdownId === 'regularity') displayText = getRegularityText(category, subcategory);
        if (toggle) toggle.textContent = displayText;
        document.getElementById(`${dropdownId}-dropdown`)?.classList.remove('show');
        hideAllSubcategories();
        currentDropdown = null;
        filterProjects(dropdownId, category, subcategory);
        showToast('Фильтр применён', `Выбрано: ${displayText}`);
    }

    function filterProjects(dropdownId, category, subcategory){
        console.log('filterProjects', dropdownId, category, subcategory);
        // Stub: integrate with your server-side or client-side filtering
    }

    function getCategoryText(category, subcategory){
        if (category === 'social') {
            if (subcategory === 'children') return 'Помощь детям';
            if (subcategory === 'elderly') return 'Помощь пожилым';
            if (subcategory === 'all') return 'Все социальные';
        }
        if (category === 'ecology') {
            if (subcategory === 'cleanup') return 'Уборка территорий';
            if (subcategory === 'planting') return 'Озеленение';
            if (subcategory === 'all') return 'Все экологические';
        }
        return 'Все категории';
    }

    function getHelpTypeText(category, subcategory){
        switch(category){
            case 'volunteering': return 'Волонтёрство';
            case 'donations': return 'Пожертвования';
            case 'expertise': return 'Экспертиза';
            case 'mentoring': return 'Наставничество';
        }
        return 'Тип помощи';
    }

    function getParticipationText(category, subcategory){
        switch(category){ case 'online': return 'Онлайн'; case 'offline': return 'Офлайн'; case 'hybrid': return 'Гибрид'; }
        return 'Формат участия';
    }

    function getRegularityText(category, subcategory){
        switch(category){ case 'regular': return 'Регулярная помощь'; case 'one-time': return 'Разовое участие'; case 'ongoing': return 'Постоянная поддержка'; }
        return 'Регулярность';
    }

    function init(){ console.info('Filters.init'); }

    return { init, toggleCategoryDropdown, showSubcategories, selectSubcategory, hideAllSubcategories, filterProjects };
})();

window.Filters = Filters;
window.toggleCategoryDropdown = Filters.toggleCategoryDropdown;
window.showSubcategories = Filters.showSubcategories;
window.selectSubcategory = Filters.selectSubcategory;
window.hideAllSubcategories = Filters.hideAllSubcategories;
window.filterProjects = Filters.filterProjects;

})(window);
