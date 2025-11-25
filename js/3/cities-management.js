// js/cities-management.js
class CitiesManagement {
    constructor() {
        this.currentCities = [];
    }

    // Инициализация управления городами
    init() {
        console.log('CitiesManagement initialized');
        // Можно добавить дополнительную логику инициализации
    }

    // Загрузка данных городов
    async loadCitiesData() {
        try {
            const response = await fetch('../php/get_cities.php?action=get_all');
            const data = await response.json();

            if (data.success && data.cities) {
                this.currentCities = data.cities;
                this.renderCitiesTable(data.cities);
                return data.cities;
            } else {
                this.showMessage('Ошибка загрузки городов: ' + data.message, 'error');
                return [];
            }
        } catch (error) {
            console.error('Ошибка загрузки городов:', error);
            this.showMessage('Ошибка соединения с сервером', 'error');
            return [];
        }
    }

    // Рендер таблицы городов
    renderCitiesTable(cities) {
        const tableBody = document.getElementById('citiesTable');
        if (!tableBody) return;

        if (cities.length === 0) {
            tableBody.innerHTML = this.getNoCitiesHTML();
        } else {
            tableBody.innerHTML = cities.map(city => this.getCityRowHTML(city)).join('');
        }
    }

    // HTML для строки города
    getCityRowHTML(city) {
        return `
            <tr>
                <td>${city.id}</td>
                <td>
                    <strong>${this.escapeHtml(city.name)}</strong>
                    ${city.region ? `<br><small style="color: rgba(255,255,255,0.6);">${this.escapeHtml(city.region)}</small>` : ''}
                </td>
                <td>${this.escapeHtml(city.region || '-')}</td>
                <td>
                    <small>${city.latitude?.toFixed(6) || '0'}, ${city.longitude?.toFixed(6) || '0'}</small>
                </td>
                <td>
                    <span class="status-badge ${city.is_active ? 'status-active' : 'status-inactive'}">
                        ${city.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                </td>
                <td class="action-buttons">
                    <button class="btn-small btn-primary" onclick="citiesManagement.centerOnCity(${city.id})" title="Показать на карте">
                        📍
                    </button>
                    <button class="btn-small btn-secondary" onclick="citiesManagement.toggleCityStatus(${city.id}, ${city.is_active ? 0 : 1})" title="${city.is_active ? 'Деактивировать' : 'Активировать'}">
                        ${city.is_active ? '❌' : '✅'}
                    </button>
                    <button class="btn-small btn-danger" onclick="citiesManagement.deleteCity(${city.id})" title="Удалить">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }

    // Центрирование карты на городе
    centerOnCity(cityId) {
        const city = this.currentCities.find(c => c.id === cityId);
        if (city && window.rosatomMap) {
            window.rosatomMap.centerOnObject('city_' + cityId);
            this.showMessage(`Карта центрирована на городе "${city.name}"`, 'info');
        } else {
            this.showMessage('Город не найден или карта не инициализирована', 'error');
        }
    }

    // Переключение статуса города
    async toggleCityStatus(cityId, newStatus) {
        const city = this.currentCities.find(c => c.id === cityId);
        if (!city) return;

        const action = newStatus ? 'активировать' : 'деактивировать';
        if (!confirm(`Вы уверены, что хотите ${action} город "${city.name}"?`)) {
            return;
        }

        try {
            const formData = new FormData();
            formData.append('city_id', cityId);
            formData.append('is_active', newStatus);

            const response = await fetch('../php/get_cities.php?action=toggle_city_status', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                await this.loadCitiesData();
                
                // Обновляем карту
                if (window.rosatomMap) {
                    if (newStatus) {
                        window.rosatomMap.addCityToMap(city);
                    } else {
                        window.rosatomMap.removeObject('city_' + cityId);
                    }
                }
            } else {
                this.showMessage(data.message, 'error');
            }
        } catch (error) {
            console.error('Ошибка изменения статуса города:', error);
            this.showMessage('Не удалось изменить статус города', 'error');
        }
    }

    // Удаление города
    async deleteCity(cityId) {
        const city = this.currentCities.find(c => c.id === cityId);
        if (!city) return;

        if (!confirm(`Вы уверены, что хотите удалить город "${city.name}"? Это действие нельзя отменить.`)) {
            return;
        }

        try {
            const formData = new FormData();
            formData.append('city_id', cityId);

            const response = await fetch('../php/get_cities.php?action=delete_city', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                await this.loadCitiesData();
                
                // Удаляем город с карты
                if (window.rosatomMap) {
                    window.rosatomMap.removeObject('city_' + cityId);
                }
            } else {
                this.showMessage(data.message, 'error');
            }
        } catch (error) {
            console.error('Ошибка удаления города:', error);
            this.showMessage('Не удалось удалить город', 'error');
        }
    }

    // Добавление нового города
    async addNewCity(cityData) {
        try {
            const formData = new FormData();
            formData.append('name', cityData.name);
            formData.append('region', cityData.region);
            formData.append('latitude', cityData.latitude);
            formData.append('longitude', cityData.longitude);

            const response = await fetch('../php/get_cities.php?action=add_city', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                await this.loadCitiesData();
                
                // Добавляем город на карту
                if (window.rosatomMap && data.city) {
                    window.rosatomMap.addCityToMap(data.city);
                }
                
                return data;
            } else {
                this.showMessage(data.message, 'error');
                return null;
            }
        } catch (error) {
            console.error('Ошибка добавления города:', error);
            this.showMessage('Ошибка соединения с сервером', 'error');
            return null;
        }
    }

    // Показать сообщение
    showMessage(message, type) {
        const messageEl = document.getElementById('adminMessage');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `admin-message ${type}`;
            messageEl.style.display = 'block';

            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        }
    }

    // Вспомогательные методы
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    getNoCitiesHTML() {
        return `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                    Города не найдены. Добавьте первый город!
                </td>
            </tr>
        `;
    }
}

// Глобальный экземпляр управления городами
window.citiesManagement = new CitiesManagement();

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    window.citiesManagement.init();
});