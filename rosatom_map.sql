-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Хост: 127.0.0.1:3306
-- Время создания: Ноя 16 2025 г., 16:21
-- Версия сервера: 8.0.30
-- Версия PHP: 8.1.9

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- База данных: `rosatom_map`
--

-- --------------------------------------------------------

--
-- Структура таблицы `cards`
--

CREATE TABLE `cards` (
  `id` int NOT NULL,
  `status` varchar(50) DEFAULT '',
  `type` varchar(100) NOT NULL,
  `header` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL,
  `main_text` text NOT NULL,
  `current_participants` int DEFAULT '0',
  `max_participants` int DEFAULT '0',
  `date` varchar(100) NOT NULL,
  `sub_text` varchar(255) NOT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Дамп данных таблицы `cards`
--

INSERT INTO `cards` (`id`, `status`, `type`, `header`, `location`, `main_text`, `current_participants`, `max_participants`, `date`, `sub_text`, `created_by`, `created_at`) VALUES
(1, 'СРОЧНО', 'СОЦ.ПРОЕКТ', 'Помощь пожилым соседям', 'Десногорск, Смоленская область', 'Нужны волонтёры для доставки продуктов и лекарств', 16, 30, '15.12.2025', 'Мы рядом', NULL, '2025-11-15 11:15:43'),
(2, '', 'ЭКОЛОГИЯ', 'Чистый берег', 'Волгодонск, Ростовская область', 'Экологическая акция по очистке берега набережной. Ждём волонтёров!', 16, 30, '15.12.2025', 'Зелёный мир', NULL, '2025-11-15 11:15:43'),
(3, '', 'ЖИВОТНЫЕ', 'Приют для бездомных животных', 'Северск, Томская область', 'Требуется помощь в уходе за животными.', 15, 30, '15.12.2025', 'Четыре лапы', NULL, '2025-11-15 11:15:43'),
(4, 'СРОЧНО', 'СОЦ.ПРОЕКТ', 'Помощь детям', 'Саров, Нижегородская область', 'Организация досуга для детей из многодетных семей', 8, 20, '20.12.2025', 'Детский фонд', NULL, '2025-11-15 11:15:43'),
(5, '', 'ЭКОЛОГИЯ', 'Посадка деревьев', 'Нововоронеж, Воронежская область', 'Массовая посадка деревьев в городском парке', 25, 50, '18.12.2025', 'ЭкоДруг', NULL, '2025-11-15 11:15:43'),
(6, '', 'ЖИВОТНЫЕ', 'Помощь приюту', 'Зеленогорск, Красноярский край', 'Сбор кормов и медикаментов для животных', 30, 45, '22.12.2025', 'Лапа помощи', NULL, '2025-11-15 11:15:43'),
(7, 'СРОЧНО', 'СОЦ.ПРОЕКТ', 'Поддержка ветеранов', 'Озёрск, Челябинская область', 'Помощь по хозяйству и общение с ветеранами', 12, 25, '17.12.2025', 'Поколение', NULL, '2025-11-15 11:15:43'),
(8, '', 'ЭКОЛОГИЯ', 'Чистый лес', 'Снежинск, Челябинская область', 'Уборка мусора в лесопарковой зоне', 18, 35, '19.12.2025', 'Зелёный патруль', NULL, '2025-11-15 11:15:43'),
(16, '', 'СОЦ.ПРОЕКТ', 'ааа', '3232', '3232', 0, 30, '12.05.2025', '123213', 3, '2025-11-16 13:20:44');

-- --------------------------------------------------------

--
-- Структура таблицы `card_participants`
--

CREATE TABLE `card_participants` (
  `id` int NOT NULL,
  `card_id` int NOT NULL,
  `user_id` int NOT NULL,
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Дамп данных таблицы `card_participants`
--

INSERT INTO `card_participants` (`id`, `card_id`, `user_id`, `joined_at`) VALUES
(1, 1, 4, '2025-11-15 11:42:45'),
(2, 2, 4, '2025-11-15 13:29:50');

-- --------------------------------------------------------

--
-- Структура таблицы `nko_organizations`
--

CREATE TABLE `nko_organizations` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `activities` text NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text,
  `website` varchar(255) DEFAULT NULL,
  `social_links` text,
  `logo_path` varchar(255) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `moderation_comment` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Дамп данных таблицы `nko_organizations`
--

INSERT INTO `nko_organizations` (`id`, `user_id`, `name`, `category`, `description`, `activities`, `phone`, `address`, `website`, `social_links`, `logo_path`, `created_by`, `status`, `moderation_comment`, `created_at`, `updated_at`) VALUES
(1, 3, 'ВИТИ НИЯУ МИФИ', 'Социальные проекты', '111', '1111', '+7 (951) 506-39-50', 'Степная 179 Волгодонск', 'https://example.com', '333', '../uploads/logos/nko_3_1763291137.png', NULL, 'pending', NULL, '2025-11-16 11:05:37', '2025-11-16 12:08:08');

-- --------------------------------------------------------

--
-- Структура таблицы `roles`
--

CREATE TABLE `roles` (
  `id` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Дамп данных таблицы `roles`
--

INSERT INTO `roles` (`id`, `name`, `description`, `created_at`) VALUES
(1, 'admin', 'Администратор', '2025-11-15 23:36:46'),
(2, 'nko', 'Некоммерческая организация', '2025-11-15 23:36:46'),
(3, 'user', 'Обычный пользователь', '2025-11-15 23:36:46');

-- --------------------------------------------------------

--
-- Структура таблицы `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `login` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `surname` varchar(255) DEFAULT NULL,
  `auth_key` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Дамп данных таблицы `users`
--

INSERT INTO `users` (`id`, `login`, `password`, `name`, `surname`, `auth_key`, `created_at`) VALUES
(3, 'admin', '$2y$10$gLqrwibV4wwNQOlyhe4JwuZvcO8tt.yCtDuLVHyv0s73I/wW5SKwy', 'Администратор', 'Системы', '8dc68f50f10f0c39a5d467d855e4fc20265782c52fe5c297b2ef7acce221d84d', '2025-11-15 10:41:12'),
(4, 'dokerox360@yandex.ru', '$2y$10$rRQak2wkLAjVl6lr7EN4hOKsuG7NHr61/ZU7BvFj0ACWRGh2M3K.S', 'Иван', 'Ковалев', NULL, '2025-11-15 10:42:41');

-- --------------------------------------------------------

--
-- Структура таблицы `user_roles`
--

CREATE TABLE `user_roles` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `role_id` int NOT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Дамп данных таблицы `user_roles`
--

INSERT INTO `user_roles` (`id`, `user_id`, `role_id`, `assigned_at`) VALUES
(1, 3, 1, '2025-11-15 23:36:47'),
(8, 4, 3, '2025-11-16 00:05:58'),
(9, 3, 2, '2025-11-16 00:06:15'),
(11, 4, 2, '2025-11-16 00:52:34');

--
-- Индексы сохранённых таблиц
--

--
-- Индексы таблицы `cards`
--
ALTER TABLE `cards`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

--
-- Индексы таблицы `card_participants`
--
ALTER TABLE `card_participants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_participation` (`card_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Индексы таблицы `nko_organizations`
--
ALTER TABLE `nko_organizations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_nko` (`user_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Индексы таблицы `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Индексы таблицы `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `login` (`login`);

--
-- Индексы таблицы `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_role` (`user_id`,`role_id`),
  ADD KEY `role_id` (`role_id`);

--
-- AUTO_INCREMENT для сохранённых таблиц
--

--
-- AUTO_INCREMENT для таблицы `cards`
--
ALTER TABLE `cards`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT для таблицы `card_participants`
--
ALTER TABLE `card_participants`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT для таблицы `nko_organizations`
--
ALTER TABLE `nko_organizations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT для таблицы `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT для таблицы `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT для таблицы `user_roles`
--
ALTER TABLE `user_roles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Ограничения внешнего ключа сохраненных таблиц
--

--
-- Ограничения внешнего ключа таблицы `cards`
--
ALTER TABLE `cards`
  ADD CONSTRAINT `cards_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ограничения внешнего ключа таблицы `card_participants`
--
ALTER TABLE `card_participants`
  ADD CONSTRAINT `card_participants_ibfk_1` FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `card_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `nko_organizations`
--
ALTER TABLE `nko_organizations`
  ADD CONSTRAINT `nko_organizations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `nko_organizations_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ограничения внешнего ключа таблицы `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
