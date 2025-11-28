# 📋 Требования и зависимости проекта

<div align="center">

**Полная документация по системным требованиям и установке**

[![PHP](https://img.shields.io/badge/PHP-8.1+-777BB4?logo=php&logoColor=white)](https://www.php.net/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Nginx](https://img.shields.io/badge/nginx-1.18+-009639?logo=nginx&logoColor=white)](https://nginx.org/)

</div>

---

## 📑 Содержание

- [Кратко](#-кратко)
- [Системные требования](#-системные-требования)
- [Серверные зависимости](#-серверные-зависимости)
- [Веб-сервер](#-веб-сервер)
- [База данных](#-база-данных)
- [Клиентские библиотеки](#-клиентские-библиотеки)
- [Настройка окружения](#-настройка-окружения)
- [Безопасность](#-безопасность)
- [Решение проблем](#-решение-проблем)
- [Структура базы данных](#-структура-базы-данных)

---

## 🎯 Кратко

**Серверная часть:**
- PHP 8.0+ (рекомендуется 8.1)
- Веб-сервер: nginx + php-fpm или Apache
- База данных: MySQL 8.0+
- Поддержка email (PHPMailer)

**Клиентская часть:**
- Yandex.Maps JavaScript API v2.1
- PapaParse для обработки CSV
- Vanilla JavaScript (ES6+)
- Адаптивный CSS без препроцессоров

**Особенности:**
- ✅ Не требуется сборка frontend (готовые JS/CSS)
- ✅ Автоматическая миграция БД при первом запуске
- ✅ Полная UTF-8 поддержка
- ✅ REST API для AJAX-взаимодействия

---

## 💻 Системные требования

### Минимальные требования (разработка)

| Компонент | Требование |
|-----------|-----------|
| **ОС** | Ubuntu 20.04+, Debian 11+, CentOS 8+ |
| **CPU** | 1 vCPU |
| **RAM** | 1-2 GB |
| **Диск** | 1 GB свободного места |
| **Сеть** | Интернет для CDN-библиотек |

### Рекомендуемые требования (продакшн)

| Компонент | Требование |
|-----------|-----------|
| **ОС** | Ubuntu 22.04 LTS |
| **CPU** | 2+ vCPU |
| **RAM** | 4+ GB |
| **Диск** | 5+ GB (с местом для логов и бэкапов) |
| **SSL** | Сертификат Let's Encrypt |

---

## 🐘 Серверные зависимости

### PHP и расширения

**Версия PHP:** 8.0+ (рекомендуется 8.1)

#### Обязательные расширения

```bash
# Подключение к MySQL
php8.1-mysqli

# JSON обработка
php8.1-json

# Многобайтовые строки (UTF-8)
php8.1-mbstring

# SSL/TLS для безопасности
php8.1-openssl

# Определение MIME типов файлов
php8.1-fileinfo

# Работа с изображениями
php8.1-gd

# HTTP запросы
php8.1-curl

# XML парсинг
php8.1-xml
```

#### Опциональные расширения

```bash
# Архивация (опционально)
php8.1-zip

# Обработка изображений (альтернатива GD)
php8.1-imagick
```

### Установка на Ubuntu 20.04/22.04

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка PHP и расширений
sudo apt install -y \
    php8.1-fpm \
    php8.1-mysqli \
    php8.1-curl \
    php8.1-mbstring \
    php8.1-xml \
    php8.1-gd \
    php8.1-zip \
    php8.1-fileinfo
```

### Установка на CentOS/RHEL

```bash
# Добавление репозитория Remi
sudo yum install -y epel-release
sudo yum install -y https://rpms.remirepo.net/enterprise/remi-release-8.rpm

# Включение модуля PHP 8.1
sudo dnf module reset php
sudo dnf module enable php:remi-8.1

# Установка PHP
sudo yum install -y \
    php81-php-fpm \
    php81-php-mysqlnd \
    php81-php-json \
    php81-php-mbstring \
    php81-php-gd \
    php81-php-curl
```

### Проверка установленных расширений

```bash
php -m | grep -E 'mysqli|json|mbstring|openssl|gd|curl'
```

---

## 🌐 Веб-сервер

### Nginx (рекомендуется)

#### Установка

```bash
sudo apt install -y nginx
```

#### Конфигурация для проекта

Создайте файл `/etc/nginx/sites-available/rosatom-map`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/404-Sleep-not-found;
    index index.php index.html;

    # Логи
    access_log /var/log/nginx/rosatom-map-access.log;
    error_log /var/log/nginx/rosatom-map-error.log;

    # Ограничение размера загружаемых файлов
    client_max_body_size 10M;

    # Основная директива для обработки запросов
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP-FPM обработка
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        
        # Таймауты для длительных операций
        fastcgi_read_timeout 300;
        fastcgi_send_timeout 300;
    }

    # Защита служебных файлов
    location ~ /\.(?!well-known) {
        deny all;
    }

    # Кеширование статики
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Запрет доступа к чувствительным файлам
    location ~ /php/(config\.php|db\.php|functions\.php)$ {
        deny all;
    }
}
```

#### Активация конфигурации

```bash
# Создание символической ссылки
sudo ln -s /etc/nginx/sites-available/rosatom-map /etc/nginx/sites-enabled/

# Проверка конфигурации
sudo nginx -t

# Перезапуск nginx
sudo systemctl restart nginx
```

### Apache (альтернатива)

#### Установка

```bash
sudo apt install -y apache2 libapache2-mod-php8.1
```

#### Конфигурация .htaccess

Создайте файл `.htaccess` в корне проекта:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # Перенаправление на index.php
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ index.php [QSA,L]
</IfModule>

# Защита конфигурационных файлов
<FilesMatch "^(config|db|functions)\.php$">
    Require all denied
</FilesMatch>

# Настройки PHP
php_value upload_max_filesize 10M
php_value post_max_size 10M
php_value max_execution_time 300
```

#### Включение mod_rewrite

```bash
sudo a2enmod rewrite
sudo systemctl restart apache2
```

---

## 🗄️ База данных

### MySQL 8.0+

#### Установка

```bash
# Ubuntu/Debian
sudo apt install -y mysql-server

# Безопасная настройка
sudo mysql_secure_installation
```

#### Создание базы данных и пользователя

```sql
-- Подключение к MySQL
mysql -u root -p

-- Создание базы данных
CREATE DATABASE rosatom_map 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Создание пользователя
CREATE USER 'rosatom_user'@'localhost' 
IDENTIFIED BY 'secure_password_here';

-- Выдача прав
GRANT ALL PRIVILEGES ON rosatom_map.* 
TO 'rosatom_user'@'localhost';

-- Применение изменений
FLUSH PRIVILEGES;

-- Выход
EXIT;
```

#### Импорт структуры БД

```bash
mysql -u rosatom_user -p rosatom_map < rosatom_map.sql
```

#### Оптимизация производительности

Отредактируйте `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
[mysqld]
# InnoDB настройки
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2

# Кодировка по умолчанию
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# Максимальное количество соединений
max_connections = 200

# Размер пакета
max_allowed_packet = 64M
```

Перезапустите MySQL:

```bash
sudo systemctl restart mysql
```

---

## 📚 Клиентские библиотеки

### Yandex.Maps API

**Версия:** 2.1  
**Подключение:** В `index.php` через CDN

```html
<script src="https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=ВАШ_API_КЛЮЧ"></script>
```

**Получение API-ключа:**
1. Регистрация в [Яндекс.Разработчике](https://developer.tech.yandex.ru/)
2. Создание приложения JavaScript API
3. Получение API-ключа
4. Добавление ключа в `index.php`

**Важно:** Ограничьте использование ключа по доменам в настройках Яндекса.

### PapaParse

**Версия:** 5.4.1  
**Назначение:** Парсинг CSV файлов  
**Подключение:** Через CDN

```html
<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
```

### PHPMailer

**Версия:** Включена в проект  
**Расположение:** `php/phpmailer/`  
**Файлы:**
- `PHPMailer.php` - Основной класс
- `SMTP.php` - SMTP протокол
- `Exception.php` - Обработка исключений

**Настройка SMTP:** См. `php/register.php` и `php/recover_password.php`

Чтобы изменить почту на свою: в файле `php/register.php` 161-167 строки и в файле `php/recover_password.php` 116-122 строки заменить данную часть на свою рабочую почту. Пароль можно создать в сервисе яндекс почты, когда вы авторизованы в свой аккаунт, нажав кнопку настрйки -> безопасность -> пароли приложений - > почта

```
// ЗАМЕНИТЕ НА ВАШИ НАСТРОЙКИ ПОЧТЫ
            $mail->Host       = 'smtp.yandex.com'; // SMTP сервер
            $mail->Username   = 'rohanudzumaki@yandex.ru'; // Логин почты
            $mail->Password   = 'wjzuvxdrgxpoloda'; // Пароль почты
            $mail->SMTPSecure = 'ssl';
            $mail->Port       = 465;
            $mail->setFrom('rohanudzumaki@yandex.ru', 'КАРТА ДОБРЫХ ДЕЛ РОСАТОМА'); // От кого
```

---

## ⚙️ Настройка окружения

### 1. Конфигурация PHP

Создайте `php/config.php` на основе примера:

```php
<?php
// Конфигурация базы данных
define('DB_HOST', 'localhost');
define('DB_USER', 'rosatom_user');
define('DB_PASS', 'secure_password_here');
define('DB_NAME', 'rosatom_map');

// API ключи
define('YANDEX_API_KEY', 'ваш_ключ_яндекс_карт');

// Настройки email (PHPMailer)
define('SMTP_HOST', 'smtp.yandex.com');
define('SMTP_USER', 'your-email@yandex.ru');
define('SMTP_PASS', 'your-app-password');
define('SMTP_PORT', 465);
define('SMTP_SECURE', 'ssl');
define('EMAIL_FROM', 'your-email@yandex.ru');
define('EMAIL_FROM_NAME', 'Карта добрых дел Росатома');

// Настройки приложения
define('SITE_URL', 'https://your-domain.com');
define('DEBUG_MODE', false); // true для разработки
```

### 2. Права доступа к файлам

```bash
# Установка прав на папку проекта
sudo chown -R www-data:www-data /var/www/404-Sleep-not-found

# Права на загрузку логотипов
chmod -R 755 uploads/
chmod -R 755 uploads/logos/

# Защита конфигурационных файлов
chmod 600 php/config.php

# Права на логи (если используются)
chmod -R 755 logs/
```

### 3. Автоматическая настройка БД

Чтобы сайт работал не только локально, в файле `php/db.php` необходимо заменить первые строки на:

```php
$host = 'localhost';
$user = 'root';
$pass = 'strong_root_password_123';
$db_name = 'rosatom_map';
```
При первом запуске `php/db.php` автоматически:
- ✅ Создаст таблицы (users, cards, nko_organizations, roles и др.)
- ✅ Создаст указанного пользователя с указанным паролем
- ✅ Настроит роли и связи
- ✅ Создаст индексы для оптимизации

**Важно:** Смените пароль администратора после первого входа!

---

## 🔒 Безопасность

### Критически важные меры

#### 1. HTTPS в продакшене

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d your-domain.com

# Автоматическое обновление
sudo certbot renew --dry-run
```

#### 2. Защита конфигурационных файлов

```bash
# Исключите из публичного доступа
echo "php/config.php" >> .gitignore

# Защита через nginx
location ~ /php/(config|db|functions)\.php$ {
    deny all;
}
```

#### 3. Валидация пользовательского ввода

- ✅ Используются prepared statements (защита от SQL-инъекций)
- ✅ Валидация email через `filter_var()`
- ✅ Хеширование паролей через `password_hash()`
- ✅ Проверка MIME типов при загрузке файлов

#### 4. CSRF защита

```php
// Генерация токена
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

// Проверка токена
if (!hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
    die('CSRF token mismatch');
}
```

#### 5. Ограничение API ключей

- Ограничьте Yandex API ключ по доменам
- Не храните API ключи в публичных репозиториях
- Используйте переменные окружения для чувствительных данных

#### 6. Защита от перебора паролей

```php
// Ограничение попыток входа
session_start();
$max_attempts = 5;
$lockout_time = 900; // 15 минут
```

---

## 🐛 Решение проблем

### Частые проблемы и их решение

#### ❌ Карта не отображается

**Проблема:** Белый экран вместо карты

**Решения:**
1. Проверьте API ключ в консоли браузера (F12)
2. Убедитесь в наличии HTTPS (если требуется Яндексом)
3. Проверьте ограничения ключа по доменам
4. Проверьте консоль на JavaScript ошибки

```javascript
// Проверка загрузки API
console.log(typeof ymaps); // Должно быть 'object'
```

#### ❌ Ошибки загрузки файлов

**Проблема:** Логотипы НКО не загружаются

**Решения:**

```bash
# Проверка прав
ls -la uploads/logos/

# Установка правильных прав
chmod -R 755 uploads/
chown -R www-data:www-data uploads/

# Проверка лимитов PHP
php -i | grep upload_max_filesize
php -i | grep post_max_size
```

#### ❌ Ошибка подключения к БД

**Проблема:** `Connection failed: Access denied`

**Решения:**

```bash
# 1. Проверка работы MySQL
sudo systemctl status mysql

# 2. Проверка пользователя
mysql -u rosatom_user -p

# 3. Проверка прав
SHOW GRANTS FOR 'rosatom_user'@'localhost';

# 4. Проверка настроек в config.php
cat php/config.php | grep DB_
```

#### ❌ Ошибки полнотекстового поиска

**Проблема:** Поиск не работает корректно

**Решения:**

```sql
-- Проверка индекса
SHOW INDEX FROM cards WHERE Key_name = 'header';

-- Пересоздание индекса
ALTER TABLE cards DROP INDEX header;
ALTER TABLE cards ADD FULLTEXT INDEX header (header, main_text, location, sub_text);

-- Проверка минимальной длины слова
SHOW VARIABLES LIKE 'ft_min_word_len';
```

#### ❌ Проблемы с кодировкой

**Проблема:** Кракозябры вместо русского текста

**Решения:**

```sql
-- Проверка кодировки БД
SHOW VARIABLES LIKE 'character_set%';

-- Исправление кодировки
ALTER DATABASE rosatom_map 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Исправление таблиц
ALTER TABLE cards 
CONVERT TO CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

```php
// В db.php добавьте
$conn->set_charset("utf8mb4");
```

#### ❌ Email не отправляются

**Проблема:** Письма регистрации/восстановления не приходят

**Решения:**

1. **Проверка настроек SMTP:**

```php
// Включите отладку в PHPMailer
$mail->SMTPDebug = 2;
$mail->Debugoutput = 'html';
```

2. **Проверка firewall:**

```bash
# Проверка доступности порта 465/587
telnet smtp.yandex.com 465
```

3. **Для Yandex почты:**
   - Используйте "пароль приложения" вместо обычного
   - Включите доступ для почтовых программ в настройках

4. **Проверка логов:**

```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/php8.1-fpm.log
```

---

## 📊 Структура базы данных

### Основные таблицы

#### users
Пользователи системы
```sql
- id (INT, PK, AUTO_INCREMENT)
- login (VARCHAR, UNIQUE) - Email пользователя
- password (VARCHAR) - Хешированный пароль
- name (VARCHAR) - Имя
- surname (VARCHAR) - Фамилия
- auth_key (VARCHAR) - Ключ для cookie авторизации
- created_at (TIMESTAMP)
```

#### roles
Роли пользователей
```sql
- id (INT, PK)
- name (VARCHAR, UNIQUE) - admin, nko, user
- description (VARCHAR)
```

#### user_roles
Связь пользователей и ролей
```sql
- id (INT, PK)
- user_id (INT, FK -> users)
- role_id (INT, FK -> roles)
```

#### cards
Проекты/карточки
```sql
- id (INT, PK)
- type (VARCHAR) - СОЦ.ПРОЕКТ, ЭКОЛОГИЯ, ЖИВОТНЫЕ
- header (VARCHAR) - Заголовок
- location (VARCHAR) - Местоположение
- main_text (TEXT) - Описание
- current_participants (INT) - Текущее кол-во участников
- max_participants (INT) - Максимум участников
- date (VARCHAR) - Дата проведения
- created_by (INT, FK -> users)
- FULLTEXT INDEX (header, main_text, location)
```

#### card_participants
Участники проектов
```sql
- id (INT, PK)
- card_id (INT, FK -> cards)
- user_id (INT, FK -> users)
- joined_at (TIMESTAMP)
- UNIQUE (card_id, user_id)
```

#### nko_organizations
НКО организации
```sql
- id (INT, PK)
- user_id (INT, FK -> users)
- name (VARCHAR) - Название
- category (VARCHAR) - Категория
- description (TEXT) - Описание деятельности
- activities (TEXT) - Функционал волонтёров
- status (ENUM) - pending, approved, rejected
- logo_path (VARCHAR) - Путь к логотипу
```

#### rosatom_cities
Города и НКО на карте
```sql
- id (INT, PK)
- name (VARCHAR) - Название
- region (VARCHAR) - Регион
- latitude (DECIMAL) - Широта
- longitude (DECIMAL) - Долгота
- object_type (ENUM) - city, nko
- nko_type (VARCHAR) - Тип НКО (если object_type='nko')
- is_active (BOOLEAN) - Активность
```

#### password_resets
Токены восстановления пароля
```sql
- id (INT, PK)
- email (VARCHAR)
- token (VARCHAR, 64) - Уникальный токен
- expires_at (DATETIME) - Срок действия
- INDEX (email, token)
```

---

## 🚀 Оптимизация производительности

### PHP-FPM

Настройте `/etc/php/8.1/fpm/pool.d/www.conf`:

```ini
[www]
pm = dynamic
pm.max_children = 50
pm.start_servers = 5
pm.min_spare_servers = 5
pm.max_spare_servers = 35
pm.max_requests = 500
```

### MySQL Query Cache

```sql
-- Анализ медленных запросов
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;

-- Проверка индексов
SHOW INDEX FROM cards;
SHOW INDEX FROM rosatom_cities;
```

### Nginx Кеширование

```nginx
# Fastcgi cache
fastcgi_cache_path /var/cache/nginx levels=1:2 
keys_zone=microcache:10m max_size=1g inactive=1h;

location ~ \.php$ {
    fastcgi_cache microcache;
    fastcgi_cache_key $scheme$request_method$host$request_uri;
    fastcgi_cache_valid 200 60s;
}
```

---

## 📞 Поддержка

При возникновении проблем:

1. **Проверьте логи:**
   - Nginx: `/var/log/nginx/error.log`
   - PHP-FPM: `/var/log/php8.1-fpm.log`
   - MySQL: `/var/log/mysql/error.log`

2. **Включите режим отладки:**
   ```php
   // В config.php
   define('DEBUG_MODE', true);
   
   // В db.php
   error_reporting(E_ALL);
   ini_set('display_errors', 1);
   ```

3. **Используйте браузерную консоль (F12):**
   - Network tab для проверки AJAX запросов
   - Console tab для JavaScript ошибок

---

## 📚 Дополнительные ресурсы

- [Документация PHP](https://www.php.net/docs.php)
- [Документация MySQL](https://dev.mysql.com/doc/)
- [Yandex.Maps API](https://yandex.ru/dev/maps/jsapi/)
- [Nginx документация](https://nginx.org/ru/docs/)
- [PHPMailer GitHub](https://github.com/PHPMailer/PHPMailer)

---

<div align="center">

**Made with ❤️ by Team 404: Sleep Not Found**

*Для дополнительной информации см. [README.md](./README.md)*

</div>
