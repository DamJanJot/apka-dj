<?php
session_start();
require_once __DIR__ . '/db_bootstrap.php';

$dbError = null;
$dbSource = null;

$db = makao_get_pdo();
$pdo = $db['pdo'];
$dbSource = $db['source'];
$dbError = $db['error'];
?>
<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Makao CBA</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <?php $roomCodeFromUrl = isset($_GET['room']) ? preg_replace('/[^A-Z0-9]/', '', strtoupper((string)$_GET['room'])) : ''; ?>
  <main class="wrap">
    <header class="top">
      <h1>Makao CBA</h1>
      <p>Wersja gotowa do uploadu na CBA (PHP + MySQL).</p>
    </header>

    <?php if (!$pdo): ?>
      <section class="notice warn">
        Brak aktywnego polaczenia DB. Szczegoly: <?php echo htmlspecialchars((string)$dbError, ENT_QUOTES, 'UTF-8'); ?>
      </section>
    <?php elseif ($dbError): ?>
      <section class="notice warn">
        <?php echo htmlspecialchars($dbError, ENT_QUOTES, 'UTF-8'); ?>
      </section>
    <?php elseif ($dbSource): ?>
      <section class="notice">
        Polaczenie DB aktywne (zrodlo: <?php echo htmlspecialchars($dbSource, ENT_QUOTES, 'UTF-8'); ?>).
      </section>
    <?php endif; ?>

    <section class="panel controls">
      <div class="row">
        <label for="mode">Tryb</label>
        <select id="mode">
          <option value="bot">Gra z botem</option>
          <option value="link">Link 2 osoby (bez wspolnego ekranu)</option>
        </select>
      </div>

      <div class="row buttons">
        <button id="newGameBtn">Nowa gra</button>
      </div>

      <div id="multiplayerPanel" class="multi-panel hidden">
        <div class="row">
          <label>Tryb linkowy</label>
          <div class="inline-actions">
            <button id="createLinkBtn" type="button">Utworz pokoj linkowy</button>
            <input id="roomCodeInput" type="text" placeholder="Wpisz kod pokoju" autocomplete="off">
            <button id="joinRoomBtn" type="button">Dolacz po kodzie</button>
          </div>
        </div>

        <div id="roomInfo" class="room-info hidden">
          <div id="roomLabel" class="muted"></div>
          <div class="inline-actions">
            <input id="roomLink" type="text" readonly>
            <button id="copyLinkBtn" type="button">Kopiuj link</button>
            <button id="leaveRoomBtn" type="button">Opusc pokoj</button>
          </div>
        </div>
      </div>

      <div id="status" class="status">Gotowe.</div>
    </section>

    <section class="panel board">
      <div class="seat-row" id="seatRow">
        <div id="topSeat" class="seat muted">Gora: -</div>
        <div id="bottomSeat" class="seat muted">Dol: -</div>
      </div>

      <div class="board-row">
        <div>
          <h3>Przeciwnik</h3>
          <div id="opponentCards" class="cards"></div>
        </div>
      </div>

      <div class="center-row">
        <div class="pile">
          <div class="label">Dobieranie</div>
          <div id="deckCount" class="card down">0</div>
        </div>
        <div class="pile">
          <div class="label">Stol</div>
          <div id="topCard" class="card">-</div>
          <div id="activeSuit" class="muted"></div>
        </div>
      </div>

      <div id="requestPicker" class="picker hidden"></div>
      <div id="suitPicker" class="picker hidden"></div>

      <div class="board-row">
        <div class="player-head">
          <h3>Twoja reka</h3>
          <div class="actions">
            <button id="throwBtn">Rzuc</button>
            <button id="drawBtn">Dobierz</button>
          </div>
        </div>
        <div id="playerCards" class="cards"></div>
      </div>
    </section>

    <section class="panel">
      <h3>Ostatnie wyniki</h3>
      <div id="matches" class="matches">Brak danych.</div>
    </section>
  </main>

  <script>window.MAKAO_ROOM_CODE = "<?php echo htmlspecialchars($roomCodeFromUrl, ENT_QUOTES, 'UTF-8'); ?>";</script>
  <script src="app.js"></script>
</body>
</html>
