(function(){
    const Accessibility = {
        init(){ console.log('Accessibility.init'); this.panelId='accessibilityPanel'; this.setupListeners(); },
        setupListeners(){ document.addEventListener('click',(e)=>{ if(e.target.closest('.accessibility-btn')||e.target.id==='accessibilityBtn'||e.target.id==='footerAccessibilityBtn'){ e.preventDefault(); this.toggle(); } const sizeBtn = e.target.closest('.size-controls button'); if(sizeBtn){ const s=sizeBtn.textContent.trim(); if(s==='A-') this.changeFontSize('smaller'); else if(s==='A') this.changeFontSize('normal'); else if(s==='A+') this.changeFontSize('larger'); document.querySelectorAll('.size-controls button').forEach(b=>b.classList.remove('active')); sizeBtn.classList.add('active'); } const schemeBtn = e.target.closest('.color-schemes button'); if(schemeBtn){ const scheme=schemeBtn.getAttribute('data-scheme'); this.changeColorScheme(scheme); } }); document.addEventListener('keydown',(e)=>{ if(e.key==='Escape') this.close(); }); },
        toggle(){ const p=document.getElementById(this.panelId); if(!p) return; p.classList.toggle('show'); document.body.style.overflow = p.classList.contains('show') ? 'hidden' : ''; },
        close(){ const p=document.getElementById(this.panelId); if(p){ p.classList.remove('show'); document.body.style.overflow=''; } },
        changeFontSize(size){ const root=document.documentElement; root.classList.remove('accessibility-large-font','accessibility-larger-font'); if(size==='normal') root.classList.add('accessibility-large-font'); if(size==='larger') root.classList.add('accessibility-larger-font'); console.log('changeFontSize',size); },
        changeColorScheme(scheme){ const root=document.documentElement; root.classList.remove('accessibility-high-contrast','accessibility-dark'); if(scheme==='contrast') root.classList.add('accessibility-high-contrast'); if(scheme==='dark') root.classList.add('accessibility-dark'); }
    };
    window.Accessibility = Accessibility;
})();
