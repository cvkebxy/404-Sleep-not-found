// map.js - Yandex map initialization (uses PapaParse and ymaps)
(function(window){
"use strict";

function initMap(){
    if (typeof ymaps === 'undefined') { console.warn('YMaps not present yet'); return; }
    ymaps.ready(function(){
        try{
            const mapElement = document.getElementById('map');
            if (!mapElement) return;
            const map = new ymaps.Map("map", { center:[55.76,37.64], zoom:4, controls:['zoomControl'] });
            const objectManager = new ymaps.ObjectManager({ clusterize:true, gridSize:64 });
            map.geoObjects.add(objectManager);
            const typePresets = { "Другое":"islands#grayDotIcon" };
            // load CSV if Papa available
            if (typeof Papa !== 'undefined') {
                Papa.parse("data/nko.csv", { download:true, header:true, delimiter:";", complete:function(results){
                    const raw = results.data || [];
                    const points = [];
                    raw.forEach((row,i)=>{
                        const lat = parseFloat(row["Широта"]), lon = parseFloat(row["Долгота"]);
                        const name = (row["Подпись"]||'').trim();
                        if (!lat || !lon || !name) return;
                        points.push({ type:"Feature", id:i+1, geometry:{type:"Point", coordinates:[lat,lon]}, properties:{ balloonContent:`<strong>${name}</strong>` , hintContent:name, name:name }, options:{ preset:typePresets["Другое"] } });
                    });
                    objectManager.add({ type:"FeatureCollection", features: points });
                }});
            }
            console.info('Map initialized');
        }catch(err){ console.error('map init error', err); }
    });
}

window.initMap = initMap;
console.info('map module loaded');
})(window);
