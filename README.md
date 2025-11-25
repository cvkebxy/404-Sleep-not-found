# 404: Sleep not found

# Карта добрых дел — полное описание модуля карты и проекта

Коротко: проект показывает интерактивную карту НКО на базе Яндекс Карт

Ссылка на презентацию: https://disk.yandex.ru/d/TuCKNaidwgmnzw

Ссылка на сайт: https://it-hackathon-team04.mephi.ru/

---

Содержание
- [Структура проекта](#структура-проекта)
- [Требования и зависимости](#требования-и-зависимости)

---

## Структура проекта

- data/
  - nko.csv
- forms/
  - 0/
    - 0admin_panel.php
    - profile.php
  - 1/
    - admin_panel.php
- img/
- js/
  - gigascript.js
  - map.js
  - animations.js
  - api.js
  - cards-management.js
  - counters.js
  - dropdowns.js
  - forms.js
  - main.js
  - modals.js
  - navigation.js
- php/
  - admin_ajax.php
  - auth.php,
  - create_card.php
  - db.php
  - delete_card.php
  - exit.php
  - functions.php
  - get_cards_ajax.php
  - get_nko.php
  - get_profile.php
  - join_project.php
  - register.php
  - save_nko.php
  - save_profile.php
- styles/…
- uploads/
  - logos/
    - nko_3_1763291137.png
- ver2.0 js
- ver3.0 js
- index.php
- rosatom_map.sql
- README.md
- REQUIREMENTS.md
- rosatom_map.sql
- rosatom.cities.sql
- 404 Sleep Not Found.pdf

---

## Требования и зависимости
- PHP 7.4+ / 8.x (используем PHP-файлы и встроенный сервер для разработки)
- Веб-сервер (Apache/nginx) + php-fpm для продакшна
- База MySQL/MariaDB (дамп — rosatom_map.sql)
- Клиентские внешние библиотеки:
  - Yandex.Maps API v2.1 (подключается в index.php)

---
