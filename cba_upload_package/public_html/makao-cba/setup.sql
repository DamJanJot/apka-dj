CREATE TABLE IF NOT EXISTS makao_cba_matches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  mode ENUM('bot','online','link') NOT NULL,
  winner ENUM('player','bot') NOT NULL,
  turns_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_makao_cba_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;

CREATE TABLE IF NOT EXISTS makao_cba_rooms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_code VARCHAR(32) NOT NULL,
  host_user_id INT NOT NULL,
  guest_user_id INT DEFAULT NULL,
  kind ENUM('invite','link') NOT NULL DEFAULT 'invite',
  status ENUM('waiting','active','finished') NOT NULL DEFAULT 'waiting',
  turn_user_id INT DEFAULT NULL,
  state_json LONGTEXT DEFAULT NULL,
  action_version INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_makao_cba_room_code (room_code),
  KEY idx_makao_cba_room_host (host_user_id, status),
  KEY idx_makao_cba_room_guest (guest_user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;

CREATE TABLE IF NOT EXISTS makao_cba_invites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id BIGINT UNSIGNED NOT NULL,
  from_user_id INT NOT NULL,
  to_user_id INT NOT NULL,
  status ENUM('pending','accepted','rejected','cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_makao_cba_invite_to (to_user_id, status),
  KEY idx_makao_cba_invite_from (from_user_id, status),
  KEY idx_makao_cba_invite_room (room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;
