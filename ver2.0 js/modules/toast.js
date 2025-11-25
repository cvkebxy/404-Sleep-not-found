(function(){
    const Toast = {
        init(){ if(!document.getElementById('toast')){ const t=document.createElement('div'); t.id='toast'; t.style.position='fixed'; t.style.right='20px'; t.style.bottom='20px'; t.style.zIndex='10000'; document.body.appendChild(t);} },
        show(title,message){ const toast=document.getElementById('toast'); if(!toast) return; toast.innerHTML = '<div class="toast-title">'+title+'</div><div class="toast-description">'+message+'</div>'; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),3000); }
    };
    window.showToast = function(title,msg){ Toast.show(title,msg); };
    window.Toast = Toast;
})();
