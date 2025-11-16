# 404-Sleep-not-found

# Карта добрых дел — полное описание модуля карты и проекта

Коротко: проект показывает интерактивную карту НКО на базе Яндекс Карт. Данные читаются из CSV (data/nko.csv), парсятся на клиенте через PapaParse и рендерятся через ymaps.ObjectManager с кластеризацией, фильтрами и поиском.

---

Содержание
- [Структура проекта](#структура-проекта)
- [Требования и зависимости](#требования-и-зависимости)
- [Конфигурация](#конфигурация)
- [Формат данных (nko.csv)](#формат-данных-nkocsv)
- [Как работает карта (логика в js/main.js)](#как-работает-карта-логика-в-jsmainjs)
- [Фильтрация, поиск и пресеты](#фильтрация-поиск-и-пресеты)
- [Геокодирование адресов без координат](#геокодирование-адресов-без-координат)
- [Производительность и масштабирование](#производительность-и-масштабирование)
- [Развертывание и безопасность](#развертывание-и-безопасность)
- [Отладка и часто встречаемые проблемы](#отладка-и-часто-встречаемые-проблемы)
- [Контроль качества перед PR](#контроль-качества-перед-pr)
- [Вклад и поддержка](#вклад-и-поддержка)

---

## Структура проекта

- admin/
  - admin_panel.php

- data/
  - nko.csv

- img/

- js/
  - accessibility.js
  - admin-panel.js
  - animations.js
  - api.js
  - cards-management.js
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

- index.php

- rosatom_map.sql

---

## Требования и зависимости
- PHP 7.4+ / 8.x (используем PHP-файлы и встроенный сервер для разработки)
- Веб-сервер (Apache/nginx) + php-fpm для продакшна
- База MySQL/MariaDB (дамп — rosatom_map.sql)
- Клиентские внешние библиотеки:
  - Yandex.Maps API v2.1 (подключается в index.php)
  - PapaParse (cdn.jsdelivr) — для парсинга CSV на клиенте
- Кодировка CSV: UTF-8 без BOM
- Разделитель CSV в проекте: `;`

---

## Конфигурация

index.php подключает Yandex API и PapaParse:

```php
<script src="https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=ВАШ_API_КЛЮЧ" type="text/javascript"></script>
<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
<script src="js/main.js"></script>
```

---

## Формат данных (data/nko.csv)

Файл используется PapaParse с опциями:
- download: true
- header: true
- delimiter: ";"

Ожидаемые столбцы (имена колонок должны совпадать):
- "Широта" — latitude (пример: 55.763594)
- "Долгота" — longitude (пример: 60.71192)
- "Описание" — длинный текст, внутри которого код ищет "Деятельность НКО: <тип>"
- "Подпись" — название организации (отображается в hint/balloon)
- (необязательно) "Номер метки" или другие поля: телефон, сайт и т.п.

Пример заголовка:
```csv
"Широта";"Долгота";"Описание";"Подпись"
55.763594;60.71192;"Деятельность НКО: Местное сообщество и развитие территорий. Основная деятельность: ...";"АНО «Пример»"
```

Важные замечания:
- Код ожидает десятичную точку в дробях.
- Файл в UTF-8 без BOM.
- Разделитель `;`.

---

## Как работает карта (логика в js/main.js)

Основные шаги реализации:
1. Инициализация карты:
   - ymaps.ready(init) → создает ymaps.Map("map", { center, zoom, controls })
2. ObjectManager:
   - const objectManager = new ymaps.ObjectManager({ clusterize: true, gridSize: 64 });
   - map.geoObjects.add(objectManager);
3. Парсинг CSV:
   - Papa.parse("data/nko.csv", { download: true, header: true, delimiter: ";" , complete: function(results) { ... } })
4. Для каждой строки:
   - const lat = parseFloat(row["Широта"]);
   - const lon = parseFloat(row["Долгота"]);
   - const name = row["Подпись"]?.trim();
   - const desc = row["Описание"]?.trim();
   - Пропускаются строки без lat/lon или name.
   - Определяется тип: если desc содержит "Город присутствия ГК Росатом" — тип тот же; иначе регэксп /Деятельность НКО:\s*(.*?)(\.|\n|$)/ извлекает тип.
   - Формируется GeoJSON Feature:
```js
{
  type: "Feature",
  id: index + 1,
  geometry: { type: "Point", coordinates: [lat, lon] },
  properties: {
    balloonContent: `<strong>${name}</strong><br>${description}`,
    clusterCaption: name,
    hintContent: name,
    type, name, description
  },
  options: { preset: typePresets[type] || "islands#grayDotIcon" }
}
```
5. Добавляем все точки в objectManager: objectManager.add({ type: "FeatureCollection", features: points });

Замечание о порядке координат: в коде используются [lat, lon], это корректно для Yandex.Maps (ymaps принимает [latitude, longitude]).

---

## Фильтрация, поиск и пресеты

- typePresets — маппинг типов → ymaps preset (иконки). Пример:
```js
const typePresets = {
  "Город присутствия ГК Росатом": "islands#blueCircleIcon",
  "Социальная защита": "islands#blueDotIcon",
  "Экология и устойчивое развитие": "islands#greenDotIcon",
  "Здоровье и спорт": "islands#orangeDotIcon",
  "Культура и образование": "islands#purpleDotIcon",
  "Местное сообщество и развитие территорий": "islands#darkGreenDotIcon",
  "Защита животных": "islands#pinkDotIcon",
  "Другое": "islands#grayDotIcon"
};
```
Рекомендация: вынести `typePresets` в `config/presets.json` или в PHP-конфиг, чтобы не редактировать JS напрямую.

- Фильтры: создаётся ymaps.control.ListBox со списком уникальных типов; состояние filters используется monitor'ом для objectManager.setFilter(obj => filters[obj.properties.type]).

- Поиск: реализован CustomSearchProvider, который делает поиск по `properties.name`, `properties.type` и `properties.description`. Результаты — временные Placemark'и. При выборе результата центрируем карту и открываем balloon соответствующего объекта (по совпадению координат).

Как расширять:
- Поддержка suggest / интеграция с Yandex.Geocoder для адресного поиска.
- Поиск по дополнительным полям (телефон, соцсеть, сайт).
- Подсветка найденного объекта на карте.

---

## Геокодирование адресов без координат

В CSV некоторые записи могут не иметь lat/lon. В проекте используются два подхода:
1. Предобработка (рекомендуется) — серверный скрипт tools/geocode.php (использует Yandex Geocoder API), который читает CSV, выполняет геокодирование с учётом лимитов и сохраняет обновлённый CSV или GeoJSON. Это уменьшит нагрузку на клиентов и предотвратит расход лимита API на клиентских сессиях.
2. Клиентское геокодирование — при загрузке в браузере вызывать ymaps.geocode для каждой строки без координат. Минусы: долгий рендер карты, риск превышения лимитов, плохой UX.

---

## Производительность и масштабирование

- Клиентский парсинг CSV и ObjectManager хорошо работает до ~1000 точек.
- При большом объёме данных (тысячи точек):
  - Предобработайте CSV в GeoJSON и отдавайте уже сгенерированный GeoJSON.
  - Используйте серверную пагинацию/загрузку по регионам (lazy-loading).
  - Рассмотрите создание тайлов или кластерного API (серверная кластеризация).
- Кеширование: сохраняйте результат парсинга/геокодинга в JSON/GeoJSON и отдавайте статически.

---

## Развертывание и безопасность

- Не храните в репозитории реальные API-ключи (Yandex API key).
- Ограничьте ключ в кабинете Яндекса по домену/рефереру.
- Настройте права на папки uploads/ и data/ — только чтение/запись нужным пользователям.
- Для продакшн: nginx + php-fpm, ssl (https), HSTS.
- Рекомендация: отдавать CSV/GeoJSON через серверный endpoint, чтобы контролировать CORS и авторизацию, если данные не публичные.
- Валидация и защита от CSRF для форм (create_card.php, delete_card.php и т.д.) — сейчас в коде используются cookie auth_key; стоит добавить CSRF-токены и проверку прав на стороне сервера (в functions.php уже есть can_delete_card, can_edit_card).

---

## Отладка и часто встречаемые проблемы

- Карта пустая / не отображается:
  - Откройте DevTools → Console: ошибка ключа API (403) или mixed-content (http/https).
  - Убедитесь, что контейнер #map имеет ненулевые width/height при инициализации.
- CSV не загружается:
  - Проверьте путь `data/nko.csv`, права доступа, CORS (если файл с другого домена).
- Точки не отображаются:
  - Проверьте столбцы "Широта" и "Долгота", формат чисел (точка, не запятая).
  - Убедитесь, что PapaParse использует `delimiter: ";"` и header: true.
- Поиск не находит объекты:
  - Проверьте, что `properties.name`, `properties.type`, `properties.description` заполнены.
- Balloon пустой:
  - Проверьте формирование `balloonContent` в properties.
- Проблемы с иконками:
  - Убедитесь, что тип у точки точно совпадает с ключом в `typePresets`.

---

## Контроль качества (чеклист перед PR)
- [ ] Реальный API-ключ заменён на placeholder / добавлен в php/config.php и исключён из git
- [ ] CSV/GeoJSON корректно парсится локально
- [ ] Фильтры и поиск протестированы на тестовом наборе данных
- [ ] UI карты адаптивен (проверить основные разрешения)
- [ ] Нет утечек listeners / таймеров при закрытии/переинициализации карты
- [ ] Для форм: валидация серверная и клиентская, CSRF защита
- [ ] Код читаем и комментарии добавлены в main.js и php-эндпоинтах

---

## Вклад и поддержка

Рабочие задачи, которые полезно завести в таск-трекере:
- Добавить server-side endpoint /data/points.json (GeoJSON) + кеширование
- Реализовать CSRF tokens для POST действий (создание/удаление карточек)
- Рефакторинг main.js: разбить на модули (map, search, filters)
- UI: добавить кнопку "Сброс фильтров" и обозначения легенды карты
```
