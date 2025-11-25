// js/map.js
class RosatomMap {
    constructor() {
        this.map = null;
        this.objectManager = null;
        this.typePresets = {
            "Город присутствия ГК Росатом": "islands#blueCircleIcon",
            "Социальная защита": "islands#blueDotIcon",
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
            console.error('Yandex Maps API не загружена');
            return Promise.reject('Yandex Maps API не загружена');
        }

        return new Promise((resolve, reject) => {
            ymaps.ready(() => {
                try {
                    const mapElement = document.getElementById('map');
                    if (!mapElement) {
                        throw new Error('Элемент карты не найден');
                    }

                    this.map = new ymaps.Map("map", {
                        center: [55.76, 37.64],
                        zoom: 4,
                        controls: ["zoomControl", "typeSelector", "fullscreenControl"]
                    });

                    this.objectManager = new ymaps.ObjectManager({
                        clusterize: true,
                        gridSize: 64,
                        clusterDisableClickZoom: true,
                        clusterIconColor: '#4a90e2'
                    });

                    this.map.geoObjects.add(this.objectManager);

                    // Загружаем данные
                    this.loadAllData()
                        .then(() => {
                            this.isInitialized = true;
                            console.log('Карта успешно инициализирована');
                            resolve(this);
                        })
                        .catch(error => {
                            console.error('Ошибка загрузки данных карты:', error);
                            reject(error);
                        });

                } catch (error) {
                    console.error('Ошибка при создании карты:', error);
                    reject(error);
                }
            });
        });
    }

    // Загрузка всех данных
    async loadAllData() {
        try {
            // Загружаем города Росатома
            const cities = await this.loadRosatomCities();
            
            // Загружаем НКО из CSV
            const nkoPoints = await this.loadNkoFromCSV();
            
            // Настраиваем фильтрацию
            this.setupMapFilters();
            
            // Настраиваем поиск
            this.setupMapSearch([...cities, ...nkoPoints]);
            
            return { cities, nkoPoints };
        } catch (error) {
            throw error;
        }
    }

    // Загрузка городов Росатома
    async loadRosatomCities() {
        try {
            const response = await fetch('php/get_cities.php?action=get_all');
            const data = await response.json();

            if (data.success && data.cities) {
                const cityPoints = data.cities.map(city => ({
                    type: "Feature",
                    id: 'city_' + city.id,
                    geometry: {
                        type: "Point",
                        coordinates: [city.latitude, city.longitude]
                    },
                    properties: {
                        balloonContent: this.createCityBalloonContent(city),
                        clusterCaption: city.name,
                        hintContent: city.name,
                        type: "Город присутствия ГК Росатома",
                        name: city.name,
                        description: "Город присутствия ГК Росатома",
                        isCity: true
                    },
                    options: {
                        preset: this.typePresets["Город присутствия ГК Росатома"],
                        balloonCloseButton: true
                    }
                }));

                this.objectManager.add({ type: "FeatureCollection", features: cityPoints });
                console.log('Города Росатома загружены:', cityPoints.length);
                return cityPoints;
            } else {
                throw new Error(data.message || 'Ошибка загрузки городов');
            }
        } catch (error) {
            console.error('Ошибка загрузки городов:', error);
            throw error;
        }
    }

    // Загрузка НКО из CSV
    loadNkoFromCSV() {
        return new Promise((resolve, reject) => {
            Papa.parse("data/nko.csv", {
                download: true,
                header: true,
                delimiter: ";",
                complete: (results) => {
                    const rawData = results.data;
                    const nkoPoints = [];

                    rawData.forEach((row, index) => {
                        const lat = parseFloat(row["Широта"]);
                        const lon = parseFloat(row["Долгота"]);
                        const name = row["Подпись"]?.trim();
                        const desc = row["Описание"]?.trim();

                        if (!lat || !lon || !name) return;

                        let type = "Другое";
                        let description = "";

                        if (desc.includes("Город присутствия ГК Росатом")) {
                            type = "Город присутствия ГК Росатома";
                            description = type;
                        } else {
                            const match = desc.match(/Деятельность НКО:\s*(.*?)(\.|\n|$)/);
                            if (match) type = match[1].trim();
                            description = desc.replace(/Деятельность НКО:\s*.*?(\.|\n)?/, "").trim();
                        }

                        nkoPoints.push({
                            type: "Feature",
                            id: 'nko_' + index,
                            geometry: {
                                type: "Point",
                                coordinates: [lat, lon]
                            },
                            properties: {
                                balloonContent: this.createNkoBalloonContent(name, description, type),
                                clusterCaption: name,
                                hintContent: name,
                                type: type,
                                name: name,
                                description: description,
                                isNko: true
                            },
                            options: {
                                preset: this.typePresets[type] || "islands#grayDotIcon",
                                balloonCloseButton: true
                            }
                        });
                    });

                    this.objectManager.add({ type: "FeatureCollection", features: nkoPoints });
                    console.log('Данные НКО загружены:', nkoPoints.length);
                    resolve(nkoPoints);
                },
                error: (error) => {
                    console.error('Ошибка загрузки CSV:', error);
                    reject(error);
                }
            });
        });
    }

    // Настройка фильтров карты
    setupMapFilters() {
        const types = [
            "Город присутствия ГК Росатома",
            "Социальная защита", 
            "Экология и устойчивое развитие",
            "Здоровье и спорт",
            "Культура и образование",
            "Местное сообщество и развитие территорий",
            "Защита животных",
            "Другое"
        ];

        const listBoxItems = types.map(type => new ymaps.control.ListBoxItem({
            data: { content: type },
            state: { selected: true }
        }));

        const listBoxControl = new ymaps.control.ListBox({
            data: { 
                content: 'Фильтр объектов',
                title: 'Фильтр по типу'
            },
            items: listBoxItems,
            state: {
                expanded: false,
                filters: listBoxItems.reduce((acc, item) => {
                    acc[item.data.get("content")] = item.isSelected();
                    return acc;
                }, {})
            }
        });

        this.map.controls.add(listBoxControl);

        listBoxControl.events.add(["select", "deselect"], (e) => {
            const item = e.get("target");
            const filters = ymaps.util.extend({}, listBoxControl.state.get("filters"));
            filters[item.data.get("content")] = item.isSelected();
            listBoxControl.state.set("filters", filters);
        });

        const monitor = new ymaps.Monitor(listBoxControl.state);
        monitor.add("filters", (filters) => {
            this.objectManager.setFilter(obj => filters[obj.properties.type]);
        });
    }

    // Настройка поиска по карте
    setupMapSearch(points) {
        const searchControl = new ymaps.control.SearchControl({
            options: {
                provider: new this.CustomSearchProvider(points),
                noPlacemark: true,
                resultsPerPage: 10,
                placeholderContent: 'Поиск городов и НКО...'
            }
        });

        this.map.controls.add(searchControl, { float: "right" });

        searchControl.events.add('resultselect', (e) => {
            const index = e.get('index');
            const results = searchControl.getResultsArray();
            const result = results[index];
            
            if (result) {
                const coords = result.geometry.getCoordinates();
                this.map.setCenter(coords, 12, {
                    duration: 300
                });
                
                // Открываем балун найденного объекта
                const foundId = result.properties.get('objectId');
                if (foundId) {
                    setTimeout(() => {
                        this.objectManager.objects.balloon.open(foundId);
                    }, 500);
                }
            }
        });
    }

    // Кастомный поисковый провайдер
    CustomSearchProvider = class {
        constructor(points) {
            this.points = points || [];
        }

        geocode(request, options) {
            const deferred = new ymaps.vow.defer();
            const geoObjects = new ymaps.GeoObjectCollection();
            const offset = options.skip || 0;
            const limit = options.results || 20;

            const query = String(request || "").toLowerCase().trim();

            if (!query) {
                deferred.resolve({
                    geoObjects: geoObjects,
                    metaData: {
                        geocoder: {
                            request: request,
                            found: 0,
                            results: 0,
                            skip: 0
                        }
                    }
                });
                return deferred.promise();
            }

            const filtered = this.points.filter(point => {
                return (
                    (point.properties.name && point.properties.name.toLowerCase().includes(query)) ||
                    (point.properties.type && point.properties.type.toLowerCase().includes(query)) ||
                    (point.properties.description && point.properties.description.toLowerCase().includes(query))
                );
            }).slice(offset, offset + limit);

            filtered.forEach(point => {
                const placemark = new ymaps.Placemark(point.geometry.coordinates, {
                    name: point.properties.name,
                    description: point.properties.type,
                    balloonContentBody: point.properties.balloonContent,
                    boundedBy: [point.geometry.coordinates, point.geometry.coordinates]
                });
                
                placemark.properties.set('objectId', point.id);
                geoObjects.add(placemark);
            });

            deferred.resolve({
                geoObjects: geoObjects,
                metaData: {
                    geocoder: {
                        request: request,
                        found: filtered.length,
                        results: limit,
                        skip: offset
                    }
                }
            });

            return deferred.promise();
        }
    }

    // Создание контента балуна для города
    createCityBalloonContent(city) {
        return `
            <div class="map-balloon">
                <h3>${city.name}</h3>
                ${city.region ? `<p><strong>Регион:</strong> ${city.region}</p>` : ''}
                <p><em>Город присутствия ГК Росатома</em></p>
                <div class="balloon-actions">
                    <button onclick="rosatomMap.viewCityProjects('${city.name}')" class="btn-balloon">
                        Посмотреть проекты
                    </button>
                </div>
            </div>
        `;
    }

    // Создание контента балуна для НКО
    createNkoBalloonContent(name, description, type) {
        return `
            <div class="map-balloon">
                <h3>${name}</h3>
                <p>${description}</p>
                <p><strong>Тип:</strong> ${type}</p>
                <div class="balloon-actions">
                    <button onclick="rosatomMap.viewNkoDetails('${name}')" class="btn-balloon">
                        Подробнее
                    </button>
                </div>
            </div>
        `;
    }

    // Просмотр проектов в городе
    viewCityProjects(cityName) {
        console.log('Просмотр проектов в городе:', cityName);
        
        const searchInput = document.querySelector('.search-input-large');
        if (searchInput) {
            searchInput.value = cityName;
            if (typeof filterProjects === 'function') {
                filterProjects('location', cityName, cityName);
            }
        }
        
        this.scrollToProjectsSection();
        showToast('Фильтр', `Показаны проекты в городе ${cityName}`);
    }

    // Просмотр деталей НКО
    viewNkoDetails(nkoName) {
        console.log('Просмотр деталей НКО:', nkoName);
        showToast('НКО', `Информация о ${nkoName}`);
        // Можно открыть модальное окно с детальной информацией
    }

    // Прокрутка к секции проектов
    scrollToProjectsSection() {
        const projectsSection = document.getElementById('projects');
        if (projectsSection) {
            const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
            const offset = projectsSection.offsetTop - headerHeight - 20;
            
            window.scrollTo({
                top: offset,
                behavior: 'smooth'
            });
        }
    }

    // Обновление данных карты
    refresh() {
        if (this.objectManager) {
            this.objectManager.removeAll();
        }
        return this.loadAllData();
    }

    // Добавление нового города на карту
    addCityToMap(cityData) {
        if (!cityData || !cityData.latitude || !cityData.longitude) {
            console.error('Неверные данные города:', cityData);
            return null;
        }

        const cityPoint = {
            type: "Feature",
            id: 'city_' + (cityData.id || Date.now()),
            geometry: {
                type: "Point",
                coordinates: [cityData.latitude, cityData.longitude]
            },
            properties: {
                balloonContent: this.createCityBalloonContent(cityData),
                clusterCaption: cityData.name,
                hintContent: cityData.name,
                type: "Город присутствия ГК Росатома",
                name: cityData.name,
                description: "Город присутствия ГК Росатома",
                isCity: true
            },
            options: {
                preset: this.typePresets["Город присутствия ГК Росатома"],
                balloonCloseButton: true
            }
        };

        this.objectManager.add(cityPoint);
        console.log('Город добавлен на карту:', cityData.name);
        return cityPoint;
    }

    // Удаление объекта с карты
    removeObject(objectId) {
        try {
            // Проверяем, существует ли объект перед удалением
            const object = this.objectManager.objects.getById(objectId);
            if (object) {
                this.objectManager.remove(objectId);
                console.log('Объект удален с карты:', objectId);
            } else {
                console.log('Объект не найден на карте для удаления:', objectId);
            }
        } catch (error) {
            console.error('Ошибка при удалении объекта с карты:', error);
        }
    }

    // Центрирование карты на объекте
    centerOnObject(objectId) {
        const object = this.objectManager.objects.getById(objectId);
        if (object) {
            this.map.setCenter(object.geometry.coordinates, 12, {
                duration: 300
            });
            this.objectManager.objects.balloon.open(objectId);
        } else {
            console.warn('Объект не найден на карте:', objectId);
        }
    }
}

// Глобальный экземпляр карты
window.rosatomMap = new RosatomMap();

// Функция инициализации для использования в основном коде
function initMap() {
    return window.rosatomMap.init();
}