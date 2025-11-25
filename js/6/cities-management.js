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
    loadCitiesData() {
        try {
            const response = await fetch('../php/get_cities.php?action=get_all');
            const data = await response.json();

            if (data.success && data.cities) {
                this.currentCities = data.cities;

                // Рендерим в админ-панель если она открыта
                const adminContainer = document.getElementById('citiesTableContainer');
                if (adminContainer) {
                    this.renderCitiesTableForAdmin(data.cities);
                }

                // Рендерим в обычную таблицу если она есть (для страницы админ-панели)
                const normalTable = document.getElementById('citiesTable');
                if (normalTable) {
                    this.renderCitiesTable(data.cities);
                }

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
    renderCitiesTableForAdmin(cities) {
        const container = document.getElementById('citiesTableContainer');
        if (!container) return;

        if (cities.length === 0) {
            container.innerHTML = this.getNoCitiesHTML();
        } else {
            container.innerHTML = `
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Название</th>
                            <th>Регион</th>
                            <th>Координаты</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cities.map(city => this.getCityRowHTML(city)).join('')}
                    </tbody>
                </table>
            `;
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