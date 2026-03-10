-- ============================================================
-- DJ Application - kompletna struktura bazy danych
-- Import przez phpMyAdmin: Database -> Import -> ten plik
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";

-- users
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `imie` varchar(255) DEFAULT NULL,
  `nazwisko` varchar(255) DEFAULT NULL,
  `nick` varchar(255) DEFAULT NULL,
  `rola` varchar(255) DEFAULT NULL,
  `zdjecie_profilowe` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- password_reset_tokens
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- sessions
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- cache
CREATE TABLE IF NOT EXISTS `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- personal_access_tokens (Sanctum)
CREATE TABLE IF NOT EXISTS `personal_access_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- orbitum_chat_messages
CREATE TABLE IF NOT EXISTS `orbitum_chat_messages` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `from_user_id` bigint(20) UNSIGNED NOT NULL,
  `to_user_id` bigint(20) UNSIGNED NOT NULL,
  `body` text NOT NULL,
  `image_path` varchar(500) DEFAULT NULL,
  `is_mention` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `orbitum_chat_from_to_idx` (`from_user_id`,`to_user_id`),
  KEY `orbitum_chat_to_read_idx` (`to_user_id`,`read_at`),
  KEY `orbitum_chat_to_mention_read_idx` (`to_user_id`,`is_mention`,`read_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- orbitum_user_activity_statuses
CREATE TABLE IF NOT EXISTS `orbitum_user_activity_statuses` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `is_online` tinyint(1) NOT NULL DEFAULT 0,
  `last_seen_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orbitum_user_activity_statuses_user_id_unique` (`user_id`),
  KEY `orbitum_user_activity_statuses_is_online_index` (`is_online`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- orbitum_friend_requests
CREATE TABLE IF NOT EXISTS `orbitum_friend_requests` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `from_user_id` bigint(20) UNSIGNED NOT NULL,
  `to_user_id` bigint(20) UNSIGNED NOT NULL,
  `status` enum('pending','accepted','rejected','cancelled') NOT NULL DEFAULT 'pending',
  `responded_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `orbitum_friend_requests_from_to_idx` (`from_user_id`,`to_user_id`),
  KEY `orbitum_friend_requests_to_status_idx` (`to_user_id`,`status`),
  KEY `orbitum_friend_requests_from_status_idx` (`from_user_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- orbitum_friendships
CREATE TABLE IF NOT EXISTS `orbitum_friendships` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_one_id` bigint(20) UNSIGNED NOT NULL,
  `user_two_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orbitum_friendships_pair_unique` (`user_one_id`,`user_two_id`),
  KEY `orbitum_friendships_user_one_id_index` (`user_one_id`),
  KEY `orbitum_friendships_user_two_id_index` (`user_two_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- orbitum_posts
CREATE TABLE IF NOT EXISTS `orbitum_posts` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `author_user_id` bigint(20) UNSIGNED NOT NULL,
  `visibility` enum('public','friends','selected') NOT NULL DEFAULT 'public',
  `body` text DEFAULT NULL,
  `image_path` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `orbitum_posts_author_created_idx` (`author_user_id`,`created_at`),
  KEY `orbitum_posts_visibility_created_idx` (`visibility`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- orbitum_post_audiences
CREATE TABLE IF NOT EXISTS `orbitum_post_audiences` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orbitum_post_audience_unique` (`post_id`,`user_id`),
  KEY `orbitum_post_audiences_user_id_index` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- orbitum_post_comments
CREATE TABLE IF NOT EXISTS `orbitum_post_comments` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `body` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `orbitum_post_comments_post_created_idx` (`post_id`,`created_at`),
  KEY `orbitum_post_comments_user_id_index` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- orbitum_post_reactions
CREATE TABLE IF NOT EXISTS `orbitum_post_reactions` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `emoji` varchar(32) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orbitum_post_reaction_unique` (`post_id`,`user_id`),
  KEY `orbitum_post_reactions_post_emoji_index` (`post_id`,`emoji`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- orbitum_post_mentions
CREATE TABLE IF NOT EXISTS `orbitum_post_mentions` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` bigint(20) UNSIGNED NOT NULL,
  `mentioned_user_id` bigint(20) UNSIGNED NOT NULL,
  `mentioned_by_user_id` bigint(20) UNSIGNED NOT NULL,
  `token` varchar(120) NOT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orbitum_post_mention_unique` (`post_id`,`mentioned_user_id`),
  KEY `orbitum_post_mentions_mentioned_read_idx` (`mentioned_user_id`,`read_at`),
  KEY `orbitum_post_mentions_post_id_index` (`post_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- orbitum_comment_mentions
CREATE TABLE IF NOT EXISTS `orbitum_comment_mentions` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `comment_id` bigint(20) UNSIGNED NOT NULL,
  `mentioned_user_id` bigint(20) UNSIGNED NOT NULL,
  `mentioned_by_user_id` bigint(20) UNSIGNED NOT NULL,
  `token` varchar(120) NOT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orbitum_comment_mention_unique` (`comment_id`,`mentioned_user_id`),
  KEY `orbitum_comment_mentions_mentioned_read_idx` (`mentioned_user_id`,`read_at`),
  KEY `orbitum_comment_mentions_comment_id_index` (`comment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- orbitum_makao_invites
CREATE TABLE IF NOT EXISTS `orbitum_makao_invites` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `from_user_id` bigint(20) UNSIGNED NOT NULL,
  `to_user_id` bigint(20) UNSIGNED NOT NULL,
  `status` enum('pending','accepted','rejected','cancelled') NOT NULL DEFAULT 'pending',
  `responded_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `orbitum_makao_invites_from_status_idx` (`from_user_id`,`status`),
  KEY `orbitum_makao_invites_to_status_idx` (`to_user_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- orbitum_makao_rooms
CREATE TABLE IF NOT EXISTS `orbitum_makao_rooms` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `player_one_id` bigint(20) UNSIGNED NOT NULL,
  `player_two_id` bigint(20) UNSIGNED NOT NULL,
  `status` enum('active','finished') NOT NULL DEFAULT 'active',
  `turn_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `last_action_by_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `state_json` json DEFAULT NULL,
  `action_version` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `orbitum_makao_rooms_p1_status_idx` (`player_one_id`,`status`),
  KEY `orbitum_makao_rooms_p2_status_idx` (`player_two_id`,`status`),
  KEY `orbitum_makao_rooms_status_updated_idx` (`status`,`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- migrations (wymagane przez Laravel)
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `migrations` (`migration`, `batch`) VALUES
('0001_01_01_000000_create_users_table', 1),
('0001_01_01_000001_create_cache_table', 1),
('0001_01_01_000002_create_jobs_table', 1),
('2025_08_31_234411_create_news_table', 1),
('2025_08_31_234411_create_rates_table', 1),
('2025_08_31_234412_create_cryptos_table', 1),
('2025_08_31_234412_create_gold_prices_table', 1),
('2025_09_09_230028_create_personal_access_tokens_table', 1),
('2025_09_15_211123_create_personal_access_tokens_table', 1),
('2026_03_07_100100_create_orbitum_chat_messages_table', 1),
('2026_03_07_100200_create_orbitum_user_activity_statuses_table', 1),
('2026_03_07_120100_add_media_and_mentions_to_orbitum_chat_messages_table', 1),
('2026_03_07_130100_create_orbitum_friend_requests_table', 1),
('2026_03_07_130200_create_orbitum_friendships_table', 1),
('2026_03_07_140100_create_orbitum_posts_table', 1),
('2026_03_07_140200_create_orbitum_post_audiences_table', 1),
('2026_03_07_150100_create_orbitum_post_comments_table', 1),
('2026_03_07_150200_create_orbitum_post_reactions_table', 1),
('2026_03_07_150300_create_orbitum_post_mentions_table', 1),
('2026_03_07_160100_create_orbitum_comment_mentions_table', 1),
('2026_03_08_120100_create_orbitum_makao_invites_table', 1),
('2026_03_08_120200_create_orbitum_makao_rooms_table', 1);

SET FOREIGN_KEY_CHECKS = 1;
