# Let's Meme Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Let's Meme as an online multiplayer meme party game with Supabase-powered real-time sync, persistent player profiles, and a democratic voting mechanic replacing the judge role.

**Architecture:** Each player uses their own device. A single `rooms` JSONB row in Supabase is the source of truth; all clients subscribe via Supabase Realtime and re-render from the latest state. Local Zustand holds only UI state (selected card, animation progress). The host writes all game mutations; other clients are read-only except for their own submissions and votes.

**Tech Stack:** Expo SDK 56, expo-router v3, React Native 0.85, TypeScript strict, Zustand v5, @supabase/supabase-js, expo-auth-session (Apple/Google OAuth), react-native-reanimated v4, expo-haptics, expo-in-app-purchases.

**Spec:** `docs/superpowers/specs/2026-05-22-letsmeme-redesign.md`

---

## File Map

### Deleted (old pass-and-play)
- `app/lobby.tsx` → replaced
- `app/game.tsx` → replaced
- `app/end.tsx` → replaced
- `src/store/gameStore.ts` → replaced
- `src/store/gameStore.test.ts` → replaced
- `src/screens/JudgeWaitScreen.tsx` → deleted
- `src/screens/PickWinnerScreen.tsx` → deleted
- `src/screens/PlayerHandScreen.tsx` → replaced
- `src/screens/RoundResultScreen.tsx` → replaced

### Kept (reused unchanged)
- `src/components/CaptionCard.tsx`
- `src/components/PhotoCard.tsx`
- `src/components/CardHand.tsx`
- `src/data/baseDeck.ts`
- `src/utils/shuffle.ts`
- `src/utils/uuid.ts`

### New / Modified
- `src/types/game.ts` — updated types (Profile, RoomPlayer, Vote, new Round/Room)
- `src/lib/supabase.ts` — Supabase client singleton
- `src/lib/supabaseSchema.sql` — SQL to run in Supabase dashboard
- `src/store/authStore.ts` — Zustand store for auth + profile
- `src/store/roomStore.ts` — Zustand store for room subscription + mutations
- `src/store/uiStore.ts` — local UI state (selected card, animation index)
- `app/_layout.tsx` — updated root navigator (add auth guard)
- `app/index.tsx` — replaced with AuthScreen
- `app/dashboard.tsx` — DashboardScreen
- `app/profile.tsx` — ProfileScreen
- `app/create-game.tsx` — CreateGameScreen
- `app/join-game.tsx` — JoinGameScreen
- `app/lobby.tsx` — LobbyScreen (online)
- `app/game.tsx` — GameScreen (phase router)
- `app/end.tsx` — EndScreen
- `app/store.tsx` — GameStoreScreen (IAP)
- `src/screens/SubmittingScreen.tsx` — caption hand pick
- `src/screens/RevealingScreen.tsx` — 3D flip reveal
- `src/screens/VotingScreen.tsx` — vote on captions
- `src/screens/ResultsScreen.tsx` — winners + score update

---

## Task 1: Update Types & Delete Old Code

**Files:**
- Modify: `src/types/game.ts`
- Delete: `src/screens/JudgeWaitScreen.tsx`, `src/screens/PickWinnerScreen.tsx`
- Delete: `src/store/gameStore.ts`, `src/store/gameStore.test.ts`

- [ ] **Step 1: Replace `src/types/game.ts` with the new type definitions**

```typescript
// src/types/game.ts

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
```

- [ ] **Step 2: Delete old files that are no longer needed**

```bash
rm src/screens/JudgeWaitScreen.tsx
rm src/screens/PickWinnerScreen.tsx
rm src/store/gameStore.ts
rm src/store/gameStore.test.ts
```

- [ ] **Step 3: Verify TypeScript compiles (no other file imports deleted files)**

```bash
npx tsc --noEmit
```

Expected: errors only from files that import the old store (app/lobby.tsx, app/game.tsx, app/end.tsx, src/screens/PlayerHandScreen.tsx, src/screens/RoundResultScreen.tsx) — those will be replaced in later tasks. No errors in `src/types/game.ts`, `src/components/`, `src/data/`, or `src/utils/`.

- [ ] **Step 4: Commit**

```bash
git add src/types/game.ts
git rm src/screens/JudgeWaitScreen.tsx src/screens/PickWinnerScreen.tsx
git rm src/store/gameStore.ts src/store/gameStore.test.ts
git commit -m "refactor: replace types with redesign model, remove judge-era screens"
```

---

## Task 2: Supabase Setup

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/supabaseSchema.sql`

> **Before starting:** Create a free Supabase project at https://supabase.com. Copy the Project URL and anon key from Project Settings → API. You will need them in Step 2.

- [ ] **Step 1: Install Supabase and auth dependencies**

```bash
npx expo install @supabase/supabase-js expo-auth-session expo-web-browser expo-secure-store
```

Expected: packages added to package.json, no peer dep warnings.

- [ ] **Step 2: Create the Supabase client singleton**

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

- [ ] **Step 3: Create `.env.local` with your Supabase credentials**

Create `.env.local` in the project root (git-ignored):

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace the values with your actual Project URL and anon key from the Supabase dashboard.

- [ ] **Step 4: Add `.env.local` to `.gitignore`**

Open `.gitignore` (create it if it doesn't exist) and add:

```
.env.local
```

- [ ] **Step 5: Create the SQL schema file**

Create `src/lib/supabaseSchema.sql`:

```sql
-- Run this in Supabase Dashboard → SQL Editor

-- Profiles table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_color text not null default '#6366f1',
  games_played integer not null default 0,
  wins integer not null default 0,
  rounds_won integer not null default 0,
  favorite_deck_id text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can read any profile"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Profile decks (owned IAP decks)
create table if not exists profile_decks (
  profile_id uuid references profiles on delete cascade,
  deck_id text not null,
  purchased_at timestamptz not null default now(),
  primary key (profile_id, deck_id)
);

alter table profile_decks enable row level security;

create policy "Users can read own decks"
  on profile_decks for select using (auth.uid() = profile_id);

create policy "Users can insert own decks"
  on profile_decks for insert with check (auth.uid() = profile_id);

-- Rooms table (full Room stored as JSONB)
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  state text not null default 'lobby',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table rooms enable row level security;

create policy "Anyone can read rooms"
  on rooms for select using (true);

create policy "Authenticated users can create rooms"
  on rooms for insert with check (auth.role() = 'authenticated' or auth.role() = 'anon');

create policy "Anyone can update rooms"
  on rooms for update using (true);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger rooms_updated_at
  before update on rooms
  for each row execute function update_updated_at();
```

- [ ] **Step 6: Run the SQL schema in the Supabase dashboard**

Go to your Supabase project → SQL Editor → New query. Paste the contents of `src/lib/supabaseSchema.sql` and click Run. Verify all tables appear under Table Editor.

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase.ts src/lib/supabaseSchema.sql .gitignore
git commit -m "feat: add Supabase client and database schema"
```

---

## Task 3: Auth Store

**Files:**
- Create: `src/store/authStore.ts`
- Create: `src/store/authStore.test.ts`

The auth store manages the current Supabase session and the user's `Profile`. It loads on app start and listens for auth state changes.

- [ ] **Step 1: Write the failing tests**

Create `src/store/authStore.test.ts`:

```typescript
import { useAuthStore } from './authStore'

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signInAnonymously: jest.fn().mockResolvedValue({ data: { user: { id: 'guest-123' } }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'guest-123',
              display_name: 'Guest',
              avatar_color: '#6366f1',
              games_played: 0,
              wins: 0,
              rounds_won: 0,
              favorite_deck_id: null,
            },
            error: null,
          }),
        }),
      }),
    }),
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ profile: null, session: null, loading: true })
  })

  it('starts with null profile and loading true', () => {
    const state = useAuthStore.getState()
    expect(state.profile).toBeNull()
    expect(state.loading).toBe(true)
  })

  it('signInAsGuest sets profile with Guest display name', async () => {
    await useAuthStore.getState().signInAsGuest()
    const { profile } = useAuthStore.getState()
    expect(profile).not.toBeNull()
    expect(profile!.displayName).toBe('Guest')
    expect(profile!.id).toBe('guest-123')
  })

  it('signOut clears profile and session', async () => {
    useAuthStore.setState({ profile: { id: 'guest-123', displayName: 'Guest', avatarColor: '#6366f1', stats: { gamesPlayed: 0, wins: 0, roundsWon: 0, favoriteDeckId: null } }, session: {} as any, loading: false })
    await useAuthStore.getState().signOut()
    expect(useAuthStore.getState().profile).toBeNull()
    expect(useAuthStore.getState().session).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/store/authStore.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module './authStore'`

- [ ] **Step 3: Implement the auth store**

Create `src/store/authStore.ts`:

```typescript
import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../types/game'

type AuthState = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  initialize: () => Promise<void>
  signInAsGuest: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Pick<Profile, 'displayName' | 'avatarColor'>>) => Promise<void>
  incrementStat: (stat: 'gamesPlayed' | 'wins' | 'roundsWon') => Promise<void>
}

function rowToProfile(row: any): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarColor: row.avatar_color,
    stats: {
      gamesPlayed: row.games_played,
      wins: row.wins,
      roundsWon: row.rounds_won,
      favoriteDeckId: row.favorite_deck_id,
    },
  }
}

async function fetchOrCreateProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (data) return rowToProfile(data)

  // Profile doesn't exist yet — create it
  const { data: created, error: createError } = await supabase
    .from('profiles')
    .insert({ id: userId, display_name: 'Guest', avatar_color: '#6366f1' })
    .select()
    .single()

  if (createError) throw createError
  return rowToProfile(created)
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const profile = await fetchOrCreateProfile(session.user.id)
      set({ session, profile, loading: false })
    } else {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchOrCreateProfile(session.user.id)
        set({ session, profile })
      } else {
        set({ session: null, profile: null })
      }
    })
  },

  signInAsGuest: async () => {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    if (data.user) {
      const profile = await fetchOrCreateProfile(data.user.id)
      set({ profile })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null })
  },

  updateProfile: async (updates) => {
    const { profile } = get()
    if (!profile) return
    const dbUpdates: any = {}
    if (updates.displayName) dbUpdates.display_name = updates.displayName
    if (updates.avatarColor) dbUpdates.avatar_color = updates.avatarColor
    await supabase.from('profiles').update(dbUpdates).eq('id', profile.id)
    set({ profile: { ...profile, ...updates } })
  },

  incrementStat: async (stat) => {
    const { profile } = get()
    if (!profile) return
    const col = stat === 'gamesPlayed' ? 'games_played' : stat === 'wins' ? 'wins' : 'rounds_won'
    await supabase.from('profiles').update({ [col]: profile.stats[stat] + 1 }).eq('id', profile.id)
    set({ profile: { ...profile, stats: { ...profile.stats, [stat]: profile.stats[stat] + 1 } } })
  },
}))
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/store/authStore.test.ts --no-coverage
```

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/store/authStore.ts src/store/authStore.test.ts
git commit -m "feat: add auth store with guest sign-in and profile management"
```

---

## Task 4: Room Store

**Files:**
- Create: `src/store/roomStore.ts`
- Create: `src/store/roomStore.test.ts`

The room store handles all room mutations (create, join, start, submit, reveal, vote, advance) and the Supabase Realtime subscription. The host writes; all clients read.

- [ ] **Step 1: Write the failing tests**

Create `src/store/roomStore.test.ts`:

```typescript
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
    const roomWithTie: Room = {
      ...mockRoom,
      state: 'playing',
      currentRound: {
        id: 'round-1',
        photoCard: { id: 'p001', type: 'photo', deckId: 'base', familySafe: true },
        submissions: [sub1, sub2],
        votes: [
          { voterId: 'player-3', submissionId: 'sub-1' },
          { voterId: 'player-3', submissionId: 'sub-2' }, // impossible in real game but tests tie logic
        ],
        winnerIds: [],
        phase: 'voting',
        revealIndex: 2,
        timerExpiresAt: null,
      },
    }
    // Manually set tie: 1 vote each
    const tieRoom = {
      ...roomWithTie,
      currentRound: {
        ...roomWithTie.currentRound!,
        votes: [
          { voterId: 'player-2', submissionId: 'sub-1' },
          { voterId: 'player-3', submissionId: 'sub-2' },
        ],
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
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/store/roomStore.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module './roomStore'`

- [ ] **Step 3: Implement the room store**

Create `src/store/roomStore.ts`:

```typescript
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { Room, Card, Vote, RoomConfig } from '../types/game'
import { shuffle } from '../utils/shuffle'
import { generateId } from '../utils/uuid'
import { BASE_CAPTION_CARDS, BASE_PHOTO_CARDS } from '../data/baseDeck'

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function buildDeck(config: RoomConfig) {
  const familyFilter = (c: Card) => !config.familyMode || c.familySafe
  return {
    captions: shuffle(BASE_CAPTION_CARDS.filter(familyFilter)),
    photos: shuffle(BASE_PHOTO_CARDS.filter(familyFilter)),
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
        (payload) => {
          set({ room: payload.new.data as Room })
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  },

  startGame: async () => {
    const { room } = get()
    if (!room) return
    let started = dealHands({ ...room, state: 'playing' })
    const photos = started.deck.photos.length > 0 ? started.deck.photos : shuffle(BASE_PHOTO_CARDS)
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
    const allSubmitted = room.players.length - 1 === room.currentRound.submissions.length + 1
      ? true : room.currentRound.submissions.length + 1 >= room.players.length
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
    if (photos.length === 0) photos = shuffle(BASE_PHOTO_CARDS)
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/store/roomStore.test.ts --no-coverage
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/store/roomStore.ts src/store/roomStore.test.ts
git commit -m "feat: add room store with submit, reveal, vote, tally, and advance logic"
```

---

## Task 5: UI Store

**Files:**
- Create: `src/store/uiStore.ts`

Local UI state only — no persistence, no Supabase. Holds selected card id and optimistic reveal animation index.

- [ ] **Step 1: Create the UI store**

```typescript
// src/store/uiStore.ts
import { create } from 'zustand'

type UIState = {
  selectedCardId: string | null
  selectCard: (id: string | null) => void
  clearSelection: () => void
}

export const useUIStore = create<UIState>((set) => ({
  selectedCardId: null,
  selectCard: (id) => set({ selectedCardId: id }),
  clearSelection: () => set({ selectedCardId: null }),
}))
```

- [ ] **Step 2: Commit**

```bash
git add src/store/uiStore.ts
git commit -m "feat: add local UI store for card selection state"
```

---

## Task 6: Root Navigation & Auth Guard

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/index.tsx` (replace with AuthScreen)

The root layout initializes auth on mount and redirects: unauthenticated → `/` (AuthScreen), authenticated → `/dashboard`.

- [ ] **Step 1: Replace `app/index.tsx` with AuthScreen**

```tsx
// app/index.tsx
import { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { supabase } from '../src/lib/supabase'
import { useAuthStore } from '../src/store/authStore'

WebBrowser.maybeCompleteAuthSession()

export default function AuthScreen() {
  const { profile, loading, signInAsGuest } = useAuthStore()

  useEffect(() => {
    if (!loading && profile) {
      router.replace('/dashboard')
    }
  }, [profile, loading])

  const handleAppleSignIn = async () => {
    const redirectUri = makeRedirectUri({ scheme: 'letsmeme' })
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: redirectUri },
    })
    if (data?.url) await WebBrowser.openAuthSessionAsync(data.url, redirectUri)
  }

  const handleGoogleSignIn = async () => {
    const redirectUri = makeRedirectUri({ scheme: 'letsmeme' })
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUri },
    })
    if (data?.url) await WebBrowser.openAuthSessionAsync(data.url, redirectUri)
  }

  const handleGuest = async () => {
    await signInAsGuest()
    router.replace('/dashboard')
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Let's Meme</Text>
      <Text style={styles.subtitle}>The meme card party game</Text>

      <TouchableOpacity style={[styles.button, styles.appleButton]} onPress={handleAppleSignIn}>
        <Text style={styles.buttonText}>Sign in with Apple</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.googleButton]} onPress={handleGoogleSignIn}>
        <Text style={styles.buttonText}>Sign in with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.guestButton} onPress={handleGuest}>
        <Text style={styles.guestText}>Play as Guest</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 42, fontWeight: '900', color: '#ffffff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#8b8fa8', marginBottom: 48 },
  button: { width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  appleButton: { backgroundColor: '#ffffff' },
  googleButton: { backgroundColor: '#4285f4' },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#0f1117' },
  guestButton: { marginTop: 16 },
  guestText: { color: '#8b8fa8', fontSize: 15 },
})
```

- [ ] **Step 2: Update `app/_layout.tsx` to initialize auth**

```tsx
// app/_layout.tsx
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'

export default function RootLayout() {
  const initialize = useAuthStore(s => s.initialize)

  useEffect(() => {
    initialize()
  }, [])

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  )
}
```

- [ ] **Step 3: Run the app and verify the auth screen loads**

```bash
npx expo start --ios
```

Expected: Dark screen with "Let's Meme" title, three sign-in options visible. No crash on load.

- [ ] **Step 4: Commit**

```bash
git add app/index.tsx app/_layout.tsx
git commit -m "feat: add auth screen with Apple, Google, and guest sign-in"
```

---

## Task 7: Dashboard, Profile & Navigation Screens

**Files:**
- Create: `app/dashboard.tsx`
- Create: `app/profile.tsx`
- Create: `app/store.tsx`

- [ ] **Step 1: Create DashboardScreen**

```tsx
// app/dashboard.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'

export default function DashboardScreen() {
  const { profile, signOut } = useAuthStore()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hey, {profile?.displayName ?? 'Player'}</Text>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <View style={[styles.avatar, { backgroundColor: profile?.avatarColor ?? '#6366f1' }]}>
            <Text style={styles.avatarText}>{(profile?.displayName ?? 'P')[0].toUpperCase()}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.card, styles.primaryCard]} onPress={() => router.push('/create-game')}>
        <Text style={styles.cardTitle}>Create Game</Text>
        <Text style={styles.cardSub}>Start a new room</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/join-game')}>
        <Text style={styles.cardTitle}>Join Game</Text>
        <Text style={styles.cardSub}>Enter a room code</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/store')}>
        <Text style={styles.cardTitle}>Game Store</Text>
        <Text style={styles.cardSub}>Unlock new decks</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  card: { backgroundColor: '#1a1d2e', borderRadius: 16, padding: 20, marginBottom: 12 },
  primaryCard: { backgroundColor: '#6366f1' },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginBottom: 4 },
  cardSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  signOutButton: { marginTop: 24, alignItems: 'center' },
  signOutText: { color: '#8b8fa8', fontSize: 15 },
})
```

- [ ] **Step 2: Create ProfileScreen**

```tsx
// app/profile.tsx
import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4']

export default function ProfileScreen() {
  const { profile, updateProfile } = useAuthStore()
  const [name, setName] = useState(profile?.displayName ?? '')
  const [color, setColor] = useState(profile?.avatarColor ?? '#6366f1')

  const handleSave = async () => {
    await updateProfile({ displayName: name.trim() || 'Player', avatarColor: color })
    router.back()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Profile</Text>

      <View style={[styles.bigAvatar, { backgroundColor: color }]}>
        <Text style={styles.bigAvatarText}>{(name || 'P')[0].toUpperCase()}</Text>
      </View>

      <Text style={styles.label}>Display Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor="#8b8fa8"
        maxLength={20}
      />

      <Text style={styles.label}>Avatar Color</Text>
      <View style={styles.colorRow}>
        {AVATAR_COLORS.map(c => (
          <TouchableOpacity key={c} onPress={() => setColor(c)} style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSelected]} />
        ))}
      </View>

      <Text style={styles.label}>Stats</Text>
      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={styles.statNum}>{profile?.stats.gamesPlayed ?? 0}</Text><Text style={styles.statLabel}>Games</Text></View>
        <View style={styles.stat}><Text style={styles.statNum}>{profile?.stats.wins ?? 0}</Text><Text style={styles.statLabel}>Wins</Text></View>
        <View style={styles.stat}><Text style={styles.statNum}>{profile?.stats.roundsWon ?? 0}</Text><Text style={styles.statLabel}>Rounds Won</Text></View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  content: { padding: 24, paddingTop: 60 },
  back: { marginBottom: 24 },
  backText: { color: '#6366f1', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 24 },
  bigAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 32 },
  bigAvatarText: { color: '#ffffff', fontWeight: '700', fontSize: 32 },
  label: { color: '#8b8fa8', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#1a1d2e', borderRadius: 12, padding: 14, color: '#ffffff', fontSize: 16 },
  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorSwatch: { width: 36, height: 36, borderRadius: 18 },
  colorSelected: { borderWidth: 3, borderColor: '#ffffff' },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: '#1a1d2e', borderRadius: 12, padding: 16, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  statLabel: { fontSize: 12, color: '#8b8fa8', marginTop: 4 },
  saveButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 32 },
  saveText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
})
```

- [ ] **Step 3: Create GameStoreScreen (IAP scaffold)**

```tsx
// app/store.tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'

const PACKS = [
  { id: 'office-life', name: 'Office Life', description: '100 work-from-home meme captions', price: '$1.99' },
  { id: 'internet-culture', name: 'Internet Culture', description: '100 chronically-online captions', price: '$1.99' },
  { id: 'danish-base', name: 'Danish Pack', description: 'Full base deck in Danish', price: '$0.99' },
]

export default function StoreScreen() {
  const { profile } = useAuthStore()
  const isGuest = !profile || profile.displayName === 'Guest'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Game Store</Text>

      {isGuest && (
        <View style={styles.guestBanner}>
          <Text style={styles.guestBannerText}>Sign in to purchase and keep decks across devices.</Text>
          <TouchableOpacity onPress={() => router.replace('/')}>
            <Text style={styles.guestBannerCta}>Sign In →</Text>
          </TouchableOpacity>
        </View>
      )}

      {PACKS.map(pack => (
        <View key={pack.id} style={styles.packCard}>
          <View style={styles.packInfo}>
            <Text style={styles.packName}>{pack.name}</Text>
            <Text style={styles.packDesc}>{pack.description}</Text>
          </View>
          <TouchableOpacity style={styles.buyButton} disabled={isGuest}>
            <Text style={styles.buyText}>{pack.price}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  content: { padding: 24, paddingTop: 60 },
  back: { marginBottom: 24 },
  backText: { color: '#6366f1', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 24 },
  guestBanner: { backgroundColor: '#1a1d2e', borderRadius: 12, padding: 16, marginBottom: 24, borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
  guestBannerText: { color: '#ffffff', fontSize: 14, marginBottom: 8 },
  guestBannerCta: { color: '#f59e0b', fontWeight: '700' },
  packCard: { backgroundColor: '#1a1d2e', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  packInfo: { flex: 1 },
  packName: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  packDesc: { color: '#8b8fa8', fontSize: 13 },
  buyButton: { backgroundColor: '#6366f1', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  buyText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
})
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard.tsx app/profile.tsx app/store.tsx
git commit -m "feat: add dashboard, profile, and game store screens"
```

---

## Task 8: Create Game & Join Game Screens

**Files:**
- Create: `app/create-game.tsx`
- Create: `app/join-game.tsx`

- [ ] **Step 1: Create CreateGameScreen**

```tsx
// app/create-game.tsx
import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'
import { useRoomStore } from '../src/store/roomStore'
import { RoomConfig } from '../src/types/game'

export default function CreateGameScreen() {
  const { profile } = useAuthStore()
  const { createRoom } = useRoomStore()
  const [targetScore, setTargetScore] = useState(5)
  const [familyMode, setFamilyMode] = useState(false)
  const [chaoticFun, setChaoticFun] = useState(false)
  const [hostReveals, setHostReveals] = useState(false)
  const [allReady, setAllReady] = useState(false)
  const [rapidFire, setRapidFire] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!profile) return
    setLoading(true)
    const config: RoomConfig = {
      targetScore,
      familyMode,
      selectedDeckIds: ['base'],
      chaoticFunMode: chaoticFun,
      hostRevealsCaptions: hostReveals,
      allReadyAdvance: allReady,
      rapidFireSeconds: rapidFire ? 30 : null,
    }
    const code = await createRoom(profile.id, profile.displayName, profile.avatarColor, config)
    setLoading(false)
    router.push('/lobby')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Create Game</Text>

      <Text style={styles.label}>Points to win</Text>
      <View style={styles.scoreRow}>
        {[3, 5, 7, 10].map(n => (
          <TouchableOpacity key={n} onPress={() => setTargetScore(n)} style={[styles.scoreBtn, targetScore === n && styles.scoreBtnActive]}>
            <Text style={[styles.scoreBtnText, targetScore === n && styles.scoreBtnTextActive]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>House Rules</Text>
      {[
        { label: 'Family Mode', sub: 'Filters out adult cards', val: familyMode, set: setFamilyMode },
        { label: 'Chaotic Fun Mode', sub: 'All captions revealed at once', val: chaoticFun, set: setChaoticFun },
        { label: 'Host Reveals Captions', sub: 'Only host can flip cards', val: hostReveals, set: setHostReveals },
        { label: 'All Ready Advance', sub: 'Players tap Ready to start next round', val: allReady, set: setAllReady },
        { label: 'Rapid Fire (30s)', sub: 'Auto-submit when timer runs out', val: rapidFire, set: setRapidFire },
      ].map(row => (
        <View key={row.label} style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>{row.label}</Text>
            <Text style={styles.toggleSub}>{row.sub}</Text>
          </View>
          <Switch value={row.val} onValueChange={row.set} trackColor={{ true: '#6366f1' }} />
        </View>
      ))}

      <TouchableOpacity style={[styles.createButton, loading && styles.createButtonDisabled]} onPress={handleCreate} disabled={loading}>
        <Text style={styles.createText}>{loading ? 'Creating…' : 'Create Room'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  content: { padding: 24, paddingTop: 60 },
  back: { marginBottom: 24 },
  backText: { color: '#6366f1', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 24 },
  label: { color: '#8b8fa8', fontSize: 13, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  scoreBtn: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#1a1d2e', alignItems: 'center', justifyContent: 'center' },
  scoreBtnActive: { backgroundColor: '#6366f1' },
  scoreBtnText: { color: '#8b8fa8', fontWeight: '700', fontSize: 18 },
  scoreBtnTextActive: { color: '#ffffff' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1d2e', borderRadius: 12, padding: 16, marginBottom: 8 },
  toggleInfo: { flex: 1 },
  toggleLabel: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  toggleSub: { color: '#8b8fa8', fontSize: 13, marginTop: 2 },
  createButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  createButtonDisabled: { opacity: 0.6 },
  createText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
})
```

- [ ] **Step 2: Create JoinGameScreen**

```tsx
// app/join-game.tsx
import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'
import { useRoomStore } from '../src/store/roomStore'

export default function JoinGameScreen() {
  const { profile } = useAuthStore()
  const { joinRoom } = useRoomStore()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    if (!profile || code.trim().length !== 6) {
      setError('Enter a 6-character room code')
      return
    }
    setLoading(true)
    setError('')
    try {
      await joinRoom(code.trim(), profile.id, profile.displayName, profile.avatarColor)
      router.push('/lobby')
    } catch (e: any) {
      setError(e.message ?? 'Could not join room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Join Game</Text>
      <Text style={styles.sub}>Ask the host for their 6-character room code</Text>

      <TextInput
        style={styles.input}
        value={code}
        onChangeText={t => setCode(t.toUpperCase())}
        placeholder="ABC123"
        placeholderTextColor="#8b8fa8"
        maxLength={6}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={[styles.joinButton, loading && styles.joinButtonDisabled]} onPress={handleJoin} disabled={loading}>
        <Text style={styles.joinText}>{loading ? 'Joining…' : 'Join Room'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', padding: 24, paddingTop: 60 },
  back: { marginBottom: 24 },
  backText: { color: '#6366f1', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  sub: { color: '#8b8fa8', fontSize: 15, marginBottom: 32 },
  input: { backgroundColor: '#1a1d2e', borderRadius: 12, padding: 16, color: '#ffffff', fontSize: 32, fontWeight: '800', textAlign: 'center', letterSpacing: 6, marginBottom: 12 },
  error: { color: '#ef4444', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  joinButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center' },
  joinButtonDisabled: { opacity: 0.6 },
  joinText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
})
```

- [ ] **Step 3: Commit**

```bash
git add app/create-game.tsx app/join-game.tsx
git commit -m "feat: add create game and join game screens"
```

---

## Task 9: Lobby Screen

**Files:**
- Create: `app/lobby.tsx` (replaces old pass-and-play version)

- [ ] **Step 1: Create LobbyScreen**

```tsx
// app/lobby.tsx
import { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'
import { useRoomStore } from '../src/store/roomStore'

export default function LobbyScreen() {
  const { profile } = useAuthStore()
  const { room, startGame, subscribeToRoom } = useRoomStore()

  useEffect(() => {
    if (!room) { router.replace('/dashboard'); return }
    const unsub = subscribeToRoom(room.id)
    return unsub
  }, [room?.id])

  useEffect(() => {
    if (room?.state === 'playing') router.replace('/game')
  }, [room?.state])

  if (!room || !profile) return null

  const isHost = room.hostId === profile.id
  const canStart = room.players.length >= 3

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Room Code</Text>
      <Text style={styles.code}>{room.code}</Text>
      <Text style={styles.sub}>Share this code with friends</Text>

      <Text style={styles.playersTitle}>Players ({room.players.length}/8)</Text>
      <FlatList
        data={room.players}
        keyExtractor={p => p.profileId}
        renderItem={({ item }) => (
          <View style={styles.playerRow}>
            <View style={[styles.playerAvatar, { backgroundColor: item.avatarColor }]}>
              <Text style={styles.playerAvatarText}>{item.displayName[0].toUpperCase()}</Text>
            </View>
            <Text style={styles.playerName}>{item.displayName}</Text>
            {item.profileId === room.hostId && <Text style={styles.hostBadge}>HOST</Text>}
            <View style={[styles.onlineDot, { backgroundColor: item.isOnline ? '#10b981' : '#4b5563' }]} />
          </View>
        )}
        style={styles.playerList}
      />

      {isHost && (
        <TouchableOpacity
          style={[styles.startButton, !canStart && styles.startButtonDisabled]}
          onPress={startGame}
          disabled={!canStart}
        >
          <Text style={styles.startText}>
            {canStart ? 'Start Game' : `Need ${3 - room.players.length} more player${3 - room.players.length !== 1 ? 's' : ''}`}
          </Text>
        </TouchableOpacity>
      )}

      {!isHost && (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>Waiting for host to start…</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', padding: 24, paddingTop: 60 },
  title: { color: '#8b8fa8', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  code: { fontSize: 48, fontWeight: '900', color: '#6366f1', textAlign: 'center', letterSpacing: 6, marginTop: 4 },
  sub: { color: '#8b8fa8', fontSize: 14, textAlign: 'center', marginBottom: 40 },
  playersTitle: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 12 },
  playerList: { flex: 1 },
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1d2e', borderRadius: 12, padding: 12, marginBottom: 8 },
  playerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  playerAvatarText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  playerName: { flex: 1, color: '#ffffff', fontSize: 16, fontWeight: '500' },
  hostBadge: { color: '#f59e0b', fontSize: 11, fontWeight: '700', marginRight: 8 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  startButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center' },
  startButtonDisabled: { backgroundColor: '#1a1d2e' },
  startText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  waitingContainer: { alignItems: 'center', paddingVertical: 16 },
  waitingText: { color: '#8b8fa8', fontSize: 15 },
})
```

- [ ] **Step 2: Commit**

```bash
git add app/lobby.tsx
git commit -m "feat: add online lobby screen with room code and player list"
```

---

## Task 10: Game Phase Screens

**Files:**
- Create: `src/screens/SubmittingScreen.tsx`
- Create: `src/screens/RevealingScreen.tsx`
- Create: `src/screens/VotingScreen.tsx`
- Create: `src/screens/ResultsScreen.tsx`
- Delete: `src/screens/PlayerHandScreen.tsx`, `src/screens/RoundResultScreen.tsx`

- [ ] **Step 1: Create SubmittingScreen**

```tsx
// src/screens/SubmittingScreen.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '../store/authStore'
import { useRoomStore } from '../store/roomStore'
import { useUIStore } from '../store/uiStore'
import PhotoCard from '../components/PhotoCard'
import CardHand from '../components/CardHand'
import { Card } from '../types/game'

export default function SubmittingScreen() {
  const { profile } = useAuthStore()
  const { room, submitCard } = useRoomStore()
  const { selectedCardId, selectCard, clearSelection } = useUIStore()

  if (!room?.currentRound || !profile) return null

  const { currentRound } = room
  const me = room.players.find(p => p.profileId === profile.id)
  const alreadySubmitted = currentRound.submissions.some(s => s.playerId === profile.id)

  const handleSelect = (card: Card) => {
    Haptics.selectionAsync()
    selectCard(card.id)
  }

  const handleSubmit = () => {
    const card = me?.hand.find(c => c.id === selectedCardId)
    if (!card) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    submitCard(profile.id, card)
    clearSelection()
  }

  const submitted = currentRound.submissions.length
  const total = room.players.length

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{submitted}/{total} submitted</Text>
      <PhotoCard imageAsset={currentRound.photoCard.imageAsset} />

      {alreadySubmitted ? (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>Waiting for others…</Text>
        </View>
      ) : (
        <>
          <Text style={styles.prompt}>Pick your funniest caption</Text>
          <CardHand
            cards={me?.hand ?? []}
            selectedId={selectedCardId}
            onSelect={handleSelect}
          />
          <TouchableOpacity
            style={[styles.submitButton, !selectedCardId && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!selectedCardId}
          >
            <Text style={styles.submitText}>Submit Caption</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', padding: 16, paddingTop: 48 },
  status: { color: '#8b8fa8', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  prompt: { color: '#ffffff', fontSize: 16, fontWeight: '600', textAlign: 'center', marginVertical: 12 },
  waitingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  waitingText: { color: '#8b8fa8', fontSize: 16 },
  submitButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center', margin: 16 },
  submitButtonDisabled: { backgroundColor: '#1a1d2e' },
  submitText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
})
```

- [ ] **Step 2: Create RevealingScreen**

```tsx
// src/screens/RevealingScreen.tsx
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '../store/authStore'
import { useRoomStore } from '../store/roomStore'
import CaptionCard from '../components/CaptionCard'
import PhotoCard from '../components/PhotoCard'

export default function RevealingScreen() {
  const { profile } = useAuthStore()
  const { room, revealNext } = useRoomStore()

  if (!room?.currentRound || !profile) return null

  const { currentRound, config } = room
  const isHost = room.hostId === profile.id
  const canTap = !config.hostRevealsCaptions || isHost
  const nextToReveal = currentRound.revealIndex

  const handleFlip = () => {
    if (!canTap) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    revealNext()
  }

  return (
    <View style={styles.container}>
      <PhotoCard imageAsset={currentRound.photoCard.imageAsset} />
      <Text style={styles.prompt}>
        {canTap ? 'Tap a card to reveal' : 'Waiting for host to reveal…'}
      </Text>
      <FlatList
        horizontal
        data={currentRound.submissions}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.cardList}
        renderItem={({ item, index }) => (
          <TouchableOpacity onPress={index === nextToReveal ? handleFlip : undefined} activeOpacity={index === nextToReveal ? 0.7 : 1}>
            <CaptionCard
              text={item.card.text ?? ''}
              revealed={item.revealed}
              onPress={index === nextToReveal ? handleFlip : undefined}
              disabled={index !== nextToReveal || !canTap}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', padding: 16, paddingTop: 48 },
  prompt: { color: '#8b8fa8', fontSize: 14, textAlign: 'center', marginVertical: 12 },
  cardList: { paddingHorizontal: 16, gap: 12 },
})
```

- [ ] **Step 3: Create VotingScreen**

```tsx
// src/screens/VotingScreen.tsx
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '../store/authStore'
import { useRoomStore } from '../store/roomStore'
import PhotoCard from '../components/PhotoCard'

export default function VotingScreen() {
  const { profile } = useAuthStore()
  const { room, castVote, tallyVotes } = useRoomStore()

  if (!room?.currentRound || !profile) return null

  const { currentRound } = room
  const myVote = currentRound.votes.find(v => v.voterId === profile.id)
  const mySubmission = currentRound.submissions.find(s => s.playerId === profile.id)
  const totalVoters = room.players.length
  const votesIn = currentRound.votes.length

  // Host triggers tally when all votes are in
  const isHost = room.hostId === profile.id
  const allVoted = votesIn >= totalVoters
  if (allVoted && isHost) {
    tallyVotes()
  }

  const handleVote = (submissionId: string) => {
    if (myVote) return
    Haptics.selectionAsync()
    castVote(profile.id, submissionId)
  }

  return (
    <View style={styles.container}>
      <PhotoCard imageAsset={currentRound.photoCard.imageAsset} />
      <Text style={styles.status}>{votesIn}/{totalVoters} voted</Text>
      <Text style={styles.prompt}>{myVote ? 'Vote cast! Waiting for others…' : 'Vote for the funniest caption'}</Text>

      <FlatList
        data={currentRound.submissions}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isOwn = item.playerId === profile.id
          const isVoted = myVote?.submissionId === item.id
          return (
            <TouchableOpacity
              style={[styles.option, isOwn && styles.optionOwn, isVoted && styles.optionVoted]}
              onPress={() => !isOwn && handleVote(item.id)}
              disabled={!!myVote || isOwn}
            >
              <Text style={styles.optionText}>{item.card.text}</Text>
              {isOwn && <Text style={styles.ownLabel}>Yours</Text>}
              {isVoted && <Text style={styles.votedLabel}>✓ Voted</Text>}
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', padding: 16, paddingTop: 48 },
  status: { color: '#8b8fa8', fontSize: 13, textAlign: 'center', marginTop: 8 },
  prompt: { color: '#ffffff', fontSize: 15, fontWeight: '600', textAlign: 'center', marginVertical: 12 },
  list: { padding: 8 },
  option: { backgroundColor: '#1a1d2e', borderRadius: 12, padding: 16, marginBottom: 10 },
  optionOwn: { opacity: 0.5 },
  optionVoted: { borderWidth: 2, borderColor: '#6366f1' },
  optionText: { color: '#ffffff', fontSize: 16 },
  ownLabel: { color: '#8b8fa8', fontSize: 12, marginTop: 4 },
  votedLabel: { color: '#6366f1', fontSize: 12, marginTop: 4, fontWeight: '600' },
})
```

- [ ] **Step 4: Create ResultsScreen**

```tsx
// src/screens/ResultsScreen.tsx
import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { useAuthStore } from '../store/authStore'
import { useRoomStore } from '../store/roomStore'

export default function ResultsScreen() {
  const { profile } = useAuthStore()
  const { room, advanceRound, setReady } = useRoomStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!room?.currentRound || !profile) return null

  const { currentRound, config } = room
  const isHost = room.hostId === profile.id
  const winners = room.players.filter(p => currentRound.winnerIds.includes(p.profileId))
  const iWon = currentRound.winnerIds.includes(profile.id)

  useEffect(() => {
    if (iWon) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }, [])

  useEffect(() => {
    if (config.allReadyAdvance) return
    if (!isHost) return
    timerRef.current = setTimeout(() => {
      advanceRound()
    }, 3000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const handleReady = () => {
    if (!profile) return
    setReady(profile.id, true)
    // Host advances when all ready
    if (isHost) {
      const allReady = room.players.every(p => p.isReady || p.profileId === profile.id)
      if (allReady) advanceRound()
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{winners.length > 1 ? 'Tie!' : '🏆 Winner!'}</Text>
      {winners.map(w => (
        <View key={w.profileId} style={[styles.winnerBadge, { backgroundColor: w.avatarColor }]}>
          <Text style={styles.winnerName}>{w.displayName}</Text>
        </View>
      ))}

      <Text style={styles.scoresTitle}>Scores</Text>
      <FlatList
        data={[...room.players].sort((a, b) => b.score - a.score)}
        keyExtractor={p => p.profileId}
        renderItem={({ item }) => (
          <View style={styles.scoreRow}>
            <Text style={styles.scorePlayer}>{item.displayName}</Text>
            <Text style={styles.scoreValue}>{item.score}</Text>
          </View>
        )}
      />

      {config.allReadyAdvance && (
        <TouchableOpacity style={styles.readyButton} onPress={handleReady}>
          <Text style={styles.readyText}>Ready →</Text>
        </TouchableOpacity>
      )}
      {!config.allReadyAdvance && !isHost && (
        <Text style={styles.advancingText}>Next round in 3s…</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', padding: 24, paddingTop: 60, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '900', color: '#ffffff', marginBottom: 16 },
  winnerBadge: { borderRadius: 16, paddingHorizontal: 20, paddingVertical: 10, marginBottom: 8 },
  winnerName: { color: '#ffffff', fontWeight: '800', fontSize: 18 },
  scoresTitle: { color: '#8b8fa8', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 32, marginBottom: 12, alignSelf: 'flex-start' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1a1d2e', borderRadius: 10, padding: 12, marginBottom: 6, width: '100%' },
  scorePlayer: { color: '#ffffff', fontSize: 15 },
  scoreValue: { color: '#6366f1', fontWeight: '800', fontSize: 15 },
  readyButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center', marginTop: 24 },
  readyText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  advancingText: { color: '#8b8fa8', fontSize: 14, marginTop: 24 },
})
```

- [ ] **Step 5: Delete old screens**

```bash
git rm src/screens/PlayerHandScreen.tsx src/screens/RoundResultScreen.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/screens/SubmittingScreen.tsx src/screens/RevealingScreen.tsx src/screens/VotingScreen.tsx src/screens/ResultsScreen.tsx
git commit -m "feat: add submitting, revealing, voting, and results game phase screens"
```

---

## Task 11: Game Screen (Phase Router) & End Screen

**Files:**
- Create: `app/game.tsx` (replaces old)
- Create: `app/end.tsx` (replaces old)

- [ ] **Step 1: Create GameScreen**

```tsx
// app/game.tsx
import { useEffect } from 'react'
import { router } from 'expo-router'
import { useRoomStore } from '../src/store/roomStore'
import { useAuthStore } from '../src/store/authStore'
import SubmittingScreen from '../src/screens/SubmittingScreen'
import RevealingScreen from '../src/screens/RevealingScreen'
import VotingScreen from '../src/screens/VotingScreen'
import ResultsScreen from '../src/screens/ResultsScreen'

export default function GameScreen() {
  const { room, subscribeToRoom } = useRoomStore()
  const { profile } = useAuthStore()

  useEffect(() => {
    if (!room) { router.replace('/dashboard'); return }
    const unsub = subscribeToRoom(room.id)
    return unsub
  }, [room?.id])

  useEffect(() => {
    if (room?.state === 'ended') router.replace('/end')
  }, [room?.state])

  if (!room?.currentRound) return null

  const { phase } = room.currentRound
  if (phase === 'submitting') return <SubmittingScreen />
  if (phase === 'revealing') return <RevealingScreen />
  if (phase === 'voting') return <VotingScreen />
  if (phase === 'results') return <ResultsScreen />
  return null
}
```

- [ ] **Step 2: Create EndScreen**

```tsx
// app/end.tsx
import { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'
import { useRoomStore } from '../src/store/roomStore'

export default function EndScreen() {
  const { profile, incrementStat } = useAuthStore()
  const { room, setRoom } = useRoomStore()

  useEffect(() => {
    if (!room || !profile) return
    incrementStat('gamesPlayed')
    const winner = [...room.players].sort((a, b) => b.score - a.score)[0]
    if (winner?.profileId === profile.id) incrementStat('wins')
  }, [])

  if (!room || !profile) return null

  const sorted = [...room.players].sort((a, b) => b.score - a.score)

  const handlePlayAgain = () => {
    setRoom({ ...room, state: 'lobby', currentRound: null })
    router.replace('/lobby')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game Over!</Text>
      <View style={[styles.winnerBadge, { backgroundColor: sorted[0]?.avatarColor ?? '#6366f1' }]}>
        <Text style={styles.winnerText}>🏆 {sorted[0]?.displayName}</Text>
      </View>

      <Text style={styles.scoresTitle}>Final Scores</Text>
      <FlatList
        data={sorted}
        keyExtractor={p => p.profileId}
        renderItem={({ item, index }) => (
          <View style={styles.scoreRow}>
            <Text style={styles.rank}>#{index + 1}</Text>
            <View style={[styles.dot, { backgroundColor: item.avatarColor }]} />
            <Text style={styles.playerName}>{item.displayName}</Text>
            <Text style={styles.score}>{item.score} pts</Text>
          </View>
        )}
        style={styles.list}
      />

      <TouchableOpacity style={styles.playAgainButton} onPress={handlePlayAgain}>
        <Text style={styles.playAgainText}>Play Again</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.dashboardButton} onPress={() => router.replace('/dashboard')}>
        <Text style={styles.dashboardText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', padding: 24, paddingTop: 60 },
  title: { fontSize: 36, fontWeight: '900', color: '#ffffff', textAlign: 'center', marginBottom: 24 },
  winnerBadge: { borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 32 },
  winnerText: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  scoresTitle: { color: '#8b8fa8', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  list: { flex: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1d2e', borderRadius: 12, padding: 14, marginBottom: 8 },
  rank: { color: '#8b8fa8', fontWeight: '700', width: 28, fontSize: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  playerName: { flex: 1, color: '#ffffff', fontSize: 15 },
  score: { color: '#6366f1', fontWeight: '800', fontSize: 15 },
  playAgainButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  playAgainText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  dashboardButton: { alignItems: 'center', marginTop: 12 },
  dashboardText: { color: '#8b8fa8', fontSize: 15 },
})
```

- [ ] **Step 3: Commit**

```bash
git add app/game.tsx app/end.tsx
git commit -m "feat: add game phase router and end screen"
```

---

## Task 12: Package.json & Config Updates

**Files:**
- Modify: `package.json`
- Modify: `app.json`
- Modify: `babel.config.js`

- [ ] **Step 1: Update jest transformIgnorePatterns to include new packages**

In `package.json`, update the `jest.transformIgnorePatterns` array:

```json
"transformIgnorePatterns": [
  "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|zustand|@supabase|isows|ws)"
]
```

- [ ] **Step 2: Add URL scheme to `app.json` for OAuth redirect**

Open `app.json` and add a `scheme` field under `expo`:

```json
{
  "expo": {
    "name": "letsMeme",
    "slug": "letsmeme",
    "scheme": "letsmeme",
    ...
  }
}
```

- [ ] **Step 3: Verify babel config skips reanimated in test env (should already be correct)**

Open `babel.config.js` and confirm it reads:

```javascript
const isTest = process.env.NODE_ENV === 'test'
module.exports = function(api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: isTest ? [] : ['react-native-reanimated/plugin'],
  }
}
```

If it matches, no change needed. If not, update it to match.

- [ ] **Step 4: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests pass (authStore, roomStore, shuffle, uuid).

- [ ] **Step 5: Commit**

```bash
git add package.json app.json babel.config.js
git commit -m "chore: update jest config, add OAuth scheme to app.json"
```

---

## Task 13: Supabase OAuth Configuration

> This task requires clicking in the Supabase and Apple/Google dashboards. No code changes.

- [ ] **Step 1: Enable Apple OAuth in Supabase**

1. Go to Supabase Dashboard → Authentication → Providers → Apple
2. Toggle "Enable Apple provider"
3. Follow the guide at https://supabase.com/docs/guides/auth/social-login/auth-apple to create an Apple Services ID and configure the redirect URL

- [ ] **Step 2: Enable Google OAuth in Supabase**

1. Go to Supabase Dashboard → Authentication → Providers → Google
2. Toggle "Enable Google provider"
3. Follow the guide at https://supabase.com/docs/guides/auth/social-login/auth-google to create a Google OAuth client ID

- [ ] **Step 3: Add redirect URL to Supabase**

In Supabase → Authentication → URL Configuration → Redirect URLs, add:

```
letsmeme://
```

- [ ] **Step 4: Test guest sign-in end-to-end**

```bash
npx expo start --ios
```

Tap "Play as Guest" → should land on DashboardScreen with display name "Guest".

---

## Task 14: End-to-End Smoke Test

Manual test of a full game flow on the simulator.

- [ ] **Step 1: Start the app**

```bash
npx expo start --ios
```

- [ ] **Step 2: Sign in as guest on first simulator**

Tap "Play as Guest" → verify Dashboard loads with "Hey, Guest".

- [ ] **Step 3: Create a room**

Tap "Create Game" → set target score to 3 → tap "Create Room" → verify Lobby loads with a 6-char code displayed.

- [ ] **Step 4: Join with two more guests**

Open two more simulator instances (or use Expo Go on physical devices). Sign in as guest on each. Tap "Join Game", enter the code from Step 3. Verify all three players appear in the lobby.

- [ ] **Step 5: Start the game**

On the host device, tap "Start Game". Verify all three devices transition to SubmittingScreen showing the photo card.

- [ ] **Step 6: Submit captions**

On each device, tap a caption card from the hand and tap "Submit Caption". Verify all three devices advance to RevealingScreen after all submit.

- [ ] **Step 7: Reveal and vote**

Tap to flip each card. Verify 3D flip animation plays. After all revealed, verify all devices advance to VotingScreen. Cast a vote on each device. Verify transition to ResultsScreen.

- [ ] **Step 8: Verify scores and advance**

Confirm winner is announced. Confirm score increments. Wait for 3s auto-advance (or tap Ready if allReadyAdvance is on). Verify next round starts.

- [ ] **Step 9: Play to target score**

Continue until a player reaches 3 points. Verify EndScreen appears with correct final rankings.

- [ ] **Step 10: Final commit**

```bash
git add -A
git commit -m "feat: complete Let's Meme redesign — online multiplayer with voting mechanic"
```
