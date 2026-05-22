export type Card = {
  id: string
  type: 'caption' | 'photo'
  deckId: string
  familySafe: boolean
  text?: string
  imageAsset?: string
  formatHint?: string
}

export type Deck = {
  id: string
  name: string
  description: string
  owned: boolean
  familySafe: boolean
}

export type Profile = {
  id: string
  displayName: string
  avatarColor: string
  stats: {
    gamesPlayed: number
    wins: number
    roundsWon: number
    favoriteDeckId: string | null
  }
}

export type RoomState = 'lobby' | 'playing' | 'ended'

export type RoomConfig = {
  targetScore: number
  familyMode: boolean
  selectedDeckIds: string[]
  chaoticFunMode: boolean
  hostRevealsCaptions: boolean
  allReadyAdvance: boolean
  rapidFireSeconds: number | null
}

export type RoomPlayer = {
  profileId: string
  displayName: string
  avatarColor: string
  score: number
  hand: Card[]
  isReady: boolean
  isOnline: boolean
}

export type Submission = {
  id: string
  playerId: string
  card: Card
  revealed: boolean
}

export type Vote = {
  voterId: string
  submissionId: string
}

export type RoundPhase = 'submitting' | 'revealing' | 'voting' | 'results'

export type Round = {
  id: string
  photoCard: Card
  submissions: Submission[]
  votes: Vote[]
  winnerIds: string[]
  phase: RoundPhase
  revealIndex: number
  timerExpiresAt: number | null
}

export type Room = {
  id: string
  code: string
  hostId: string
  players: RoomPlayer[]
  config: RoomConfig
  state: RoomState
  currentRound: Round | null
  deck: {
    captions: Card[]
    photos: Card[]
  }
}
