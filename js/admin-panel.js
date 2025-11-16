// admin-panel.js - функции для панели администратора

// Функции для админ панели
function openAdminModal() {
    const modal = document.getElementById('adminModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    applyAccessibilityToModal(modal);
    loadAdminData();
}

function closeAdminModal() {
    const modal = document.getElementById('adminModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// Загрузка данных для админ панели
async function loadAdminData() {
    const tableBody = document.getElementById('adminUsersTable');
    const loading = document.getElementById('adminLoading');
    const totalUsers = document.getElementById('totalUsers');
    
    tableBody.innerHTML = '';
    loading.style.display = 'block';
    
    try {
        const response = await fetch('php/admin_ajax.php?action=get_users');
        const data = await response.json();
        
        if (data.status === 'success') {
            renderUsersTable(data.users);
            totalUsers.textContent = data.users.length;
        } else {
            showAdminMessage('Ошибка загрузки данных: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showAdminMessage('Ошибка соединения с сервером', 'error');
    } finally {
        loading.style.display = 'none';
    }
}

// Рендер таблицы пользователей
function renderUsersTable(users) {
    const tableBody = document.getElementById('adminUsersTable');
    
    if (users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                    Пользователи не найдены
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${escapeHtml(user.login)}</td>
            <td>${escapeHtml(user.name || '')}</td>
            <td>${escapeHtml(user.surname || '')}</td>
            <td>
                ${user.roles ? user.roles.split(',').map(role => `
                    <span class="role-badge role-${role}">${role}</span>
                `).join('') : '<span style="color: rgba(255,255,255,0.5);">нет ролей</span>'}
            </td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="role-controls">
                    <div class="role-section">
                        <span class="role-section-label">Назначить роль:</span>
                        <button class="role-btn add" onclick="adminAssignRole(${user.id}, 'admin')" ${user.roles && user.roles.includes('admin') ? 'disabled' : ''}>
                            + Админ
                        </button>
                        <button class="role-btn add" onclick="adminAssignRole(${user.id}, 'nko')" ${user.roles && user.roles.includes('nko') ? 'disabled' : ''}>
                            + НКО
                        </button>
                        <button class="role-btn add" onclick="adminAssignRole(${user.id}, 'user')" ${user.roles && user.roles.includes('user') ? 'disabled' : ''}>
                            + Пользователь
                        </button>
                    </div>
                    <div class="role-section">
                        <span class="role-section-label">Убрать роль:</span>
                        <button class="role-btn remove" onclick="adminRemoveRole(${user.id}, 'admin')" ${user.roles && user.roles.includes('admin') ? '' : 'disabled'}>
                            - Админ
                        </button>
                        <button class="role-btn remove" onclick="adminRemoveRole(${user.id}, 'nko')" ${user.roles && user.roles.includes('nko') ? '' : 'disabled'}>
                            - НКО
                        </button>
                        <button class="role-btn remove" onclick="adminRemoveRole(${user.id}, 'user')" ${user.roles && user.roles.includes('user') ? '' : 'disabled'}>
                            - Пользователь
                        </button>
                    </div>
                </div>
            </td>
            <td>
                <div class="admin-actions">
                    <button class="delete-btn" onclick="adminDeleteUser(${user.id})" ${user.is_current ? 'disabled' : ''}>
                        Удалить
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Функции управления ролями
async function adminAssignRole(userId, role) {
    if (!confirm(`Назначить роль "${role}" пользователю?`)) return;
    
    try {
        const response = await fetch('php/admin_ajax.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=assign_role&user_id=${userId}&role=${role}`
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showAdminMessage(data.message, 'success');
            loadAdminData(); // Перезагружаем данные
        } else {
            showAdminMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showAdminMessage('Ошибка соединения с сервером', 'error');
    }
}

async function adminRemoveRole(userId, role) {
    if (!confirm(`Убрать роль "${role}" у пользователя?`)) return;
    
    try {
        const response = await fetch('php/admin_ajax.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=remove_role&user_id=${userId}&role=${role}`
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showAdminMessage(data.message, 'success');
            loadAdminData(); // Перезагружаем данные
        } else {
            showAdminMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showAdminMessage('Ошибка соединения с сервером', 'error');
    }
}

async function adminDeleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
    
    try {
        const response = await fetch('php/admin_ajax.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=delete_user&user_id=${userId}`
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showAdminMessage(data.message, 'success');
            loadAdminData(); // Перезагружаем данные
        } else {
            showAdminMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showAdminMessage('Ошибка соединения с сервером', 'error');
    }
}

// Вспомогательные функции
function showAdminMessage(message, type) {
    const messageEl = document.getElementById('adminMessage');
    messageEl.textContent = message;
    messageEl.className = `admin-message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Инициализация админ панели
document.addEventListener('DOMContentLoaded', function() {
    // Добавляем обработчики для кнопок админ панели
    const adminBtn = document.querySelector('.admin-btn');
    if (adminBtn) {
        adminBtn.addEventListener('click', openAdminModal);
    }
    
    // Закрытие по клику вне модального окна
    document.getElementById('adminModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeAdminModal();
        }
    });
    
    // Закрытие по ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const adminModal = document.getElementById('adminModal');
            if (adminModal && adminModal.classList.contains('show')) {
                closeAdminModal();
            }
        }
    });
});
    
    
    
    
    
    
    
    
    
    
// Функция тестирования Google Sheets
function runSheetsTest() {
    if (!confirm('Запустить тест интеграции с Google Sheets?')) {
        return;
    }
    
    showToast('Тестирование', 'Запуск теста Google Sheets...', 'info');
    
    fetch('php/test_sheets.php')
        .then(response => response.text())
        .then(data => {
            console.log('Результат теста:', data);
            
            if (data.includes('УСПЕХ')) {
                showToast('Успех', 'Тест Google Sheets выполнен успешно!', 'success');
            } else {
                showToast('Ошибка', 'Тест Google Sheets завершился с ошибкой', 'error');
            }
            
            // Показываем детали в консоли или алерте
            if (data.includes('ОШИБКА')) {
                alert('Детали ошибки:\n' + data);
            }
        })
        .catch(error => {
            console.error('Ошибка теста:', error);
            showToast('Ошибка', 'Не удалось выполнить тест: ' + error, 'error');
        });
}