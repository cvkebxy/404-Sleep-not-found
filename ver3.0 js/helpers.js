// helpers.js - utility functions
(function(window){
"use strict";

const Helpers = {
    scrollToSection(id) {
        const element = document.getElementById(id);
        if (!element) return;
        const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
        const pos = element.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
        window.scrollTo({ top: pos, behavior: 'smooth' });
    },

    getDefaultText(dropdownId) {
        switch(dropdownId) {
            case 'categories': return 'Все категории';
            case 'help-type': return 'Тип помощи';
            case 'participation': return 'Формат участия';
            case 'regularity': return 'Регулярность';
            default: return 'Выбрать';
        }
    },

    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

window.Helpers = Helpers;
window.scrollToSection = Helpers.scrollToSection;
window.getDefaultText = Helpers.getDefaultText;
window.escapeHtml = Helpers.escapeHtml;

console.info('Helpers.init');
})(window);
