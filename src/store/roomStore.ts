import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { Room, Card, RoomConfig } from '../types/game'
import { shuffle } from '../utils/shuffle'
import { generateId } from '../utils/uuid'
import { CAPTION_CARDS, PHOTO_CARDS } from '../data/baseDeck'

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function buildDeck(config: RoomConfig) {
  const familyFilter = (c: Card) => !config.familyMode || c.familySafe
  return {
    captions: shuffle(CAPTION_CARDS.filter(familyFilter)),
    photos: shuffle(PHOTO_CARDS.filter(familyFilter)),
  }
}

function dealHands(room: Room): Room {
  const captions = [...room.deck.captions]
  const players = room.players.map(p => {
    const hand: Card[] = []
    while (hand.length < 7 && captions.length > 0) {
      hand.push(captions.shift()!)
    }
    return { ...p, hand }
  })
  return { ...room, players, deck: { ...room.deck, captions } }
}

async function persistRoom(room: Room) {
  await supabase
    .from('rooms')
    .update({ data: room, state: room.state })
    .eq('id', room.id)
}

type RoomStoreState = {
  room: Room | null
  loading: boolean
  error: string | null
  setRoom: (room: Room) => void
  createRoom: (hostId: string, displayName: string, avatarColor: string, config: RoomConfig) => Promise<string>
  joinRoom: (code: string, profileId: string, displayName: string, avatarColor: string) => Promise<void>
  subscribeToRoom: (roomId: string) => () => void
  startGame: () => Promise<void>
  submitCard: (playerId: string, card: Card) => void
  revealNext: () => void
  castVote: (voterId: string, submissionId: string) => void
  tallyVotes: () => void
  advanceRound: () => Promise<void>
  setReady: (profileId: string, ready: boolean) => void
}

export const useRoomStore = create<RoomStoreState>((set, get) => ({
  room: null,
  loading: false,
  error: null,

  setRoom: (room) => set({ room }),

  createRoom: async (hostId, displayName, avatarColor, config) => {
    const code = generateRoomCode()
    const deck = buildDeck(config)
    const room: Room = {
      id: generateId(),
      code,
      hostId,
      players: [{ profileId: hostId, displayName, avatarColor, score: 0, hand: [], isReady: false, isOnline: true }],
      config,
      state: 'lobby',
      currentRound: null,
      deck,
    }
    const { data, error } = await supabase
      .from('rooms')
      .insert({ id: room.id, code, state: 'lobby', data: room })
      .select()
      .single()
    if (error) throw error
    set({ room })
    return code
  },

  joinRoom: async (code, profileId, displayName, avatarColor) => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()
    if (error || !data) throw new Error('Room not found')
    const room: Room = data.data
    if (room.state !== 'lobby') throw new Error('Game already started')
    if (room.players.length >= 8) throw new Error('Room is full')
    if (room.players.find(p => p.profileId === profileId)) return // already in room
    const updated: Room = {
      ...room,
      players: [...room.players, { profileId, displayName, avatarColor, score: 0, hand: [], isReady: false, isOnline: true }],
    }
    await persistRoom(updated)
    set({ room: updated })
  },

  subscribeToRoom: (roomId) => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload: { new: { data: Room } }) => {
          set({ room: payload.new.data })
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  },

  startGame: async () => {
    const { room } = get()
    if (!room) return
    const started = dealHands({ ...room, state: 'playing' })
    const photos = started.deck.photos.length > 0 ? started.deck.photos : shuffle(PHOTO_CARDS)
    const photoCard = photos[0]
    const remainingPhotos = photos.slice(1)
    const round = {
      id: generateId(),
      photoCard,
      submissions: [],
      votes: [],
      winnerIds: [],
      phase: 'submitting' as const,
      revealIndex: 0,
      timerExpiresAt: room.config.rapidFireSeconds
        ? Date.now() + room.config.rapidFireSeconds * 1000
        : null,
    }
    const updated: Room = { ...started, currentRound: round, deck: { ...started.deck, photos: remainingPhotos } }
    await persistRoom(updated)
    set({ room: updated })
  },

  submitCard: (playerId, card) => {
    const { room } = get()
    if (!room?.currentRound) return
    if (room.currentRound.submissions.find(s => s.playerId === playerId)) return
    const submission = { id: generateId(), playerId, card, revealed: false }
    const allSubmitted = room.currentRound.submissions.length + 1 >= room.players.length
    const updatedRound = {
      ...room.currentRound,
      submissions: [...room.currentRound.submissions, submission],
      phase: allSubmitted
        ? (room.config.chaoticFunMode ? 'voting' as const : 'revealing' as const)
        : 'submitting' as const,
    }
    const updatedPlayers = room.players.map(p =>
      p.profileId === playerId ? { ...p, hand: p.hand.filter(c => c.id !== card.id) } : p
    )
    const updated: Room = { ...room, players: updatedPlayers, currentRound: updatedRound }
    persistRoom(updated)
    set({ room: updated })
  },

  revealNext: () => {
    const { room } = get()
    if (!room?.currentRound) return
    const { revealIndex, submissions } = room.currentRound
    const nextIndex = revealIndex + 1
    const updatedSubmissions = submissions.map((s, i) =>
      i === revealIndex ? { ...s, revealed: true } : s
    )
    const allRevealed = nextIndex >= submissions.length
    const updatedRound = {
      ...room.currentRound,
      submissions: updatedSubmissions,
      revealIndex: nextIndex,
      phase: allRevealed ? 'voting' as const : 'revealing' as const,
    }
    const updated: Room = { ...room, currentRound: updatedRound }
    persistRoom(updated)
    set({ room: updated })
  },

  castVote: (voterId, submissionId) => {
    const { room } = get()
    if (!room?.currentRound) return
    const submission = room.currentRound.submissions.find(s => s.id === submissionId)
    if (!submission || submission.playerId === voterId) return // can't vote for own
    if (room.currentRound.votes.find(v => v.voterId === voterId)) return // already voted
    const updated: Room = {
      ...room,
      currentRound: {
        ...room.currentRound,
        votes: [...room.currentRound.votes, { voterId, submissionId }],
      },
    }
    persistRoom(updated)
    set({ room: updated })
  },

  tallyVotes: () => {
    const { room } = get()
    if (!room?.currentRound) return
    const { submissions, votes } = room.currentRound
    // Count votes per submission
    const voteCounts = new Map<string, number>()
    submissions.forEach(s => voteCounts.set(s.id, 0))
    votes.forEach(v => voteCounts.set(v.submissionId, (voteCounts.get(v.submissionId) ?? 0) + 1))
    const maxVotes = Math.max(...Array.from(voteCounts.values()))
    const winningSubIds = submissions.filter(s => (voteCounts.get(s.id) ?? 0) === maxVotes).map(s => s.id)
    const winnerIds = submissions.filter(s => winningSubIds.includes(s.id)).map(s => s.playerId)
    const updatedPlayers = room.players.map(p =>
      winnerIds.includes(p.profileId) ? { ...p, score: p.score + 1 } : p
    )
    const updatedRound = { ...room.currentRound, winnerIds, phase: 'results' as const }
    const updated: Room = { ...room, players: updatedPlayers, currentRound: updatedRound }
    persistRoom(updated)
    set({ room: updated })
  },

  advanceRound: async () => {
    const { room } = get()
    if (!room) return
    // Check win condition
    const winner = room.players.find(p => p.score >= room.config.targetScore)
    if (winner) {
      const updated: Room = { ...room, state: 'ended' }
      await persistRoom(updated)
      set({ room: updated })
      return
    }
    // Refill hands
    const captions = [...room.deck.captions]
    const players = room.players.map(p => {
      const hand = [...p.hand]
      while (hand.length < 7 && captions.length > 0) hand.push(captions.shift()!)
      return { ...p, hand, isReady: false }
    })
    // Next photo card
    let photos = [...room.deck.photos]
    if (photos.length === 0) photos = shuffle(PHOTO_CARDS)
    const photoCard = photos[0]
    const remainingPhotos = photos.slice(1)
    const round = {
      id: generateId(),
      photoCard,
      submissions: [],
      votes: [],
      winnerIds: [],
      phase: 'submitting' as const,
      revealIndex: 0,
      timerExpiresAt: room.config.rapidFireSeconds
        ? Date.now() + room.config.rapidFireSeconds * 1000
        : null,
    }
    const updated: Room = {
      ...room,
      players,
      currentRound: round,
      deck: { captions, photos: remainingPhotos },
    }
    await persistRoom(updated)
    set({ room: updated })
  },

  setReady: (profileId, ready) => {
    const { room } = get()
    if (!room) return
    const updated: Room = {
      ...room,
      players: room.players.map(p => p.profileId === profileId ? { ...p, isReady: ready } : p),
    }
    persistRoom(updated)
    set({ room: updated })
  },
}))
