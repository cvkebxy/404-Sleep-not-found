// accessibility.js - accessibility features
(function(window){
"use strict";
const Accessibility = (function(){
    let accessibilityMode = false;

    function applyAccessibilityToModal(modal){
        if (!modal) return;
        // copy classes from root
        const accessibilityClasses = Array.from(document.documentElement.classList).filter(c=>c.startsWith('accessibility-'));
        modal.className = modal.className.replace(/accessibility-\S+/g, '');
        if (accessibilityClasses.length) modal.classList.add(...accessibilityClasses);
        // inline styles based on root
        const root = document.documentElement;
        modal.style.fontSize = root.classList.contains('accessibility-larger-font') ? '20px' : root.classList.contains('accessibility-large-font') ? '18px' : '';
        modal.style.lineHeight = root.classList.contains('accessibility-large-line-height') ? '1.8' : '';
    }

    function changeFontSize(size){
        document.documentElement.classList.remove('accessibility-large-font','accessibility-larger-font');
        document.body.classList.remove('accessibility-large-font','accessibility-larger-font');
        if (size === 'normal') {
            document.documentElement.classList.add('accessibility-large-font');
            document.body.classList.add('accessibility-large-font');
        } else if (size === 'larger') {
            document.documentElement.classList.add('accessibility-larger-font');
            document.body.classList.add('accessibility-larger-font');
        }
        // apply to open modals
        document.querySelectorAll('.auth-modal.show, .auth-dialog.show').forEach(applyAccessibilityToModal);
        console.log('changeFontSize', size);
    }

    function changeLineHeight(h){
        document.documentElement.classList.toggle('accessibility-large-line-height', h === 'large');
        document.body.classList.toggle('accessibility-large-line-height', h === 'large');
        document.querySelectorAll('*').forEach(el=> el.style.lineHeight = h === 'large' ? '1.8' : '');
        document.querySelectorAll('.auth-modal, .auth-dialog').forEach(applyAccessibilityToModal);
    }

    function changeFontFamily(font){
        document.documentElement.classList.toggle('accessibility-dyslexic-font', font === 'dyslexic');
        document.body.classList.toggle('accessibility-dyslexic-font', font === 'dyslexic');
        document.querySelectorAll('*').forEach(el=> el.style.fontFamily = font === 'dyslexic' ? 'Comic Sans MS, Arial, sans-serif' : '');
        document.querySelectorAll('.auth-modal, .auth-dialog').forEach(applyAccessibilityToModal);
    }

    function changeColorScheme(scheme){
        document.documentElement.classList.remove('accessibility-high-contrast','accessibility-dark');
        document.body.classList.remove('accessibility-high-contrast','accessibility-dark');
        if (scheme === 'contrast') { document.documentElement.classList.add('accessibility-high-contrast'); document.body.classList.add('accessibility-high-contrast'); }
        if (scheme === 'dark') { document.documentElement.classList.add('accessibility-dark'); document.body.classList.add('accessibility-dark'); }
        document.querySelectorAll('.auth-modal, .auth-dialog').forEach(applyAccessibilityToModal);
    }

    function resetAccessibilitySettings(){
        document.documentElement.className = '';
        document.body.className = '';
        document.querySelectorAll('*').forEach(el => { el.style.fontSize=''; el.style.lineHeight=''; el.style.fontFamily=''; });
        showToast('Настройки доступности','Все настройки сброшены');
    }

    function toggleAccessibilityMode(){
        const panel = document.getElementById('accessibilityPanel');
        if (!panel) { console.error('Панель доступности не найдена'); return; }
        panel.classList.toggle('show');
        document.body.style.overflow = panel.classList.contains('show') ? 'hidden' : '';
        accessibilityMode = panel.classList.contains('show');
    }

    function closeAccessibilityPanel(){
        const panel = document.getElementById('accessibilityPanel');
        if (panel) { panel.classList.remove('show'); document.body.style.overflow = ''; accessibilityMode = false; }
    }

    function init(){
        console.info('Accessibility.init');
        // wire basic buttons via delegation where present
        document.addEventListener('click', (e)=>{
            if (e.target.closest('.accessibility-btn') || e.target.id === 'accessibilityBtn' || e.target.id === 'footerAccessibilityBtn') {
                e.preventDefault();
                toggleAccessibilityMode();
            }
            // size controls
            const sizeBtn = e.target.closest('.size-controls button');
            if (sizeBtn) {
                const txt = sizeBtn.textContent.trim();
                if (txt === 'A-') changeFontSize('smaller');
                else if (txt === 'A') changeFontSize('normal');
                else if (txt === 'A+') changeFontSize('larger');
                document.querySelectorAll('.size-controls button').forEach(b=>b.classList.remove('active'));
                sizeBtn.classList.add('active');
            }
            const schemeBtn = e.target.closest('.color-schemes button');
            if (schemeBtn) changeColorScheme(schemeBtn.getAttribute('data-scheme') || 'normal');
            const spacingBtn = e.target.closest('.spacing-controls button');
            if (spacingBtn) {
                const txt = spacingBtn.textContent.toLowerCase();
                changeLineHeight(txt === 'увеличенный' ? 'large' : 'normal');
            }
            const fontBtn = e.target.closest('.font-controls button');
            if (fontBtn) changeFontFamily(fontBtn.textContent.toLowerCase().includes('дисл') ? 'dyslexic' : 'standard');
        });

        // close panel on escape
        document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeAccessibilityPanel(); });
    }

    return {
        init, changeFontSize, changeLineHeight, changeFontFamily, changeColorScheme,
        resetAccessibilitySettings, toggleAccessibilityMode, closeAccessibilityPanel, applyAccessibilityToModal
    };
})();

window.Accessibility = Accessibility;
window.changeFontSize = Accessibility.changeFontSize;
window.changeLineHeight = Accessibility.changeLineHeight;
window.changeFontFamily = Accessibility.changeFontFamily;
window.changeColorScheme = Accessibility.changeColorScheme;
window.resetAccessibilitySettings = Accessibility.resetAccessibilitySettings;
window.toggleAccessibilityMode = Accessibility.toggleAccessibilityMode;
window.closeAccessibilityPanel = Accessibility.closeAccessibilityPanel;

console.info('Accessibility.init loaded');
})(window);
