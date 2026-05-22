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

export type Player = {
  id: string
  name: string
  score: number
  hand: Card[]
  isJudge: boolean
}

export type RoomState = 'lobby' | 'playing' | 'ended'

export type RoomConfig = {
  targetScore: number
  familyMode: boolean
  rapidFireSeconds: number | null
  judgeExplainsWhy: boolean
  selectedDeckIds: string[]
}

export type Submission = {
  id: string
  playerId: string
  card: Card
  revealed: boolean
}

export type RoundPhase = 'submitting' | 'revealing' | 'explaining' | 'complete'

export type Round = {
  id: string
  photoCard: Card
  submissions: Submission[]
  winnerId: string | null
  judgeExplanation: string | null
  phase: RoundPhase
  revealIndex: number
  timerExpiresAt: number | null
}

export type Room = {
  id: string
  players: Player[]
  config: RoomConfig
  state: RoomState
  currentRound: Round | null
  judgeIndex: number
  deck: {
    captions: Card[]
    photos: Card[]
  }
}
