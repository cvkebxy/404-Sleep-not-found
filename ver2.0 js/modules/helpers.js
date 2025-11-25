(function(){
    const Helpers = {
        init() { console.log('Helpers.init'); },
        escapeHtml(unsafe){ return String(unsafe||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;');},
        formatDate(dateString){ const d=new Date(dateString); return isNaN(d)?'': d.toLocaleDateString('ru-RU')+' '+d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}); }
    };
    window.Helpers = Helpers;
})();
