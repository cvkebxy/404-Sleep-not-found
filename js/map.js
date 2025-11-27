// map.js
class RosatomMap {
    constructor() {
        this.map = null;
        this.objectManager = null;
        this.nkoPoints = [];
        this.cityPoints = [];
        this.allCities = [];
        this.activeFilters = new Set();
        this.activeCities = new Set();
        
        this.filterOrder = [
            "Город присутствия ГК Росатом",
            "Местное сообщество и развитие территорий",
            "Социальная защита",
            "Экология и устойчивое развитие", 
            "Здоровье и спорт",
            "Культура и образование",
            "Защита животных",
            "Другое"
        ];

        this.typePresets = {
            "Город присутствия ГК Росатом": "islands#blueCircleIcon",
            "Социальная защита": "islands#yellowDotIcon",
            "Экология и устойчивое развитие": "islands#greenDotIcon",
            "Здоровье и спорт": "islands#orangeDotIcon", 
            "Культура и образование": "islands#purpleDotIcon",
            "Местное сообщество и развитие территорий": "islands#darkGreenDotIcon",
            "Защита животных": "islands#pinkDotIcon",
            "Другое": "islands#grayDotIcon"
        };

        this.isInitialized = false;
    }

    // Инициализация карты
    init() {
        if (typeof ymaps === 'undefined') {
            console.error('Яндекс Maps API не загружена');
            return Promise.reject('Yandex Maps API не загружена');
        }

        return new Promise((resolve, reject) => {
            ymaps.ready(() => {
                try {
                    console.log('Yandex Maps API готова');

                    const mapElement = document.getElementById('map');
                    if (!mapElement) {
                        throw new Error('Элемент карты не найден');
                    }

                    console.log('Создание карты...');
                    // Создаем карту полностью без контролов
                    this.map = new ymaps.Map("map", {
                        center: [55.76, 37.64],
                        zoom: 4,
                        controls: [] 
                    });
                    
                    this.initSearchControl();

                    this.map.controls.add('zoomControl', {
                        position: {
                            top: 200,
                            right: 20
                        }
                    });

                    // Инициализируем полноэкранный режим
                    this.initFullscreen();

                    console.log('🟡 Создаем ObjectManager...');
                    this.objectManager = new ymaps.ObjectManager({
                        clusterize: true,
                        gridSize: 64,
                        clusterDisableClickZoom: false,
                        clusterOpenBalloonOnClick: true,
                        clusterBalloonContentLayout: 'cluster#balloonCarousel',
                        clusterBalloonItemContentLayout: this.createClusterItemTemplate(),
                        clusterBalloonPanelMaxMapArea: 0,
                        clusterBalloonContentLayoutWidth: 300,
                        clusterBalloonContentLayoutHeight: 200,
                        clusterBalloonPagerSize: 5
                    });

                    console.log('🟡 Добавляем ObjectManager на карту...');
                    this.map.geoObjects.add(this.objectManager);

                    // Инициализируем сайдбар
                    this.initSidebar();

                    // Загружаем данные
                    this.loadAllData()
                        .then(() => {
                            this.isInitialized = true;
                            console.log('✅ Карта успешно инициализирована');
                            resolve(this);
                        })
                        .catch(error => {
                            console.error('❌ Ошибка загрузки данных карты:', error);
                            reject(error);
                        });

                } catch (error) {
                    console.error('❌ Ошибка при создании карты:', error);
                    reject(error);
                }
            });
        });
    }
    
    openObjectBalloon(objectId) {
        const objectState = this.objectManager.getObjectState(objectId);
        
        if (objectState && objectState.isClustered) {
            // Открываем кластер, если объект в нем
            this.objectManager.clusters.balloon.open(objectState.cluster.id);
        } else {
            // Открываем балун объекта
            this.objectManager.objects.balloon.open(objectId);
        }
    }
    
    // Инициализация поиска по объектам из базы 
    initSearchControl() {
        const CustomSearchProvider = function(map) {
            this.map = map;
        };

        CustomSearchProvider.prototype.geocode = function(request, options) {
            const deferred = ymaps.vow.defer();
            const geoObjects = new ymaps.GeoObjectCollection();
            const offset = options.skip || 0;
            const limit = options.results || 20;
            const q = String(request || "").toLowerCase().trim();

            if (!q) {
                deferred.resolve({
                    geoObjects: geoObjects,
                    metaData: {
                        geocoder: {
                            request: request,
                            found: 0,
                            results: limit,
                            skip: offset
                        }
                    }
                });
                return deferred.promise();
            }

            const allObjects = window.rosatomMap.objectManager.objects.getAll();

            const filtered = allObjects.filter(obj => {
                const props = obj.properties;
                return (
                    (props.name && props.name.toLowerCase().includes(q)) ||
                    (props.type && props.type.toLowerCase().includes(q)) ||
                    (props.description && props.description.toLowerCase().includes(q)) ||
                    (props.shortDescription && props.shortDescription.toLowerCase().includes(q))
                );
            }).slice(offset, offset + limit);

            filtered.forEach(obj => {
                geoObjects.add(new ymaps.Placemark(obj.geometry.coordinates, {
                    name: obj.properties.name,
                    description: obj.properties.type,
                    balloonContentBody: '<strong>' + obj.properties.name + '</strong><br>' + obj.properties.shortDescription,
                    boundedBy: [obj.geometry.coordinates, obj.geometry.coordinates],
                    objectId: obj.id
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

        // Метод suggest для всплывающих подсказок
        CustomSearchProvider.prototype.suggest = function(request, options) {
            const deferred = ymaps.vow.defer();
            const q = String(request || "").toLowerCase().trim();

            if (!q) {
                deferred.resolve([]);
                return deferred.promise();
            }

            const allObjects = window.rosatomMap.objectManager.objects.getAll();
            
            const suggestions = allObjects
                .filter(obj => {
                    const props = obj.properties;
                    return (
                        (props.name && props.name.toLowerCase().includes(q)) ||
                        (props.type && props.type.toLowerCase().includes(q)) ||
                        (props.description && props.description.toLowerCase().includes(q)) ||
                        (props.shortDescription && props.shortDescription.toLowerCase().includes(q))
                    );
                })
                .slice(0, 5) // Показываем максимум 5 подсказок
                .map(obj => ({
                    displayName: obj.properties.name + ' — ' + obj.properties.type,
                    value: obj.properties.name,
                    objectId: obj.id
                }));

            deferred.resolve(suggestions);
            return deferred.promise();
        };

        // Создаем контрол поиска с включенными подсказками
        const searchControl = new ymaps.control.SearchControl({
            options: {
                provider: new CustomSearchProvider(this.map),
                noPlacemark: true,
                resultsPerPage: 5,
                placeholderContent: 'Город или НКО',
                popupItemLayout: ymaps.templateLayoutFactory.createClass(
                    '<div class="search-suggest-item">' +
                        '<strong>{{ properties.displayName|raw }}</strong>' +
                    '</div>'
                )
            }
        });

        this.map.controls.add(searchControl, { 
            position: { top: 14, left: 20 } 
        });

        // Обработчик выбора результата
        searchControl.events.add("resultshow", (e) => {
            const index = e.get("index");
            const results = searchControl.getResultsArray();
            const result = results[index];
            
            if (!result) return;

            const coords = result.geometry.getCoordinates();
            this.map.setCenter(coords, 14, { duration: 400 });

            const allObjects = this.objectManager.objects.getAll();
            const found = allObjects.find(obj => {
                const c = obj.geometry.coordinates;
                return Math.abs(c[0] - coords[0]) < 1e-6 && Math.abs(c[1] - coords[1]) < 1e-6;
            });

            if (found) {
                setTimeout(() => {
                    this.openObjectBalloon(found.id);
                }, 100);
            }
        });
    }
    
    // Инициализация сайдбара
    initSidebar() {
        const toggleBtn = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('custom-filters');

        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                setTimeout(() => {
                    if (this.map) {
                        this.map.container.fitToViewport();
                    }
                }, 300);
            });
        }
    }

    // Загрузка всех данных
    async loadAllData() {
        try {
            console.log('Загрузка всех данных для карты...');

            const response = await fetch('php/get_cities.php?action=get_all_with_nko');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Ответ от сервера:', data);

            if (!data.success || !data.cities) {
                console.error('Ошибка загрузки данных:', data.message);
                return;
            }

            console.log('Получены объекты:', data.cities.length);

            // Обрабатываем данные
            this.processData(data.cities);
            
            // Рендерим фильтры
            this.renderFilters();
            
            // Центрируем карту
            setTimeout(() => {
                this.centerMapOnObjects();
            }, 500);

        } catch (error) {
            console.error('Ошибка загрузки данных карты:', error);
        }
    }

    // Обработка данных из БД
    processData(cities) {
        this.cityPoints = [];
        this.nkoPoints = [];
        this.allCities = [];

        cities.forEach((city, index) => {
            const lat = parseFloat(city.latitude);
            const lon = parseFloat(city.longitude);

            // Строгая проверка координат
            if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                console.error('❌ Некорректные координаты:', city.name);
                return;
            }

            const isCity = city.object_type === 'city';
            const objectId = isCity ? 'city_' + city.id : 'nko_' + city.id;
            
            let objectType;
            if (isCity) {
                objectType = "Город присутствия ГК Росатом";
            } else {
                objectType = city.nko_type || "Другое";
            }

            // Создаем короткое описание
            const shortDescription = this.createShortDescription(city);

            const point = {
                type: "Feature",
                id: objectId,
                geometry: {
                    type: "Point",
                    coordinates: [lat, lon]
                },
                properties: {
                    clusterCaption: city.name,
                    hintContent: city.name,
                    type: objectType,
                    name: city.name,
                    description: city.description || '',
                    shortDescription: shortDescription,
                    city: city.region || '',
                    socialLink: city.social_links || '',
                    activities: city.nko_activities || '',
                    targetAudience: city.target_audience || '',
                    yearlyPlan: city.yearly_plan || '',
                    isCity: isCity,
                    isNko: !isCity,
                    id: objectId
                },
                options: {
                    preset: this.getPresetForType(city),
                    balloonContentLayout: this.createBalloonTemplate(),
                    balloonPanelMaxMapArea: 0,
                    balloonOffset: [0, 0],
                    hideIconOnBalloonOpen: false,
                    balloonCloseButton: false
                }
            };

            if (isCity) {
                this.cityPoints.push(point);
                if (city.region && !this.allCities.includes(city.region)) {
                    this.allCities.push(city.region);
                }
            } else {
                this.nkoPoints.push(point);
                if (city.region && !this.allCities.includes(city.region)) {
                    this.allCities.push(city.region);
                }
            }
        });

        // Сортируем города по алфавиту
        this.allCities.sort();

        // Добавляем точки на карту
        const allPoints = [...this.cityPoints, ...this.nkoPoints];
        this.objectManager.add({
            type: "FeatureCollection",
            features: allPoints
        });

        console.log('🎯 Объекты добавлены в objectManager:', allPoints.length);
        console.log('🏙️ Города:', this.allCities);
    }

    // Создание короткого описания
    createShortDescription(city) {
        const description = city.description || '';
        const activities = city.nko_activities || '';
        
        let fullDescription = description;
        if (activities && activities !== '-') {
            fullDescription += (fullDescription ? '. ' : '') + activities;
        }
        
        return fullDescription.substring(0, 120).trim() + (fullDescription.length > 120 ? '...' : '');
    }

    // Создание шаблона балуна
    createBalloonTemplate() {
        return ymaps.templateLayoutFactory.createClass(
            `
            <div class="custom-balloon">
                <div class="balloon-title-top">$[properties.name]</div>
                
                <div class="horizontal-line"></div>
                
                <div class="balloon-content">
                    <div class="balloon-type">$[properties.type]</div>
                    
                    $[if properties.city]
                        <div class="balloon-city">$[properties.city]</div>
                    $[endif]
                    
                    <div class="balloon-description">$[properties.shortDescription]</div>
                </div>
                
                <div class="balloon-footer">
                    <button class="details-button" data-id="$[properties.id]">Подробнее</button>
                </div>
            </div>
            `,
            {
                build: function () {
                    this.constructor.superclass.build.call(this);

                    // Обработчик кнопки "Подробнее"
                    const detailsButton = this.getParentElement().querySelector('.details-button');
                    const dataId = detailsButton ? detailsButton.getAttribute('data-id') : null;
                    
                    if (detailsButton && dataId) {
                        detailsButton.addEventListener('click', () => {
                            const feature = window.rosatomMap.objectManager.objects.getById(dataId);
                            
                            if (!feature) {
                                console.error(`Объект с ID ${dataId} не найден в ObjectManager.`);
                                return;
                            }
                            
                            window.rosatomMap.openDetailsModal(feature.properties);
                        });
                    }
                }
            }
        );
    }

    // Создание шаблона для элементов кластера
    createClusterItemTemplate() {
        return ymaps.templateLayoutFactory.createClass(
            `<div class="cluster-item">
                <div class="cluster-item-header">
                    <strong>$[properties.name]</strong>
                </div>
                <div class="cluster-item-type">$[properties.type]</div>
                $[if properties.city]
                    <div class="cluster-item-city">$[properties.city]</div>
                $[endif]
                <div class="cluster-item-description">$[properties.shortDescription]</div>
                <button class="cluster-details-btn" data-id="$[properties.id]">Подробнее</button>
            </div>`,
            {
                build: function () {
                    this.constructor.superclass.build.call(this);

                    // Обработчик кнопки "Подробнее" в элементе кластера
                    const detailsBtn = this.getParentElement().querySelector('.cluster-details-btn');
                    const dataId = detailsBtn ? detailsBtn.getAttribute('data-id') : null;

                    if (detailsBtn && dataId) {
                        detailsBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            const feature = window.rosatomMap.objectManager.objects.getById(dataId);

                            if (feature) {
                                // Закрываем балун кластера
                                if (window.rosatomMap.objectManager.clusters.balloon) {
                                    window.rosatomMap.objectManager.clusters.balloon.close();
                                }

                                // Открываем модальное окно
                                window.rosatomMap.openDetailsModal(feature.properties);
                            }
                        });
                    }
                }
            }
        );
    }

    // Открытие модального окна
    openDetailsModal(properties) {
        const modal = document.getElementById('details-modal');
        const orgName = document.getElementById('modal-org-name');
        const title = document.getElementById('modal-title');
        const linkContainer = document.getElementById('modal-social-link');
        const description = document.getElementById('modal-description');
        const closeBtn = document.querySelector('.modal-close');

        // Основная информация
        orgName.textContent = properties.name;
        title.textContent = `${properties.type} (${properties.city || 'Регион не указан'})`;

        // Социальные ссылки
        linkContainer.innerHTML = '';
        if (properties.socialLink && properties.socialLink !== '-' && properties.socialLink !== '') {
            let socialLink = properties.socialLink;
            if (!socialLink.startsWith('http')) {
                socialLink = 'https://' + socialLink;
            }
            linkContainer.innerHTML = `<a href="${socialLink}" target="_blank" class="social-link">Перейти на страницу НКО</a>`;
        }

        // Полное описание
        let fullDescription = '';

        if (properties.description && properties.description !== '-') {
            fullDescription += `<p><strong>Описание:</strong> ${properties.description}</p>`;
        }

        if (properties.activities && properties.activities !== '-') {
            fullDescription += `<p><strong>Деятельность:</strong> ${properties.activities}</p>`;
        }

        if (properties.targetAudience && properties.targetAudience !== '-') {
            fullDescription += `<p><strong>Целевая аудитория:</strong> ${properties.targetAudience}</p>`;
        }

        if (properties.yearlyPlan && properties.yearlyPlan !== '-') {
            fullDescription += `<p><strong>План мероприятий:</strong> ${properties.yearlyPlan}</p>`;
        }

        if (!fullDescription) {
            fullDescription = '<p><em>Подробная информация отсутствует</em></p>';
        }

        description.innerHTML = fullDescription;

        // Закрываем балун Яндекс.Карт перед открытием модального окна
        if (this.objectManager && this.objectManager.objects.balloon) {
            try {
                this.objectManager.objects.balloon.close();
            } catch (e) {
                console.log('Баллун уже закрыт');
            }
        }

        // Показываем модальное окно
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        const closeModal = () => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        };

        // Обработчики событий
        closeBtn.onclick = closeModal;

        modal.onclick = (event) => {
            if (event.target === modal) {
                closeModal();
            }
        };

        // Обработчик Escape
        const escapeHandler = (event) => {
            if (event.key === "Escape") {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };

        document.addEventListener('keydown', escapeHandler);
    }

    // Рендер фильтров
    renderFilters() {
        const filterListContainer = document.getElementById('filter-list');
        const allPoints = [...this.cityPoints, ...this.nkoPoints];
        const existingTypes = [...new Set(allPoints.map(p => p.properties.type))];
        
        // Сортируем типы согласно порядку
        existingTypes.sort((a, b) => {
            const indexA = this.filterOrder.indexOf(a);
            const indexB = this.filterOrder.indexOf(b);
            const finalIndexA = indexA === -1 ? this.filterOrder.length : indexA;
            const finalIndexB = indexB === -1 ? this.filterOrder.length : indexB;
            return finalIndexA - finalIndexB;
        });

        filterListContainer.innerHTML = '';

        existingTypes.forEach(type => {
            const item = document.createElement('div');
            item.className = 'filter-item';
            
            const safeTypeClass = type.toLowerCase().replace(/[\s\(\)]/g, '-');
            item.classList.add(`filter-${safeTypeClass}`);
            
            if (type === "Город присутствия ГК Росатом") {
                item.innerHTML = `
                    <span class="filter-text">${type.toUpperCase()}</span>
                `;

                item.addEventListener('click', () => {
                    const dropdown = item.nextElementSibling;
                    
                    if (dropdown && dropdown.classList.contains('city-filter-dropdown')) {
                        dropdown.classList.toggle('open');

                        if (!dropdown.classList.contains('open') && this.activeCities.size === 0) {
                            item.classList.remove('active');
                        } else {
                            item.classList.add('active');
                        }
                    }
                });
                
                filterListContainer.appendChild(item);
                
                const dropdown = document.createElement('div');
                dropdown.className = 'city-filter-dropdown';
                
                dropdown.innerHTML = `
                    <input type="text" class="city-search" placeholder="Поиск по городам...">
                    <button class="select-all-cities-btn">ВЫБРАТЬ ВСЕ</button>
                    <div class="city-list"></div>
                `;

                filterListContainer.appendChild(dropdown);
                
                this.initCityDropdown(dropdown, item);

            } else {
                item.innerHTML = `
                    <span class="filter-text">${type.toUpperCase()}</span>
                    <div class="filter-checkbox"></div>
                `;

                item.addEventListener('click', () => {
                    if (this.activeFilters.has(type)) {
                        this.activeFilters.delete(type);
                        item.classList.remove('active');
                    } else {
                        this.activeFilters.add(type);
                        item.classList.add('active');
                    }
                    this.applyFilters();
                });
                filterListContainer.appendChild(item);
            }
        });
    }

    // Инициализация выпадающего списка городов
    initCityDropdown(dropdown, filterItemElement) {
        const cityListDiv = dropdown.querySelector('.city-list');
        const searchInput = dropdown.querySelector('.city-search');
        const selectAllBtn = dropdown.querySelector('.select-all-cities-btn');
        
        const renderCityList = (cities, filter = '') => {
            cityListDiv.innerHTML = '';
            const searchQ = filter.toLowerCase();

            const filteredCities = cities.filter(city => 
                !filter || city.toLowerCase().includes(searchQ)
            );
            
            if (this.allCities.length === 0) {
                 cityListDiv.innerHTML = '<p style="padding: 10px; color: #999;">Список городов пуст.</p>';
                 return;
            }

            if (filteredCities.length === 0 && filter) {
                cityListDiv.innerHTML = `<p style="padding: 10px; color: #999;">Города по запросу "${filter}" не найдены.</p>`;
                return;
            }

            filteredCities.forEach(city => {
                const isChecked = this.activeCities.has(city);
                const item = document.createElement('label');
                item.className = 'city-checkbox-item';
                item.innerHTML = `
                    <input type="checkbox" data-city="${city}" ${isChecked ? 'checked' : ''}>
                    ${city}
                `;
                
                item.querySelector('input').addEventListener('change', (e) => {
                    const selectedCity = e.target.getAttribute('data-city');
                    if (e.target.checked) {
                        this.activeCities.add(selectedCity);
                    } else {
                        this.activeCities.delete(selectedCity);
                    }
                    this.applyFilters();
                    this.updateSelectAllButton(this.allCities);
                    
                    const cityFilterElement = document.querySelector('.filter-item.filter-город-присутствия-гк-росатом');
                    if (this.activeCities.size > 0) {
                        cityFilterElement.classList.add('active');
                    } else {
                        cityFilterElement.classList.remove('active');
                    }
                });
                
                cityListDiv.appendChild(item);
            });
        };

        const selectAllCities = () => {
            const allChecked = this.activeCities.size === this.allCities.length && this.allCities.length > 0;
            
            if (allChecked) {
                this.activeCities.clear();
            } else {
                this.allCities.forEach(city => this.activeCities.add(city));
            }
            
            renderCityList(this.allCities, searchInput.value);
            this.applyFilters();
            this.updateSelectAllButton(this.allCities);
        };

        this.updateSelectAllButton = (cities) => {
            if (this.activeCities.size === cities.length && cities.length > 0) {
                 selectAllBtn.textContent = 'СНЯТЬ ВЫБОР СО ВСЕХ';
            } else {
                 selectAllBtn.textContent = 'ВЫБРАТЬ ВСЕ';
            }
        };

        selectAllBtn.addEventListener('click', selectAllCities);

        searchInput.addEventListener('input', (e) => {
            renderCityList(this.allCities, e.target.value);
        });

        renderCityList(this.allCities);
        this.updateSelectAllButton(this.allCities);
    }

    // Применение фильтров
    applyFilters() {
        const hasActiveTypeFilters = this.activeFilters.size > 0;
        const hasActiveCityFilters = this.activeCities.size > 0;

        console.log('Active filters:', {
            types: Array.from(this.activeFilters),
            cities: Array.from(this.activeCities)
        });

        if (!hasActiveTypeFilters && !hasActiveCityFilters) {
            // Если нет активных фильтров - показываем всё
            this.objectManager.setFilter(() => true);
            console.log('Показываем все объекты');
        } else {
            this.objectManager.setFilter(obj => {
                const objType = obj.properties.type;
                const isCityType = objType === "Город присутствия ГК Росатом";
                const objCity = obj.properties.city;

                let shouldShow = false;

                if (isCityType) {
                    // Города Росатома: показываем только если нет фильтров по типам И выбран город
                    if (hasActiveTypeFilters) {
                        // Если есть активные фильтры по типам НКО - скрываем города
                        shouldShow = false;
                    } else {
                        // Показываем город только если он выбран в фильтре городов или нет фильтров по городам
                        shouldShow = !hasActiveCityFilters || this.activeCities.has(objCity);
                    }
                } else {
                    // НКО: показываем только если тип выбран И город соответствует
                    const isTypeMatch = !hasActiveTypeFilters || this.activeFilters.has(objType);
                    const isCityMatch = !hasActiveCityFilters || this.activeCities.has(objCity);
                    shouldShow = isTypeMatch && isCityMatch;
                }

                return shouldShow;
            });
        }
    }

    // Центрирование карты на объектах
    centerMapOnObjects() {
        if (!this.objectManager || !this.map) return;

        try {
            const objects = this.objectManager.objects.getAll();
            console.log('📍 Доступные объекты для центрирования:', objects.length);

            if (objects.length === 0) {
                console.warn('⚠️ Нет объектов для центрирования');
                return;
            }

            const bounds = this.objectManager.getBounds();
            if (bounds) {
                this.map.setBounds(bounds, {
                    checkZoomRange: true,
                    duration: 1000
                });
                console.log('Карта центрирована по границам объектов');
            } else {
                const firstObject = objects[0];
                this.map.setCenter(firstObject.geometry.coordinates, 8, {
                    duration: 1000
                });
                console.log('Карта центрирована на первом объекте');
            }
        } catch (error) {
            console.error('Ошибка центрирования карты:', error);
        }
    }

    // Вспомогательный метод для определения иконки
    getPresetForType(city) {
        if (city.object_type === 'city') {
            return this.typePresets["Город присутствия ГК Росатом"];
        }

        if (city.object_type === 'nko') {
            const nkoType = city.nko_type;
            if (nkoType && this.typePresets[nkoType]) {
                return this.typePresets[nkoType];
            }
        }

        return this.typePresets["Другое"];
    }
    
    // Инициализация полноэкранного режима
    initFullscreen() {
        // Создаем кнопку полноэкранного режима
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.className = 'map-fullscreen-btn';
        fullscreenBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
            <span>Полный экран</span>
        `;

        // Добавляем кнопку в контейнер карты
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.appendChild(fullscreenBtn);
        }

        // Обработчик клика
        fullscreenBtn.addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Обработчик клавиши Escape для выхода из полноэкранного режима
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.querySelector('.map-section.fullscreen')) {
                this.exitFullscreen();
            }
        });

        // Обработчик изменения ориентации устройства
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                if (this.map && document.querySelector('.map-section.fullscreen')) {
                    this.map.container.fitToViewport();
                }
            }, 300);
        });
    }

    // Переключение полноэкранного режима
    toggleFullscreen() {
        const mapSection = document.getElementById('map-section');

        if (mapSection.classList.contains('fullscreen')) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }

    // Вход в полноэкранный режим
    enterFullscreen() {
        const mapSection = document.getElementById('map-section');
        const fullscreenBtn = document.querySelector('.map-fullscreen-btn');

        mapSection.classList.add('fullscreen');

        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                </svg>
                <span>Выйти</span>
            `;
        }

        // Обновляем размеры карты
        setTimeout(() => {
            if (this.map) {
                this.map.container.fitToViewport();
                this.centerMapOnObjects();
            }
        }, 100);

        // Блокируем прокрутку body
        document.body.style.overflow = 'hidden';
    }

    // Выход из полноэкранного режима
    exitFullscreen() {
        const mapSection = document.getElementById('map-section');
        const fullscreenBtn = document.querySelector('.map-fullscreen-btn');

        mapSection.classList.remove('fullscreen');

        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
                <span>Полный экран</span>
            `;
        }

        // Восстанавливаем прокрутку body
        document.body.style.overflow = '';

        // Обновляем размеры карты
        setTimeout(() => {
            if (this.map) {
                this.map.container.fitToViewport();
            }
        }, 100);
    }  
}

// Глобальный экземпляр карты
window.rosatomMap = new RosatomMap();

// Функция инициализации для использования в основном коде
function initMap() {
    return window.rosatomMap.init();
}