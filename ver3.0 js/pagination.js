// pagination.js - AJAX pagination
(function(window){
"use strict";
const Pagination = (function(){
    async function changeCardPage(page){
        try {
            if (!page || page < 1) return;
            showLoadingIndicator();
            // Try both possible endpoints (some installs have singular/plural)
            const endpoints = ['php/get_card_ajax.php','php/get_cards_ajax.php','php/get_cards_ajax.php'];
            let response, data;
            for (const ep of endpoints){
                try{
                    response = await fetch(`${ep}?card_page=${page}`, { credentials: 'same-origin' });
                    if (!response.ok) throw new Error('not ok');
                    data = await response.json();
                    break;
                }catch(err){ /* try next */ }
            }
            if (!data || !data.success) throw new Error('Invalid response');
            updateContent(data.html, page);
            window.currentPage = data.current_page || page;
            window.totalPages = data.total_pages || window.totalPages || 1;
            updateURL(window.currentPage);
            scrollToProjectsSection();
        } catch (err){
            console.error('changeCardPage error', err);
            showToast('Ошибка','Не удалось загрузить карточки');
        } finally {
            hideLoadingIndicator();
        }
    }

    function updatePaginationButtons(){
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        if (prevBtn) prevBtn.style.display = (window.currentPage>1?'inline-block':'none');
        if (nextBtn) nextBtn.style.display = (window.currentPage<window.totalPages?'inline-block':'none');
        document.querySelectorAll('.pagination-btn').forEach(btn=>{
            const n = parseInt(btn.textContent,10);
            btn.classList.toggle('active', n===window.currentPage);
        });
    }

    function init(){ console.info('Pagination.init'); }

    return { init, changeCardPage, updatePaginationButtons };
})();

window.Pagination = Pagination;
window.changeCardPage = Pagination.changeCardPage;
window.updatePaginationButtons = Pagination.updatePaginationButtons;

console.info('Pagination module loaded');
})(window);
