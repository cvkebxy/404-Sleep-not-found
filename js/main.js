// main.js - базовые функции и инициализация

// main.js - ВОССТАНАВЛИВАЕМ оригинальную функцию карты

function initMap() {
    if (typeof ymaps === 'undefined') {
        console.error('Yandex Maps API не загружена');
        return;
    }

    ymaps.ready(function() {
        console.log('Yandex Maps API загружена');
        
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Элемент карты не найден');
            return;
        }

        try {
            const map = new ymaps.Map("map", {
                center: [55.76, 37.64],
                zoom: 4,
                controls: ["zoomControl"]
            });

            const objectManager = new ymaps.ObjectManager({
                clusterize: true,
                gridSize: 64
            });

            map.geoObjects.add(objectManager);

            const typePresets = {
                "Город присутствия ГК Росатом": "islands#blueCircleIcon",
                "Социальная защита": "islands#blueDotIcon",
                "Экология и устойчивое развитие": "islands#greenDotIcon",
                "Здоровье и спорт": "islands#orangeDotIcon",
                "Культура и образование": "islands#purpleDotIcon",
                "Местное сообщество и развитие территорий": "islands#darkGreenDotIcon",
                "Защита животных": "islands#pinkDotIcon",
                "Другое": "islands#grayDotIcon"
            };

            // Загружаем данные из CSV
            Papa.parse("data/nko.csv", {
                download: true,
                header: true,
                delimiter: ";",
                complete: function(results) {
                    const rawData = results.data;
                    const points = [];

                    rawData.forEach((row, index) => {
                        const lat = parseFloat(row["Широта"]);
                        const lon = parseFloat(row["Долгота"]);
                        const name = row["Подпись"]?.trim();
                        const desc = row["Описание"]?.trim();

                        if (!lat || !lon || !name) return;

                        let type = "Другое";
                        let description = "";

                        if (desc.includes("Город присутствия ГК Росатом")) {
                            type = "Город присутствия ГК Росатом";
                            description = type;
                        } else {
                            const match = desc.match(/Деятельность НКО:\s*(.*?)(\.|\n|$)/);
                            if (match) type = match[1].trim();
                            description = desc.replace(/Деятельность НКО:\s*.*?(\.|\n)?/, "").trim();
                        }

                        points.push({
                            type: "Feature",
                            id: index + 1,
                            geometry: {
                                type: "Point",
                                coordinates: [lat, lon]
                            },
                            properties: {
                                balloonContent: `<strong>${name}</strong><br>${description}`,
                                clusterCaption: name,
                                hintContent: name,
                                type: type,
                                name: name,
                                description: description
                            },
                            options: {
                                preset: typePresets[type] || "islands#grayDotIcon"
                            }
                        });
                    });

                    objectManager.add({ type: "FeatureCollection", features: points });

                    // Добавляем фильтрацию
                    const types = [...new Set(points.map(p => p.properties.type))];
                    const listBoxItems = types.map(type => new ymaps.control.ListBoxItem({
                        data: { content: type },
                        state: { selected: false }
                    }));

                    const listBoxControl = new ymaps.control.ListBox({
                        data: { content: "Фильтр", title: "Фильтр по типу" },
                        items: listBoxItems,
                        state: {
                            expanded: false,
                            filters: listBoxItems.reduce((acc, item) => {
                                acc[item.data.get("content")] = item.isSelected();
                                return acc;
                            }, {})
                        }
                    });

                    map.controls.add(listBoxControl);

                    listBoxControl.events.add(["select", "deselect"], function (e) {
                        const item = e.get("target");
                        const filters = ymaps.util.extend({}, listBoxControl.state.get("filters"));
                        filters[item.data.get("content")] = item.isSelected();
                        listBoxControl.state.set("filters", filters);
                    });

                    const monitor = new ymaps.Monitor(listBoxControl.state);
                    monitor.add("filters", function (filters) {
                        objectManager.setFilter(obj => filters[obj.properties.type]);
                    });

                    // Добавляем поиск
                    const searchControl = new ymaps.control.SearchControl({
                        options: {
                            provider: new CustomSearchProvider(points),
                            noPlacemark: true,
                            resultsPerPage: 5
                        }
                    });

                    map.controls.add(searchControl, { float: "right" });

                    searchControl.events.add("resultshow", function (e) {
                        const index = e.get("index");
                        const results = searchControl.getResultsArray();
                        const result = results[index];
                        if (!result) return;

                        const coords = result.geometry.getCoordinates();
                        map.setCenter(coords, 10, { duration: 300 });

                        const found = points.find(p => {
                            const c = p.geometry.coordinates;
                            return Math.abs(c[0] - coords[0]) < 1e-6 && Math.abs(c[1] - coords[1]) < 1e-6;
                        });

                        if (found) objectManager.objects.balloon.open(found.id);
                    });
                }
            });

            // Кастомный поисковый провайдер
            function CustomSearchProvider(points) {
                this.points = points;
            }

            CustomSearchProvider.prototype.geocode = function(request, options) {
                const deferred = new ymaps.vow.defer();
                const geoObjects = new ymaps.GeoObjectCollection();
                const offset = options.skip || 0;
                const limit  = options.results || 20;

                const q = String(request || "").toLowerCase().trim();

                const filtered = this.points.filter(p => {
                    return (
                        (p.properties.name && p.properties.name.toLowerCase().includes(q)) ||
                        (p.properties.type && p.properties.type.toLowerCase().includes(q)) ||
                        (p.properties.description && p.properties.description.toLowerCase().includes(q))
                    );
                }).slice(offset, offset + limit);

                filtered.forEach(p => {
                    geoObjects.add(new ymaps.Placemark(p.geometry.coordinates, {
                        name: p.properties.name,
                        description: p.properties.type,
                        balloonContentBody: `<strong>${p.properties.name}</strong><br>${p.properties.description}`,
                        boundedBy: [p.geometry.coordinates, p.geometry.coordinates]
                    }));
                });

                deferred.resolve({
                    geoObjects: geoObjects,
                    metaData: {
                        geocoder: {
                            request: request,
                            found: geoObjects.getLength(),
                            results: limit,
                            skip: offset
                        }
                    }
                });

                return deferred.promise();
            };

            console.log('Карта успешно инициализирована с данными из CSV');

        } catch (error) {
            console.error('Ошибка при создании карты:', error);
        }
    });
}



// Запускаем инициализацию карты при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log("Инициализация приложения...");
    
    // Проверяем загружена ли API карт
    if (typeof ymaps !== 'undefined') {
        initMap();
    } else {
        console.log('Ожидаем загрузку Yandex Maps API...');
        // Если API еще не загружена, ждем
        window.addEventListener('load', initMap);
    }
    
    // Инициализация счетчиков
    if (typeof countersManager !== 'undefined') {
        countersManager.init();
    }
    
    // Защита от множественных вызовов deleteCard
    let deleteTimeout = null;
    
    const originalDeleteCard = window.deleteCard;
    
    window.deleteCard = function(cardId, cardElement) {
        // Защита от быстрых повторных кликов
        if (deleteTimeout) {
            console.log('Защита: игнорируем быстрый повторный клик');
            return;
        }
        
        // Блокируем вызовы на 2 секунды
        deleteTimeout = setTimeout(() => {
            deleteTimeout = null;
        }, 2000);
        
        // Вызываем оригинальную функцию
        originalDeleteCard(cardId, cardElement);
    };
    
    // Остальная инициализация...
    initFormValidation();
    initAnimations();
    initEventListeners();
    initModalHandlers();
});

// Базовые слушатели событий
function initEventListeners() {
    console.log("Инициализация слушателей событий...");
    
    // Обработчики для кнопок открытия модальных окон
    document.getElementById('accessibilityBtn')?.addEventListener('click', toggleAccessibilityMode);
    document.getElementById('footerAccessibilityBtn')?.addEventListener('click', toggleAccessibilityMode);
    document.getElementById('loginBtn')?.addEventListener('click', openAuthModal);
    document.getElementById('profileBtn')?.addEventListener('click', openProfileModal);
    document.getElementById('nkoBtn')?.addEventListener('click', openNkoModal);
    
    // Кнопка создания проекта
    const createProjectBtn = document.querySelector('.btn-primary[onclick*="openCreateCardModal"]');
    if (createProjectBtn) {
        createProjectBtn.addEventListener('click', openCreateCardModal);
    }
    
    // Кнопка админ-панели
    const adminBtn = document.querySelector('.admin-btn');
    if (adminBtn) {
        adminBtn.addEventListener('click', openAdminModal);
    }
    
    // Обработчики для кнопок закрытия
    document.getElementById('closeAuthModal')?.addEventListener('click', closeAuthModal);
    document.getElementById('closeNkoModal')?.addEventListener('click', closeNkoModal);
    document.getElementById('closeProfileModal')?.addEventListener('click', closeProfileModal);
    document.getElementById('closeAccessibilityPanel')?.addEventListener('click', closeAccessibilityPanel);

    // Глобальные обработчики для пагинации (делегирование событий)
    document.addEventListener('click', function(e) {
        // Обработка кнопок пагинации с номерами
        if (e.target.classList.contains('pagination-btn') && !e.target.classList.contains('active')) {
            e.preventDefault();
            e.stopPropagation();
            const page = parseInt(e.target.textContent);
            if (!isNaN(page) && typeof changeCardPage === 'function') {
                changeCardPage(page);
            }
            return;
        }
        
        // Обработка кнопки "Назад"
        if (e.target.classList.contains('prev-btn') || e.target.closest('.prev-btn')) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof changeCardPage === 'function' && typeof currentPage !== 'undefined' && currentPage > 1) {
                changeCardPage(currentPage - 1);
            }
            return;
        }
        
        // Обработка кнопки "Вперед"
        if (e.target.classList.contains('next-btn') || e.target.closest('.next-btn')) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof changeCardPage === 'function' && typeof currentPage !== 'undefined' && typeof totalPages !== 'undefined' && currentPage < totalPages) {
                changeCardPage(currentPage + 1);
            }
            return;
        }
        
        // Обработка кнопок помощи в проектах
        if (e.target.classList.contains('btn-help') && !e.target.disabled) {
            const cardId = e.target.getAttribute('data-card-id');
            if (cardId && typeof joinProject === 'function') {
                joinProject(cardId, e.target);
            }
            return;
        }
        
        // Обработка кнопок удаления проектов
        //if (e.target.classList.contains('delete-card-btn') || e.target.closest('.delete-card-btn')) {
            //e.preventDefault();
            //e.stopPropagation();
            //const cardElement = e.target.closest('.project-card');
            //if (cardElement && typeof deleteCard === 'function') {
                //const cardId = cardElement.getAttribute('data-card-id');
                //deleteCard(cardId, cardElement);
            //}
            //return;
    });

    // Закрытие выпадающих меню при клике вне их
    document.addEventListener('click', function(event) {
        const dropdowns = document.querySelectorAll('.category-dropdown');
        let clickedInside = false;
        
        dropdowns.forEach(dropdown => {
            if (dropdown.contains(event.target)) {
                clickedInside = true;
            }
        });
        
        if (!clickedInside) {
            document.querySelectorAll('.category-dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });
            if (typeof hideAllSubcategories === 'function') {
                hideAllSubcategories();
            }
        }
    });

    // Smooth scroll для anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Закрытие модальных окон по ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Закрываем активное модальное окно
            const activeModals = document.querySelectorAll('.auth-modal.show');
            if (activeModals.length > 0) {
                const activeModal = activeModals[0];
                if (activeModal.id === 'authModal' && typeof closeAuthModal === 'function') closeAuthModal();
                else if (activeModal.id === 'nkoModal' && typeof closeNkoModal === 'function') closeNkoModal();
                else if (activeModal.id === 'profileModal' && typeof closeProfileModal === 'function') closeProfileModal();
                else if (activeModal.id === 'createCardModal' && typeof closeCreateCardModal === 'function') closeCreateCardModal();
                else if (activeModal.id === 'adminModal' && typeof closeAdminModal === 'function') closeAdminModal();
            }
            
            // Закрываем панель доступности
            const accessibilityPanel = document.getElementById('accessibilityPanel');
            if (accessibilityPanel && accessibilityPanel.classList.contains('show') && typeof closeAccessibilityPanel === 'function') {
                closeAccessibilityPanel();
            }
        }
    });

    // Обработчики для accessibility кнопок
    document.querySelectorAll('.scheme-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const scheme = this.getAttribute('data-scheme');
            if (scheme && typeof changeColorScheme === 'function') {
                changeColorScheme(scheme);
            }
        });
    });
    
    // Обработчики для кнопок фильтров карты
    document.querySelectorAll('.filter-badge').forEach(btn => {
        btn.addEventListener('click', function() {
            if (typeof toggleFilter === 'function') {
                const filterType = this.classList.contains('active-social') ? 'social' : 'ecology';
                toggleFilter(this, filterType);
            }
        });
    });

    // Обработчики для кнопок управления размером шрифта
    document.querySelectorAll('.size-controls button').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.textContent;
            if (action === 'A-' && typeof changeFontSize === 'function') changeFontSize('smaller');
            else if (action === 'A' && typeof changeFontSize === 'function') changeFontSize('normal');
            else if (action === 'A+' && typeof changeFontSize === 'function') changeFontSize('larger');
        });
    });

    // Обработчики для кнопок межстрочного интервала
    document.querySelectorAll('.spacing-controls button').forEach(btn => {
        btn.addEventListener('click', function() {
            const spacing = this.textContent.toLowerCase();
            if (spacing === 'обычный' && typeof changeLineHeight === 'function') changeLineHeight('normal');
            else if (spacing === 'увеличенный' && typeof changeLineHeight === 'function') changeLineHeight('large');
        });
    });

    // Обработчики для кнопок шрифта
    document.querySelectorAll('.font-controls button').forEach(btn => {
        btn.addEventListener('click', function() {
            const font = this.textContent.toLowerCase();
            if (font === 'стандартный' && typeof changeFontFamily === 'function') changeFontFamily('standard');
            else if (font === 'для дислексии' && typeof changeFontFamily === 'function') changeFontFamily('dyslexic');
        });
    });

    // Кнопка сброса настроек доступности
    const resetBtn = document.querySelector('.reset-btn');
    if (resetBtn && typeof resetAccessibilitySettings === 'function') {
        resetBtn.addEventListener('click', resetAccessibilitySettings);
    }

    console.log("Все обработчики событий инициализированы");
}

// Toast уведомления
function showToast(title, message) {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.error("Toast элемент не найден!");
        return;
    }
    toast.innerHTML = '<div class="toast-title">' + title + '</div><div class="toast-description">' + message + '</div>';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Вспомогательные функции
function getDefaultText(dropdownId) {
    switch(dropdownId) {
        case 'categories': return 'Все категории';
        case 'help-type': return 'Тип помощи';
        case 'participation': return 'Формат участия';
        case 'regularity': return 'Регулярность';
        default: return 'Выбрать';
    }
}

// Функция для скрытия всех подкатегорий
function hideAllSubcategories() {
    document.querySelectorAll('.subcategory-menu').forEach(menu => {
        menu.classList.remove('show');
    });
}

// Инициализация обработчиков модальных окон
function initModalHandlers() {
    console.log("Инициализация обработчиков модальных окон...");
    
    // Проверяем существование элементов
    console.log("accessibilityBtn:", document.getElementById('accessibilityBtn'));
    console.log("footerAccessibilityBtn:", document.getElementById('footerAccessibilityBtn'));
    console.log("loginBtn:", document.getElementById('loginBtn'));
    console.log("profileBtn:", document.getElementById('profileBtn'));
    console.log("nkoBtn:", document.getElementById('nkoBtn'));
    
    // Обработчики для кнопок открытия модальных окон
    document.getElementById('accessibilityBtn')?.addEventListener('click', toggleAccessibilityMode);
    document.getElementById('footerAccessibilityBtn')?.addEventListener('click', toggleAccessibilityMode);
    document.getElementById('loginBtn')?.addEventListener('click', openAuthModal);
    document.getElementById('profileBtn')?.addEventListener('click', openProfileModal);
    document.getElementById('nkoBtn')?.addEventListener('click', openNkoModal);
    
    // Обработчики для кнопок закрытия
    document.getElementById('closeAuthModal')?.addEventListener('click', closeAuthModal);
    document.getElementById('closeNkoModal')?.addEventListener('click', closeNkoModal);
    document.getElementById('closeProfileModal')?.addEventListener('click', closeProfileModal);
    document.getElementById('closeAccessibilityPanel')?.addEventListener('click', closeAccessibilityPanel);
    
    // Обработчики для accessibility кнопок
    document.querySelectorAll('.scheme-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Проверяем что функция существует
            if (typeof changeColorScheme === 'function') {
                changeColorScheme(this.getAttribute('data-scheme'));
            }
        });
    });
    
    // Обработчики для кнопок фильтров карты
    document.querySelectorAll('.filter-badge').forEach(btn => {
        btn.addEventListener('click', function() {
            // Проверяем что функция существует
            if (typeof toggleFilter === 'function') {
                toggleFilter(this, this.classList.contains('active-social') ? 'social' : 'ecology');
            }
        });
    });
    
    console.log("Обработчики модальных окон инициализированы");
}

// Функция для панели доступности
function toggleAccessibilityMode() {
    const panel = document.getElementById('accessibilityPanel');
    if (panel) {
        const isShowing = panel.classList.contains('show');
        if (!isShowing) {
            panel.classList.add('show');
            document.body.style.overflow = 'hidden';
        } else {
            panel.classList.remove('show');
            document.body.style.overflow = '';
        }
    }
}

// Функция закрытия панели доступности
function closeAccessibilityPanel() {
    const panel = document.getElementById('accessibilityPanel');
    if (panel) {
        panel.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Экспортируем функции для глобального использования
window.showToast = showToast;
window.hideAllSubcategories = hideAllSubcategories;
window.getDefaultText = getDefaultText;
window.toggleAccessibilityMode = toggleAccessibilityMode;
window.closeAccessibilityPanel = closeAccessibilityPanel;