# Let's Meme — Redesign Spec
_2026-05-22_

## Overview

A mobile meme party game where players compete to pair the funniest caption card with a meme photo card. All players vote for the funniest caption — no judge role. Built for online multiplayer: each player uses their own device. Persistent player profiles with stats.

**Phase 1:** Online multiplayer, each player on their own device (this spec).
**Phase 2:** Normalized database, push notifications, tournaments (future spec).

---

## Decisions

| Topic | Decision |
|-------|----------|
| Backend | Supabase (Postgres + Realtime + Auth) |
| Auth | Apple + Google sign-in; guest/anonymous option |
| Profile | Display name, avatar color, stats (wins, games played, rounds won) |
| Room code | 6-character alphanumeric |
| Players | 3–8 per room |
| Reveal mode | One-by-one 3D flip (default); Chaotic Fun + Host Reveals as optional room settings |
| Voting | Simultaneous after reveal; can't vote for own caption; ties → all tied players get a point |
| Round advance | 3s auto-countdown (default); All Ready mode as optional room setting |
| Deck access | Host's purchased decks available to all players in room; guests limited to base deck |
| Business model | Free base deck + IAP theme/language/custom packs |
| Reused from v1 | CaptionCard, PhotoCard, CardHand, baseDeck, shuffle, uuid |

---

## Data Model

### Profile
```ts
type Profile = {
  id: string              // Supabase auth user id
  displayName: string
  avatarColor: string     // hex color string
  stats: {
    gamesPlayed: number
    wins: number
    roundsWon: number
    favoriteDeckId: string | null
  }
}
```

### Card & Deck
```ts
type Card = {
  id: string
  type: 'caption' | 'photo'
  deckId: string
  familySafe: boolean
  text?: string           // caption cards
  imageAsset?: string     // photo cards: local asset path or remote URL
  formatHint?: string     // e.g. 'two-panel', 'reaction', 'distracted'
}

type Deck = {
  id: string
  name: string
  description: string
  owned: boolean          // false = locked, requires IAP
  familySafe: boolean
}
```

### Room
```ts
type RoomState = 'lobby' | 'playing' | 'ended'

type RoomConfig = {
  targetScore: number
  familyMode: boolean
  selectedDeckIds: string[]
  // House rules
  chaoticFunMode: boolean        // all captions revealed + vote simultaneously
  hostRevealsCaptions: boolean   // only host can tap to flip cards
  allReadyAdvance: boolean       // all players tap Ready to start next round
  rapidFireSeconds: number | null
}

type Room = {
  id: string
  code: string            // 6-char alphanumeric join code, unique among active rooms
  hostId: string          // profile id of host
  players: RoomPlayer[]
  config: RoomConfig
  state: RoomState
  currentRound: Round | null
  deck: {
    captions: Card[]      // shuffled remaining caption cards
    photos: Card[]        // shuffled remaining photo cards
  }
}

type RoomPlayer = {
  profileId: string
  displayName: string
  avatarColor: string
  score: number
  hand: Card[]            // current caption cards (max 7)
  isReady: boolean        // for allReadyAdvance mode
  isOnline: boolean       // presence tracking via Supabase Realtime
}
```

### Round & Voting
```ts
type RoundPhase = 'submitting' | 'revealing' | 'voting' | 'results'

type Round = {
  id: string
  photoCard: Card
  submissions: Submission[]
  votes: Vote[]
  winnerIds: string[]         // player ids; ties → multiple winners, all get a point
  phase: RoundPhase
  revealIndex: number         // how many cards flipped so far
  timerExpiresAt: number | null  // unix ms, null if rapid fire disabled
}

type Submission = {
  id: string
  playerId: string
  card: Card
  revealed: boolean
}

type Vote = {
  voterId: string
  submissionId: string        // enforced: voterId !== submission.playerId
}
```

---

## Architecture

### State & Sync

Supabase Realtime powers live game state. The `rooms` table is the single source of truth — all clients subscribe to their room row and react to changes.

```
Supabase
  └── rooms table (one row per active game, full Room stored as JSONB)
        └── Realtime subscription → all clients update together

  └── profiles table (one row per user)
  └── profile_decks table (tracks owned IAP decks per profile)

Local Zustand store (UI state only)
  ├── current profile (loaded from Supabase on auth)
  ├── selected card in hand (pre-submission, optimistic)
  └── animation state (reveal index, flip progress)
```

**Why JSONB for Room:** Single-column JSONB is simpler to build and perfectly adequate for 3–8 players in Phase 1. Phase 2 can normalize if needed — the data model is already clean.

**Auth flow:**
- Supabase Auth handles Apple/Google OAuth + anonymous sign-in
- On first sign-in, a `profiles` row is created
- Guest players get an anonymous Supabase session; upgrade path preserves their stats

**Realtime sync pattern:**
- Host writes all game state mutations to Supabase (advance phase, deal cards, etc.)
- All clients subscribe to the room row and derive their UI from latest state
- Optimistic local update only for own hand card selection

**Deck access:**
- Host selects decks when creating the room; `selectedDeckIds` stored in `RoomConfig`
- All players in the room play with those cards regardless of personal ownership
- Guests see an upgrade prompt in Game Store; signed-in players get full deck access once purchased

### Reused from v1
- `src/components/CaptionCard.tsx` — 3D flip animation, unchanged
- `src/components/PhotoCard.tsx` — unchanged
- `src/components/CardHand.tsx` — unchanged
- `src/data/baseDeck.ts` — unchanged
- `src/utils/shuffle.ts` — unchanged
- `src/utils/uuid.ts` — unchanged
- `src/types/game.ts` — `Card` and `Deck` types kept; `Room`, `Player`, `Round` replaced

---

## Screen Map & Navigation

```
Stack Navigator (Root)
├── AuthScreen              — Apple/Google sign-in + guest option
├── DashboardScreen         — Create Game, Join Game, Game Store
├── ProfileScreen           — display name, avatar color, stats
├── CreateGameScreen        — deck selection, config toggles, room code generated
├── JoinGameScreen          — enter 6-char room code
├── LobbyScreen             — player list, online presence, host starts game
│
├── GameScreen (phase-controlled, not separate routes)
│     ├── SubmittingPhase   — each player picks a caption card from hand
│     ├── RevealingPhase    — 3D flip reveal (default / host-paced / chaotic)
│     ├── VotingPhase       — all players vote simultaneously
│     └── ResultsPhase      — winners, scores, 3s countdown or Ready
│
└── EndScreen               — final scores, play again / back to dashboard
```

**Navigation rules:**
- Auth → Dashboard is the root; back button never returns to auth once signed in
- Dashboard → CreateGame / JoinGame → Lobby → Game → End → Dashboard
- GameScreen phases are controlled by `Round.phase` in Supabase, not separate routes — back button never interrupts a round
- ProfileScreen accessible from Dashboard header

---

## Core Game Loop

```
1. Host creates room → selects decks + config → 6-char code generated
2. Players join via code → appear in lobby with online indicator
3. Host taps Start → hands dealt (7 cards each), first round begins

4. ROUND STARTS
   a. Photo card shown to all players simultaneously (top of screen)
   b. Each player secretly picks a caption from their hand (SubmittingPhase)
      - Rapid Fire: countdown timer, auto-submit on expiry
      - All submitted → phase advances automatically

   c. RevealingPhase (default: one-by-one 3D flip)
      - Any player taps to flip next card
      - [Host Reveals Captions mode: only host can tap]
      - [Chaotic Fun mode: all captions revealed at once, skip straight to voting]

   d. VotingPhase
      - All players see revealed captions
      - Each player taps to cast one vote (cannot vote for own caption)
      - Votes hidden until all votes cast, then revealed simultaneously

   e. ResultsPhase
      - Winner(s) announced; ties → all tied players get a point
      - Scores updated
      - 3s auto-advance to next round
      - [All Ready mode: players tap Ready instead of countdown]

   f. Hands refilled to 7, next round begins

5. First player to reach target score → EndScreen
6. EndScreen: final rankings, play again (back to lobby) or exit to dashboard
```

---

## Business Model & Game Store

**Free tier:**
- Base deck: 200 caption cards + 10 photo cards, bundled with app
- Full game functionality, no limits

**Game Store (IAP via `expo-in-app-purchases`):**

| Product | Type | Contents |
|---------|------|----------|
| Theme packs | One-time purchase | ~100 caption cards + 5 photos, themed (e.g. "Office Life", "Internet Culture") |
| Language packs | One-time purchase | Full base deck translated (e.g. Danish, Spanish) |
| Custom deck | One-time purchase | Player-created captions + optional image upload |

**Ownership rules:**
- Purchased decks tracked in `profile_decks` table, tied to Supabase auth id
- Available across all devices when signed in
- Host's purchased decks are available to all players in their room (host pays, everyone plays)
- Guest players limited to base deck; upgrade prompt shown in Game Store

**Family mode:**
- Toggle in room config (host sets at game creation)
- Filters all cards by `familySafe: boolean` at deck-build time

---

## UI & Visual Design Principles

- **Portrait only**, thumb-reachable controls in bottom 60% of screen
- **Dark theme**: deep navy/black background, vibrant accent color for interactive elements
- **3D card aesthetics**: cards have depth, drop shadows, slight perspective tilt
- **Flip animation**: `react-native-reanimated` rotateY 0→180° with front/back opacity crossfade
- **Hand of cards**: fan/arc layout, cards overlap, tap to select lifts card with spring animation
- **Photo card**: top ~40% of screen, large, caption overlaid in meme font (Impact or similar)
- **Online presence**: subtle colored dot on player avatars (green = online, grey = disconnected)

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `expo` | Base SDK |
| `expo-router` | File-based navigation |
| `react-native-reanimated` | 3D card flip animations |
| `react-native-worklets` | Peer dep for reanimated v4 |
| `zustand` | Local UI state |
| `@supabase/supabase-js` | Auth, database, realtime |
| `expo-auth-session` | Apple/Google OAuth with Supabase |
| `expo-haptics` | Tactile feedback on card interactions |
| `expo-in-app-purchases` | Deck/theme/language pack purchases |

---

## Out of Scope (This Spec)

- Push notifications
- Tournaments / leaderboards
- Custom image upload for photo cards (custom captions supported; images deferred)
- Reconnect / rejoin logic for dropped connections (Phase 2)
- Normalized database schema (JSONB room is fine for Phase 1)
- Web / desktop clients
