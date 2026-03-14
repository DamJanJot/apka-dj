<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db_bootstrap.php';

$db = makao_get_pdo();
$pdo = $db['pdo'];

if (!$pdo) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Brak polaczenia z DB']);
    exit;
}

$action = $_GET['action'] ?? '';

function makao_column_exists(PDO $pdo, string $table, string $column): bool
{
    try {
        $stmt = $pdo->prepare("SHOW COLUMNS FROM {$table} LIKE :col");
        $stmt->execute([':col' => $column]);
        return (bool)$stmt->fetch();
    } catch (Throwable $e) {
        return false;
    }
}

function makao_ensure_schema(PDO $pdo): void
{
    // Minimum schema required for link rooms.
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS makao_cba_rooms ('
        . 'id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,'
        . 'room_code VARCHAR(32) NOT NULL,'
        . 'host_user_id INT NOT NULL,'
        . 'guest_user_id INT DEFAULT NULL,'
        . 'kind VARCHAR(16) NOT NULL DEFAULT "invite",'
        . 'status VARCHAR(16) NOT NULL DEFAULT "waiting",'
        . 'turn_user_id INT DEFAULT NULL,'
        . 'state_json LONGTEXT DEFAULT NULL,'
        . 'action_version INT UNSIGNED NOT NULL DEFAULT 0,'
        . 'created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,'
        . 'updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,'
        . 'PRIMARY KEY (id),'
        . 'UNIQUE KEY uniq_makao_cba_room_code (room_code),'
        . 'KEY idx_makao_cba_room_host (host_user_id),'
        . 'KEY idx_makao_cba_room_guest (guest_user_id)'
        . ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS makao_cba_invites ('
        . 'id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,'
        . 'room_id BIGINT UNSIGNED NOT NULL,'
        . 'from_user_id INT NOT NULL,'
        . 'to_user_id INT NOT NULL,'
        . 'status VARCHAR(16) NOT NULL DEFAULT "pending",'
        . 'created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,'
        . 'responded_at TIMESTAMP NULL DEFAULT NULL,'
        . 'PRIMARY KEY (id),'
        . 'KEY idx_makao_cba_invite_to (to_user_id, status),'
        . 'KEY idx_makao_cba_invite_from (from_user_id, status),'
        . 'KEY idx_makao_cba_invite_room (room_id)'
        . ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci'
    );

    $roomColumns = [
        'room_code' => 'VARCHAR(32) NOT NULL',
        'host_user_id' => 'INT NOT NULL DEFAULT 0',
        'guest_user_id' => 'INT DEFAULT NULL',
        'kind' => 'VARCHAR(16) NOT NULL DEFAULT "invite"',
        'status' => 'VARCHAR(16) NOT NULL DEFAULT "waiting"',
        'turn_user_id' => 'INT DEFAULT NULL',
        'state_json' => 'LONGTEXT DEFAULT NULL',
        'action_version' => 'INT UNSIGNED NOT NULL DEFAULT 0',
        'created_at' => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'updated_at' => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    ];

    foreach ($roomColumns as $col => $definition) {
        if (!makao_column_exists($pdo, 'makao_cba_rooms', $col)) {
            $pdo->exec("ALTER TABLE makao_cba_rooms ADD COLUMN {$col} {$definition}");
        }
    }

    $inviteColumns = [
        'room_id' => 'BIGINT UNSIGNED NOT NULL DEFAULT 0',
        'from_user_id' => 'INT NOT NULL DEFAULT 0',
        'to_user_id' => 'INT NOT NULL DEFAULT 0',
        'status' => 'VARCHAR(16) NOT NULL DEFAULT "pending"',
        'created_at' => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'responded_at' => 'TIMESTAMP NULL DEFAULT NULL',
    ];

    foreach ($inviteColumns as $col => $definition) {
        if (!makao_column_exists($pdo, 'makao_cba_invites', $col)) {
            $pdo->exec("ALTER TABLE makao_cba_invites ADD COLUMN {$col} {$definition}");
        }
    }
}

try {
    makao_ensure_schema($pdo);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Brak przygotowanego schematu makao-cba.']);
    exit;
}

function makao_json_input(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function makao_user_exists(PDO $pdo, int $userId): bool
{
    if ($userId <= 0) {
        return false;
    }
    $stmt = $pdo->prepare('SELECT id FROM uzytkownicy WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $userId]);
    return (bool)$stmt->fetch();
}

function makao_room_by_code(PDO $pdo, string $roomCode): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM makao_cba_rooms WHERE room_code = :code LIMIT 1');
    $stmt->execute([':code' => $roomCode]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function makao_generate_room_code(): string
{
    return strtoupper(bin2hex(random_bytes(4)));
}

function makao_room_payload(PDO $pdo, array $room): array
{
    $users = [];
    $ids = [];
    if (!empty($room['host_user_id'])) $ids[] = (int)$room['host_user_id'];
    if (!empty($room['guest_user_id'])) $ids[] = (int)$room['guest_user_id'];

    if ($ids) {
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare("SELECT id, imie, nazwisko, email FROM uzytkownicy WHERE id IN ($placeholders)");
        $stmt->execute($ids);
        foreach ($stmt->fetchAll() as $u) {
            $users[(int)$u['id']] = $u;
        }
    }

    return [
        'id' => (int)$room['id'],
        'room_code' => (string)$room['room_code'],
        'host_user_id' => (int)$room['host_user_id'],
        'guest_user_id' => $room['guest_user_id'] !== null ? (int)$room['guest_user_id'] : null,
        'kind' => (string)$room['kind'],
        'status' => (string)$room['status'],
        'turn_user_id' => $room['turn_user_id'] !== null ? (int)$room['turn_user_id'] : null,
        'action_version' => (int)$room['action_version'],
        'state_json' => $room['state_json'] ? json_decode((string)$room['state_json'], true) : null,
        'host_user' => $users[(int)$room['host_user_id']] ?? null,
        'guest_user' => ($room['guest_user_id'] !== null && isset($users[(int)$room['guest_user_id']])) ? $users[(int)$room['guest_user_id']] : null,
    ];
}

if ($action === 'save_match' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = makao_json_input();

    $userId = isset($data['user_id']) ? (int)$data['user_id'] : 0;
    $mode = (string)($data['mode'] ?? 'bot');
    $winner = (string)($data['winner'] ?? 'player');
    $turns = isset($data['turns_count']) ? (int)$data['turns_count'] : 0;

    if (!in_array($mode, ['bot', 'online', 'link'], true)) {
        $mode = 'bot';
    }
    if (!in_array($winner, ['player', 'bot'], true)) {
        $winner = 'player';
    }

    try {
        if ($userId > 0) {
            $check = $pdo->prepare('SELECT id FROM uzytkownicy WHERE id = :id LIMIT 1');
            $check->execute([':id' => $userId]);
            if (!$check->fetch()) {
                echo json_encode(['ok' => false, 'error' => 'Nie ma takiego user_id']);
                exit;
            }
        }

        $stmt = $pdo->prepare('INSERT INTO makao_cba_matches (user_id, mode, winner, turns_count) VALUES (:uid, :mode, :winner, :turns)');
        $stmt->execute([
            ':uid' => max(0, $userId),
            ':mode' => $mode,
            ':winner' => $winner,
            ':turns' => max(0, $turns),
        ]);

        echo json_encode(['ok' => true]);
        exit;
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Nie udalo sie zapisac meczu']);
        exit;
    }
}

if ($action === 'lobby') {
    $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
    if (!makao_user_exists($pdo, $userId)) {
        echo json_encode(['ok' => false, 'error' => 'Wybierz poprawnego uzytkownika.']);
        exit;
    }

    $incomingStmt = $pdo->prepare(
        'SELECT i.id, i.room_id, i.from_user_id, i.to_user_id, i.status, i.created_at, u.imie, u.nazwisko, u.email '
        . 'FROM makao_cba_invites i '
        . 'LEFT JOIN uzytkownicy u ON u.id = i.from_user_id '
        . 'WHERE i.to_user_id = :uid AND i.status = "pending" '
        . 'ORDER BY i.id DESC LIMIT 30'
    );
    $incomingStmt->execute([':uid' => $userId]);

    $outgoingStmt = $pdo->prepare(
        'SELECT i.id, i.room_id, i.from_user_id, i.to_user_id, i.status, i.created_at, u.imie, u.nazwisko, u.email '
        . 'FROM makao_cba_invites i '
        . 'LEFT JOIN uzytkownicy u ON u.id = i.to_user_id '
        . 'WHERE i.from_user_id = :uid AND i.status = "pending" '
        . 'ORDER BY i.id DESC LIMIT 30'
    );
    $outgoingStmt->execute([':uid' => $userId]);

    $roomStmt = $pdo->prepare(
        'SELECT * FROM makao_cba_rooms '
        . 'WHERE (host_user_id = :uid OR guest_user_id = :uid) AND status IN ("waiting", "active") '
        . 'ORDER BY id DESC LIMIT 1'
    );
    $roomStmt->execute([':uid' => $userId]);
    $room = $roomStmt->fetch();

    echo json_encode([
        'ok' => true,
        'incoming' => $incomingStmt->fetchAll(),
        'outgoing' => $outgoingStmt->fetchAll(),
        'active_room' => $room ? makao_room_payload($pdo, $room) : null,
    ]);
    exit;
}

if ($action === 'create_invite' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = makao_json_input();
    $fromUserId = isset($data['from_user_id']) ? (int)$data['from_user_id'] : 0;
    $toUserId = isset($data['to_user_id']) ? (int)$data['to_user_id'] : 0;

    if ($fromUserId <= 0 || $toUserId <= 0 || $fromUserId === $toUserId) {
        echo json_encode(['ok' => false, 'error' => 'Niepoprawne dane zaproszenia.']);
        exit;
    }
    if (!makao_user_exists($pdo, $fromUserId) || !makao_user_exists($pdo, $toUserId)) {
        echo json_encode(['ok' => false, 'error' => 'Nie znaleziono uzytkownika.']);
        exit;
    }

    $roomCode = makao_generate_room_code();

    try {
        $pdo->beginTransaction();

        $roomStmt = $pdo->prepare(
            'INSERT INTO makao_cba_rooms (room_code, host_user_id, kind, status) '
            . 'VALUES (:code, :host, "invite", "waiting")'
        );
        $roomStmt->execute([':code' => $roomCode, ':host' => $fromUserId]);
        $roomId = (int)$pdo->lastInsertId();

        $inviteStmt = $pdo->prepare(
            'INSERT INTO makao_cba_invites (room_id, from_user_id, to_user_id, status) '
            . 'VALUES (:room, :from, :to, "pending")'
        );
        $inviteStmt->execute([':room' => $roomId, ':from' => $fromUserId, ':to' => $toUserId]);

        $pdo->commit();

        echo json_encode([
            'ok' => true,
            'room_code' => $roomCode,
            'room_link' => 'index.php?room=' . urlencode($roomCode),
        ]);
        exit;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Nie udalo sie wyslac zaproszenia.']);
        exit;
    }
}

if ($action === 'create_link_room' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = makao_json_input();
    $hostUserId = isset($data['host_user_id']) ? (int)$data['host_user_id'] : 0;

    if ($hostUserId <= 0) {
        echo json_encode(['ok' => false, 'error' => 'Niepoprawny identyfikator hosta.']);
        exit;
    }

    $roomCode = makao_generate_room_code();

    try {
        $stmt = $pdo->prepare(
            'INSERT INTO makao_cba_rooms (room_code, host_user_id, kind, status) '
            . 'VALUES (:code, :host, "link", "waiting")'
        );
        $stmt->execute([':code' => $roomCode, ':host' => $hostUserId]);

        echo json_encode([
            'ok' => true,
            'room_code' => $roomCode,
            'room_link' => 'index.php?room=' . urlencode($roomCode),
        ]);
        exit;
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode([
            'ok' => false,
            'error' => 'Nie udalo sie utworzyc pokoju linkowego.',
            'detail' => $e->getMessage(),
        ]);
        exit;
    }
}

if ($action === 'accept_invite' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = makao_json_input();
    $userId = isset($data['user_id']) ? (int)$data['user_id'] : 0;
    $inviteId = isset($data['invite_id']) ? (int)$data['invite_id'] : 0;

    try {
        $pdo->beginTransaction();

        $invStmt = $pdo->prepare('SELECT * FROM makao_cba_invites WHERE id = :id FOR UPDATE');
        $invStmt->execute([':id' => $inviteId]);
        $invite = $invStmt->fetch();

        if (!$invite || (int)$invite['to_user_id'] !== $userId || $invite['status'] !== 'pending') {
            $pdo->rollBack();
            echo json_encode(['ok' => false, 'error' => 'Zaproszenie jest nieaktualne.']);
            exit;
        }

        $roomStmt = $pdo->prepare('SELECT * FROM makao_cba_rooms WHERE id = :id FOR UPDATE');
        $roomStmt->execute([':id' => (int)$invite['room_id']]);
        $room = $roomStmt->fetch();

        if (!$room || $room['status'] !== 'waiting') {
            $pdo->rollBack();
            echo json_encode(['ok' => false, 'error' => 'Pokoj nie jest juz dostepny.']);
            exit;
        }

        $updRoom = $pdo->prepare(
            'UPDATE makao_cba_rooms SET guest_user_id = :guest, status = "active", turn_user_id = host_user_id, updated_at = CURRENT_TIMESTAMP WHERE id = :id'
        );
        $updRoom->execute([':guest' => $userId, ':id' => (int)$room['id']]);

        $updInv = $pdo->prepare('UPDATE makao_cba_invites SET status = "accepted", responded_at = CURRENT_TIMESTAMP WHERE id = :id');
        $updInv->execute([':id' => $inviteId]);

        $pdo->commit();

        echo json_encode(['ok' => true, 'room_code' => $room['room_code']]);
        exit;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Nie udalo sie zaakceptowac zaproszenia.']);
        exit;
    }
}

if (($action === 'reject_invite' || $action === 'cancel_invite') && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = makao_json_input();
    $userId = isset($data['user_id']) ? (int)$data['user_id'] : 0;
    $inviteId = isset($data['invite_id']) ? (int)$data['invite_id'] : 0;

    $stmt = $pdo->prepare('SELECT * FROM makao_cba_invites WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $inviteId]);
    $invite = $stmt->fetch();

    if (!$invite || $invite['status'] !== 'pending') {
        echo json_encode(['ok' => false, 'error' => 'Zaproszenie jest nieaktualne.']);
        exit;
    }

    if ($action === 'reject_invite' && (int)$invite['to_user_id'] !== $userId) {
        echo json_encode(['ok' => false, 'error' => 'Brak uprawnien.']);
        exit;
    }
    if ($action === 'cancel_invite' && (int)$invite['from_user_id'] !== $userId) {
        echo json_encode(['ok' => false, 'error' => 'Brak uprawnien.']);
        exit;
    }

    $newStatus = $action === 'reject_invite' ? 'rejected' : 'cancelled';
    $upd = $pdo->prepare('UPDATE makao_cba_invites SET status = :st, responded_at = CURRENT_TIMESTAMP WHERE id = :id');
    $upd->execute([':st' => $newStatus, ':id' => $inviteId]);

    $roomUpd = $pdo->prepare('UPDATE makao_cba_rooms SET status = "finished", updated_at = CURRENT_TIMESTAMP WHERE id = :id AND status = "waiting"');
    $roomUpd->execute([':id' => (int)$invite['room_id']]);

    echo json_encode(['ok' => true]);
    exit;
}

if ($action === 'join_room' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = makao_json_input();
    $userId = isset($data['user_id']) ? (int)$data['user_id'] : 0;
    $roomCode = trim((string)($data['room_code'] ?? ''));

    if ($userId <= 0 || $roomCode === '') {
        echo json_encode(['ok' => false, 'error' => 'Niepoprawne dane dolaczenia.']);
        exit;
    }

    try {
        $pdo->beginTransaction();
        $roomStmt = $pdo->prepare('SELECT * FROM makao_cba_rooms WHERE room_code = :code FOR UPDATE');
        $roomStmt->execute([':code' => $roomCode]);
        $room = $roomStmt->fetch();

        if (!$room) {
            $pdo->rollBack();
            echo json_encode(['ok' => false, 'error' => 'Nie znaleziono pokoju.']);
            exit;
        }

        if ((int)$room['host_user_id'] === $userId || ((int)($room['guest_user_id'] ?? 0)) === $userId) {
            $pdo->commit();
            echo json_encode(['ok' => true, 'room' => makao_room_payload($pdo, $room)]);
            exit;
        }

        if ($room['status'] !== 'waiting' || !empty($room['guest_user_id'])) {
            $pdo->rollBack();
            echo json_encode(['ok' => false, 'error' => 'Pokoj jest juz zajety lub zakonczony.']);
            exit;
        }

        $upd = $pdo->prepare('UPDATE makao_cba_rooms SET guest_user_id = :guest, status = "active", turn_user_id = host_user_id, updated_at = CURRENT_TIMESTAMP WHERE id = :id');
        $upd->execute([':guest' => $userId, ':id' => (int)$room['id']]);

        $roomStmt = $pdo->prepare('SELECT * FROM makao_cba_rooms WHERE id = :id LIMIT 1');
        $roomStmt->execute([':id' => (int)$room['id']]);
        $fresh = $roomStmt->fetch();

        $pdo->commit();
        echo json_encode(['ok' => true, 'room' => makao_room_payload($pdo, $fresh)]);
        exit;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Nie udalo sie dolaczyc do pokoju.']);
        exit;
    }
}

if ($action === 'room') {
    $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
    $roomCode = trim((string)($_GET['room_code'] ?? ''));

    $room = makao_room_by_code($pdo, $roomCode);
    if (!$room) {
        echo json_encode(['ok' => false, 'error' => 'Nie znaleziono pokoju.']);
        exit;
    }

    $isMember = ((int)$room['host_user_id'] === $userId) || ((int)($room['guest_user_id'] ?? 0) === $userId);
    if (!$isMember) {
        echo json_encode(['ok' => false, 'error' => 'Brak dostepu do pokoju.']);
        exit;
    }

    echo json_encode(['ok' => true, 'room' => makao_room_payload($pdo, $room)]);
    exit;
}

if ($action === 'sync_room' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = makao_json_input();
    $userId = isset($data['user_id']) ? (int)$data['user_id'] : 0;
    $roomCode = trim((string)($data['room_code'] ?? ''));
    $actionVersion = isset($data['action_version']) ? (int)$data['action_version'] : -1;
    $turnUserId = isset($data['turn_user_id']) ? (int)$data['turn_user_id'] : 0;
    $state = $data['state'] ?? null;

    if (!is_array($state)) {
        echo json_encode(['ok' => false, 'error' => 'Brak poprawnego stanu gry.']);
        exit;
    }

    try {
        $pdo->beginTransaction();
        $roomStmt = $pdo->prepare('SELECT * FROM makao_cba_rooms WHERE room_code = :code FOR UPDATE');
        $roomStmt->execute([':code' => $roomCode]);
        $room = $roomStmt->fetch();

        if (!$room) {
            $pdo->rollBack();
            echo json_encode(['ok' => false, 'error' => 'Nie znaleziono pokoju.']);
            exit;
        }

        $isMember = ((int)$room['host_user_id'] === $userId) || ((int)($room['guest_user_id'] ?? 0) === $userId);
        if (!$isMember) {
            $pdo->rollBack();
            echo json_encode(['ok' => false, 'error' => 'Brak dostepu do pokoju.']);
            exit;
        }

        if ((int)$room['action_version'] !== $actionVersion) {
            $pdo->rollBack();
            echo json_encode(['ok' => false, 'error' => 'Konflikt wersji.', 'room' => makao_room_payload($pdo, $room)]);
            exit;
        }

        if ((int)($room['turn_user_id'] ?? 0) !== $userId && (int)$room['action_version'] > 0) {
            $pdo->rollBack();
            echo json_encode(['ok' => false, 'error' => 'To nie Twoja kolej.']);
            exit;
        }

        $nextVersion = $actionVersion + 1;
        $upd = $pdo->prepare(
            'UPDATE makao_cba_rooms '
            . 'SET state_json = :state, action_version = :ver, turn_user_id = :turn_user, updated_at = CURRENT_TIMESTAMP '
            . 'WHERE id = :id'
        );
        $upd->execute([
            ':state' => json_encode($state, JSON_UNESCAPED_UNICODE),
            ':ver' => $nextVersion,
            ':turn_user' => $turnUserId > 0 ? $turnUserId : null,
            ':id' => (int)$room['id'],
        ]);

        $roomStmt = $pdo->prepare('SELECT * FROM makao_cba_rooms WHERE id = :id LIMIT 1');
        $roomStmt->execute([':id' => (int)$room['id']]);
        $fresh = $roomStmt->fetch();

        $pdo->commit();
        echo json_encode(['ok' => true, 'room' => makao_room_payload($pdo, $fresh)]);
        exit;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Nie udalo sie zsynchronizowac pokoju.']);
        exit;
    }
}

if ($action === 'leave_room' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = makao_json_input();
    $userId = isset($data['user_id']) ? (int)$data['user_id'] : 0;
    $roomCode = trim((string)($data['room_code'] ?? ''));

    $room = makao_room_by_code($pdo, $roomCode);
    if (!$room) {
        echo json_encode(['ok' => false, 'error' => 'Nie znaleziono pokoju.']);
        exit;
    }

    $isMember = ((int)$room['host_user_id'] === $userId) || ((int)($room['guest_user_id'] ?? 0) === $userId);
    if (!$isMember) {
        echo json_encode(['ok' => false, 'error' => 'Brak dostepu do pokoju.']);
        exit;
    }

    $upd = $pdo->prepare('UPDATE makao_cba_rooms SET status = "finished", updated_at = CURRENT_TIMESTAMP WHERE id = :id');
    $upd->execute([':id' => (int)$room['id']]);

    echo json_encode(['ok' => true]);
    exit;
}

if ($action === 'matches') {
    try {
        $sql = 'SELECT m.id, m.user_id, m.mode, m.winner, m.turns_count, m.created_at, u.imie, u.nazwisko '
            . 'FROM makao_cba_matches m '
            . 'LEFT JOIN uzytkownicy u ON u.id = m.user_id '
            . 'ORDER BY m.id DESC LIMIT 20';
        $rows = $pdo->query($sql)->fetchAll();
        echo json_encode(['ok' => true, 'items' => $rows]);
        exit;
    } catch (Throwable $e) {
        echo json_encode(['ok' => false, 'items' => []]);
        exit;
    }
}

echo json_encode(['ok' => false, 'error' => 'Nieznana akcja']);
