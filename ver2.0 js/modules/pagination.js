(function(){
    const Pagination = {
        init(){ console.log('Pagination.init'); window.changeCardPage = this.changeCardPage.bind(this); window.addEventListener('popstate',(e)=>{ const p=(e.state&&e.state.page)||1; this.changeCardPage(p); }); },
        async changeCardPage(page){ if(!page) return; try{ const response = await fetch(`php/get_card_ajax.php?card_page=${page}`); const data = await response.json(); if(data.success && data.html){ document.getElementById('projectsContainer').innerHTML = data.html; window.currentPage = data.current_page || page; window.totalPages = data.total_pages || window.totalPages; history.pushState({page:page},'', new URL(window.location.href).pathname + '?card_page='+page); } }catch(err){ console.error('changeCardPage error',err); window.showToast?.('Ошибка','Не удалось загрузить страницу'); } }
    };
    window.Pagination = Pagination;
})();
