// animations.js - анимации и параллакс эффекты

function initAnimations() {
    initScrollAnimations();
    initParallax();
    initCardsAnimation();
}

// Анимация появления элементов при скролле
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Добавляем анимацию появления для карточек
    document.querySelectorAll('.stat-card, .step-card, .project-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// Анимация для карточек при AJAX-загрузке
function initCardsAnimation() {
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

// Функция для плавной смены контента при AJAX-пагинации
function animateContentChange(container, newHTML, callback) {
    // Плавное исчезновение
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    setTimeout(() => {
        // Замена контента
        container.innerHTML = newHTML;
        
        // Плавное появление
        setTimeout(() => {
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
            
            // Реинициализируем анимации
            initScrollAnimations();
            initCardsAnimation();
            
            // Вызываем callback если есть
            if (callback) callback();
        }, 50);
    }, 300);
}

// Параллакс эффекты
function initParallax() {
    // Параллакс для фоновых линий
    document.addEventListener('scroll', () => {
        const backgroundSvg = document.querySelector('.background-svg');
        if (backgroundSvg) {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.3;
            backgroundSvg.style.transform = `translateY(${rate}px)`;
        }
    });

    // Параллакс для декоративных линий
    document.addEventListener('scroll', () => {
        const lines = document.querySelectorAll('.decorative-lines');
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        lines.forEach((line, index) => {
            line.style.transform = `translateY(${rate * (index + 1) * 0.3}px)`;
        });
    });
}

// Функция для анимации смены контента
function animateContentChange(container, newContent) {
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        container.innerHTML = newContent;
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
        
        // Реинициализируем анимации для новых элементов
        initScrollAnimations();
        initCardsAnimation();
    }, 300);
}