import { create } from 'zustand'
import type { Room, RoomConfig, Round, Submission } from '../types/game'
import { CAPTION_CARDS, PHOTO_CARDS } from '../data/baseDeck'
import { shuffle } from '../utils/shuffle'
import { generateId } from '../utils/uuid'

type GameStore = {
  room: Room | null
  createRoom: (names: string[], config: RoomConfig) => void
  startGame: () => void
  submitCard: (playerId: string, cardId: string) => void
  revealNext: () => void
  pickWinner: (playerId: string) => void
  reset: () => void
}

function buildDeck(config: RoomConfig) {
  const captions = config.familyMode
    ? CAPTION_CARDS.filter(c => c.familySafe)
    : CAPTION_CARDS
  const photos = config.familyMode
    ? PHOTO_CARDS.filter(c => c.familySafe)
    : PHOTO_CARDS
  return {
    captions: shuffle(captions),
    photos: shuffle(photos),
  }
}

function dealHands(room: Room): Room {
  const captions = [...room.deck.captions]
  const players = room.players.map(p => {
    if (p.isJudge) return p
    const hand = captions.splice(0, 7)
    return { ...p, hand }
  })
  return { ...room, players, deck: { ...room.deck, captions } }
}

function startRound(room: Room): Room {
  let photos = [...room.deck.photos]
  if (photos.length === 0) {
    photos = shuffle(PHOTO_CARDS)
  }
  const photoCard = photos.shift()!
  const round: Round = {
    id: generateId(),
    photoCard,
    submissions: [],
    winnerId: null,
    judgeExplanation: null,
    phase: 'submitting',
    revealIndex: 0,
    timerExpiresAt: room.config.rapidFireSeconds
      ? Date.now() + room.config.rapidFireSeconds * 1000
      : null,
  }
  return { ...room, currentRound: round, deck: { ...room.deck, photos } }
}

function refillHands(room: Room): Room {
  const captions = [...room.deck.captions]
  const players = room.players.map(p => {
    if (p.isJudge) return p  // preserve judge's hand — don't clear it
    const needed = 7 - p.hand.length
    const refill = captions.splice(0, needed)
    return { ...p, hand: [...p.hand, ...refill] }
  })
  return { ...room, players, deck: { ...room.deck, captions } }
}

export const useGameStore = create<GameStore>((set, get) => ({
  room: null,

  createRoom(names, config) {
    const players = names.map(name => ({
      id: generateId(),
      name,
      score: 0,
      hand: [],
      isJudge: false,
    }))
    const deck = buildDeck(config)
    const room: Room = {
      id: generateId(),
      players,
      config,
      state: 'lobby',
      currentRound: null,
      judgeIndex: 0,
      deck,
    }
    set({ room })
  },

  startGame() {
    const { room } = get()
    if (!room) return
    const withJudge: Room = {
      ...room,
      state: 'playing',
      players: room.players.map((p, i) => ({ ...p, isJudge: i === 0 })),
      judgeIndex: 0,
    }
    const withHands = dealHands(withJudge)
    const withRound = startRound(withHands)
    set({ room: withRound })
  },

  submitCard(playerId, cardId) {
    const { room } = get()
    if (!room || !room.currentRound) return
    const player = room.players.find(p => p.id === playerId)
    if (!player) return
    const card = player.hand.find(c => c.id === cardId)
    if (!card) return

    const submission: Submission = {
      id: generateId(),
      playerId,
      card,
      revealed: false,
    }

    const updatedPlayers = room.players.map(p =>
      p.id === playerId ? { ...p, hand: p.hand.filter(c => c.id !== cardId) } : p
    )
    const updatedSubmissions = [...room.currentRound.submissions, submission]
    const nonJudgeCount = room.players.filter(p => !p.isJudge).length
    const allSubmitted = updatedSubmissions.length === nonJudgeCount

    set({
      room: {
        ...room,
        players: updatedPlayers,
        currentRound: {
          ...room.currentRound,
          submissions: shuffle(updatedSubmissions),
          phase: allSubmitted ? 'revealing' : 'submitting',
        },
      },
    })
  },

  revealNext() {
    const { room } = get()
    if (!room || !room.currentRound) return
    const { revealIndex, submissions } = room.currentRound
    if (revealIndex >= submissions.length) return

    const updatedSubmissions = submissions.map((s, i) =>
      i === revealIndex ? { ...s, revealed: true } : s
    )
    set({
      room: {
        ...room,
        currentRound: {
          ...room.currentRound,
          submissions: updatedSubmissions,
          revealIndex: revealIndex + 1,
        },
      },
    })
  },

  pickWinner(playerId) {
    const { room } = get()
    if (!room || !room.currentRound) return

    const updatedPlayers = room.players.map(p =>
      p.id === playerId ? { ...p, score: p.score + 1 } : p
    )
    const winner = updatedPlayers.find(p => p.id === playerId)!
    if (winner.score >= room.config.targetScore) {
      set({
        room: {
          ...room,
          players: updatedPlayers,
          state: 'ended',
          currentRound: { ...room.currentRound, winnerId: playerId, phase: 'complete' },
        },
      })
      return
    }

    const nextJudgeIndex = (room.judgeIndex + 1) % room.players.length
    const withNewJudge: Room = {
      ...room,
      players: updatedPlayers.map((p, i) => ({ ...p, isJudge: i === nextJudgeIndex })),
      judgeIndex: nextJudgeIndex,
      currentRound: { ...room.currentRound, winnerId: playerId, phase: 'complete' },
    }
    const withFilledHands = refillHands(withNewJudge)
    const withNewRound = startRound(withFilledHands)
    setTimeout(() => {
      set({ room: withNewRound })
    }, 2000)
  },

  reset() {
    set({ room: null })
  },
}))
