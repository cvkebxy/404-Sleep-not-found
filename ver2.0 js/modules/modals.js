(function(){
    const Modals = {
        init(){ console.log('Modals.init'); document.addEventListener('click',(e)=>{ if(e.target.matches('.nav-link')){ e.preventDefault(); const id=e.target.getAttribute('data-section-id'); if(id) this.scrollToSection(id); } }); },
        scrollToSection(id){ const el=document.getElementById(id); if(!el) return; const headerHeight=document.querySelector('.header')?.offsetHeight||0; const pos=el.getBoundingClientRect().top+window.pageYOffset; window.scrollTo({ top: pos-headerHeight-20, behavior:'smooth' }); },
        open(id){ const m=document.getElementById(id); if(m){ m.classList.add('show'); document.body.style.overflow='hidden'; } }, close(id){ const m=document.getElementById(id); if(m){ m.classList.remove('show'); document.body.style.overflow=''; } }
    };
    window.scrollToSection = Modals.scrollToSection.bind(Modals);
    window.openAuthModal = ()=>Modals.open('authModal');
    window.openNkoModal = ()=>Modals.open('nkoModal');
    window.openProfileModal = ()=>Modals.open('profileModal');
    window.closeAuthModal = ()=>Modals.close('authModal');
    window.closeNkoModal = ()=>Modals.close('nkoModal');
    window.closeProfileModal = ()=>Modals.close('profileModal');
    window.Modals = Modals;
})();
