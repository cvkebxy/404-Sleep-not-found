// counters.js - улучшенная версия с реальными данными
class CountersManager {
    constructor() {
        this.counters = {
            projects: 0,
            volunteers: 0,
            cities: 0,
            organizations: 0
        };
        this.init();
    }

    async init() {
        await this.loadRealCounters();
        this.setupEventListeners();
    }

    async loadRealCounters() {
        try {
            const response = await fetch('php/get_stats.php');
            const data = await response.json();
            
            if (data.success) {
                this.counters = data.stats;
                this.updateCounters();
            }
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
            // Используем значения по умолчанию
            this.counters = {
                projects: 300,
                volunteers: 5202,
                cities: 32,
                organizations: 130
            };
            this.updateCounters();
        }
    }

    setupEventListeners() {
        // Слушаем создание новых карточек
        document.addEventListener('cardCreated', () => {
            this.incrementCounter('projects');
        });

        // Слушаем участие в проектах
        document.addEventListener('volunteerJoined', () => {
            this.incrementCounter('volunteers');
        });
    }

    incrementCounter(counterName) {
        if (this.counters[counterName] !== undefined) {
            this.counters[counterName]++;
            this.updateCounterDisplay(counterName);
        }
    }

    updateCounterDisplay(counterName) {
        const elements = {
            projects: '.stat-card:nth-child(3) .stat-number',
            volunteers: '.stat-card:nth-child(4) .stat-number',
            cities: '.stat-card:nth-child(1) .stat-number',
            organizations: '.stat-card:nth-child(2) .stat-number'
        };

        const element = document.querySelector(elements[counterName]);
        if (element) {
            this.animateCounter(element, this.counters[counterName]);
        }
    }

    animateCounter(element, newValue) {
        const currentValue = parseInt(element.textContent.replace(/\D/g, '')) || 0;
        const duration = 1000;
        const steps = 20;
        const stepValue = (newValue - currentValue) / steps;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const value = Math.round(currentValue + (stepValue * currentStep));
            element.textContent = value.toLocaleString();

            if (currentStep >= steps) {
                element.textContent = newValue.toLocaleString();
                clearInterval(timer);
            }
        }, duration / steps);
    }

    updateCounters() {
        Object.keys(this.counters).forEach(counter => {
            this.updateCounterDisplay(counter);
        });
    }

    addProject() {
        this.incrementCounter('projects');
        document.dispatchEvent(new CustomEvent('cardCreated'));
    }

    addVolunteer() {
        this.incrementCounter('volunteers');
        document.dispatchEvent(new CustomEvent('volunteerJoined'));
    }
}

// Инициализация менеджера счетчиков
const countersManager = new CountersManager();
window.countersManager = countersManager;