// api.js - API запросы и взаимодействие с сервером

// AJAX обработка формы входа
document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    console.log("Отправка формы входа");
    const formData = new FormData(this);
    
    try {
        const response = await fetch('php/auth.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        console.log("Ответ сервера:", data);
        
        showToast(data.status === 'success' ? 'Успех' : 'Ошибка', data.message);
        
        if (data.status === 'success') {
            setTimeout(() => {
                console.log("Перезагрузка страницы...");
                location.reload();
            }, 1500);
        }
    } catch (error) {
        console.error("Ошибка:", error);
        showToast('Ошибка', 'Ошибка соединения с сервером');
    }
});

// AJAX обработка формы регистрации
document.getElementById('registerForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    try {
        const response = await fetch('php/register.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        showToast(data.status === 'success' ? 'Успех' : 'Ошибка', data.message);
        
        // ТОЛЬКО при успешной регистрации переключаем на форму входа
        if (data.status === 'success') {
            setTimeout(() => {
                switchAuthForm('login');
                document.getElementById('loginEmail').value = document.getElementById('registerEmail').value;
                document.getElementById('registerForm').reset();
            }, 1500);
        }
        // При ошибке форма остается открытой
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Ошибка соединения с сервером');
    }
});

// Улучшенная загрузка данных профиля
window.loadProfileData = async function() {
    try {
        console.log("Загрузка данных профиля...");
        
        // Показываем индикатор загрузки в секции проектов
        const projectsList = document.getElementById('projectsList');
        if (projectsList) {
            projectsList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7);">
                    <div class="loading-spinner" style="width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
                    Загрузка проектов...
                </div>
            `;
        }
        
        const response = await fetch('php/get_profile.php');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Данные профиля:", data);
        
        if (data.success) {
            fillProfileForm(data);
        } else {
            showToast('Ошибка', data.message);
        }
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        showToast('Ошибка', 'Не удалось загрузить данные профиля');
        
        // Показываем ошибку в секции проектов
        const projectsList = document.getElementById('projectsList');
        if (projectsList) {
            projectsList.innerHTML = `
                <p style="color: #ff6b6b; text-align: center; padding: 20px;">
                    Ошибка загрузки проектов
                </p>
            `;
        }
    }
}

window.initProfileScroll = function() {
    const scrollable = document.querySelector('.profile-scrollable');
    if (scrollable) {
        // Принудительно обновляем высоту
        scrollable.style.maxHeight = '400px';
        scrollable.style.overflowY = 'auto';
        
        console.log("Скролл инициализирован, высота:", scrollable.scrollHeight, "видимая высота:", scrollable.clientHeight);
    }
}

// В api.js - улучшенная функция fillProfileForm
window.fillProfileForm = function(data) {
    console.log("Заполнение формы профиля данными:", data);
    
    // Основные поля
    if (document.getElementById('profileName')) {
        document.getElementById('profileName').value = data.user.name || '';
    }
    if (document.getElementById('profileSurname')) {
        document.getElementById('profileSurname').value = data.user.surname || '';
    }
    if (document.getElementById('profileEmail')) {
        document.getElementById('profileEmail').value = data.user.login || '';
    }

    // Данные НКО
    if (data.nko) {
        const nkoSection = document.getElementById('nkoProfileSection');
        if (nkoSection) {
            nkoSection.style.display = 'block';
            
            if (document.getElementById('profileNkoName')) {
                document.getElementById('profileNkoName').value = data.nko.name || '';
            }
            if (document.getElementById('profileNkoCategory')) {
                document.getElementById('profileNkoCategory').value = data.nko.category || '';
            }
            if (document.getElementById('profileNkoDescription')) {
                document.getElementById('profileNkoDescription').value = data.nko.description || '';
            }
            if (document.getElementById('profileNkoActivities')) {
                document.getElementById('profileNkoActivities').value = data.nko.activities || '';
            }
            if (document.getElementById('profileNkoPhone')) {
                document.getElementById('profileNkoPhone').value = data.nko.phone || '';
            }
            if (document.getElementById('profileNkoAddress')) {
                document.getElementById('profileNkoAddress').value = data.nko.address || '';
            }
            if (document.getElementById('profileNkoWebsite')) {
                document.getElementById('profileNkoWebsite').value = data.nko.website || '';
            }
            if (document.getElementById('profileNkoSocial')) {
                document.getElementById('profileNkoSocial').value = data.nko.social_links || '';
            }
        }
    }

    // Проекты пользователя - ВАЖНО: всегда загружаем проекты
    loadUserProjects(data.projects || []);
    
    // Показываем статус модерации если есть данные НКО
    if (data.nko) {
        if (data.nko.status === 'pending') {
            showToast('Информация', 'Ваша НКО ожидает модерации');
        } else if (data.nko.status === 'approved') {
            showToast('Успех', 'Ваша НКО прошла модерацию и отображается на карте');
        } else if (data.nko.status === 'rejected') {
            showToast('Внимание', 'Ваша НКО не прошла модерацию. Причина: ' + (data.nko.moderation_comment || 'не указана'));
        }
    }
}

// Улучшенная функция загрузки проектов
window.loadUserProjects = function(projects) {
    const projectsList = document.getElementById('projectsList');
    if (!projectsList) {
        console.error('Элемент projectsList не найден!');
        return;
    }
    
    console.log('Загрузка проектов:', projects);
    
    if (projects.length === 0) {
        projectsList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.05); border-radius: 8px;">
                <p style="margin: 0;">У вас пока нет созданных проектов</p>
            </div>
        `;
        return;
    }
    
    let projectsHTML = `
        <div class="user-projects-list">
            <p style="color: rgba(255,255,255,0.8); margin-bottom: 15px; font-size: 14px;">
                Всего проектов: <strong>${projects.length}</strong>
            </p>
    `;
    
    projects.forEach(project => {
        const statusBadge = project.status === 'СРОЧНО' ? 
            '<span class="badge badge-urgent" style="font-size: 10px; padding: 2px 6px;">СРОЧНО</span>' : '';
        
        const typeBadge = project.type === 'СОЦ.ПРОЕКТ' ? 
            '<span class="badge badge-social" style="font-size: 10px; padding: 2px 6px;">Социальный</span>' : 
            project.type === 'ЭКОЛОГИЯ' ? 
            '<span class="badge badge-ecology" style="font-size: 10px; padding: 2px 6px;">Экология</span>' : 
            '<span class="badge badge-animals" style="font-size: 10px; padding: 2px 6px;">Животные</span>';
        
        projectsHTML += `
            <div class="user-project-item" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px; background: rgba(255,255,255,0.08); border-radius: 6px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                        ${statusBadge}
                        ${typeBadge}
                        <strong style="color: white; font-family: 'Roboto', sans-serif; font-size: 14px;">${escapeHtml(project.header)}</strong>
                    </div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7);">
                        📍 ${escapeHtml(project.location)} | 📅 ${escapeHtml(project.date)}
                    </div>
                </div>
                <button type="button" onclick="viewProject(${project.id})" class="btn-text" style="font-size: 11px; padding: 6px 12px; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; background: rgba(255,255,255,0.1); white-space: nowrap;">
                    Просмотреть
                </button>
            </div>
        `;
    });
    
    projectsHTML += '</div>';
    projectsList.innerHTML = projectsHTML;
}

// Функция для просмотра проекта
window.viewProject = function(projectId) {
    closeProfileModal();
    
    setTimeout(() => {
        const projectElement = document.querySelector(`.project-card[data-card-id="${projectId}"]`);
        if (projectElement) {
            projectElement.scrollIntoView({ behavior: 'smooth' });
            projectElement.style.boxShadow = '0 0 0 3px rgba(74, 144, 226, 0.5)';
            projectElement.style.transform = 'scale(1.02)';
            setTimeout(() => {
                projectElement.style.boxShadow = '';
                projectElement.style.transform = '';
            }, 3000);
        } else {
            if (typeof changeCardPage === 'function') {
                changeCardPage(1);
                setTimeout(() => {
                    const projectElement = document.querySelector(`.project-card[data-card-id="${projectId}"]`);
                    if (projectElement) {
                        projectElement.scrollIntoView({ behavior: 'smooth' });
                        projectElement.style.boxShadow = '0 0 0 3px rgba(74, 144, 226, 0.5)';
                        projectElement.style.transform = 'scale(1.02)';
                        setTimeout(() => {
                            projectElement.style.boxShadow = '';
                            projectElement.style.transform = '';
                        }, 3000);
                    }
                }, 1000);
            }
        }
    }, 500);
}

// Экранирование HTML
window.escapeHtml = function(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Улучшенная загрузка данных НКО
window.loadNkoData = async function() {
    try {
        const response = await fetch('php/get_nko.php');
        const data = await response.json();
        
        if (data.success) {
            if (data.nko) {
                // Заполняем форму данными НКО
                document.getElementById('nkoName').value = data.nko.name || '';
                document.getElementById('nkoCategory').value = data.nko.category || '';
                document.getElementById('nkoDescription').value = data.nko.description || '';
                document.getElementById('nkoActivities').value = data.nko.activities || '';
                document.getElementById('nkoPhone').value = data.nko.phone || '';
                document.getElementById('nkoAddress').value = data.nko.address || '';
                document.getElementById('nkoWebsite').value = data.nko.website || '';
                document.getElementById('nkoSocial').value = data.nko.social_links || '';
                
                // Показываем статус
                const submitBtn = document.querySelector('#nkoForm .auth-submit');
                if (data.nko.status === 'pending') {
                    submitBtn.textContent = 'Обновить данные НКО (ожидает модерации)';
                } else if (data.nko.status === 'approved') {
                    submitBtn.textContent = 'Обновить данные НКО (одобрено)';
                } else if (data.nko.status === 'rejected') {
                    submitBtn.textContent = 'Обновить данные НКО (отклонено)';
                    showToast('Внимание', 'Ваша НКО не прошла модерацию. Причина: ' + (data.nko.moderation_comment || 'не указана'));
                }
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки данных НКО:', error);
    }
}

// обработчик формы профиля
document.getElementById('profileForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    try {
        const submitBtn = this.querySelector('.auth-submit');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Сохранение...';
        submitBtn.disabled = true;
        
        const response = await fetch('php/save_profile.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        showToast(data.success ? 'Успех' : 'Ошибка', data.message);
        
        if (data.success) {
            setTimeout(() => {
                closeProfileModal();
                // Обновляем имя в хедере
                const profileBtn = document.getElementById('profileBtn');
                if (profileBtn) {
                    const name = document.getElementById('profileName').value;
                    const surname = document.getElementById('profileSurname').value;
                    profileBtn.textContent = name + ' ' + surname;
                }
                // Перезагружаем данные профиля
                if (typeof loadProfileData === 'function') {
                    loadProfileData();
                }
            }, 1500);
        }
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'Ошибка соединения с сервером');
        
        const submitBtn = this.querySelector('.auth-submit');
        submitBtn.textContent = 'Сохранить изменения';
        submitBtn.disabled = false;
    }
});

// Резервная функция для загрузки профиля
window.loadProfileDataDirect = async function() {
    try {
        console.log("Прямая загрузка данных профиля...");
        const response = await fetch('php/get_profile.php');
        const data = await response.json();
        
        if (data.success) {
            // Заполняем форму напрямую
            document.getElementById('profileName').value = data.user.name || '';
            document.getElementById('profileSurname').value = data.user.surname || '';
            document.getElementById('profileEmail').value = data.user.login || '';
            
            // Загружаем проекты
            if (data.projects && data.projects.length > 0) {
                loadUserProjects(data.projects);
            }
        }
    } catch (error) {
        console.error('Ошибка прямой загрузки:', error);
    }
}