import { useRoomStore } from './roomStore'
import { Room, RoomConfig } from '../types/game'

const mockRoom: Room = {
  id: 'room-1',
  code: 'ABC123',
  hostId: 'player-1',
  players: [
    { profileId: 'player-1', displayName: 'Alice', avatarColor: '#f00', score: 0, hand: [], isReady: false, isOnline: true },
    { profileId: 'player-2', displayName: 'Bob', avatarColor: '#0f0', score: 0, hand: [], isReady: false, isOnline: true },
    { profileId: 'player-3', displayName: 'Carol', avatarColor: '#00f', score: 0, hand: [], isReady: false, isOnline: true },
  ],
  config: {
    targetScore: 5,
    familyMode: false,
    selectedDeckIds: ['base'],
    chaoticFunMode: false,
    hostRevealsCaptions: false,
    allReadyAdvance: false,
    rapidFireSeconds: null,
  },
  state: 'lobby',
  currentRound: null,
  deck: { captions: [], photos: [] },
}

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'room-1', code: 'ABC123', data: {} }, error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'room-1', code: 'ABC123', data: mockRoom }, error: null }),
        }),
      }),
    }),
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    }),
    removeChannel: jest.fn(),
  },
}))

describe('roomStore', () => {
  beforeEach(() => {
    useRoomStore.setState({ room: null, loading: false, error: null })
  })

  it('starts with null room', () => {
    expect(useRoomStore.getState().room).toBeNull()
  })

  it('setRoom updates the room', () => {
    useRoomStore.getState().setRoom(mockRoom)
    expect(useRoomStore.getState().room).toEqual(mockRoom)
  })

  it('submitCard adds a submission to currentRound', () => {
    const roomWithRound: Room = {
      ...mockRoom,
      state: 'playing',
      currentRound: {
        id: 'round-1',
        photoCard: { id: 'p001', type: 'photo', deckId: 'base', familySafe: true },
        submissions: [],
        votes: [],
        winnerIds: [],
        phase: 'submitting',
        revealIndex: 0,
        timerExpiresAt: null,
      },
    }
    useRoomStore.setState({ room: roomWithRound })
    const card = { id: 'c001', type: 'caption' as const, deckId: 'base', familySafe: true, text: 'Test caption' }
    useRoomStore.getState().submitCard('player-1', card)
    const { room } = useRoomStore.getState()
    expect(room!.currentRound!.submissions).toHaveLength(1)
    expect(room!.currentRound!.submissions[0].playerId).toBe('player-1')
    expect(room!.currentRound!.submissions[0].card).toEqual(card)
  })

  it('castVote adds a vote and cannot vote for own submission', () => {
    const sub = { id: 'sub-1', playerId: 'player-2', card: { id: 'c001', type: 'caption' as const, deckId: 'base', familySafe: true, text: 'hi' }, revealed: true }
    const ownSub = { id: 'sub-2', playerId: 'player-1', card: { id: 'c002', type: 'caption' as const, deckId: 'base', familySafe: true, text: 'own' }, revealed: true }
    const roomWithVoting: Room = {
      ...mockRoom,
      state: 'playing',
      currentRound: {
        id: 'round-1',
        photoCard: { id: 'p001', type: 'photo', deckId: 'base', familySafe: true },
        submissions: [sub, ownSub],
        votes: [],
        winnerIds: [],
        phase: 'voting',
        revealIndex: 2,
        timerExpiresAt: null,
      },
    }
    useRoomStore.setState({ room: roomWithVoting })
    // Valid vote
    useRoomStore.getState().castVote('player-1', 'sub-1')
    expect(useRoomStore.getState().room!.currentRound!.votes).toHaveLength(1)
    // Can't vote for own submission — silently ignored
    useRoomStore.getState().castVote('player-1', 'sub-2')
    expect(useRoomStore.getState().room!.currentRound!.votes).toHaveLength(1)
  })

  it('tallyVotes awards points to all tied winners', () => {
    const sub1 = { id: 'sub-1', playerId: 'player-1', card: { id: 'c001', type: 'caption' as const, deckId: 'base', familySafe: true, text: 'A' }, revealed: true }
    const sub2 = { id: 'sub-2', playerId: 'player-2', card: { id: 'c002', type: 'caption' as const, deckId: 'base', familySafe: true, text: 'B' }, revealed: true }
    const roomWithVotes: Room = {
      ...mockRoom,
      state: 'playing',
      currentRound: {
        id: 'round-1',
        photoCard: { id: 'p001', type: 'photo', deckId: 'base', familySafe: true },
        submissions: [sub1, sub2],
        votes: [
          { voterId: 'player-2', submissionId: 'sub-1' },
          { voterId: 'player-3', submissionId: 'sub-1' },
        ],
        winnerIds: [],
        phase: 'voting',
        revealIndex: 2,
        timerExpiresAt: null,
      },
    }
    useRoomStore.setState({ room: roomWithVotes })
    useRoomStore.getState().tallyVotes()
    const { room } = useRoomStore.getState()
    expect(room!.currentRound!.winnerIds).toEqual(['player-1'])
    expect(room!.currentRound!.phase).toBe('results')
    expect(room!.players.find(p => p.profileId === 'player-1')!.score).toBe(1)
  })

  it('tallyVotes awards point to all tied players', () => {
    const sub1 = { id: 'sub-1', playerId: 'player-1', card: { id: 'c001', type: 'caption' as const, deckId: 'base', familySafe: true, text: 'A' }, revealed: true }
    const sub2 = { id: 'sub-2', playerId: 'player-2', card: { id: 'c002', type: 'caption' as const, deckId: 'base', familySafe: true, text: 'B' }, revealed: true }
    const tieRoom: Room = {
      ...mockRoom,
      state: 'playing',
      currentRound: {
        id: 'round-1',
        photoCard: { id: 'p001', type: 'photo', deckId: 'base', familySafe: true },
        submissions: [sub1, sub2],
        votes: [
          { voterId: 'player-2', submissionId: 'sub-1' },
          { voterId: 'player-3', submissionId: 'sub-2' },
        ],
        winnerIds: [],
        phase: 'voting',
        revealIndex: 2,
        timerExpiresAt: null,
      },
    }
    useRoomStore.setState({ room: tieRoom })
    useRoomStore.getState().tallyVotes()
    const { room } = useRoomStore.getState()
    expect(room!.currentRound!.winnerIds).toContain('player-1')
    expect(room!.currentRound!.winnerIds).toContain('player-2')
    expect(room!.players.find(p => p.profileId === 'player-1')!.score).toBe(1)
    expect(room!.players.find(p => p.profileId === 'player-2')!.score).toBe(1)
  })

  it('submitCard advances phase to revealing when all players submit', () => {
    const card1 = { id: 'c001', type: 'caption' as const, deckId: 'base', familySafe: true, text: 'A' }
    const card2 = { id: 'c002', type: 'caption' as const, deckId: 'base', familySafe: true, text: 'B' }
    const card3 = { id: 'c003', type: 'caption' as const, deckId: 'base', familySafe: true, text: 'C' }
    const roomWithRound: Room = {
      ...mockRoom,
      state: 'playing',
      players: [
        { ...mockRoom.players[0], hand: [card1] },
        { ...mockRoom.players[1], hand: [card2] },
        { ...mockRoom.players[2], hand: [card3] },
      ],
      currentRound: {
        id: 'round-1',
        photoCard: { id: 'p001', type: 'photo', deckId: 'base', familySafe: true },
        submissions: [],
        votes: [],
        winnerIds: [],
        phase: 'submitting',
        revealIndex: 0,
        timerExpiresAt: null,
      },
    }
    useRoomStore.setState({ room: roomWithRound })
    useRoomStore.getState().submitCard('player-1', card1)
    useRoomStore.getState().submitCard('player-2', card2)
    useRoomStore.getState().submitCard('player-3', card3)
    expect(useRoomStore.getState().room!.currentRound!.phase).toBe('revealing')
    expect(useRoomStore.getState().room!.currentRound!.submissions).toHaveLength(3)
  })

  it('advanceRound sets state to ended when a player reaches targetScore', async () => {
    const roomAtWin: Room = {
      ...mockRoom,
      state: 'playing',
      config: { ...mockRoom.config, targetScore: 3 },
      players: [
        { ...mockRoom.players[0], score: 3 },
        { ...mockRoom.players[1], score: 1 },
        { ...mockRoom.players[2], score: 0 },
      ],
      currentRound: {
        id: 'round-1',
        photoCard: { id: 'p001', type: 'photo', deckId: 'base', familySafe: true },
        submissions: [],
        votes: [],
        winnerIds: ['player-1'],
        phase: 'results',
        revealIndex: 0,
        timerExpiresAt: null,
      },
    }
    useRoomStore.setState({ room: roomAtWin })
    await useRoomStore.getState().advanceRound()
    expect(useRoomStore.getState().room!.state).toBe('ended')
  })
})
