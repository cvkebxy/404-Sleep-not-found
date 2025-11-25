# Требования и зависимости — Карта НКО

Этот файл описывает системные требования, серверные и клиентские зависимости проекта, а также примеры установки и базовые рекомендации по развёртыванию.

---

## Кратко
- Сервер: PHP (>=7.4, рекоменд. 8.0+), веб-сервер (nginx или Apache), MySQL/MariaDB.
- Клиент: Yandex.Maps API (подключается по ключу), PapaParse (CDN).
- Не требуется сборка frontend (проект уже статический JS/CSS).
---

## Системные требования
- Операционная система: Ubuntu 20.04 / 22.04, Debian 11/12 или аналогичный Linux.
- CPU: 1 vCPU (dev), 2+ vCPU (prod).
- RAM: 1–2 GB (dev), 2–4+ GB (prod, при многопользовательской нагрузке).
- Диск: минимум 1 GB свободного пространства (данные, логи, бэкапы отдельно).

---

## Серверные зависимости (PHP)
Рекомендуемая версия PHP: 8.0 или 8.1. Поддержка 7.4 возможна, но лучше 8.x.

Необходимые расширения PHP:
- mysqli (или PDO_MYSQL) — работа с MySQL
- json
- mbstring
- openssl
- fileinfo (для загрузки логотипа)
- zip (опционально)
- gd или imagick (если планируется обработка изображений на сервере)
- curl (для внешних запросов — например, серверный геокодер)
- session, pdo (если используются)

Пример установки PHP и расширений на Ubuntu:
```bash
sudo apt update
sudo apt install -y php8.1 php8.1-fpm php8.1-mysqli php8.1-curl php8.1-mbstring php8.1-xml php8.1-gd php8.1-zip
```

Если используется Apache:
```bash
sudo apt install -y libapache2-mod-php8.1
```

---

## Веб-сервер
- nginx + php-fpm (рекомендуется) или Apache + php-fpm.
- HTTPS (обязательно в продакшн) — используйте certbot/Let's Encrypt.

Пример nginx site-конфигурации (основной блок):
- root → папка с проектом (где index.php)
- try_files и обработка PHP через php-fpm socket или порт.

---

## База данных
- MySQL 8.0 / MariaDB 10.5+
- Импортировать дамп: `rosatom_map.sql`

Пример:
```bash
mysql -u root -p
CREATE DATABASE rosatom_map CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rosatom_map;
SOURCE /path/to/rosatom_map.sql;
```

---

## Клиентские зависимости
- Yandex.Maps JavaScript API v2.1 — подключается в index.php по URL:
  `https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=ВАШ_API_КЛЮЧ`

Эти зависимости подключаются напрямую в HTML/PHP и не требуют npm/сборки.

---

## Опциональные инструменты для разработки / CI
- Git
- Composer (если будете добавлять PHP-зависимости)
- Node.js + npm/yarn (если захотите собрать frontend)
- phpMyAdmin (администрация БД)
- Docker/Docker Compose — можно развернуть стек (php-fpm, nginx, mysql) для разработки.

Пример минимального `docker-compose.yml` (опция — перечень):
- сервисы: app (php-fpm), nginx, db (mysql)

---

## Безопасность
- Не храните API-ключи в публичных репозиториях.
- Ограничьте рефереры/домен для Yandex API в консоли Яндекса.
- В POST-эндпойнтах добавьте CSRF-защиту.
- Валидация и очистка пользовательского ввода (особенно для загрузки файлов и полей NKO).
- Используйте HTTPS, HSTS и настроенный CORS, если нужно.

---

## Быстрые команды — Ubuntu (сводка)
```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить nginx, php-fpm и расширения
sudo apt install -y nginx php8.1-fpm php8.1-mysqli php8.1-curl php8.1-mbstring php8.1-xml php8.1-gd php8.1-zip

# Установить MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Импорт БД
mysql -u root -p rosatom_map < rosatom_map.sql

# Создать config.php локально (не в git)
cp php/config.example.php php/config.php
# отредактировать php/config.php -> вписать YANDEX_API_KEY
```

---

## Частые проблемы и решения
- "Карта не отображается" — проверьте ключ Яндекса, консоль браузера (403), mixed content (http/https).
- "CSV не загружается" — путь к `data/nko.csv`, права, CORS.
- "Файлы не загружаются" — права на папку uploads/logos.
- "Ошибка подключения к БД" — проверьте host/port/user/password, права пользователя, кодировку БД.
```
