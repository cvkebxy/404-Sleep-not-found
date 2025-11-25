// app.js - orchestration entry point
(function(window){
"use strict";
async function initSequence(){
    console.info('app.js starting...');
    // init simple modules first
    if (window.Helpers) console.info('Helpers ready');
    if (window.Toast) Toast.init && Toast.init();
    if (window.Accessibility) Accessibility.init && Accessibility.init();
    if (window.Modals) Modals.init && Modals.init();
    if (window.Filters) Filters.init && Filters.init();
    if (window.Cards) Cards.init && Cards.init();
    if (window.Pagination) Pagination.init && Pagination.init();
    if (window.countersManager) { /* already started */ }
    // map: try init if ymaps loaded later page load
    if (typeof ymaps !== 'undefined') { if (window.initMap) window.initMap(); }
    // final hooks
    console.info('app.js finished init sequence');
}

document.addEventListener('DOMContentLoaded', function(){ initSequence(); });
console.info('app.js loaded');
})(window);
