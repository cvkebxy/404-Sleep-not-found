// modals.js - modal window helpers
(function(window){
"use strict";
const Modals = (function(){
    function switchAuthForm(target){
        const dialog = document.querySelector('.auth-dialog');
        if (!dialog) return;
        const isRegister = target === 'register';
        const active = document.querySelector('.auth-form.active');
        if (active){ active.style.opacity='0'; active.style.transform = isRegister ? 'translateX(-20px)' : 'translateX(20px)'; }
        if (isRegister) dialog.classList.add('large'); else dialog.classList.remove('large');
        setTimeout(()=>{
            document.querySelectorAll('.auth-form').forEach(f=>f.classList.remove('active'));
            const el = document.getElementById(`${target}Form`);
            if (el){ el.classList.add('active'); setTimeout(()=>{ el.style.opacity='1'; el.style.transform='translateX(0)'; },50); }
        },300);
    }

    function openAuthModal(){ const modal = document.getElementById('authModal'); if (!modal) return; modal.classList.add('show'); document.body.style.overflow='hidden'; resetForms(); }
    function closeAuthModal(){ const modal = document.getElementById('authModal'); if (!modal) return; modal.classList.remove('show'); document.body.style.overflow=''; resetForms(); }
    function openNkoModal(){ const modal = document.getElementById('nkoModal'); if (!modal) return; modal.classList.add('show'); document.body.style.overflow='hidden'; if (window.loadNkoData) window.loadNkoData(); }
    function closeNkoModal(){ const modal = document.getElementById('nkoModal'); if (!modal) return; modal.classList.remove('show'); document.body.style.overflow=''; }
    function openProfileModal(){ const modal = document.getElementById('profileModal'); if (!modal) return; modal.classList.add('show'); document.body.style.overflow='hidden'; setTimeout(()=>{ if (window.loadProfileData) window.loadProfileData(); if (window.initProfileScroll) setTimeout(window.initProfileScroll,500); },100); }
    function closeProfileModal(){ const modal = document.getElementById('profileModal'); if (!modal) return; modal.classList.remove('show'); document.body.style.overflow=''; }

    function openCreateCardModal(){ const modal = document.getElementById('createCardModal'); if (!modal) return; modal.classList.add('show'); document.body.style.overflow='hidden'; if (window.applyAccessibilityToModal) window.applyAccessibilityToModal(modal); if (window.initCreateCardForm) setTimeout(window.initCreateCardForm,100); }
    function closeCreateCardModal(){ const modal = document.getElementById('createCardModal'); if (!modal) return; modal.classList.remove('show'); document.body.style.overflow=''; const f = document.getElementById('createCardForm'); if (f) f.reset(); }

    function init(){
        console.info('Modals.init');
        // bind simple close buttons
        document.addEventListener('click', function(e){
            if (e.target.matches('.close-auth') || e.target.closest('.close-auth')) closeAuthModal();
        });
    }

    function resetForms(){ const loginForm = document.getElementById('loginForm'); const registerForm = document.getElementById('registerForm'); if (loginForm) loginForm.reset(); if (registerForm) registerForm.reset(); document.querySelectorAll('.auth-form').forEach(f=>{ f.style.opacity=''; f.style.transform=''; }); const dialog = document.querySelector('.auth-dialog'); if (dialog) dialog.classList.remove('large'); switchAuthForm('login'); }

    return { init, switchAuthForm, openAuthModal, closeAuthModal, openNkoModal, closeNkoModal, openProfileModal, closeProfileModal, openCreateCardModal, closeCreateCardModal, resetForms };
})();

window.Modals = Modals;
window.switchAuthForm = Modals.switchAuthForm;
window.openAuthModal = Modals.openAuthModal;
window.closeAuthModal = Modals.closeAuthModal;
window.openNkoModal = Modals.openNkoModal;
window.closeNkoModal = Modals.closeNkoModal;
window.openProfileModal = Modals.openProfileModal;
window.closeProfileModal = Modals.closeProfileModal;
window.openCreateCardModal = Modals.openCreateCardModal;
window.closeCreateCardModal = Modals.closeCreateCardModal;

console.info('Modals module loaded');
})(window);
