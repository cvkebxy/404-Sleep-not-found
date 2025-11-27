# 404: Sleep not found

# Карта добрых дел — описание проекта

Коротко: проект показывает интерактивную карту НКО на базе Яндекс Карт

Ссылка на презентацию: https://disk.yandex.ru/d/TuCKNaidwgmnzw

Ссылка на сайт: https://it-hackathon-team04.mephi.ru/

---

Содержание
- [Структура проекта](#структура-проекта)
- [Требования и зависимости](#требования-и-зависимости)

---

## Структура проекта

- img/
  - ...

- js/
  - gigascript.js
  - map.js

- php/
  - admin_ajax.php
  - admin_nko_ajax.php
  - auth.php,
  - create_card.php
  - db.php
  - delete_card.php
  - exit.php
  - functions.php
  - get_cards_ajax.php
  - get_cities.php
  - get_nko.php
  - get_nko_details.php
  - get_profile.php
  - get_project_page.php
  - get_stats.php
  - join_project.php
  - register.php
  - save_nko.php
  - save_profile.php
  - search_projects.php

- styles/
  - gigamain.css
  - map.css

- uploads/
  - logos/
    - ...

- index.php
- rosatom_map.sql
- rosatom.cities.sql
- README.md
- REQUIREMENTS.md
- how_to_run.docx
- 404 Sleep Not Found для mvp.pdf

---

## Требования и зависимости
- PHP 7.4+ / 8.x (используем PHP-файлы и встроенный сервер для разработки)
- Веб-сервер (Apache/nginx) + php-fpm для продакшна
- База MySQL/MariaDB (дамп — rosatom_map.sql и rosatom_cities.sql)
- Клиентские внешние библиотеки:
  - Yandex.Maps API v2.1 (подключается в index.php)

---
