(function(){
    console.log('app.js starting...');
    window.Helpers?.init?.();
    window.Toast?.init?.();
    window.Accessibility?.init?.();
    window.Modals?.init?.();
    window.CountersManagerInstance?.init?.();
    window.Pagination?.init?.();
    window.Cards?.init?.();
    window.MapModule?.init?.();
    console.log('app.js finished init sequence');
})();
