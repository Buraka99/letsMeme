# Let's Meme — Design Spec
_2026-05-22_

## Overview

A mobile party game inspired by *What Do You Meme?*. Players compete to pair the funniest caption card with a meme photo card. A rotating judge picks the winner each round. Built for phones, played in person.

**Phase 1:** Single-device pass-and-play (this spec).  
**Phase 2:** Multi-device online multiplayer (future spec, same data model).

---

## Decisions

| Topic | Decision |
|-------|----------|
| Play mode | Local-first pass-and-play; data model must be online-ready |
| Stack | Expo (React Native, TypeScript) |
| Caption input | Pre-written deck (200 cards bundled); paid expansion packs via IAP |
| Photo cards | AI-generated original characters in recognizable meme formats (~30 bundled) |
| Moderation | Family mode toggle per room; cards tagged `family_safe` |
| Judging UX | 3D flip reveal one-by-one → caption list to pick winner |
| Scoring | First to N points; host sets N at game start |
| House rules | Rapid Fire Timer (optional) + Judge Explains Why (optional) |
| Persistence | Per-device only, no accounts, session-scoped scores |
| Monetization | Free app + paid expansion packs (IAP) |

---

## Data Model

### Card
```ts
type Card = {
  id: string
  type: 'caption' | 'photo'
  deckId: string        // 'base' or expansion pack id
  familySafe: boolean
  // caption cards
  text?: string
  // photo cards
  imageAsset?: string   // local asset path or remote URL
  formatHint?: string   // e.g. 'two-panel', 'reaction', 'distracted'
}
```

### Deck
```ts
type Deck = {
  id: string
  name: string
  description: string
  owned: boolean        // false = locked, requires IAP
  familySafe: boolean   // true = all cards in deck are family safe
}
```

### Player
```ts
type Player = {
  id: string            // uuid, generated at game start
  name: string
  score: number         // photo cards won
  hand: Card[]          // current caption cards in hand (max 7)
  isJudge: boolean
}
```

### Room (Game Session)
```ts
type RoomState = 'lobby' | 'playing' | 'ended'

type Room = {
  id: string
  players: Player[]
  config: RoomConfig
  state: RoomState
  currentRound: Round | null
  judgeIndex: number    // index into players[], rotates each round
  deck: {
    captions: Card[]    // shuffled remaining caption cards
    photos: Card[]      // shuffled remaining photo cards
  }
}

type RoomConfig = {
  targetScore: number       // first to N wins
  familyMode: boolean
  rapidFireSeconds: number | null   // null = disabled
  judgeExplainsWhy: boolean
  selectedDeckIds: string[]
}
```

### Round
```ts
type Round = {
  id: string
  photoCard: Card
  submissions: Submission[]
  winnerId: string | null       // player id
  judgeExplanation: string | null
  phase: 'submitting' | 'revealing' | 'explaining' | 'complete'
  revealIndex: number           // how many cards flipped so far
  timerExpiresAt: number | null // unix ms, null if rapid fire disabled
}
```

### Submission
```ts
type Submission = {
  id: string
  playerId: string
  card: Card
  revealed: boolean
}
```

---

## Architecture

### State Management
Single `GameStore` (Zustand) holding the full `Room` object. All game logic lives in store actions — no logic in components. Components are pure renders of store state.

```
GameStore (Zustand)
  └── Room
        ├── Players + hands
        ├── RoomConfig
        ├── Current Round
        └── Deck (shuffled card arrays)
```

### Asset Strategy
- Photo card images: bundled as local assets (`assets/images/memes/`)
- Base caption deck: bundled as a JSON file (`assets/data/base-deck.json`)
- Expansion packs: downloaded on purchase, cached locally via Expo FileSystem
- All Phase 1 gameplay works 100% offline

### Online-Ready Design Principles
The data model is designed so that in Phase 2:
- `Room` becomes a server-side document (Supabase / Firebase)
- `GameStore` actions become both local optimistic updates + server mutations
- `Player.id` becomes an auth user id
- No screen or component needs to change — only the store's persistence layer

---

## Screen List & Navigation

```
Stack Navigator (Root)
├── HomeScreen              — app entry, name input, start/join game
├── LobbyScreen             — player list, config toggles, start button
├── GameScreen (tab-like phases, not separate routes)
│     ├── JudgeWaitScreen   — judge sees photo card large; waits for submissions
│     ├── PlayerHandScreen  — non-judge players pick a card from hand
│     ├── TimerOverlayScreen— countdown overlay (rapid fire mode)
│     ├── RevealScreen      — judge taps to flip cards one by one (3D)
│     ├── PickWinnerScreen  — judge picks from revealed caption list
│     ├── ExplainScreen     — judge types/speaks explanation (if enabled)
│     └── RoundResultScreen — winner announced, scores updated
└── EndScreen               — final scores, play again / exit
```

Navigation is a single root stack. The `GameScreen` phases are controlled by `Round.phase` in the store — not separate routes — so the back button never takes a player mid-round somewhere unexpected.

---

## Core Game Loop

```
1. Host creates room → sets config (target score, mode, toggles, deck)
2. Players enter names → added to room
3. Host taps Start → hands dealt (7 cards each), first judge assigned
4. ROUND STARTS
   a. Judge sees photo card full-screen (JudgeWaitScreen)
   b. Phone passed to each non-judge player in turn
   c. Each player secretly picks a caption card (PlayerHandScreen)
      - If Rapid Fire enabled: countdown timer visible
      - If timer expires: random card auto-submitted
   d. All submitted → judge gets phone (RevealScreen)
   e. Judge taps each face-down card → 3D flip reveals caption
   f. After all flipped → PickWinnerScreen shows caption list
   g. Judge taps winner
   h. If Judge Explains Why enabled → ExplainScreen (free text or skip)
   i. RoundResultScreen → winner gets point, photo card awarded
   j. Hands refilled to 7, judge index advances
5. If a player reaches target score → EndScreen
6. Otherwise → back to step 4
```

---

## UI & Visual Design Principles

- **Portrait only**, thumb-reachable controls in bottom 60% of screen
- **3D card aesthetics**: cards have depth, drop shadows, slight perspective tilt
- **Flip animation**: `react-native-reanimated` rotateY 0→180° with front/back faces
- **Dark theme**: deep navy/black background, vibrant accent color for interactive elements
- **Hand of cards**: slight fan/arc layout, cards overlap, tap to select lifts card with spring animation
- **Photo card**: always displayed at top ~40% of screen, large, with caption overlaid in meme font (Impact or similar)

---

## Minimal Vertical Slice (MVP)

The first playable build covers exactly one full round end-to-end with 3 fake players:

1. Name entry → room creation
2. 3 players added (2 can be "fake" tapped through quickly)
3. One round: judge sees photo, 2 players pick cards, judge flips and picks winner
4. Score increments, round result shown

**Out of scope for slice:** timer, judge explains why, end screen, deck selection, IAP, family mode toggle UI (data model supports it, toggle just defaults off).

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `expo` | Base SDK |
| `expo-router` | File-based navigation |
| `react-native-reanimated` | 3D card flip animations |
| `zustand` | Game state management |
| `expo-av` | Sound effects (card flip, winner reveal) |
| `expo-haptics` | Tactile feedback on card interactions |

No backend dependencies for Phase 1. IAP via `expo-in-app-purchases` added when expansion packs ship.

---

## Future Phase 2 Notes (Online Multiplayer)

- Replace Zustand persistence with Supabase Realtime or Liveblocks
- Each player uses their own device — `PlayerHandScreen` is private
- Add account creation (Apple/Google sign-in) at that point
- `Room.id` becomes a shareable join code
- Reconnect logic: store `Round.phase` server-side, client rehydrates on reconnect
- No screen redesign needed — same navigation map, same components

---

## Out of Scope (This Spec)

- Online multiplayer
- User accounts / auth
- IAP implementation (data model supports it; store logic deferred)
- Custom deck builder
- Language packs
- Report / content moderation flow
- Push notifications
