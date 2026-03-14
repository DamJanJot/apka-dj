(() => {
  const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const REQUEST_RANKS = ['5', '6', '7', '8', '9', '10'];

  const roomCodeFromUrl = (window.MAKAO_ROOM_CODE || '').trim().toUpperCase();

  const el = {
    mode: document.getElementById('mode'),
    newGameBtn: document.getElementById('newGameBtn'),
    status: document.getElementById('status'),
    deckCount: document.getElementById('deckCount'),
    topCard: document.getElementById('topCard'),
    activeSuit: document.getElementById('activeSuit'),
    opponentCards: document.getElementById('opponentCards'),
    playerCards: document.getElementById('playerCards'),
    throwBtn: document.getElementById('throwBtn'),
    drawBtn: document.getElementById('drawBtn'),
    requestPicker: document.getElementById('requestPicker'),
    suitPicker: document.getElementById('suitPicker'),
    matches: document.getElementById('matches'),
    multiplayerPanel: document.getElementById('multiplayerPanel'),
    createLinkBtn: document.getElementById('createLinkBtn'),
    roomCodeInput: document.getElementById('roomCodeInput'),
    roomInfo: document.getElementById('roomInfo'),
    roomLabel: document.getElementById('roomLabel'),
    roomLink: document.getElementById('roomLink'),
    copyLinkBtn: document.getElementById('copyLinkBtn'),
    joinRoomBtn: document.getElementById('joinRoomBtn'),
    leaveRoomBtn: document.getElementById('leaveRoomBtn'),
    topSeat: document.getElementById('topSeat'),
    bottomSeat: document.getElementById('bottomSeat'),
  };

  const state = {
    mode: 'bot',
    game: null,
    selected: [],
    room: null,
    currentRoomCode: roomCodeFromUrl,
    roomPoll: null,
    saving: false,
    syncing: false,
    clientId: 0,
  };

  function getOrCreateClientId() {
    const key = 'makao_client_id_v1';
    const existing = Number(window.localStorage.getItem(key) || 0);
    if (existing > 0) return existing;
    const created = Math.floor(Math.random() * 900000000) + 100000000;
    window.localStorage.setItem(key, String(created));
    return created;
  }

  function setStatus(msg) {
    el.status.textContent = msg;
  }

  function myId() {
    return state.clientId;
  }

  function suitSymbol(suit) {
    if (suit === 'hearts') return '♥';
    if (suit === 'diamonds') return '♦';
    if (suit === 'clubs') return '♣';
    return '♠';
  }

  function suitName(suit) {
    if (suit === 'hearts') return 'kier';
    if (suit === 'diamonds') return 'karo';
    if (suit === 'clubs') return 'trefl';
    return 'pik';
  }

  function cardClass(card) {
    return card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black';
  }

  function cardHtml(card) {
    return `<span class="card-content"><span class="rank">${card.rank}</span><span class="suit">${suitSymbol(card.suit)}</span></span>`;
  }

  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = out[i];
      out[i] = out[j];
      out[j] = t;
    }
    return out;
  }

  function buildDeck() {
    const out = [];
    SUITS.forEach((suit) => {
      RANKS.forEach((rank) => {
        out.push({ id: `${rank}-${suit}-${Math.random().toString(36).slice(2, 9)}`, rank, suit });
      });
    });
    return shuffle(out);
  }

  function isQueenSpades(card) {
    return card.rank === 'Q' && card.suit === 'spades';
  }

  function isReverseKing(card) {
    return card.rank === 'K' && card.suit === 'spades';
  }

  function attackValue(card) {
    if (card.rank === '2') return 2;
    if (card.rank === '3') return 3;
    if (card.rank === 'K') return 5;
    return 0;
  }

  function isAttack(card) {
    return attackValue(card) > 0;
  }

  function isFunctional(card) {
    return isAttack(card) || card.rank === '4' || card.rank === 'A' || card.rank === 'J' || isQueenSpades(card) || isReverseKing(card);
  }

  function topCard(game) {
    return game.discard.length ? game.discard[game.discard.length - 1] : null;
  }

  function refillDeckIfNeeded(game) {
    if (game.deck.length > 0 || game.discard.length <= 1) return;
    const t = game.discard[game.discard.length - 1];
    const rest = game.discard.slice(0, -1);
    game.deck = shuffle(rest);
    game.discard = [t];
  }

  function drawCards(game, count) {
    const out = [];
    for (let i = 0; i < count; i += 1) {
      refillDeckIfNeeded(game);
      const card = game.deck.pop();
      if (!card) break;
      out.push(card);
    }
    return out;
  }

  function canStackAttack(card, top) {
    return !!top && isAttack(card) && isAttack(top) && (card.rank === top.rank || card.suit === top.suit);
  }

  function canPlayCard(game, card) {
    const top = topCard(game);
    if (!top) return true;
    if (isQueenSpades(card)) return true;

    if (game.pendingDraw > 0) return canStackAttack(card, top);
    if (game.pendingSkipCount > 0) return card.rank === '4';
    if (game.pendingRequest) return card.rank === game.pendingRequest || card.rank === 'J';
    if (game.queenOpenTurn) return true;

    if (game.activeSuit) return card.suit === game.activeSuit || card.rank === top.rank;
    return card.suit === top.suit || card.rank === top.rank;
  }

  function botId() {
    return -1;
  }

  function roomOpponentId() {
    if (!state.room) return null;
    if (state.room.host_user_id === myId()) return state.room.guest_user_id || null;
    if (state.room.guest_user_id === myId()) return state.room.host_user_id || null;
    return null;
  }

  function opponentId() {
    if (state.mode === 'bot') return botId();
    return roomOpponentId();
  }

  function makeGame(playerA, playerB) {
    const deck = buildDeck();
    const handA = deck.splice(0, 5);
    const handB = deck.splice(0, 5);

    const burned = [];
    let first = deck.pop() || null;
    while (first && isFunctional(first) && deck.length > 0) {
      burned.push(first);
      first = deck.pop() || null;
    }

    return {
      deck,
      discard: [...burned, ...(first ? [first] : [])],
      hands: {
        [playerA]: handA,
        [playerB]: handB,
      },
      turnUserId: playerA,
      winnerUserId: null,
      activeSuit: first ? first.suit : null,
      pendingDraw: 0,
      pendingSkipCount: 0,
      pendingRequest: null,
      queenOpenTurn: false,
      awaitingSuitPickUserId: null,
      awaitingRequestPickUserId: null,
      turnsCount: 0,
    };
  }

  function getHand(game, id) {
    if (!game || id === null || id === undefined) return [];
    return game.hands[id] || [];
  }

  function isMyTurn(game) {
    return !!game && game.turnUserId === myId();
  }

  function canAct(game) {
    if (!game || game.winnerUserId) return false;
    if (game.awaitingSuitPickUserId || game.awaitingRequestPickUserId) {
      return game.awaitingSuitPickUserId === myId() || game.awaitingRequestPickUserId === myId();
    }
    return isMyTurn(game);
  }

  function clearSelections() {
    state.selected = [];
  }

  function selectedPlayableCards(game) {
    const hand = getHand(game, myId());
    const selected = hand.filter((c) => state.selected.includes(c.id));
    if (!selected.length) return [];
    if (!selected.every((c) => c.rank === selected[0].rank)) return [];

    const lead = selected[selected.length - 1];
    if (!canPlayCard(game, lead)) return [];

    if (game.pendingRequest && selected[0].rank !== game.pendingRequest && selected[0].rank !== 'J') return [];
    return selected;
  }

  function applyThrow(game, actorId, cards) {
    if (!cards.length) return;

    const hand = getHand(game, actorId);
    const remove = new Set(cards.map((c) => c.id));
    const newHand = hand.filter((c) => !remove.has(c.id));

    game.hands[actorId] = newHand;
    game.discard = game.discard.concat(cards);
    const lead = cards[cards.length - 1];
    const oppId = actorId === myId() ? opponentId() : myId();

    game.turnsCount += 1;

    if (!newHand.length) {
      game.winnerUserId = actorId;
      return;
    }

    if (isQueenSpades(lead)) {
      game.pendingDraw = 0;
      game.pendingSkipCount = 0;
      game.pendingRequest = null;
      game.activeSuit = null;
      game.queenOpenTurn = true;
      game.turnUserId = oppId;
      return;
    }

    game.queenOpenTurn = false;

    if (game.pendingDraw > 0) {
      game.pendingDraw += cards.reduce((s, c) => s + attackValue(c), 0);
      game.activeSuit = lead.suit;
      game.turnUserId = oppId;
      return;
    }

    if (game.pendingSkipCount > 0) {
      game.pendingSkipCount += cards.filter((c) => c.rank === '4').length;
      game.activeSuit = lead.suit;
      game.turnUserId = oppId;
      return;
    }

    if (game.pendingRequest) {
      if (lead.rank === 'J') {
        if (state.mode === 'bot' && actorId === botId()) {
          game.pendingRequest = REQUEST_RANKS[Math.floor(Math.random() * REQUEST_RANKS.length)];
          game.activeSuit = lead.suit;
          game.turnUserId = oppId;
        } else {
          game.awaitingRequestPickUserId = actorId;
          game.activeSuit = lead.suit;
        }
        return;
      }

      if (lead.rank === game.pendingRequest) {
        game.pendingRequest = null;
        game.activeSuit = lead.suit;
        game.turnUserId = oppId;
        return;
      }
    }

    if (isAttack(lead)) {
      game.pendingDraw = cards.reduce((s, c) => s + attackValue(c), 0);
      game.activeSuit = lead.suit;
      game.turnUserId = oppId;
      return;
    }

    if (lead.rank === '4') {
      game.pendingSkipCount = cards.filter((c) => c.rank === '4').length;
      game.activeSuit = lead.suit;
      game.turnUserId = oppId;
      return;
    }

    if (lead.rank === 'A') {
      if (state.mode === 'bot' && actorId === botId()) {
        game.activeSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
        game.turnUserId = oppId;
      } else {
        game.awaitingSuitPickUserId = actorId;
        game.activeSuit = null;
      }
      return;
    }

    if (lead.rank === 'J') {
      if (state.mode === 'bot' && actorId === botId()) {
        game.pendingRequest = REQUEST_RANKS[Math.floor(Math.random() * REQUEST_RANKS.length)];
        game.activeSuit = lead.suit;
        game.turnUserId = oppId;
      } else {
        game.awaitingRequestPickUserId = actorId;
        game.activeSuit = lead.suit;
      }
      return;
    }

    if (isReverseKing(lead)) {
      game.activeSuit = lead.suit;
      game.turnUserId = actorId;
      return;
    }

    game.activeSuit = lead.suit;
    game.turnUserId = oppId;
  }

  function drawActionOn(game, actorId) {
    const oppId = actorId === myId() ? opponentId() : myId();

    if (game.pendingSkipCount > 0) {
      game.pendingSkipCount = Math.max(0, game.pendingSkipCount - 1);
      game.turnUserId = oppId;
      return;
    }

    if (game.pendingDraw > 0) {
      const cards = drawCards(game, game.pendingDraw);
      game.hands[actorId] = getHand(game, actorId).concat(cards);
      game.pendingDraw = 0;
      game.turnUserId = oppId;
      return;
    }

    if (game.pendingRequest) {
      const cards = drawCards(game, 1);
      game.hands[actorId] = getHand(game, actorId).concat(cards);
      game.turnUserId = oppId;
      return;
    }

    const cards = drawCards(game, 1);
    game.hands[actorId] = getHand(game, actorId).concat(cards);
    game.turnUserId = oppId;
  }

  async function apiGet(action, params = {}) {
    const q = new URLSearchParams({ action, ...params });
    const res = await fetch(`api.php?${q.toString()}`);
    return res.json();
  }

  async function apiPost(action, payload = {}) {
    const res = await fetch(`api.php?action=${encodeURIComponent(action)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  function renderSeats() {
    if (state.mode === 'bot') {
      el.topSeat.textContent = 'Gora: Bot';
      el.bottomSeat.textContent = 'Dol: Ty';
      return;
    }

    if (!state.room) {
      el.topSeat.textContent = 'Gora: -';
      el.bottomSeat.textContent = 'Dol: Ty';
      return;
    }

    const opp = roomOpponentId();
    el.topSeat.textContent = `Gora: ${opp ? 'Przeciwnik online' : 'Oczekiwanie na gracza...'}`;
    el.bottomSeat.textContent = 'Dol: Ty';
  }

  function statusText(game) {
    if (state.mode === 'link' && state.room && state.room.status === 'waiting') {
      return 'Pokoj utworzony. Czekasz na drugiego gracza z linku.';
    }

    if (!game) {
      if (state.mode === 'link') {
        return state.currentRoomCode ? 'Dolaczono do pokoju. Oczekiwanie na start.' : 'Utworz pokoj linkowy lub dolacz po kodzie.';
      }
      return 'Kliknij Nowa gra, aby zaczac.';
    }

    if (game.winnerUserId) {
      return game.winnerUserId === myId() ? 'Wygrales.' : (state.mode === 'bot' ? 'Bot wygral.' : 'Przeciwnik wygral.');
    }

    if (game.awaitingSuitPickUserId) {
      return game.awaitingSuitPickUserId === myId() ? 'Wybierz kolor po A.' : 'Przeciwnik wybiera kolor po A.';
    }

    if (game.awaitingRequestPickUserId) {
      return game.awaitingRequestPickUserId === myId() ? 'Wybierz zadanie po J.' : 'Przeciwnik wybiera zadanie po J.';
    }

    if (game.pendingDraw > 0) {
      return game.turnUserId === myId() ? `Twoj ruch: atak ${game.pendingDraw}.` : `Ruch przeciwnika: atak ${game.pendingDraw}.`;
    }

    if (game.pendingSkipCount > 0) {
      return game.turnUserId === myId() ? `Twoj ruch: czekanie ${game.pendingSkipCount}.` : `Ruch przeciwnika: czekanie ${game.pendingSkipCount}.`;
    }

    if (game.pendingRequest) {
      return game.turnUserId === myId() ? `Twoj ruch: zadanie ${game.pendingRequest}.` : `Ruch przeciwnika: zadanie ${game.pendingRequest}.`;
    }

    return game.turnUserId === myId() ? 'Twoja kolej.' : 'Kolej przeciwnika.';
  }

  function renderRoomInfo() {
    if (!state.currentRoomCode) {
      el.roomInfo.classList.add('hidden');
      return;
    }

    const link = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(state.currentRoomCode)}`;
    el.roomInfo.classList.remove('hidden');
    el.roomLabel.textContent = `Pokoj ${state.currentRoomCode}${state.room ? ` (${state.room.status})` : ''}`;
    el.roomLink.value = link;
    el.roomCodeInput.value = state.currentRoomCode;
  }

  function renderModeUI() {
    const linkMode = state.mode === 'link';
    el.multiplayerPanel.classList.toggle('hidden', !linkMode);
    renderRoomInfo();
    renderSeats();
  }

  function renderGame() {
    const game = state.game;
    const top = game ? topCard(game) : null;

    setStatus(statusText(game));

    el.deckCount.textContent = game ? String(game.deck.length) : '0';
    el.topCard.className = `card ${top ? cardClass(top) : ''}`;
    el.topCard.innerHTML = top ? cardHtml(top) : '-';
    el.activeSuit.textContent = `Aktywny kolor: ${game && game.activeSuit ? suitName(game.activeSuit) : '-'}`;

    const myHand = game ? getHand(game, myId()) : [];
    const selectedSet = new Set(state.selected);
    el.playerCards.innerHTML = myHand.map((card) => {
      const playable = game && canAct(game) && canPlayCard(game, card);
      const selected = selectedSet.has(card.id);
      return `<button data-id="${card.id}" class="card ${cardClass(card)} ${playable ? 'playable' : ''} ${selected ? 'selected' : ''}">${cardHtml(card)}</button>`;
    }).join('');

    const oppHand = game ? getHand(game, opponentId()) : [];
    el.opponentCards.innerHTML = oppHand.map(() => '<div class="card down"></div>').join('');

    const throwCount = game && canAct(game) ? selectedPlayableCards(game).length : 0;
    el.throwBtn.disabled = !throwCount;
    el.throwBtn.textContent = throwCount > 0 ? `Rzuc (${throwCount})` : 'Rzuc';

    const drawDisabled = !(game && canAct(game));
    el.drawBtn.disabled = drawDisabled;
    if (!game) {
      el.drawBtn.textContent = 'Dobierz';
    } else if (game.pendingSkipCount > 0) {
      el.drawBtn.textContent = `Czekaj (${game.pendingSkipCount})`;
    } else if (game.pendingDraw > 0) {
      el.drawBtn.textContent = `Dobierz ${game.pendingDraw}`;
    } else if (game.pendingRequest) {
      el.drawBtn.textContent = 'Dobierz 1';
    } else {
      el.drawBtn.textContent = 'Dobierz';
    }

    const awaitSuit = game && game.awaitingSuitPickUserId === myId();
    el.suitPicker.classList.toggle('hidden', !awaitSuit);
    el.suitPicker.innerHTML = awaitSuit
      ? SUITS.map((s) => `<button data-suit="${s}">${suitSymbol(s)} ${suitName(s)}</button>`).join('')
      : '';

    const awaitReq = game && game.awaitingRequestPickUserId === myId();
    el.requestPicker.classList.toggle('hidden', !awaitReq);
    el.requestPicker.innerHTML = awaitReq
      ? REQUEST_RANKS.map((r) => `<button data-req="${r}">${r}</button>`).join('') + '<button data-req="">Brak zadania</button>'
      : '';

    renderSeats();
  }

  async function loadMatches() {
    try {
      const data = await apiGet('matches');
      if (!data.ok || !Array.isArray(data.items) || !data.items.length) {
        el.matches.textContent = 'Brak danych.';
        return;
      }
      el.matches.innerHTML = data.items.map((m) => {
        const user = m.user_id > 0 ? `${m.imie || ''} ${m.nazwisko || ''}`.trim() || `#${m.user_id}` : 'anonim';
        return `<div class="match-row"><strong>${user}</strong><span>${m.mode}</span><span>wygral: ${m.winner}</span><small>${m.created_at}</small></div>`;
      }).join('');
    } catch (_) {
      el.matches.textContent = 'Brak danych.';
    }
  }

  async function saveMatchIfNeeded() {
    const game = state.game;
    if (!game || !game.winnerUserId || state.saving) return;

    state.saving = true;
    try {
      await apiPost('save_match', {
        user_id: 0,
        mode: state.mode,
        winner: game.winnerUserId === myId() ? 'player' : 'bot',
        turns_count: game.turnsCount,
      });
      loadMatches();
    } catch (_) {
      // ignore
    } finally {
      state.saving = false;
    }
  }

  async function fetchRoom() {
    if (!state.currentRoomCode) return;

    try {
      const data = await apiGet('room', { user_id: String(myId()), room_code: state.currentRoomCode });
      if (!data.ok) return;

      state.room = data.room;
      if (state.room && state.room.state_json) {
        state.game = state.room.state_json;
      }

      renderRoomInfo();
      renderGame();
    } catch (_) {
      // ignore
    }
  }

  async function pushRoomState() {
    if (state.syncing || !state.currentRoomCode || !state.room || !state.game) return false;

    state.syncing = true;
    try {
      const data = await apiPost('sync_room', {
        user_id: myId(),
        room_code: state.currentRoomCode,
        action_version: Number(state.room.action_version || 0),
        turn_user_id: state.game.turnUserId || null,
        state: state.game,
      });

      if (!data.ok) {
        if (data.room && data.room.state_json) {
          state.room = data.room;
          state.game = data.room.state_json;
          clearSelections();
          renderRoomInfo();
        }
        setStatus(data.error || 'Blad synchronizacji.');
        renderGame();
        return false;
      }

      state.room = data.room;
      if (data.room && data.room.state_json) {
        state.game = data.room.state_json;
      }

      renderRoomInfo();
      renderGame();
      return true;
    } catch (_) {
      setStatus('Blad polaczenia z API.');
      return false;
    } finally {
      state.syncing = false;
    }
  }

  async function maybeCreateInitialRoomGame() {
    if (!state.room) return;
    if (state.room.status !== 'active') return;
    if (state.room.state_json) return;
    if (state.room.host_user_id !== myId()) return;
    if (!state.room.guest_user_id) return;

    state.game = makeGame(state.room.host_user_id, state.room.guest_user_id);
    clearSelections();
    await pushRoomState();
  }

  function startRoomPolling() {
    if (state.roomPoll) {
      clearInterval(state.roomPoll);
      state.roomPoll = null;
    }

    if (state.mode !== 'link') return;

    state.roomPoll = setInterval(async () => {
      await fetchRoom();
      await maybeCreateInitialRoomGame();
    }, 1400);
  }

  function maybeBotMove() {
    if (state.mode !== 'bot') return;
    const game = state.game;
    if (!game || game.winnerUserId || game.turnUserId !== botId()) return;
    if (game.awaitingSuitPickUserId || game.awaitingRequestPickUserId) return;

    setTimeout(() => {
      const fresh = state.game;
      if (!fresh || fresh.winnerUserId || fresh.turnUserId !== botId()) return;

      const hand = getHand(fresh, botId());
      const playable = hand.filter((c) => canPlayCard(fresh, c));
      if (!playable.length) {
        drawActionOn(fresh, botId());
        renderGame();
        return;
      }

      const chosen = playable[Math.floor(Math.random() * playable.length)];
      applyThrow(fresh, botId(), [chosen]);
      renderGame();
      if (fresh.winnerUserId) saveMatchIfNeeded();
    }, 650);
  }

  function toggleCardSelection(cardId) {
    const game = state.game;
    if (!game || !canAct(game)) return;

    const hand = getHand(game, myId());
    const card = hand.find((c) => c.id === cardId);
    if (!card || !canPlayCard(game, card)) return;

    const next = state.selected.slice();
    const idx = next.indexOf(cardId);
    if (idx >= 0) {
      next.splice(idx, 1);
      state.selected = next;
      renderGame();
      return;
    }

    if (next.length > 0) {
      const first = hand.find((c) => c.id === next[0]);
      if (!first || first.rank !== card.rank) {
        state.selected = [cardId];
        renderGame();
        return;
      }
    }

    next.push(cardId);
    state.selected = next;
    renderGame();
  }

  async function handleThrow() {
    const game = state.game;
    if (!game || !canAct(game)) return;

    const cards = selectedPlayableCards(game);
    if (!cards.length) return;

    applyThrow(game, myId(), cards);
    clearSelections();

    if (state.mode === 'bot') {
      renderGame();
      if (game.winnerUserId) saveMatchIfNeeded();
      else maybeBotMove();
      return;
    }

    const ok = await pushRoomState();
    if (ok && game.winnerUserId) saveMatchIfNeeded();
  }

  async function handleDraw() {
    const game = state.game;
    if (!game || !canAct(game)) return;

    drawActionOn(game, myId());
    clearSelections();

    if (state.mode === 'bot') {
      renderGame();
      maybeBotMove();
      return;
    }

    await pushRoomState();
  }

  async function onPickSuit(suit) {
    const game = state.game;
    if (!game || game.awaitingSuitPickUserId !== myId()) return;

    game.activeSuit = suit;
    game.awaitingSuitPickUserId = null;
    game.turnUserId = opponentId();

    if (state.mode === 'bot') {
      renderGame();
      maybeBotMove();
      return;
    }

    await pushRoomState();
  }

  async function onPickRequest(rank) {
    const game = state.game;
    if (!game || game.awaitingRequestPickUserId !== myId()) return;

    game.pendingRequest = rank || null;
    game.awaitingRequestPickUserId = null;
    game.turnUserId = opponentId();

    if (state.mode === 'bot') {
      renderGame();
      maybeBotMove();
      return;
    }

    await pushRoomState();
  }

  async function joinRoomByCode(rawCode) {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) {
      setStatus('Podaj kod pokoju.');
      return;
    }

    try {
      const data = await apiPost('join_room', { user_id: myId(), room_code: code });
      if (!data.ok) {
        setStatus(data.error || 'Nie udalo sie dolaczyc do pokoju.');
        return;
      }

      state.currentRoomCode = code;
      state.room = data.room;
      renderRoomInfo();
      await fetchRoom();
      await maybeCreateInitialRoomGame();
      renderGame();
    } catch (_) {
      setStatus('Blad podczas dolaczania do pokoju.');
    }
  }

  async function createLinkRoom() {
    try {
      const data = await apiPost('create_link_room', { host_user_id: myId() });
      if (!data.ok) {
        setStatus(data.error || 'Nie udalo sie utworzyc pokoju linkowego.');
        return;
      }

      state.currentRoomCode = data.room_code;
      renderRoomInfo();
      await joinRoomByCode(data.room_code);
      setStatus('Pokoj linkowy utworzony. Wyslij link drugiej osobie.');
    } catch (_) {
      setStatus('Blad podczas tworzenia pokoju linkowego.');
    }
  }

  async function leaveRoom() {
    if (!state.currentRoomCode) return;

    try {
      const data = await apiPost('leave_room', { user_id: myId(), room_code: state.currentRoomCode });
      if (!data.ok) {
        setStatus(data.error || 'Nie udalo sie opuscic pokoju.');
        return;
      }

      state.room = null;
      state.game = null;
      state.currentRoomCode = '';
      clearSelections();
      renderRoomInfo();
      renderGame();
      setStatus('Pokoj zakonczony.');
    } catch (_) {
      setStatus('Blad podczas opuszczania pokoju.');
    }
  }

  async function startNewGame() {
    state.mode = el.mode.value;
    clearSelections();

    if (state.mode === 'bot') {
      state.room = null;
      state.currentRoomCode = '';
      state.game = makeGame(myId(), botId());
      renderModeUI();
      renderGame();
      maybeBotMove();
      return;
    }

    renderModeUI();
    if (state.currentRoomCode) {
      await joinRoomByCode(state.currentRoomCode);
      return;
    }

    setStatus('Utworz pokoj linkowy albo dolacz po kodzie.');
    renderGame();
  }

  document.addEventListener('click', async (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;

    const cardBtn = t.closest('[data-id]');
    if (cardBtn && cardBtn.classList.contains('card')) {
      toggleCardSelection(cardBtn.getAttribute('data-id'));
      return;
    }

    const suitBtn = t.closest('[data-suit]');
    if (suitBtn) {
      await onPickSuit(suitBtn.getAttribute('data-suit'));
      return;
    }

    const reqBtn = t.closest('[data-req]');
    if (reqBtn) {
      await onPickRequest(reqBtn.getAttribute('data-req'));
    }
  });

  el.newGameBtn.addEventListener('click', startNewGame);
  el.throwBtn.addEventListener('click', handleThrow);
  el.drawBtn.addEventListener('click', handleDraw);

  el.mode.addEventListener('change', () => {
    state.mode = el.mode.value;
    state.game = null;
    clearSelections();
    renderModeUI();
    renderGame();
    startRoomPolling();
  });

  el.createLinkBtn.addEventListener('click', createLinkRoom);
  el.joinRoomBtn.addEventListener('click', () => joinRoomByCode(el.roomCodeInput.value || state.currentRoomCode));
  el.leaveRoomBtn.addEventListener('click', leaveRoom);
  el.copyLinkBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(el.roomLink.value || '');
      setStatus('Skopiowano link pokoju.');
    } catch (_) {
      setStatus('Nie mozna skopiowac linku.');
    }
  });

  async function boot() {
    state.clientId = getOrCreateClientId();
    state.mode = el.mode.value;

    loadMatches();
    renderModeUI();

    if (state.mode === 'bot') {
      state.game = makeGame(myId(), botId());
      renderGame();
    } else {
      renderGame();
    }

    if (roomCodeFromUrl) {
      el.mode.value = 'link';
      state.mode = 'link';
      state.currentRoomCode = roomCodeFromUrl;
      renderModeUI();
      await joinRoomByCode(roomCodeFromUrl);
    }

    startRoomPolling();
  }

  boot();
})();
