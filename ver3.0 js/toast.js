// toast.js - simple toast notifications
(function(window){
"use strict";

const Toast = {
    init() {
        if (!document.getElementById('toast')) {
            const div = document.createElement('div');
            div.id = 'toast';
            div.className = 'site-toast';
            div.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:99999;padding:12px 18px;border-radius:8px;background:rgba(0,0,0,0.7);color:#fff;display:none;max-width:320px;';
            document.body.appendChild(div);
        }
    },
    show(title, message, timeout = 3000) {
        this.init();
        const toast = document.getElementById('toast');
        toast.innerHTML = '<div style="font-weight:600;margin-bottom:6px;">'+title+'</div><div>'+message+'</div>';
        toast.style.display = 'block';
        toast.style.opacity = '1';
        clearTimeout(toast._timeoutId);
        toast._timeoutId = setTimeout(()=>{
            toast.style.opacity = '0';
            setTimeout(()=> toast.style.display = 'none', 250);
        }, timeout);
    }
};

window.Toast = Toast;
window.showToast = function(title, message){ Toast.show(title, message); };
console.info('Toast.init');
})(window);
