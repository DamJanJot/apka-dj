import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  FriendUser,
  MakaoOnlineInvite,
  MakaoOnlineOverview,
  MakaoOnlineRoom,
  acceptMakaoInvite,
  cancelMakaoInvite,
  getMakaoRoom,
  getMakaoOnlineOverview,
  leaveMakaoRoom,
  rejectMakaoInvite,
  sendMakaoInvite,
  syncMakaoRoomState,
} from '@/api/client'

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
type RequestRank = '5' | '6' | '7' | '8' | '9' | '10'
type SuitNaming = 'classic' | 'regional'
type Turn = 'player' | 'bot'
type GameMode = 'bot' | 'local' | 'online'

type Card = {
  id: string
  suit: Suit
  rank: Rank
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const REQUEST_RANKS: RequestRank[] = ['5', '6', '7', '8', '9', '10']

function suitSymbol(suit: Suit) {
  if (suit === 'hearts') return '♥'
  if (suit === 'diamonds') return '♦'
  if (suit === 'clubs') return '♣'
  return '♠'
}

function suitName(suit: Suit, naming: SuitNaming = 'classic') {
  if (naming === 'regional') {
    if (suit === 'hearts') return 'czerwono'
    if (suit === 'diamonds') return 'krajc'
    if (suit === 'clubs') return 'dzwonek'
    return 'wino'
  }

  if (suit === 'hearts') return 'kier'
  if (suit === 'diamonds') return 'karo'
  if (suit === 'clubs') return 'trefl'
  return 'pik'
}

function fullCardName(card: Card) {
  return `${card.rank}${suitSymbol(card.suit)}`
}

function cardColorClass(card: Card) {
  return card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black'
}

function isQueenSpades(card: Card) {
  return card.rank === 'Q' && card.suit === 'spades'
}

function isReverseKing(card: Card) {
  return card.rank === 'K' && card.suit === 'spades'
}

function attackValue(card: Card) {
  if (card.rank === '2') return 2
  if (card.rank === '3') return 3
  if (card.rank === 'K') return 5
  return 0
}

function isAttackCard(card: Card) {
  return attackValue(card) > 0
}

function isFunctionalCard(card: Card) {
  return isAttackCard(card) || card.rank === '4' || card.rank === 'A' || card.rank === 'J' || isQueenSpades(card) || isReverseKing(card)
}

function otherTurn(turn: Turn): Turn {
  return turn === 'player' ? 'bot' : 'player'
}

function shuffle<T>(items: T[]) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildDeck() {
  const deck: Card[] = []
  SUITS.forEach((suit) => {
    RANKS.forEach((rank) => {
      deck.push({
        id: `${rank}-${suit}-${Math.random().toString(36).slice(2, 10)}`,
        suit,
        rank,
      })
    })
  })
  return shuffle(deck)
}

function takeFromDeck(
  fromDeck: Card[],
  discard: Card[],
  count: number
): { drawn: Card[]; nextDeck: Card[]; nextDiscard: Card[] } {
  let deck = [...fromDeck]
  let discardPile = [...discard]
  const drawn: Card[] = []

  const refillDeckIfNeeded = () => {
    if (deck.length > 0) return
    if (discardPile.length <= 1) return

    const top = discardPile[discardPile.length - 1]
    const rest = discardPile.slice(0, -1)
    deck = shuffle(rest)
    discardPile = [top]
  }

  for (let i = 0; i < count; i += 1) {
    refillDeckIfNeeded()
    const card = deck.pop()
    if (!card) break
    drawn.push(card)
  }

  return {
    drawn,
    nextDeck: deck,
    nextDiscard: discardPile,
  }
}

function canStackAttack(card: Card, top: Card | null) {
  if (!top) return false
  if (!isAttackCard(card)) return false
  if (!isAttackCard(top)) return false
  return card.rank === top.rank || card.suit === top.suit
}

function canPlayCard(args: {
  card: Card
  top: Card | null
  activeSuit: Suit | null
  pendingDraw: number
  pendingSkipCount: number
  pendingRequest: RequestRank | null
  queenOpenTurn: boolean
}) {
  const { card, top, activeSuit, pendingDraw, pendingSkipCount, pendingRequest, queenOpenTurn } = args

  if (!top) return true
  if (isQueenSpades(card)) return true

  if (pendingDraw > 0) {
    return canStackAttack(card, top)
  }

  if (pendingSkipCount > 0) {
    return card.rank === '4'
  }

  if (pendingRequest) {
    return card.rank === pendingRequest || card.rank === 'J'
  }

  if (queenOpenTurn) {
    return true
  }

  if (activeSuit) {
    return card.suit === activeSuit || card.rank === top.rank
  }

  return card.suit === top.suit || card.rank === top.rank
}

function pickBestSuit(hand: Card[]) {
  const suitCounts = SUITS.map((suit) => ({
    suit,
    count: hand.filter((card) => card.suit === suit).length,
  }))
  suitCounts.sort((a, b) => b.count - a.count)
  return suitCounts[0]?.suit || SUITS[Math.floor(Math.random() * SUITS.length)]
}

function pickBestRequest(hand: Card[]): RequestRank {
  const rankCounts = REQUEST_RANKS.map((rank) => ({
    rank,
    count: hand.filter((card) => card.rank === rank).length,
  }))
  rankCounts.sort((a, b) => b.count - a.count)
  if ((rankCounts[0]?.count || 0) > 0) return rankCounts[0].rank
  return REQUEST_RANKS[Math.floor(Math.random() * REQUEST_RANKS.length)]
}

function removeCardsByIds(hand: Card[], ids: string[]) {
  const idSet = new Set(ids)
  return hand.filter((card) => !idSet.has(card.id))
}

export default function Makao() {
  const { user } = useAuth()
  const [gameMode, setGameMode] = useState<GameMode>('bot')
  const [showRules, setShowRules] = useState(false)
  const [onlineOverview, setOnlineOverview] = useState<MakaoOnlineOverview | null>(null)
  const [onlineRoom, setOnlineRoom] = useState<MakaoOnlineRoom | null>(null)
  const [onlineLoading, setOnlineLoading] = useState(false)
  const [onlineBusyKey, setOnlineBusyKey] = useState<string | null>(null)
  const [onlineMessage, setOnlineMessage] = useState<string | null>(null)
  const [onlineSeededRoomId, setOnlineSeededRoomId] = useState<number | null>(null)
  const [pendingOnlineSync, setPendingOnlineSync] = useState(false)

  const [deck, setDeck] = useState<Card[]>([])
  const [discardPile, setDiscardPile] = useState<Card[]>([])
  const [playerHand, setPlayerHand] = useState<Card[]>([])
  const [botHand, setBotHand] = useState<Card[]>([])

  const [activeSuit, setActiveSuit] = useState<Suit | null>(null)
  const [pendingDraw, setPendingDraw] = useState(0)
  const [pendingSkipCount, setPendingSkipCount] = useState(0)
  const [pendingRequest, setPendingRequest] = useState<RequestRank | null>(null)
  const [queenOpenTurn, setQueenOpenTurn] = useState(false)

  const [turn, setTurn] = useState<Turn>('player')
  const [winner, setWinner] = useState<Turn | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const [awaitingSuitPick, setAwaitingSuitPick] = useState(false)
  const [awaitingRequestPick, setAwaitingRequestPick] = useState(false)
  const [selectedPlayerCards, setSelectedPlayerCards] = useState<string[]>([])
  const [selectedBotCards, setSelectedBotCards] = useState<string[]>([])
  const [suitNaming, setSuitNaming] = useState<SuitNaming>(() => {
    if (typeof window === 'undefined') return 'classic'
    const raw = window.localStorage.getItem('makao.suitNaming.v1')
    return raw === 'regional' ? 'regional' : 'classic'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('makao.suitNaming.v1', suitNaming)
  }, [suitNaming])

  const topCard = useMemo(() => {
    if (discardPile.length === 0) return null
    return discardPile[discardPile.length - 1]
  }, [discardPile])

  const addLog = (message: string) => {
    setLogs((prev) => [`${new Date().toLocaleTimeString('pl-PL')} • ${message}`, ...prev].slice(0, 18))
  }

  const actorLabel = (actor: Turn) => {
    if (gameMode === 'local') return actor === 'player' ? 'Gracz 1' : 'Gracz 2'
    if (gameMode === 'online') return actor === 'player' ? 'Ty' : 'Znajomy'
    return actor === 'player' ? 'Ty' : 'Bot'
  }

  const isOnlineRoomReady = useMemo(() => {
    return gameMode === 'online' && !!onlineRoom && !!onlineRoom.state_json
  }, [gameMode, onlineRoom])

  const getOpponentUserId = () => {
    if (!user?.id || !onlineRoom) return 0
    return Number(user.id) === Number(onlineRoom.player_one_id)
      ? Number(onlineRoom.player_two_id)
      : Number(onlineRoom.player_one_id)
  }

  const buildOnlineStatePayload = () => {
    if (!onlineRoom || !user?.id) return null

    const me = Number(user.id)
    const amPlayerOne = me === Number(onlineRoom.player_one_id)

    return {
      deck,
      discard_pile: discardPile,
      player_one_hand: amPlayerOne ? playerHand : botHand,
      player_two_hand: amPlayerOne ? botHand : playerHand,
      active_suit: activeSuit,
      pending_draw: pendingDraw,
      pending_skip: pendingSkipCount > 0,
      pending_skip_count: pendingSkipCount,
      pending_request: pendingRequest,
      queen_open_turn: queenOpenTurn,
      awaiting_suit_pick: awaitingSuitPick,
      awaiting_request_pick: awaitingRequestPick,
      winner_user_id: winner
        ? (winner === 'player' ? me : getOpponentUserId())
        : null,
      logs,
    }
  }

  const applyOnlineRoomState = (room: MakaoOnlineRoom) => {
    if (!user?.id) return
    const raw = room.state_json as Record<string, unknown> | null
    if (!raw) return

    const me = Number(user.id)
    const amPlayerOne = me === Number(room.player_one_id)

    const p1 = (raw.player_one_hand as Card[]) || []
    const p2 = (raw.player_two_hand as Card[]) || []

    setDeck((raw.deck as Card[]) || [])
    setDiscardPile((raw.discard_pile as Card[]) || [])
    setPlayerHand(amPlayerOne ? p1 : p2)
    setBotHand(amPlayerOne ? p2 : p1)

    setActiveSuit((raw.active_suit as Suit | null) || null)
    setPendingDraw(Number(raw.pending_draw || 0))
    setPendingSkipCount(Number(raw.pending_skip_count || (raw.pending_skip ? 1 : 0)))
    setPendingRequest((raw.pending_request as RequestRank | null) || null)
    setQueenOpenTurn(Boolean(raw.queen_open_turn))
    setAwaitingSuitPick(Boolean(raw.awaiting_suit_pick))
    setAwaitingRequestPick(Boolean(raw.awaiting_request_pick))
    setLogs((raw.logs as string[]) || [])

    const winnerUserId = Number(raw.winner_user_id || 0)
    if (winnerUserId > 0) {
      setWinner(winnerUserId === me ? 'player' : 'bot')
    } else {
      setWinner(null)
    }

    setTurn(Number(room.turn_user_id || 0) === me ? 'player' : 'bot')
  }

  const startGame = (mode: GameMode = gameMode) => {
    const freshDeck = buildDeck()
    const p1 = freshDeck.splice(0, 5)
    const p2 = freshDeck.splice(0, 5)

    const burned: Card[] = []
    let firstDiscard = freshDeck.pop() || null

    while (firstDiscard && isFunctionalCard(firstDiscard) && freshDeck.length > 0) {
      burned.push(firstDiscard)
      firstDiscard = freshDeck.pop() || null
    }

    const pile = [...burned, ...(firstDiscard ? [firstDiscard] : [])]

    setDeck(freshDeck)
    setPlayerHand(p1)
    setBotHand(p2)
    setDiscardPile(pile)

    setActiveSuit(firstDiscard?.suit || null)
    setPendingDraw(0)
    setPendingSkipCount(0)
    setPendingRequest(null)
    setQueenOpenTurn(false)

    setTurn('player')
    setWinner(null)
    setAwaitingSuitPick(false)
    setAwaitingRequestPick(false)
    setSelectedPlayerCards([])
    setSelectedBotCards([])
    setLogs([])

    addLog(`Nowa gra (${mode === 'bot' ? 'vs bot' : mode === 'online' ? 'online ze znajomym' : 'lokalnie ze znajomym'}).`)
    if (burned.length > 0) {
      addLog(`Spalono ${burned.length} kar${burned.length === 1 ? 'te' : 't'} funkcyjnych na starcie.`)
    }
    if (firstDiscard) {
      addLog(`Startowa karta: ${fullCardName(firstDiscard)}.`)
    }
  }

  useEffect(() => {
    if (gameMode === 'online') {
      setWinner(null)
      return
    }

    startGame(gameMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode])

  useEffect(() => {
    if (gameMode !== 'online') return

    let mounted = true

    const load = async () => {
      if (mounted) setOnlineLoading(true)
      try {
        const data = await getMakaoOnlineOverview()
        if (!mounted) return
        setOnlineOverview(data)
        setOnlineRoom((data.active_room as MakaoOnlineRoom | null) || null)
      } catch {
        if (!mounted) return
        setOnlineMessage('Nie udalo sie pobrac lobby online.')
      } finally {
        if (mounted) setOnlineLoading(false)
      }
    }

    load()
    const id = window.setInterval(load, 6000)

    return () => {
      mounted = false
      window.clearInterval(id)
    }
  }, [gameMode])

  const refreshOnlineOverview = async () => {
    const data = await getMakaoOnlineOverview()
    setOnlineOverview(data)
    setOnlineRoom((data.active_room as MakaoOnlineRoom | null) || null)
  }

  const runOnlineAction = async (key: string, action: () => Promise<void>) => {
    setOnlineBusyKey(key)
    setOnlineMessage(null)
    try {
      await action()
      await refreshOnlineOverview()
    } catch {
      setOnlineMessage('Operacja online nie powiodla sie. Sprobuj ponownie.')
    } finally {
      setOnlineBusyKey(null)
    }
  }

  useEffect(() => {
    if (gameMode !== 'online' || !onlineRoom?.id) return

    let mounted = true

    const pollRoom = async () => {
      try {
        const latest = await getMakaoRoom(Number(onlineRoom.id))
        if (!mounted) return

        setOnlineRoom(latest)
        if (Number(latest.action_version || 0) !== Number(onlineRoom.action_version || 0)) {
          applyOnlineRoomState(latest)
        }
      } catch {
        // noop
      }
    }

    const id = window.setInterval(pollRoom, 2200)
    return () => {
      mounted = false
      window.clearInterval(id)
    }
  }, [gameMode, onlineRoom?.id, onlineRoom?.action_version])

  useEffect(() => {
    if (gameMode !== 'online' || !onlineRoom?.id || !user?.id) return
    if (onlineRoom.state_json) {
      applyOnlineRoomState(onlineRoom)
      return
    }

    if (onlineSeededRoomId === Number(onlineRoom.id)) {
      return
    }

    if (Number(onlineRoom.turn_user_id || 0) !== Number(user.id)) {
      return
    }

    startGame('online')
    setOnlineSeededRoomId(Number(onlineRoom.id))
    setPendingOnlineSync(true)
  }, [gameMode, onlineRoom, user?.id, onlineSeededRoomId])

  useEffect(() => {
    if (!pendingOnlineSync || gameMode !== 'online' || !onlineRoom?.id || !user?.id) return

    const payload = buildOnlineStatePayload()
    if (!payload) return

    const sync = async () => {
      try {
        const opponentId = getOpponentUserId()
        const turnUserId = turn === 'player' ? Number(user.id) : opponentId
        const nextVersion = Number(onlineRoom.action_version || 0) + 1

        const room = await syncMakaoRoomState({
          roomId: Number(onlineRoom.id),
          state: payload,
          turnUserId,
          actionVersion: nextVersion,
          winnerUserId: (payload.winner_user_id as number | null) || null,
        })

        setOnlineRoom(room)
      } catch {
        setOnlineMessage('Nie udalo sie zsynchronizowac ruchu online.')
      } finally {
        setPendingOnlineSync(false)
      }
    }

    sync()
  }, [pendingOnlineSync, gameMode, onlineRoom, user?.id, deck, discardPile, playerHand, botHand, activeSuit, pendingDraw, pendingSkipCount, pendingRequest, queenOpenTurn, awaitingSuitPick, awaitingRequestPick, winner, logs, turn])

  const getHand = (actor: Turn) => (actor === 'player' ? playerHand : botHand)

  const setHand = (actor: Turn, cards: Card[]) => {
    if (actor === 'player') {
      setPlayerHand(cards)
    } else {
      setBotHand(cards)
    }
  }

  const forceDrawAndPass = (actor: Turn, count: number) => {
    const draw = takeFromDeck(deck, discardPile, count)
    setDeck(draw.nextDeck)
    setDiscardPile(draw.nextDiscard)
    setHand(actor, [...getHand(actor), ...draw.drawn])
    addLog(`${actorLabel(actor)} dobiera ${draw.drawn.length} kart.`)
    setPendingDraw(0)
    if (actor === 'player') {
      setSelectedPlayerCards([])
    } else {
      setSelectedBotCards([])
    }
    setTurn(otherTurn(actor))
  }

  const playCardBy = (actor: Turn, cardsToPlay: Card[]) => {
    if (!topCard || winner) return

    const actorHand = getHand(actor)

    if (cardsToPlay.length === 0) return

    const playedIds = cardsToPlay.map((c) => c.id)
    const nextHand = removeCardsByIds(actorHand, playedIds)
    const nextDiscard = [...discardPile, ...cardsToPlay]
    const leadCard = cardsToPlay[cardsToPlay.length - 1]

    setHand(actor, nextHand)
    setDiscardPile(nextDiscard)
    if (actor === 'player') {
      setSelectedPlayerCards([])
    } else {
      setSelectedBotCards([])
    }
    addLog(`${actorLabel(actor)} zagrywa ${cardsToPlay.map(fullCardName).join(' + ')}.`)

    if (nextHand.length === 0) {
      setWinner(actor)
      addLog(`${actorLabel(actor)} wygrywa partie!`)
      return
    }

    if (isQueenSpades(leadCard)) {
      setPendingDraw(0)
      setPendingSkipCount(0)
      setPendingRequest(null)
      setActiveSuit(null)
      setQueenOpenTurn(true)
      setTurn(otherTurn(actor))
      addLog(`Q♠ kasuje wszystkie efekty. ${actorLabel(otherTurn(actor))} moze polozyc dowolna karte.`)
      return
    }

    setQueenOpenTurn(false)

    if (pendingDraw > 0) {
      const added = cardsToPlay.reduce((sum, c) => sum + attackValue(c), 0)
      setPendingDraw((prev) => prev + added)
      setActiveSuit(leadCard.suit)
      setTurn(otherTurn(actor))
      addLog(`Walka trwa, pula wzrasta do ${pendingDraw + added}.`)
      return
    }

    if (pendingSkipCount > 0) {
      const addedSkips = cardsToPlay.filter((c) => c.rank === '4').length
      setPendingSkipCount((prev) => prev + addedSkips)
      setActiveSuit(leadCard.suit)
      setTurn(otherTurn(actor))
      addLog(`Stop 4 zostal odbity. Czekanie rosnie do ${pendingSkipCount + addedSkips} kolejek.`)
      return
    }

    if (pendingRequest) {
      if (leadCard.rank === 'J') {
        if (actor === 'bot' && gameMode === 'bot') {
          const req = pickBestRequest(nextHand)
          setPendingRequest(req)
          setActiveSuit(leadCard.suit)
          setTurn(otherTurn(actor))
          addLog(`Bot przezada i ustawia ${req}. Teraz odpowiada przeciwnik.`)
        } else {
          setAwaitingRequestPick(true)
          setActiveSuit(leadCard.suit)
          addLog('Walet przezada. Wybierz nowa wartosc 5-10 albo brak zadania.')
        }
        return
      }

      if (leadCard.rank === pendingRequest) {
        setPendingRequest(null)
        setActiveSuit(leadCard.suit)
        setTurn(otherTurn(actor))
        addLog(`Zadanie ${pendingRequest} zostalo spelnione.`)
        return
      }
    }

    if (isAttackCard(leadCard)) {
      const drawNeed = cardsToPlay.reduce((sum, c) => sum + attackValue(c), 0)
      setPendingDraw(drawNeed)
      setActiveSuit(leadCard.suit)
      setTurn(otherTurn(actor))
      addLog(`Atak: kolejny gracz musi dobrac ${drawNeed} lub sie bronic.`)
      return
    }

    if (leadCard.rank === '4') {
      const skipCount = cardsToPlay.filter((c) => c.rank === '4').length
      setPendingSkipCount(skipCount)
      setActiveSuit(leadCard.suit)
      setTurn(otherTurn(actor))
      addLog(`Stop: kolejny gracz czeka ${skipCount} kolejk${skipCount === 1 ? 'e' : 'i'} lub zagrywa 4.`)
      return
    }

    if (leadCard.rank === 'A') {
      if (actor === 'bot' && gameMode === 'bot') {
        const suit = pickBestSuit(nextHand)
        setActiveSuit(suit)
        setTurn(otherTurn(actor))
        addLog(`As zmienia kolor na ${suitName(suit)}.`)
      } else {
        setAwaitingSuitPick(true)
        setActiveSuit(null)
        addLog('As zmienia kolor. Wybierz kolor.')
      }
      return
    }

    if (leadCard.rank === 'J') {
      if (actor === 'bot' && gameMode === 'bot') {
        const req = pickBestRequest(nextHand)
        setPendingRequest(req)
        setActiveSuit(leadCard.suit)
        setTurn(otherTurn(actor))
        addLog(`Walet zadaje ${req}. Najpierw odpowiada przeciwnik.`)
      } else {
        setAwaitingRequestPick(true)
        setActiveSuit(leadCard.suit)
        addLog('Walet zadaje karte 5-10. Wybierz wartosc albo brak zadania.')
      }
      return
    }

    if (isReverseKing(leadCard)) {
      setActiveSuit(leadCard.suit)
      setTurn(actor)
      addLog(`K♠ robi jedna kolejke wstecz. ${actorLabel(actor)} gra jeszcze raz.`)
      return
    }

    setActiveSuit(leadCard.suit)
    setTurn(otherTurn(actor))
  }

  const getSelectedCards = (actor: Turn) => {
    const ids = actor === 'player' ? selectedPlayerCards : selectedBotCards
    const hand = getHand(actor)
    if (ids.length === 0) return []
    const idSet = new Set(ids)
    return hand.filter((card) => idSet.has(card.id))
  }

  const getPlayableSelection = (actor: Turn) => {
    if (!topCard) return [] as Card[]

    const selected = getSelectedCards(actor)
    if (selected.length === 0) return [] as Card[]

    const sameRank = selected.every((c) => c.rank === selected[0].rank)
    if (!sameRank) return [] as Card[]

    const lead = selected[selected.length - 1]
    const leadPlayable = canPlayCard({
      card: lead,
      top: topCard,
      activeSuit,
      pendingDraw,
      pendingSkipCount,
      pendingRequest,
      queenOpenTurn,
    })

    if (!leadPlayable) return [] as Card[]

    if (pendingRequest) {
      if (selected[0].rank !== pendingRequest && selected[0].rank !== 'J') {
        return [] as Card[]
      }
      return selected
    }

    return selected
  }

  const toggleCardSelection = (actor: Turn, card: Card) => {
    if (!topCard || winner || awaitingSuitPick || awaitingRequestPick) return

    const isActorsTurn = turn === actor
    if (!isActorsTurn) return

    const playableAsSingle = canPlayCard({
      card,
      top: topCard,
      activeSuit,
      pendingDraw,
      pendingSkipCount,
      pendingRequest,
      queenOpenTurn,
    })

    if (!playableAsSingle) return

    const setter = actor === 'player' ? setSelectedPlayerCards : setSelectedBotCards

    setter((prev) => {
      if (prev.includes(card.id)) {
        return prev.filter((id) => id !== card.id)
      }

      const selected = getHand(actor).filter((h) => prev.includes(h.id))
      if (selected.length > 0 && selected[0].rank !== card.rank) {
        return [card.id]
      }

      return [...prev, card.id]
    })
  }

  const onThrowSelected = (actor: Turn) => {
    if (!topCard || winner || awaitingSuitPick || awaitingRequestPick) return
    if (turn !== actor) return

    const selected = getPlayableSelection(actor)
    if (selected.length === 0) return

    playCardBy(actor, selected)
    if (gameMode === 'online' && actor === 'player') {
      setPendingOnlineSync(true)
    }
  }

  const onPickSuit = (suit: Suit) => {
    if (!awaitingSuitPick || winner) return
    setActiveSuit(suit)
    setAwaitingSuitPick(false)
    setTurn(otherTurn(turn))
    addLog(`${actorLabel(turn)} ustawia kolor ${suitName(suit)}.`)
    if (gameMode === 'online' && turn === 'player') setPendingOnlineSync(true)
  }

  const onPickRequest = (rank: RequestRank | null) => {
    if (!awaitingRequestPick || winner) return
    setPendingRequest(rank)
    setAwaitingRequestPick(false)
    if (rank) {
      setTurn(otherTurn(turn))
      addLog(`${actorLabel(turn)} zadaje ${rank}. Teraz przeciwnik musi zagrac ${rank} albo dobrac.`)
    } else {
      setTurn(otherTurn(turn))
      addLog(`${actorLabel(turn)} nie zadaje nic. Dalej gramy do koloru waleta.`)
    }
    if (gameMode === 'online' && turn === 'player') setPendingOnlineSync(true)
  }

  const onDrawClick = () => {
    if (winner || awaitingSuitPick || awaitingRequestPick) return

    const shouldSync = gameMode === 'online' && turn === 'player'

    if (pendingSkipCount > 0) {
      setPendingSkipCount((prev) => Math.max(0, prev - 1))
      setTurn(otherTurn(turn))
      addLog(`${actorLabel(turn)} czeka kolejke.`)
      if (shouldSync) setPendingOnlineSync(true)
      return
    }

    if (pendingDraw > 0) {
      forceDrawAndPass(turn, pendingDraw)
      if (shouldSync) setPendingOnlineSync(true)
      return
    }

    if (pendingRequest) {
      forceDrawAndPass(turn, 1)
      addLog(`Zadanie ${pendingRequest} pozostaje aktywne.`)
      if (shouldSync) setPendingOnlineSync(true)
      return
    }

    const draw = takeFromDeck(deck, discardPile, 1)
    if (draw.drawn.length === 0) {
      addLog('Brak kart do dobrania.')
      setTurn(otherTurn(turn))
      if (shouldSync) setPendingOnlineSync(true)
      return
    }

    setDeck(draw.nextDeck)
    setDiscardPile(draw.nextDiscard)
    setHand(turn, [...getHand(turn), ...draw.drawn])
    addLog(`${actorLabel(turn)} dobiera 1 karte.`)
    setTurn(otherTurn(turn))
    if (shouldSync) setPendingOnlineSync(true)
  }

  useEffect(() => {
    if (gameMode !== 'bot') return
    if (winner || turn !== 'bot' || awaitingSuitPick || awaitingRequestPick || !topCard) return

    const id = window.setTimeout(() => {
      const playable = botHand.filter((card) => canPlayCard({
        card,
        top: topCard,
        activeSuit,
        pendingDraw,
        pendingSkipCount,
        pendingRequest,
        queenOpenTurn,
      }))

      if (playable.length === 0) {
        onDrawClick()
        return
      }

      if (pendingRequest) {
        const jCard = botHand.find((card) => card.rank === 'J')
        if (jCard && Math.random() < 0.45) {
          playCardBy('bot', [jCard])
          return
        }
      }

      const chosen = playable[Math.floor(Math.random() * playable.length)]
      playCardBy('bot', [chosen])
    }, 650)

    return () => window.clearTimeout(id)
  }, [
    gameMode,
    winner,
    turn,
    awaitingSuitPick,
    awaitingRequestPick,
    topCard,
    botHand,
    activeSuit,
    pendingDraw,
    pendingSkipCount,
    pendingRequest,
    queenOpenTurn,
  ])

  const statusText = useMemo(() => {
    if (gameMode === 'online') {
      if (!isOnlineRoomReady) {
        return 'Tryb online: zapraszaj znajomych i dolaczaj do pokoju Makao.'
      }

      if (winner === 'player') return 'Wygrales partie online.'
      if (winner === 'bot') return 'Znajomy wygral partie online.'
      if (awaitingSuitPick && turn === 'player') return 'Wybierz kolor po asie.'
      if (awaitingRequestPick && turn === 'player') return 'Wybierz zadanie waleta (5-10).'
      if (pendingDraw > 0 && turn === 'player') return `Atak aktywny: dobierz ${pendingDraw} albo sie bron.`
      if (pendingSkipCount > 0 && turn === 'player') return `Aktywna 4: czekasz ${pendingSkipCount} kolejk${pendingSkipCount === 1 ? 'e' : 'i'} albo odbijasz 4.`
      if (pendingRequest && turn === 'player') return `Aktywne zadanie: ${pendingRequest}.`
      return turn === 'player' ? 'Twoja tura online.' : 'Tura znajomego.'
    }

    if (winner === 'player') return gameMode === 'bot' ? 'Wygrales z botem.' : 'Wygral Gracz 1.'
    if (winner === 'bot') return gameMode === 'bot' ? 'Bot wygral partie.' : 'Wygral Gracz 2.'
    if (awaitingSuitPick) return `${actorLabel(turn)} wybiera kolor po asie.`
    if (awaitingRequestPick) return `${actorLabel(turn)} wybiera zadanie waleta (5-10).`
    if (pendingDraw > 0) return `${actorLabel(turn)}: aktywny atak ${pendingDraw}.`
    if (pendingSkipCount > 0) return `${actorLabel(turn)}: aktywne zatrzymanie 4 (${pendingSkipCount}).`
    if (pendingRequest) return `${actorLabel(turn)}: aktywne zadanie ${pendingRequest}.`
    return `${actorLabel(turn)} wykonuje ruch.`
  }, [winner, gameMode, isOnlineRoomReady, awaitingSuitPick, awaitingRequestPick, pendingDraw, pendingSkipCount, pendingRequest, turn])

  const playerSelection = getPlayableSelection('player')
  const botSelection = getPlayableSelection('bot')

  const onlineTurnOwnerLabel = useMemo(() => {
    if (!onlineRoom?.turn_user_id || !user?.id) return 'nieznana'
    return Number(onlineRoom.turn_user_id) === Number(user.id) ? 'Ty' : 'Znajomy'
  }, [onlineRoom?.turn_user_id, user?.id])

  const currentTurnLabel = useMemo(() => {
    if (gameMode === 'online') {
      if (isOnlineRoomReady) return turn === 'player' ? 'Ty' : 'Znajomy'
      return onlineTurnOwnerLabel
    }

    if (gameMode === 'local') return turn === 'player' ? 'Gracz 1' : 'Gracz 2'
    return turn === 'player' ? 'Ty' : 'Bot'
  }, [gameMode, isOnlineRoomReady, turn, onlineTurnOwnerLabel])

  return (
    <div className="card makao-card">
      <div className="makao-header-row">
        <h1 className="makao-title">Makao</h1>
        <div className="makao-top-actions">
          <div className="makao-mode-switch" role="group" aria-label="Nazewnictwo kolorow">
            <button
              type="button"
              className={`makao-mode-btn ${suitNaming === 'classic' ? 'active' : ''}`}
              onClick={() => setSuitNaming('classic')}
            >
              Kier/Karo/Trefl/Pik
            </button>
            <button
              type="button"
              className={`makao-mode-btn ${suitNaming === 'regional' ? 'active' : ''}`}
              onClick={() => setSuitNaming('regional')}
            >
              Czerwono/Krajc/Dzwonek/Wino
            </button>
          </div>

          <div className="makao-mode-switch" role="group" aria-label="Tryb gry">
            <button
              type="button"
              className={`makao-mode-btn ${gameMode === 'bot' ? 'active' : ''}`}
              onClick={() => setGameMode('bot')}
            >
              Gra z botem
            </button>
            <button
              type="button"
              className={`makao-mode-btn ${gameMode === 'online' ? 'active' : ''}`}
              onClick={() => setGameMode('online')}
            >
              Online
            </button>

            <button
              type="button"
              className={`makao-mode-btn ${gameMode === 'local' ? 'active' : ''}`}
              onClick={() => setGameMode('local')}
            >
              Gra ze znajomym
            </button>
          </div>

          <button type="button" className="makao-new-game-btn" onClick={() => startGame(gameMode)} disabled={gameMode === 'online'}>
            Nowa gra
          </button>
        </div>
      </div>

      <div className="small muted" style={{ marginBottom: 10 }}>{statusText}</div>
      <div className="makao-turn-row">
        <span className={`makao-turn-pill ${turn === 'player' ? 'is-player' : 'is-opponent'}`}>
          Kolej: {currentTurnLabel}
        </span>
      </div>

      <div className="makao-layout">
        <section className="makao-panel">
          <h3 className="makao-section-title">Sterowanie</h3>

          {gameMode === 'online' && (
            <div className="makao-online-box">
              {onlineMessage && <div className="small" style={{ color: '#fca5a5' }}>{onlineMessage}</div>}
              {onlineLoading && <div className="small muted">Ladowanie lobby...</div>}

              {onlineOverview?.active_room && (
                <div className="makao-online-room">
                  <div className="small muted">Aktywny pokoj online</div>
                  <div className="small">Pokoj #{onlineOverview.active_room.id}</div>
                  <div className="small muted">Status: {onlineOverview.active_room.status}</div>
                  <div className="small muted">Kolej: {onlineTurnOwnerLabel}</div>
                  <div className="small muted">Synchronizacja ruchow jest aktywna po stronie API (beta).</div>
                  <button
                    type="button"
                    className="makao-mini-btn ghost"
                    style={{ marginTop: 8 }}
                    onClick={() => runOnlineAction(`leave-${onlineOverview.active_room?.id}`, () => leaveMakaoRoom(Number(onlineOverview.active_room?.id || 0)))}
                  >
                    Opusc pokoj
                  </button>
                </div>
              )}

              <div className="makao-online-list">
                <div className="small muted">Znajomi ({onlineOverview?.friends?.length || 0})</div>
                {(onlineOverview?.friends || []).slice(0, 8).map((friend: FriendUser) => {
                  const key = `invite-${friend.id}`
                  return (
                    <div key={friend.id} className="makao-online-row">
                      <span>{`${friend.imie || ''} ${friend.nazwisko || ''}`.trim() || friend.email || `Uzytkownik #${friend.id}`}</span>
                      <button
                        type="button"
                        className="makao-mini-btn"
                        disabled={onlineBusyKey === key}
                        onClick={() => runOnlineAction(key, () => sendMakaoInvite(Number(friend.id)))}
                      >
                        Zapros
                      </button>
                    </div>
                  )
                })}
                {(onlineOverview?.friends || []).length === 0 && <div className="small muted">Brak znajomych do zaproszenia.</div>}
              </div>

              <div className="makao-online-list">
                <div className="small muted">Zaproszenia do Ciebie</div>
                {(onlineOverview?.incoming || []).map((invite: MakaoOnlineInvite) => {
                  const acceptKey = `in-accept-${invite.id}`
                  const rejectKey = `in-reject-${invite.id}`
                  return (
                    <div key={invite.id} className="makao-online-row">
                      <span>{`${invite.imie || ''} ${invite.nazwisko || ''}`.trim() || invite.email || `Uzytkownik #${invite.from_user_id}`}</span>
                      <div className="makao-online-actions">
                        <button
                          type="button"
                          className="makao-mini-btn"
                          disabled={onlineBusyKey === acceptKey}
                          onClick={() => runOnlineAction(acceptKey, async () => { await acceptMakaoInvite(Number(invite.id)) })}
                        >
                          Akceptuj
                        </button>
                        <button
                          type="button"
                          className="makao-mini-btn ghost"
                          disabled={onlineBusyKey === rejectKey}
                          onClick={() => runOnlineAction(rejectKey, () => rejectMakaoInvite(Number(invite.id)))}
                        >
                          Odrzuc
                        </button>
                      </div>
                    </div>
                  )
                })}
                {(onlineOverview?.incoming || []).length === 0 && <div className="small muted">Brak przychodzacych zaproszen.</div>}
              </div>

              <div className="makao-online-list">
                <div className="small muted">Twoje wyslane</div>
                {(onlineOverview?.outgoing || []).map((invite: MakaoOnlineInvite) => {
                  const cancelKey = `out-cancel-${invite.id}`
                  return (
                    <div key={invite.id} className="makao-online-row">
                      <span>{`${invite.imie || ''} ${invite.nazwisko || ''}`.trim() || invite.email || `Uzytkownik #${invite.to_user_id}`}</span>
                      <button
                        type="button"
                        className="makao-mini-btn ghost"
                        disabled={onlineBusyKey === cancelKey}
                        onClick={() => runOnlineAction(cancelKey, () => cancelMakaoInvite(Number(invite.id)))}
                      >
                        Cofnij
                      </button>
                    </div>
                  )
                })}
                {(onlineOverview?.outgoing || []).length === 0 && <div className="small muted">Brak wyslanych zaproszen.</div>}
              </div>

              {user?.id && <div className="small muted">Twoj ID gracza: {user.id}</div>}
            </div>
          )}

          {(gameMode !== 'online' || isOnlineRoomReady) && (
            <>

          <button
            type="button"
            className="makao-rules-toggle"
            onClick={() => setShowRules((prev) => !prev)}
          >
            {showRules ? 'Ukryj zasady' : 'Pokaz zasady'}
          </button>

          {showRules && (
            <div className="makao-rules">
              <ul>
                <li>Nie startujemy od karty funkcyjnej: palimy az wyjdzie 5-10.</li>
                <li>2, 3 i K sa waleczne: w walce dokladasz po kolorze lub figurze.</li>
                <li>4 zatrzymuje kolejki i sumuje oczekiwanie, gdy jest odbijana kolejnymi 4.</li>
                <li>A zmienia kolor.</li>
                <li>J zadaje 5-10; podczas zadania mozna przezadac J albo odpuscic zadanie.</li>
                <li>Moesz rzucic kilka kart tej samej figury, zaznaczajac je przed rzutem.</li>
                <li>Q♠ anuluje wszystko pod soba i otwiera dowolna karte.</li>
                <li>K♠ robi jedna kolejke wstecz i wraca do normalnej kolejnosci.</li>
              </ul>
            </div>
          )}

          <div className="makao-meta-list">
            <div className="makao-meta-item">
              <span>Gracz 1</span>
              <strong>{playerHand.length}</strong>
            </div>
            <div className="makao-meta-item">
              <span>{gameMode === 'bot' ? 'Bot' : gameMode === 'online' ? 'Znajomy' : 'Gracz 2'}</span>
              <strong>{botHand.length}</strong>
            </div>
            <div className="makao-meta-item">
              <span>Stos dobierania</span>
              <strong>{deck.length}</strong>
            </div>
          </div>
            </>
          )}
        </section>

        <section className="makao-table">
          {gameMode === 'online' && !isOnlineRoomReady ? (
            <div className="makao-online-placeholder">
              <h3 className="makao-section-title">Stol online</h3>
              <p className="small muted">Lobby online jest aktywne. Po akceptacji zaproszenia pokoj pojawi sie po lewej stronie.</p>
              <p className="small muted">Silnik synchronizacji ruchow po API jest gotowy po stronie backendu i przygotowany do kolejnego kroku integracji UX rozgrywki.</p>
            </div>
          ) : (
            <>
          <div className="makao-opponent-row">
            <div className="makao-player-head">
              <span className="small muted">{gameMode === 'local' ? 'Reka gracza 2' : gameMode === 'online' ? 'Reka znajomego (online)' : 'Przeciwnik (bot)'}</span>
              {gameMode === 'local' && (
                <button
                  type="button"
                  className="makao-draw-btn"
                  onClick={() => onThrowSelected('bot')}
                  disabled={turn !== 'bot' || botSelection.length === 0 || awaitingSuitPick || awaitingRequestPick || !!winner}
                >
                  Rzuc {botSelection.length > 0 ? `(${botSelection.length})` : ''}
                </button>
              )}
            </div>
            <div className="makao-opponent-cards">
              {(gameMode === 'bot' || gameMode === 'online') && botHand.map((card) => (
                <div key={card.id} className="makao-card-face down" />
              ))}

              {gameMode === 'local' && botHand.map((card) => {
                const playable = canPlayCard({
                  card,
                  top: topCard,
                  activeSuit,
                  pendingDraw,
                  pendingSkipCount,
                  pendingRequest,
                  queenOpenTurn,
                }) && turn === 'bot' && !awaitingSuitPick && !awaitingRequestPick && !winner

                const selected = selectedBotCards.includes(card.id)

                return (
                  <button
                    key={card.id}
                    type="button"
                    className={`makao-card-face ${cardColorClass(card)} ${playable ? 'playable' : ''} ${selected ? 'selected' : ''}`}
                    disabled={!playable && !selected}
                    onClick={() => toggleCardSelection('bot', card)}
                  >
                    <span className="makao-card-content">
                      <span className="makao-card-rank">{card.rank}</span>
                      <span className="makao-card-suit">{suitSymbol(card.suit)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="makao-center-row">
            <div className="makao-pile">
              <div className="small muted">Dobieranie</div>
              <div className="makao-card-face down">{deck.length}</div>
            </div>

            <div className="makao-pile">
              <div className="small muted">Stol</div>
              <div className={`makao-card-face ${topCard ? cardColorClass(topCard) : ''}`}>
                {topCard ? (
                  <span className="makao-card-content">
                    <span className="makao-card-rank">{topCard.rank}</span>
                    <span className="makao-card-suit">{suitSymbol(topCard.suit)}</span>
                  </span>
                ) : '-'}
              </div>
              <div className="small muted">Aktywny kolor: {activeSuit ? suitName(activeSuit, suitNaming) : '-'}</div>
            </div>
          </div>

          {awaitingSuitPick && (gameMode !== 'online' || turn === 'player') && (
            <div className="makao-suit-picker">
              <div className="small muted">Wybierz kolor po asie:</div>
              <div className="makao-suit-actions">
                {SUITS.map((suit) => (
                  <button
                    key={suit}
                    type="button"
                    className="makao-suit-btn"
                    onClick={() => onPickSuit(suit)}
                  >
                    {suitSymbol(suit)} {suitName(suit, suitNaming)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {awaitingRequestPick && (gameMode !== 'online' || turn === 'player') && (
            <div className="makao-suit-picker">
              <div className="small muted">Wybierz zadanie waleta (5-10):</div>
              <div className="makao-suit-actions">
                {REQUEST_RANKS.map((rank) => (
                  <button
                    key={rank}
                    type="button"
                    className="makao-suit-btn"
                    onClick={() => onPickRequest(rank)}
                  >
                    {rank}
                  </button>
                ))}
                <button
                  type="button"
                  className="makao-suit-btn"
                  onClick={() => onPickRequest(null)}
                >
                  Brak zadania
                </button>
              </div>
            </div>
          )}

          <div className="makao-player-row">
            <div className="makao-player-head">
              <span className="small muted">Reka gracza 1</span>
              <div className="makao-player-head-actions">
                <button
                  type="button"
                  className="makao-draw-btn"
                  onClick={() => onThrowSelected('player')}
                  disabled={
                    turn !== 'player' ||
                    playerSelection.length === 0 ||
                    awaitingSuitPick ||
                    awaitingRequestPick ||
                    !!winner
                  }
                >
                  Rzuc {playerSelection.length > 0 ? `(${playerSelection.length})` : ''}
                </button>
                <button
                  type="button"
                  className="makao-draw-btn"
                  onClick={onDrawClick}
                  disabled={
                    !!winner ||
                    awaitingSuitPick ||
                    awaitingRequestPick ||
                    ((gameMode === 'bot' || gameMode === 'online') && turn !== 'player')
                  }
                >
                  {pendingSkipCount > 0 ? `Czekaj (${pendingSkipCount})` : pendingDraw > 0 ? `Dobierz ${pendingDraw}` : pendingRequest ? 'Dobierz 1' : 'Dobierz'}
                </button>
              </div>
            </div>
            <div className="makao-player-cards">
              {playerHand.map((card) => {
                const playable = canPlayCard({
                  card,
                  top: topCard,
                  activeSuit,
                  pendingDraw,
                  pendingSkipCount,
                  pendingRequest,
                  queenOpenTurn,
                }) && turn === 'player' && !awaitingSuitPick && !awaitingRequestPick && !winner

                const selected = selectedPlayerCards.includes(card.id)

                return (
                  <button
                    key={card.id}
                    type="button"
                    className={`makao-card-face ${cardColorClass(card)} ${playable ? 'playable' : ''} ${selected ? 'selected' : ''}`}
                    disabled={!playable && !selected}
                    onClick={() => toggleCardSelection('player', card)}
                  >
                    <span className="makao-card-content">
                      <span className="makao-card-rank">{card.rank}</span>
                      <span className="makao-card-suit">{suitSymbol(card.suit)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
            </>
          )}
        </section>

        <aside className="makao-panel">
          <h3 className="makao-section-title">Log ruchow</h3>
          <div className="makao-log-list">
            {logs.length === 0 && <div className="small muted">Brak zdarzen.</div>}
            {logs.map((entry, idx) => (
              <div key={`${entry}-${idx}`} className="makao-log-item">
                {entry}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
