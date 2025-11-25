// counters.js - counters manager
(function(window){
"use strict";
class CountersManager {
    constructor(){ this.counters = { projects:0, volunteers:0, cities:0, organizations:0 }; this.init(); }
    async init(){ await this.loadRealCounters(); this.setupEventListeners(); }
    async loadRealCounters(){
        try {
            const resp = await fetch('php/get_stats.php');
            const data = await resp.json();
            if (data.success) { this.counters = data.stats; this.updateCounters(); return; }
        } catch(e){ console.warn('loadRealCounters failed', e); }
        this.counters = { projects: 300, volunteers: 5202, cities: 32, organizations: 130 };
        this.updateCounters();
    }
    setupEventListeners(){ document.addEventListener('cardCreated', ()=>this.addProject()); document.addEventListener('volunteerJoined', ()=>this.addVolunteer()); }
    incrementCounter(name){ if (this.counters[name]!==undefined){ this.counters[name]++; this.updateCounterDisplay(name); } }
    updateCounterDisplay(name){
        const map = { projects:'.stat-card:nth-child(3) .stat-number', volunteers:'.stat-card:nth-child(4) .stat-number', cities:'.stat-card:nth-child(1) .stat-number', organizations:'.stat-card:nth-child(2) .stat-number' };
        const el = document.querySelector(map[name]);
        if (el) this.animateCounter(el, this.counters[name]);
    }
    animateCounter(el,newValue){
        const cur = parseInt(el.textContent.replace(/\D/g,''))||0;
        const steps=20; const step=(newValue-cur)/steps; let i=0;
        const t = setInterval(()=>{ i++; const v=Math.round(cur+step*i); el.textContent = v.toLocaleString(); if (i>=steps){ clearInterval(t); el.textContent = newValue.toLocaleString(); } }, 1000/steps);
    }
    updateCounters(){ Object.keys(this.counters).forEach(k=>this.updateCounterDisplay(k)); }
    addProject(){ this.incrementCounter('projects'); document.dispatchEvent(new CustomEvent('cardCreated')); }
    addVolunteer(){ this.incrementCounter('volunteers'); document.dispatchEvent(new CustomEvent('volunteerJoined')); }
}

window.countersManager = new CountersManager();
console.info('Counters loaded');
})(window);
