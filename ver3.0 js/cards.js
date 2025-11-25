// cards.js - join/delete/create card handling
(function(window){
"use strict";
const Cards = (function(){
    let deleteInProgress = false;
    let formHandlerInitialized = false;

    function initHelpButtons(){
        document.addEventListener('click', function(e){
            const btn = e.target.closest('.btn-help');
            if (btn && !btn.disabled){
                e.preventDefault();
                const cardId = btn.getAttribute('data-card-id');
                if (cardId) joinProject(parseInt(cardId), btn);
            }
        });
    }

    async function joinProject(cardId, buttonElement){
        if (!buttonElement) buttonElement = document.querySelector(`.btn-help[data-card-id="${cardId}"]`);
        const originalText = buttonElement?.textContent || '';
        if (buttonElement) { buttonElement.disabled = true; buttonElement.innerHTML = '<div class="loading-spinner-small"></div> Загрузка...'; }
        try {
            const resp = await fetch('php/join_project.php', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:`card_id=${cardId}` });
            const data = await resp.json();
            if (data.success) {
                if (buttonElement) { buttonElement.textContent = 'Вы участвуете'; buttonElement.disabled = true; }
                if (window.countersManager) window.countersManager.addVolunteer();
                showToast('Успех', data.message || 'Вы присоединились');
                if (typeof changeCardPage === 'function') changeCardPage(window.currentPage);
            } else {
                if (buttonElement) { buttonElement.textContent = originalText; buttonElement.disabled = false; }
                showToast('Ошибка', data.message || 'Не удалось присоединиться');
            }
        } catch(err){
            console.error('joinProject err',err);
            if (buttonElement) { buttonElement.textContent = originalText; buttonElement.disabled = false; }
            showToast('Ошибка','Ошибка соединения с сервером');
        }
    }

    function initDeleteButtons(){
        // use delegated handler
        document.addEventListener('click', handleDeleteClick);
    }

    function handleDeleteClick(e){
        const deleteBtn = e.target.closest('.delete-card-btn');
        if (!deleteBtn) return;
        e.preventDefault(); e.stopPropagation();
        const cardElement = deleteBtn.closest('.project-card');
        if (!cardElement) return;
        const cardId = cardElement.getAttribute('data-card-id');
        deleteCard(cardId, cardElement);
    }

    async function deleteCard(cardId, cardElement){
        if (deleteInProgress) return;
        if (!cardElement) cardElement = document.querySelector(`.project-card[data-card-id="${cardId}"]`);
        if (!cardElement) return;
        if (!confirm('Вы уверены?')) return;
        deleteInProgress = true;
        const deleteBtn = cardElement.querySelector('.delete-card-btn');
        if (deleteBtn) { deleteBtn.disabled = true; deleteBtn.innerHTML = '<div class="loading-spinner-small"></div>'; }
        try {
            const resp = await fetch('php/delete_card.php', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:`card_id=${cardId}` });
            const data = await resp.json();
            showToast(data.status==='success'?'Успех':'Ошибка', data.message || '');
            if (data.status === 'success') {
                cardElement.style.transition='all .3s ease'; cardElement.style.opacity='0'; cardElement.style.transform='scale(.9) translateY(20px)';
                setTimeout(()=>{ cardElement.remove(); const remaining = document.querySelectorAll('.project-card'); if (remaining.length===0) setTimeout(()=>window.location.reload(),800); }, 350);
            } else {
                if (deleteBtn) { deleteBtn.disabled=false; deleteBtn.innerHTML='×'; }
            }
        } catch(err){
            console.error('deleteCard err', err);
            showToast('Ошибка','Ошибка соединения с сервером');
            if (deleteBtn) { deleteBtn.disabled=false; deleteBtn.innerHTML='×'; }
        } finally {
            setTimeout(()=> deleteInProgress=false, 800);
        }
    }

    function initCreateCardForm(){
        if (formHandlerInitialized) return;
        const form = document.getElementById('createCardForm');
        if (!form) return;
        form.addEventListener('submit', async function(e){ e.preventDefault(); await handleCreateCardForm(this); });
        formHandlerInitialized = true;
    }

    async function handleCreateCardForm(form){
        const formData = new FormData(form);
        const submitBtn = form.querySelector('.auth-submit');
        const originalText = submitBtn?.textContent || 'Опубликовать проект';
        if (submitBtn) { submitBtn.textContent='Создание...'; submitBtn.disabled=true; }
        try{
            const resp = await fetch('php/create_card.php', { method:'POST', body: formData });
            const data = await resp.json();
            showToast(data.status==='success'?'Успех':'Ошибка', data.message || '');
            if (data.status === 'success') { form.reset(); closeCreateCardModal(); setTimeout(()=>window.location.reload(),800); }
        }catch(err){ console.error(err); showToast('Ошибка','Ошибка соединения с сервером'); }
        if (submitBtn) { submitBtn.textContent = originalText; submitBtn.disabled=false; }
    }

    function init(){
        console.info('Cards.init');
        initHelpButtons();
        initDeleteButtons();
        initCreateCardForm();
    }

    return { init, joinProject, deleteCard, initCreateCardForm };
})();

window.Cards = Cards;
window.joinProject = Cards.joinProject;
window.deleteCard = Cards.deleteCard;
window.initCreateCardForm = Cards.initCreateCardForm;

console.info('Cards module loaded');
})(window);
