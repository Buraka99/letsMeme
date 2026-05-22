# Let's Meme MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully playable single-device pass-and-play meme card game with one complete round end-to-end, 3D card flip reveal, and first-to-N scoring.

**Architecture:** Expo Router for navigation; Zustand store holds the full Room state machine; all game logic lives in store actions; components are pure renders. GameScreen phases (submitting → revealing → explaining → complete) are driven by `Round.phase` in the store, not separate routes.

**Tech Stack:** Expo SDK 51+, expo-router v3, zustand, react-native-reanimated v3, expo-haptics, TypeScript strict mode.

---

## File Structure

```
app/
  _layout.tsx                   # Root stack navigator
  index.tsx                     # HomeScreen — name entry
  lobby.tsx                     # LobbyScreen — player list + config
  game.tsx                      # GameScreen — phase router
  end.tsx                       # EndScreen — final scores

src/
  types/
    game.ts                     # All shared types: Card, Player, Room, Round, etc.

  store/
    gameStore.ts                # Zustand store: Room state + all actions
    gameStore.test.ts           # Unit tests for all store actions

  data/
    baseDeck.ts                 # 200 caption cards + 30 photo cards as typed arrays

  components/
    PhotoCard.tsx               # Large meme image with caption overlay
    CaptionCard.tsx             # 3D flippable caption card (front/back)
    CardHand.tsx                # Fan layout of cards in player's hand
    ScoreBoard.tsx              # Player names + scores row
    Timer.tsx                   # Countdown ring for rapid fire mode

  screens/
    JudgeWaitScreen.tsx         # Judge sees photo; waits for all submissions
    PlayerHandScreen.tsx        # Non-judge picks a card from hand
    RevealScreen.tsx            # Judge taps to flip cards one by one
    PickWinnerScreen.tsx        # Judge picks winner from caption list
    ExplainScreen.tsx           # Judge types explanation (optional)
    RoundResultScreen.tsx       # Winner announced + score update

  utils/
    shuffle.ts                  # Fisher-Yates shuffle utility
    shuffle.test.ts
    uuid.ts                     # Tiny uuid generator (no external dep)
    uuid.test.ts
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`
- Create: `app/_layout.tsx`
- Create: `.gitignore` (already exists, update)

- [ ] **Step 1: Create Expo project**

```bash
cd /Users/buru/Repos/letsMeme
npx create-expo-app@latest . --template blank-typescript
```

Expected: installs dependencies, creates `app/`, `assets/`, `package.json`.

- [ ] **Step 2: Install dependencies**

```bash
npx expo install expo-router react-native-reanimated expo-haptics zustand
npx expo install -- --save-dev jest @testing-library/react-native @types/jest jest-expo
```

- [ ] **Step 3: Configure expo-router in app.json**

Open `app.json` and ensure the `expo` object contains:
```json
{
  "expo": {
    "scheme": "letsmeme",
    "web": { "bundler": "metro" },
    "plugins": ["expo-router"]
  }
}
```

- [ ] **Step 4: Configure babel for reanimated**

Replace contents of `babel.config.js`:
```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  }
}
```

- [ ] **Step 5: Configure Jest**

Add to `package.json`:
```json
"jest": {
  "preset": "jest-expo",
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|zustand)"
  ]
}
```

- [ ] **Step 6: Create root layout**

Create `app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  )
}
```

- [ ] **Step 7: Verify app boots**

```bash
npx expo start --ios
```

Expected: Expo Go opens, white screen (no routes yet). No red errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Expo project with expo-router and reanimated"
```

---

## Task 2: Types

**Files:**
- Create: `src/types/game.ts`

- [ ] **Step 1: Create types file**

Create `src/types/game.ts`:
```ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/game.ts
git commit -m "feat: add shared game types"
```

---

## Task 3: Utility Functions

**Files:**
- Create: `src/utils/shuffle.ts`
- Create: `src/utils/shuffle.test.ts`
- Create: `src/utils/uuid.ts`
- Create: `src/utils/uuid.test.ts`

- [ ] **Step 1: Write shuffle tests**

Create `src/utils/shuffle.test.ts`:
```ts
import { shuffle } from './shuffle'

describe('shuffle', () => {
  it('returns array of same length', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(shuffle(arr)).toHaveLength(5)
  })

  it('contains all original elements', () => {
    const arr = [1, 2, 3, 4, 5]
    const result = shuffle(arr)
    expect(result.sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('does not mutate original array', () => {
    const arr = [1, 2, 3]
    const original = [...arr]
    shuffle(arr)
    expect(arr).toEqual(original)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx jest src/utils/shuffle.test.ts
```

Expected: FAIL — "Cannot find module './shuffle'"

- [ ] **Step 3: Implement shuffle**

Create `src/utils/shuffle.ts`:
```ts
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
```

- [ ] **Step 4: Run shuffle tests — confirm pass**

```bash
npx jest src/utils/shuffle.test.ts
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Write uuid tests**

Create `src/utils/uuid.test.ts`:
```ts
import { generateId } from './uuid'

describe('generateId', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateId()).toBe('string')
    expect(generateId().length).toBeGreaterThan(0)
  })

  it('returns unique values', () => {
    const ids = Array.from({ length: 100 }, generateId)
    expect(new Set(ids).size).toBe(100)
  })
})
```

- [ ] **Step 6: Run to confirm failure**

```bash
npx jest src/utils/uuid.test.ts
```

Expected: FAIL — "Cannot find module './uuid'"

- [ ] **Step 7: Implement uuid**

Create `src/utils/uuid.ts`:
```ts
export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
```

- [ ] **Step 8: Run uuid tests — confirm pass**

```bash
npx jest src/utils/uuid.test.ts
```

Expected: PASS — 2 tests.

- [ ] **Step 9: Commit**

```bash
git add src/utils/
git commit -m "feat: add shuffle and uuid utilities"
```

---

## Task 4: Base Deck Data

**Files:**
- Create: `src/data/baseDeck.ts`

- [ ] **Step 1: Create base deck data file**

Create `src/data/baseDeck.ts` with 200 caption cards and 10 placeholder photo cards (art assets added later):

```ts
import type { Card } from '../types/game'

export const CAPTION_CARDS: Card[] = [
  { id: 'c001', type: 'caption', deckId: 'base', familySafe: true, text: 'Nobody:\nAbsolutely nobody:\nMe:' },
  { id: 'c002', type: 'caption', deckId: 'base', familySafe: true, text: 'This is fine.' },
  { id: 'c003', type: 'caption', deckId: 'base', familySafe: true, text: 'When you said 5 minutes... 3 hours ago' },
  { id: 'c004', type: 'caption', deckId: 'base', familySafe: true, text: 'Me explaining to my mom why I need this' },
  { id: 'c005', type: 'caption', deckId: 'base', familySafe: true, text: 'My face when the delivery guy arrives' },
  { id: 'c006', type: 'caption', deckId: 'base', familySafe: true, text: 'How I look leaving work on Friday' },
  { id: 'c007', type: 'caption', deckId: 'base', familySafe: true, text: 'When someone says "just one more episode"' },
  { id: 'c008', type: 'caption', deckId: 'base', familySafe: true, text: 'My brain at 3am' },
  { id: 'c009', type: 'caption', deckId: 'base', familySafe: true, text: 'Telling myself I\'ll start the diet tomorrow' },
  { id: 'c010', type: 'caption', deckId: 'base', familySafe: true, text: 'When the waiter says "enjoy your meal" and I say "you too"' },
  { id: 'c011', type: 'caption', deckId: 'base', familySafe: true, text: 'My dog watching me eat' },
  { id: 'c012', type: 'caption', deckId: 'base', familySafe: true, text: 'When someone cancels plans I didn\'t want to attend anyway' },
  { id: 'c013', type: 'caption', deckId: 'base', familySafe: true, text: 'Every programmer at 2am' },
  { id: 'c014', type: 'caption', deckId: 'base', familySafe: true, text: 'Me pretending to listen in a meeting' },
  { id: 'c015', type: 'caption', deckId: 'base', familySafe: true, text: 'When the WiFi goes out for 10 seconds' },
  { id: 'c016', type: 'caption', deckId: 'base', familySafe: true, text: 'Adulting is just Googling things' },
  { id: 'c017', type: 'caption', deckId: 'base', familySafe: true, text: 'Me vs. my bank account' },
  { id: 'c018', type: 'caption', deckId: 'base', familySafe: true, text: 'When the teacher says "this will be on the exam"' },
  { id: 'c019', type: 'caption', deckId: 'base', familySafe: true, text: 'My weekend plans vs. what actually happened' },
  { id: 'c020', type: 'caption', deckId: 'base', familySafe: true, text: 'Running late but stopping for coffee anyway' },
  { id: 'c021', type: 'caption', deckId: 'base', familySafe: false, text: 'When you\'re 30 minutes early and feel like a god' },
  { id: 'c022', type: 'caption', deckId: 'base', familySafe: true, text: 'The audacity' },
  { id: 'c023', type: 'caption', deckId: 'base', familySafe: true, text: 'Sir, this is a Wendy\'s' },
  { id: 'c024', type: 'caption', deckId: 'base', familySafe: true, text: 'Stonks' },
  { id: 'c025', type: 'caption', deckId: 'base', familySafe: true, text: 'It do be like that sometimes' },
  { id: 'c026', type: 'caption', deckId: 'base', familySafe: true, text: 'Certified hood classic' },
  { id: 'c027', type: 'caption', deckId: 'base', familySafe: true, text: 'I am once again asking' },
  { id: 'c028', type: 'caption', deckId: 'base', familySafe: true, text: 'Permit me to introduce myself' },
  { id: 'c029', type: 'caption', deckId: 'base', familySafe: true, text: 'Not all heroes wear capes' },
  { id: 'c030', type: 'caption', deckId: 'base', familySafe: true, text: 'We live in a society' },
  { id: 'c031', type: 'caption', deckId: 'base', familySafe: true, text: 'When you find a $20 bill in your old jacket' },
  { id: 'c032', type: 'caption', deckId: 'base', familySafe: true, text: 'My cat at 4am' },
  { id: 'c033', type: 'caption', deckId: 'base', familySafe: true, text: 'Energy drink number 3' },
  { id: 'c034', type: 'caption', deckId: 'base', familySafe: true, text: 'When the group chat finally replies after 2 hours' },
  { id: 'c035', type: 'caption', deckId: 'base', familySafe: true, text: 'My motivation on Monday morning' },
  { id: 'c036', type: 'caption', deckId: 'base', familySafe: true, text: 'The last brain cell working overtime' },
  { id: 'c037', type: 'caption', deckId: 'base', familySafe: true, text: 'Plot twist' },
  { id: 'c038', type: 'caption', deckId: 'base', familySafe: true, text: 'Hold up' },
  { id: 'c039', type: 'caption', deckId: 'base', familySafe: true, text: 'Big brain time' },
  { id: 'c040', type: 'caption', deckId: 'base', familySafe: true, text: 'When someone says "we need to talk"' },
  { id: 'c041', type: 'caption', deckId: 'base', familySafe: true, text: 'Panic at the disco' },
  { id: 'c042', type: 'caption', deckId: 'base', familySafe: true, text: 'Task failed successfully' },
  { id: 'c043', type: 'caption', deckId: 'base', familySafe: true, text: 'When the plan actually works' },
  { id: 'c044', type: 'caption', deckId: 'base', familySafe: true, text: 'Error 404: motivation not found' },
  { id: 'c045', type: 'caption', deckId: 'base', familySafe: true, text: 'Loading... please wait' },
  { id: 'c046', type: 'caption', deckId: 'base', familySafe: true, text: 'Have you tried turning it off and on again?' },
  { id: 'c047', type: 'caption', deckId: 'base', familySafe: true, text: 'When you\'re the only one who read the assignment' },
  { id: 'c048', type: 'caption', deckId: 'base', familySafe: true, text: 'First day of school energy' },
  { id: 'c049', type: 'caption', deckId: 'base', familySafe: true, text: 'Last day of school energy' },
  { id: 'c050', type: 'caption', deckId: 'base', familySafe: true, text: 'When someone spoils the ending' },
  { id: 'c051', type: 'caption', deckId: 'base', familySafe: true, text: 'Gym in January vs. gym in February' },
  { id: 'c052', type: 'caption', deckId: 'base', familySafe: true, text: 'My social battery' },
  { id: 'c053', type: 'caption', deckId: 'base', familySafe: true, text: 'Introvert leaving a party after 20 minutes' },
  { id: 'c054', type: 'caption', deckId: 'base', familySafe: true, text: 'When someone says "you look tired"' },
  { id: 'c055', type: 'caption', deckId: 'base', familySafe: true, text: 'Eating dinner and immediately planning tomorrow\'s breakfast' },
  { id: 'c056', type: 'caption', deckId: 'base', familySafe: true, text: 'Speed run any%' },
  { id: 'c057', type: 'caption', deckId: 'base', familySafe: true, text: 'When the food arrives and it\'s exactly what you ordered' },
  { id: 'c058', type: 'caption', deckId: 'base', familySafe: true, text: 'That escalated quickly' },
  { id: 'c059', type: 'caption', deckId: 'base', familySafe: true, text: 'Me: I\'ll go to bed at 10pm. Also me:' },
  { id: 'c060', type: 'caption', deckId: 'base', familySafe: true, text: 'You can\'t fire me, I quit' },
  { id: 'c061', type: 'caption', deckId: 'base', familySafe: true, text: 'Minimum effort, maximum result' },
  { id: 'c062', type: 'caption', deckId: 'base', familySafe: true, text: 'This is not what I signed up for' },
  { id: 'c063', type: 'caption', deckId: 'base', familySafe: true, text: 'My anxiety watching me have fun' },
  { id: 'c064', type: 'caption', deckId: 'base', familySafe: true, text: 'Chaotic neutral' },
  { id: 'c065', type: 'caption', deckId: 'base', familySafe: true, text: 'The betrayal' },
  { id: 'c066', type: 'caption', deckId: 'base', familySafe: true, text: 'Nailed it' },
  { id: 'c067', type: 'caption', deckId: 'base', familySafe: true, text: 'Perfectly balanced, as all things should be' },
  { id: 'c068', type: 'caption', deckId: 'base', familySafe: true, text: 'I\'m not locked in here with you...' },
  { id: 'c069', type: 'caption', deckId: 'base', familySafe: true, text: 'Outstanding move' },
  { id: 'c070', type: 'caption', deckId: 'base', familySafe: true, text: 'Winter is coming' },
  { id: 'c071', type: 'caption', deckId: 'base', familySafe: true, text: 'Surprised Pikachu face' },
  { id: 'c072', type: 'caption', deckId: 'base', familySafe: true, text: 'Expectation vs. reality' },
  { id: 'c073', type: 'caption', deckId: 'base', familySafe: true, text: 'The floor is lava' },
  { id: 'c074', type: 'caption', deckId: 'base', familySafe: true, text: 'Instructions unclear' },
  { id: 'c075', type: 'caption', deckId: 'base', familySafe: true, text: 'Technically not wrong' },
  { id: 'c076', type: 'caption', deckId: 'base', familySafe: true, text: 'When the quiet kid raises their hand' },
  { id: 'c077', type: 'caption', deckId: 'base', familySafe: true, text: 'Savage level: 100' },
  { id: 'c078', type: 'caption', deckId: 'base', familySafe: true, text: 'Not today' },
  { id: 'c079', type: 'caption', deckId: 'base', familySafe: true, text: 'My face trying to be professional' },
  { id: 'c080', type: 'caption', deckId: 'base', familySafe: true, text: 'Sending a text and immediately regretting it' },
  { id: 'c081', type: 'caption', deckId: 'base', familySafe: true, text: 'Every group project ever' },
  { id: 'c082', type: 'caption', deckId: 'base', familySafe: true, text: 'Ctrl + Z my entire life' },
  { id: 'c083', type: 'caption', deckId: 'base', familySafe: true, text: 'New year, same me' },
  { id: 'c084', type: 'caption', deckId: 'base', familySafe: true, text: 'Crying in the club' },
  { id: 'c085', type: 'caption', deckId: 'base', familySafe: true, text: 'Me at 25 thinking I\'d have it figured out' },
  { id: 'c086', type: 'caption', deckId: 'base', familySafe: true, text: 'The audacity of this man' },
  { id: 'c087', type: 'caption', deckId: 'base', familySafe: true, text: 'Generational trauma unlocked' },
  { id: 'c088', type: 'caption', deckId: 'base', familySafe: true, text: 'Just vibing' },
  { id: 'c089', type: 'caption', deckId: 'base', familySafe: true, text: 'CEO of not reading the room' },
  { id: 'c090', type: 'caption', deckId: 'base', familySafe: true, text: 'Bro woke up and chose violence' },
  { id: 'c091', type: 'caption', deckId: 'base', familySafe: true, text: 'Character development' },
  { id: 'c092', type: 'caption', deckId: 'base', familySafe: true, text: 'The villain arc begins' },
  { id: 'c093', type: 'caption', deckId: 'base', familySafe: true, text: 'Imagine if we did nothing' },
  { id: 'c094', type: 'caption', deckId: 'base', familySafe: true, text: 'This aged poorly' },
  { id: 'c095', type: 'caption', deckId: 'base', familySafe: true, text: 'Woke up and chose chaos' },
  { id: 'c096', type: 'caption', deckId: 'base', familySafe: true, text: 'Living rent free in my head' },
  { id: 'c097', type: 'caption', deckId: 'base', familySafe: true, text: 'Core memory unlocked' },
  { id: 'c098', type: 'caption', deckId: 'base', familySafe: true, text: 'Not my problem' },
  { id: 'c099', type: 'caption', deckId: 'base', familySafe: true, text: 'The prophecy is unclear' },
  { id: 'c100', type: 'caption', deckId: 'base', familySafe: true, text: 'The timeline has been altered' },
  { id: 'c101', type: 'caption', deckId: 'base', familySafe: true, text: 'Sleep paralysis demon energy' },
  { id: 'c102', type: 'caption', deckId: 'base', familySafe: true, text: 'Technically legal' },
  { id: 'c103', type: 'caption', deckId: 'base', familySafe: true, text: 'When the plan comes together' },
  { id: 'c104', type: 'caption', deckId: 'base', familySafe: true, text: 'Main character syndrome' },
  { id: 'c105', type: 'caption', deckId: 'base', familySafe: true, text: 'Side quest accepted' },
  { id: 'c106', type: 'caption', deckId: 'base', familySafe: true, text: 'Bonus stage' },
  { id: 'c107', type: 'caption', deckId: 'base', familySafe: true, text: 'Final boss energy' },
  { id: 'c108', type: 'caption', deckId: 'base', familySafe: true, text: 'Respawning...' },
  { id: 'c109', type: 'caption', deckId: 'base', familySafe: true, text: 'Achievement unlocked' },
  { id: 'c110', type: 'caption', deckId: 'base', familySafe: true, text: 'Save point reached' },
  { id: 'c111', type: 'caption', deckId: 'base', familySafe: true, text: 'Inventory full' },
  { id: 'c112', type: 'caption', deckId: 'base', familySafe: true, text: 'HP critical' },
  { id: 'c113', type: 'caption', deckId: 'base', familySafe: true, text: 'Skill issue' },
  { id: 'c114', type: 'caption', deckId: 'base', familySafe: true, text: 'No cap' },
  { id: 'c115', type: 'caption', deckId: 'base', familySafe: true, text: 'Lowkey / highkey' },
  { id: 'c116', type: 'caption', deckId: 'base', familySafe: true, text: 'It\'s giving...' },
  { id: 'c117', type: 'caption', deckId: 'base', familySafe: true, text: 'Understood the assignment' },
  { id: 'c118', type: 'caption', deckId: 'base', familySafe: true, text: 'Rent free' },
  { id: 'c119', type: 'caption', deckId: 'base', familySafe: true, text: 'Slay' },
  { id: 'c120', type: 'caption', deckId: 'base', familySafe: true, text: 'Based and redpilled' },
  { id: 'c121', type: 'caption', deckId: 'base', familySafe: true, text: 'The audacity to exist' },
  { id: 'c122', type: 'caption', deckId: 'base', familySafe: true, text: 'We don\'t talk about that' },
  { id: 'c123', type: 'caption', deckId: 'base', familySafe: true, text: 'Somewhere, a manager is furious' },
  { id: 'c124', type: 'caption', deckId: 'base', familySafe: true, text: 'Terms and conditions apply' },
  { id: 'c125', type: 'caption', deckId: 'base', familySafe: true, text: 'In a parallel universe' },
  { id: 'c126', type: 'caption', deckId: 'base', familySafe: true, text: 'Simulation theory confirmed' },
  { id: 'c127', type: 'caption', deckId: 'base', familySafe: true, text: 'The algorithm knows' },
  { id: 'c128', type: 'caption', deckId: 'base', familySafe: true, text: 'Unsubscribe from life' },
  { id: 'c129', type: 'caption', deckId: 'base', familySafe: true, text: 'Terms: declined' },
  { id: 'c130', type: 'caption', deckId: 'base', familySafe: true, text: 'Offline mode activated' },
  { id: 'c131', type: 'caption', deckId: 'base', familySafe: true, text: 'Reading the comments was a mistake' },
  { id: 'c132', type: 'caption', deckId: 'base', familySafe: true, text: 'LinkedIn vs. Instagram vs. reality' },
  { id: 'c133', type: 'caption', deckId: 'base', familySafe: true, text: 'When the AI gets it right' },
  { id: 'c134', type: 'caption', deckId: 'base', familySafe: true, text: 'When the AI hallucinates' },
  { id: 'c135', type: 'caption', deckId: 'base', familySafe: true, text: 'Prompt engineering gone wrong' },
  { id: 'c136', type: 'caption', deckId: 'base', familySafe: true, text: 'Hot take: water is wet' },
  { id: 'c137', type: 'caption', deckId: 'base', familySafe: true, text: 'Unpopular opinion incoming' },
  { id: 'c138', type: 'caption', deckId: 'base', familySafe: true, text: 'The discourse' },
  { id: 'c139', type: 'caption', deckId: 'base', familySafe: true, text: 'Touch grass' },
  { id: 'c140', type: 'caption', deckId: 'base', familySafe: true, text: 'Go outside' },
  { id: 'c141', type: 'caption', deckId: 'base', familySafe: true, text: 'When your spotify wrapped drops' },
  { id: 'c142', type: 'caption', deckId: 'base', familySafe: true, text: 'Hyperpop summer' },
  { id: 'c143', type: 'caption', deckId: 'base', familySafe: true, text: 'My Roman Empire' },
  { id: 'c144', type: 'caption', deckId: 'base', familySafe: true, text: 'Eating the rich' },
  { id: 'c145', type: 'caption', deckId: 'base', familySafe: true, text: 'It\'s called fashion, look it up' },
  { id: 'c146', type: 'caption', deckId: 'base', familySafe: true, text: 'Cottagecore chaos' },
  { id: 'c147', type: 'caption', deckId: 'base', familySafe: true, text: 'That\'s so fetch' },
  { id: 'c148', type: 'caption', deckId: 'base', familySafe: true, text: 'The villain was right' },
  { id: 'c149', type: 'caption', deckId: 'base', familySafe: true, text: 'Lore drop' },
  { id: 'c150', type: 'caption', deckId: 'base', familySafe: true, text: 'Canon event' },
  { id: 'c151', type: 'caption', deckId: 'base', familySafe: true, text: 'When the bus is 1 minute late' },
  { id: 'c152', type: 'caption', deckId: 'base', familySafe: true, text: 'That meeting could have been an email' },
  { id: 'c153', type: 'caption', deckId: 'base', familySafe: true, text: 'Passive aggressive "per my last email"' },
  { id: 'c154', type: 'caption', deckId: 'base', familySafe: true, text: 'Out of office: forever' },
  { id: 'c155', type: 'caption', deckId: 'base', familySafe: true, text: 'Calendar blocked' },
  { id: 'c156', type: 'caption', deckId: 'base', familySafe: true, text: 'Synergy. Leverage. Disrupt.' },
  { id: 'c157', type: 'caption', deckId: 'base', familySafe: true, text: 'Move fast and break things' },
  { id: 'c158', type: 'caption', deckId: 'base', familySafe: true, text: 'Hustle culture victim' },
  { id: 'c159', type: 'caption', deckId: 'base', familySafe: true, text: 'Grinding for what exactly' },
  { id: 'c160', type: 'caption', deckId: 'base', familySafe: true, text: 'Rise and grind said no one happy' },
  { id: 'c161', type: 'caption', deckId: 'base', familySafe: true, text: 'When someone asks how I\'m doing' },
  { id: 'c162', type: 'caption', deckId: 'base', familySafe: true, text: 'Fine. Everything is fine.' },
  { id: 'c163', type: 'caption', deckId: 'base', familySafe: true, text: 'Smiling through it' },
  { id: 'c164', type: 'caption', deckId: 'base', familySafe: true, text: 'Manifesting good vibes only' },
  { id: 'c165', type: 'caption', deckId: 'base', familySafe: true, text: 'We ball' },
  { id: 'c166', type: 'caption', deckId: 'base', familySafe: true, text: 'It is what it is' },
  { id: 'c167', type: 'caption', deckId: 'base', familySafe: true, text: 'Vibe check: failed' },
  { id: 'c168', type: 'caption', deckId: 'base', familySafe: true, text: 'Respect the grind' },
  { id: 'c169', type: 'caption', deckId: 'base', familySafe: true, text: 'Caught in 4K' },
  { id: 'c170', type: 'caption', deckId: 'base', familySafe: true, text: 'Ratio + L + no cap' },
  { id: 'c171', type: 'caption', deckId: 'base', familySafe: true, text: 'The plot thickens' },
  { id: 'c172', type: 'caption', deckId: 'base', familySafe: true, text: 'Stay tuned' },
  { id: 'c173', type: 'caption', deckId: 'base', familySafe: true, text: 'To be continued...' },
  { id: 'c174', type: 'caption', deckId: 'base', familySafe: true, text: 'Cliffhanger energy' },
  { id: 'c175', type: 'caption', deckId: 'base', familySafe: true, text: 'Part 2 never came' },
  { id: 'c176', type: 'caption', deckId: 'base', familySafe: true, text: 'When the sequel is actually good' },
  { id: 'c177', type: 'caption', deckId: 'base', familySafe: true, text: 'Origin story' },
  { id: 'c178', type: 'caption', deckId: 'base', familySafe: true, text: 'The prequel nobody asked for' },
  { id: 'c179', type: 'caption', deckId: 'base', familySafe: true, text: 'Extended universe' },
  { id: 'c180', type: 'caption', deckId: 'base', familySafe: true, text: 'Crossover event' },
  { id: 'c181', type: 'caption', deckId: 'base', familySafe: true, text: 'When you run out of show to watch' },
  { id: 'c182', type: 'caption', deckId: 'base', familySafe: true, text: 'Autoplaying at 1am' },
  { id: 'c183', type: 'caption', deckId: 'base', familySafe: true, text: 'Still watching? Yes. Always.' },
  { id: 'c184', type: 'caption', deckId: 'base', familySafe: true, text: 'Binge-watching is self care' },
  { id: 'c185', type: 'caption', deckId: 'base', familySafe: true, text: 'Rewatching for the 5th time' },
  { id: 'c186', type: 'caption', deckId: 'base', familySafe: true, text: 'Skipping the opening credits... eventually' },
  { id: 'c187', type: 'caption', deckId: 'base', familySafe: true, text: 'Spoilers are a war crime' },
  { id: 'c188', type: 'caption', deckId: 'base', familySafe: true, text: 'When the episode ends on a cliffhanger' },
  { id: 'c189', type: 'caption', deckId: 'base', familySafe: true, text: 'The ship sails itself' },
  { id: 'c190', type: 'caption', deckId: 'base', familySafe: true, text: 'They did my fave dirty' },
  { id: 'c191', type: 'caption', deckId: 'base', familySafe: true, text: 'Cinematic universe destroyed' },
  { id: 'c192', type: 'caption', deckId: 'base', familySafe: true, text: 'The writing in season 3 though' },
  { id: 'c193', type: 'caption', deckId: 'base', familySafe: true, text: 'Cancelled after one season' },
  { id: 'c194', type: 'caption', deckId: 'base', familySafe: true, text: 'Fan fiction is better anyway' },
  { id: 'c195', type: 'caption', deckId: 'base', familySafe: true, text: 'Headcanon accepted' },
  { id: 'c196', type: 'caption', deckId: 'base', familySafe: true, text: 'Fandom wars, 2007-present' },
  { id: 'c197', type: 'caption', deckId: 'base', familySafe: true, text: 'Merch purchased before watching' },
  { id: 'c198', type: 'caption', deckId: 'base', familySafe: true, text: 'Convention energy' },
  { id: 'c199', type: 'caption', deckId: 'base', familySafe: true, text: 'Cosplay at the grocery store' },
  { id: 'c200', type: 'caption', deckId: 'base', familySafe: true, text: 'No ragrets' },
]

export const PHOTO_CARDS: Card[] = [
  { id: 'p001', type: 'photo', deckId: 'base', familySafe: true, imageAsset: 'meme_approval', formatHint: 'two-panel' },
  { id: 'p002', type: 'photo', deckId: 'base', familySafe: true, imageAsset: 'meme_distracted', formatHint: 'distracted' },
  { id: 'p003', type: 'photo', deckId: 'base', familySafe: true, imageAsset: 'meme_disaster', formatHint: 'reaction' },
  { id: 'p004', type: 'photo', deckId: 'base', familySafe: true, imageAsset: 'meme_dog_computer', formatHint: 'reaction' },
  { id: 'p005', type: 'photo', deckId: 'base', familySafe: true, imageAsset: 'meme_thinking', formatHint: 'reaction' },
  { id: 'p006', type: 'photo', deckId: 'base', familySafe: true, imageAsset: 'meme_running', formatHint: 'action' },
  { id: 'p007', type: 'photo', deckId: 'base', familySafe: true, imageAsset: 'meme_success', formatHint: 'reaction' },
  { id: 'p008', type: 'photo', deckId: 'base', familySafe: true, imageAsset: 'meme_side_eye', formatHint: 'reaction' },
  { id: 'p009', type: 'photo', deckId: 'base', familySafe: true, imageAsset: 'meme_nope', formatHint: 'two-panel' },
  { id: 'p010', type: 'photo', deckId: 'base', familySafe: true, imageAsset: 'meme_waiting', formatHint: 'reaction' },
]

export const BASE_DECK = {
  id: 'base',
  name: 'Base Deck',
  description: 'The original 200-card Let\'s Meme deck',
  owned: true,
  familySafe: false,
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/baseDeck.ts
git commit -m "feat: add base deck data (200 captions, 10 photo stubs)"
```

---

## Task 5: Game Store

**Files:**
- Create: `src/store/gameStore.ts`
- Create: `src/store/gameStore.test.ts`

- [ ] **Step 1: Write failing store tests**

Create `src/store/gameStore.test.ts`:
```ts
import { act } from 'react'
import { useGameStore } from './gameStore'

beforeEach(() => {
  useGameStore.getState().reset()
})

describe('createRoom', () => {
  it('creates a room in lobby state with given players', () => {
    act(() => {
      useGameStore.getState().createRoom(
        ['Alice', 'Bob', 'Carol'],
        { targetScore: 5, familyMode: false, rapidFireSeconds: null, judgeExplainsWhy: false, selectedDeckIds: ['base'] }
      )
    })
    const room = useGameStore.getState().room
    expect(room).not.toBeNull()
    expect(room!.state).toBe('lobby')
    expect(room!.players).toHaveLength(3)
    expect(room!.players.map(p => p.name)).toEqual(['Alice', 'Bob', 'Carol'])
    expect(room!.players.every(p => p.score === 0)).toBe(true)
    expect(room!.players.every(p => p.hand.length === 0)).toBe(true)
  })
})

describe('startGame', () => {
  it('deals 7 cards to each non-judge player and sets room to playing', () => {
    act(() => {
      useGameStore.getState().createRoom(
        ['Alice', 'Bob', 'Carol'],
        { targetScore: 5, familyMode: false, rapidFireSeconds: null, judgeExplainsWhy: false, selectedDeckIds: ['base'] }
      )
      useGameStore.getState().startGame()
    })
    const room = useGameStore.getState().room!
    expect(room.state).toBe('playing')
    const judge = room.players.find(p => p.isJudge)!
    const nonJudges = room.players.filter(p => !p.isJudge)
    expect(judge).toBeDefined()
    expect(judge.hand).toHaveLength(0)
    nonJudges.forEach(p => expect(p.hand).toHaveLength(7))
  })

  it('starts a round with a photo card', () => {
    act(() => {
      useGameStore.getState().createRoom(
        ['Alice', 'Bob', 'Carol'],
        { targetScore: 5, familyMode: false, rapidFireSeconds: null, judgeExplainsWhy: false, selectedDeckIds: ['base'] }
      )
      useGameStore.getState().startGame()
    })
    const room = useGameStore.getState().room!
    expect(room.currentRound).not.toBeNull()
    expect(room.currentRound!.photoCard.type).toBe('photo')
    expect(room.currentRound!.phase).toBe('submitting')
  })
})

describe('submitCard', () => {
  it('adds a submission for the player and removes card from hand', () => {
    act(() => {
      useGameStore.getState().createRoom(
        ['Alice', 'Bob', 'Carol'],
        { targetScore: 5, familyMode: false, rapidFireSeconds: null, judgeExplainsWhy: false, selectedDeckIds: ['base'] }
      )
      useGameStore.getState().startGame()
    })
    const room = useGameStore.getState().room!
    const nonJudge = room.players.find(p => !p.isJudge)!
    const cardToPlay = nonJudge.hand[0]
    act(() => {
      useGameStore.getState().submitCard(nonJudge.id, cardToPlay.id)
    })
    const updated = useGameStore.getState().room!
    const updatedPlayer = updated.players.find(p => p.id === nonJudge.id)!
    expect(updatedPlayer.hand).toHaveLength(6)
    expect(updated.currentRound!.submissions).toHaveLength(1)
    expect(updated.currentRound!.submissions[0].card.id).toBe(cardToPlay.id)
    expect(updated.currentRound!.submissions[0].revealed).toBe(false)
  })

  it('transitions phase to revealing when all non-judges have submitted', () => {
    act(() => {
      useGameStore.getState().createRoom(
        ['Alice', 'Bob', 'Carol'],
        { targetScore: 5, familyMode: false, rapidFireSeconds: null, judgeExplainsWhy: false, selectedDeckIds: ['base'] }
      )
      useGameStore.getState().startGame()
    })
    const room = useGameStore.getState().room!
    const nonJudges = room.players.filter(p => !p.isJudge)
    act(() => {
      nonJudges.forEach(p => {
        useGameStore.getState().submitCard(p.id, p.hand[0].id)
      })
    })
    const updated = useGameStore.getState().room!
    expect(updated.currentRound!.phase).toBe('revealing')
  })
})

describe('revealNext', () => {
  it('marks the next submission as revealed and increments revealIndex', () => {
    act(() => {
      useGameStore.getState().createRoom(
        ['Alice', 'Bob', 'Carol'],
        { targetScore: 5, familyMode: false, rapidFireSeconds: null, judgeExplainsWhy: false, selectedDeckIds: ['base'] }
      )
      useGameStore.getState().startGame()
    })
    const room = useGameStore.getState().room!
    const nonJudges = room.players.filter(p => !p.isJudge)
    act(() => {
      nonJudges.forEach(p => {
        useGameStore.getState().submitCard(p.id, p.hand[0].id)
      })
      useGameStore.getState().revealNext()
    })
    const updated = useGameStore.getState().room!
    expect(updated.currentRound!.revealIndex).toBe(1)
    expect(updated.currentRound!.submissions[0].revealed).toBe(true)
  })
})

describe('pickWinner', () => {
  it('awards a point, advances judge, refills hands, starts new round', () => {
    act(() => {
      useGameStore.getState().createRoom(
        ['Alice', 'Bob', 'Carol'],
        { targetScore: 5, familyMode: false, rapidFireSeconds: null, judgeExplainsWhy: false, selectedDeckIds: ['base'] }
      )
      useGameStore.getState().startGame()
    })
    const room = useGameStore.getState().room!
    const nonJudges = room.players.filter(p => !p.isJudge)
    const winnerId = nonJudges[0].id
    act(() => {
      nonJudges.forEach(p => useGameStore.getState().submitCard(p.id, p.hand[0].id))
      nonJudges.forEach(() => useGameStore.getState().revealNext())
      useGameStore.getState().pickWinner(winnerId)
    })
    const updated = useGameStore.getState().room!
    const winner = updated.players.find(p => p.id === winnerId)!
    expect(winner.score).toBe(1)
    // judge rotated
    const prevJudgeIndex = room.judgeIndex
    expect(updated.judgeIndex).toBe((prevJudgeIndex + 1) % 3)
    // hands refilled
    updated.players.filter(p => !p.isJudge).forEach(p => {
      expect(p.hand).toHaveLength(7)
    })
  })

  it('sets room state to ended when winner reaches targetScore', () => {
    act(() => {
      useGameStore.getState().createRoom(
        ['Alice', 'Bob'],
        { targetScore: 1, familyMode: false, rapidFireSeconds: null, judgeExplainsWhy: false, selectedDeckIds: ['base'] }
      )
      useGameStore.getState().startGame()
    })
    const room = useGameStore.getState().room!
    const nonJudge = room.players.find(p => !p.isJudge)!
    act(() => {
      useGameStore.getState().submitCard(nonJudge.id, nonJudge.hand[0].id)
      useGameStore.getState().revealNext()
      useGameStore.getState().pickWinner(nonJudge.id)
    })
    expect(useGameStore.getState().room!.state).toBe('ended')
  })
})
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx jest src/store/gameStore.test.ts
```

Expected: FAIL — "Cannot find module './gameStore'"

- [ ] **Step 3: Implement game store**

Create `src/store/gameStore.ts`:
```ts
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
  const photos = [...room.deck.photos]
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
    set({ room: withNewRound })
  },

  reset() {
    set({ room: null })
  },
}))

function refillHands(room: Room): Room {
  const captions = [...room.deck.captions]
  const players = room.players.map(p => {
    if (p.isJudge) return { ...p, hand: [] }
    const needed = 7 - p.hand.length
    const refill = captions.splice(0, needed)
    return { ...p, hand: [...p.hand, ...refill] }
  })
  return { ...room, players, deck: { ...room.deck, captions } }
}
```

- [ ] **Step 4: Run store tests — confirm pass**

```bash
npx jest src/store/gameStore.test.ts
```

Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/store/
git commit -m "feat: add Zustand game store with full round state machine"
```

---

## Task 6: HomeScreen

**Files:**
- Create: `app/index.tsx`

- [ ] **Step 1: Create HomeScreen**

Create `app/index.tsx`:
```tsx
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { useGameStore } from '../src/store/gameStore'
import type { RoomConfig } from '../src/types/game'

export default function HomeScreen() {
  const [names, setNames] = useState(['', '', ''])
  const createRoom = useGameStore(s => s.createRoom)

  function addPlayer() {
    if (names.length < 8) setNames([...names, ''])
  }

  function updateName(index: number, value: string) {
    setNames(names.map((n, i) => (i === index ? value : n)))
  }

  function removePlayer(index: number) {
    if (names.length <= 2) return
    setNames(names.filter((_, i) => i !== index))
  }

  function handleStart() {
    const validNames = names.map(n => n.trim()).filter(Boolean)
    if (validNames.length < 2) return
    const config: RoomConfig = {
      targetScore: 5,
      familyMode: false,
      rapidFireSeconds: null,
      judgeExplainsWhy: false,
      selectedDeckIds: ['base'],
    }
    createRoom(validNames, config)
    router.push('/lobby')
  }

  const canStart = names.filter(n => n.trim()).length >= 2

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Let's Meme</Text>
          <Text style={styles.subtitle}>Add players to get started</Text>

          {names.map((name, i) => (
            <View key={i} style={styles.row}>
              <TextInput
                style={styles.input}
                placeholder={`Player ${i + 1}`}
                placeholderTextColor="#555"
                value={name}
                onChangeText={v => updateName(i, v)}
                maxLength={20}
                autoCapitalize="words"
              />
              {names.length > 2 && (
                <TouchableOpacity onPress={() => removePlayer(i)} style={styles.removeBtn}>
                  <Text style={styles.removeTxt}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {names.length < 8 && (
            <TouchableOpacity onPress={addPlayer} style={styles.addBtn}>
              <Text style={styles.addTxt}>+ Add Player</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleStart}
            style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
            disabled={!canStart}
          >
            <Text style={styles.startTxt}>Start Game</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  flex: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 40, fontWeight: '900', color: '#fff', textAlign: 'center', marginTop: 32, marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  input: {
    flex: 1, backgroundColor: '#1a1a2e', color: '#fff', fontSize: 18,
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a',
  },
  removeBtn: { marginLeft: 12, padding: 8 },
  removeTxt: { color: '#555', fontSize: 18 },
  addBtn: { alignItems: 'center', padding: 14, marginBottom: 24 },
  addTxt: { color: '#6c63ff', fontSize: 16, fontWeight: '600' },
  startBtn: {
    backgroundColor: '#6c63ff', padding: 18, borderRadius: 16,
    alignItems: 'center', marginTop: 8,
  },
  startBtnDisabled: { backgroundColor: '#2a2a4a' },
  startTxt: { color: '#fff', fontSize: 20, fontWeight: '800' },
})
```

- [ ] **Step 2: Verify screen renders**

```bash
npx expo start --ios
```

Expected: Home screen with player name inputs and Start Game button visible. No red errors.

- [ ] **Step 3: Commit**

```bash
git add app/index.tsx
git commit -m "feat: add HomeScreen with player name entry"
```

---

## Task 7: LobbyScreen

**Files:**
- Create: `app/lobby.tsx`

- [ ] **Step 1: Create LobbyScreen**

Create `app/lobby.tsx`:
```tsx
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList } from 'react-native'
import { router } from 'expo-router'
import { useGameStore } from '../src/store/gameStore'

export default function LobbyScreen() {
  const room = useGameStore(s => s.room)
  const startGame = useGameStore(s => s.startGame)

  if (!room) {
    router.replace('/')
    return null
  }

  function handleStart() {
    startGame()
    router.replace('/game')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Players</Text>
        <FlatList
          data={room.players}
          keyExtractor={p => p.id}
          renderItem={({ item, index }) => (
            <View style={styles.playerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{item.name[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.playerName}>{item.name}</Text>
              {index === 0 && <Text style={styles.hostBadge}>HOST</Text>}
            </View>
          )}
          style={styles.list}
        />

        <View style={styles.configRow}>
          <Text style={styles.configLabel}>First to</Text>
          <Text style={styles.configValue}>{room.config.targetScore} points</Text>
        </View>

        <TouchableOpacity onPress={handleStart} style={styles.startBtn}>
          <Text style={styles.startTxt}>Deal Cards</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  inner: { flex: 1, padding: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 24, textAlign: 'center' },
  list: { flex: 1 },
  playerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#6c63ff', alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { color: '#fff', fontWeight: '800', fontSize: 18 },
  playerName: { flex: 1, color: '#fff', fontSize: 18, marginLeft: 14 },
  hostBadge: {
    color: '#6c63ff', fontSize: 11, fontWeight: '800',
    borderWidth: 1, borderColor: '#6c63ff', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  configRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 8 },
  configLabel: { color: '#888', fontSize: 16 },
  configValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
  startBtn: { backgroundColor: '#6c63ff', padding: 18, borderRadius: 16, alignItems: 'center' },
  startTxt: { color: '#fff', fontSize: 20, fontWeight: '800' },
})
```

- [ ] **Step 2: Verify navigation works**

```bash
npx expo start --ios
```

Expected: Enter names → tap Start Game → lobby shows player list → tap Deal Cards (will navigate to `/game` which doesn't exist yet — that's fine, expect a "route not found" screen).

- [ ] **Step 3: Commit**

```bash
git add app/lobby.tsx
git commit -m "feat: add LobbyScreen with player list"
```

---

## Task 8: CaptionCard Component (3D Flip)

**Files:**
- Create: `src/components/CaptionCard.tsx`

- [ ] **Step 1: Create CaptionCard with 3D flip animation**

Create `src/components/CaptionCard.tsx`:
```tsx
import { useEffect } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, interpolate, Extrapolation,
} from 'react-native-reanimated'

type Props = {
  text: string
  revealed: boolean
  onPress?: () => void
  selected?: boolean
  disabled?: boolean
}

export function CaptionCard({ text, revealed, onPress, selected = false, disabled = false }: Props) {
  const rotation = useSharedValue(revealed ? 180 : 0)

  useEffect(() => {
    rotation.value = withTiming(revealed ? 180 : 0, { duration: 500 })
  }, [revealed])

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${rotation.value}deg` }],
    backfaceVisibility: 'hidden',
    opacity: interpolate(rotation.value, [89, 91], [1, 0], Extrapolation.CLAMP),
  }))

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${interpolate(rotation.value, [0, 180], [180, 360])}deg` }],
    backfaceVisibility: 'hidden',
    opacity: interpolate(rotation.value, [89, 91], [0, 1], Extrapolation.CLAMP),
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  }))

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || !onPress} activeOpacity={0.85} style={styles.wrapper}>
      <View style={[styles.card, selected && styles.cardSelected]}>
        {/* Back face */}
        <Animated.View style={[styles.face, styles.back, backStyle]}>
          <Text style={styles.backText}>🃏</Text>
        </Animated.View>
        {/* Front face */}
        <Animated.View style={[styles.face, styles.front, frontStyle]}>
          <Text style={styles.captionText}>{text}</Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrapper: { margin: 6 },
  card: {
    width: 160, height: 110,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  cardSelected: {
    shadowColor: '#6c63ff',
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 16,
  },
  face: {
    width: '100%', height: '100%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  front: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4a' },
  back: { backgroundColor: '#6c63ff' },
  backText: { fontSize: 36 },
  captionText: { color: '#fff', fontSize: 14, textAlign: 'center', lineHeight: 20, fontWeight: '600' },
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/CaptionCard.tsx
git commit -m "feat: add CaptionCard with 3D flip animation"
```

---

## Task 9: PhotoCard Component

**Files:**
- Create: `src/components/PhotoCard.tsx`

- [ ] **Step 1: Create PhotoCard**

Create `src/components/PhotoCard.tsx`:
```tsx
import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native'

const PLACEHOLDER_COLOR: Record<string, string> = {
  meme_approval: '#e94560',
  meme_distracted: '#f5a623',
  meme_disaster: '#7ed321',
  meme_dog_computer: '#4a90e2',
  meme_thinking: '#9b59b6',
  meme_running: '#e67e22',
  meme_success: '#2ecc71',
  meme_side_eye: '#e74c3c',
  meme_nope: '#1abc9c',
  meme_waiting: '#3498db',
}

type Props = {
  imageAsset: string
  formatHint?: string
  captionOverlay?: string
}

export function PhotoCard({ imageAsset, formatHint, captionOverlay }: Props) {
  const color = PLACEHOLDER_COLOR[imageAsset] ?? '#6c63ff'

  return (
    <View style={styles.container}>
      <View style={[styles.imagePlaceholder, { backgroundColor: color }]}>
        <Text style={styles.placeholderLabel}>{imageAsset.replace('meme_', '').toUpperCase()}</Text>
        {formatHint && <Text style={styles.formatHint}>{formatHint}</Text>}
      </View>
      {captionOverlay && (
        <View style={styles.captionBar}>
          <Text style={styles.captionText} numberOfLines={3}>{captionOverlay}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  formatHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  captionBar: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 12,
  },
  captionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PhotoCard.tsx
git commit -m "feat: add PhotoCard component with colour placeholder"
```

---

## Task 10: CardHand Component

**Files:**
- Create: `src/components/CardHand.tsx`

- [ ] **Step 1: Create CardHand**

Create `src/components/CardHand.tsx`:
```tsx
import { ScrollView, StyleSheet, View } from 'react-native'
import { CaptionCard } from './CaptionCard'
import type { Card } from '../types/game'

type Props = {
  cards: Card[]
  selectedId: string | null
  onSelect: (cardId: string) => void
  disabled?: boolean
}

export function CardHand({ cards, selectedId, onSelect, disabled = false }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {cards.map((card, i) => {
          const angle = ((i - (cards.length - 1) / 2) * 4)
          return (
            <View
              key={card.id}
              style={[
                styles.cardWrapper,
                { transform: [{ rotate: `${angle}deg` }, { translateY: Math.abs(angle) * 1.5 }] },
                selectedId === card.id && styles.cardWrapperSelected,
              ]}
            >
              <CaptionCard
                text={card.text ?? ''}
                revealed
                onPress={() => onSelect(card.id)}
                selected={selectedId === card.id}
                disabled={disabled}
              />
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingVertical: 16 },
  scroll: { paddingHorizontal: 24, alignItems: 'flex-end', paddingBottom: 8 },
  cardWrapper: { marginHorizontal: -6 },
  cardWrapperSelected: { transform: [{ translateY: -12 }] },
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/CardHand.tsx
git commit -m "feat: add CardHand fan layout component"
```

---

## Task 11: Game Screen Phases

**Files:**
- Create: `app/game.tsx`
- Create: `src/screens/JudgeWaitScreen.tsx`
- Create: `src/screens/PlayerHandScreen.tsx`
- Create: `src/screens/RevealScreen.tsx`
- Create: `src/screens/PickWinnerScreen.tsx`
- Create: `src/screens/RoundResultScreen.tsx`

- [ ] **Step 1: Create JudgeWaitScreen**

Create `src/screens/JudgeWaitScreen.tsx`:
```tsx
import { View, Text, StyleSheet, SafeAreaView } from 'react-native'
import { PhotoCard } from '../components/PhotoCard'
import type { Room } from '../types/game'

type Props = { room: Room }

export function JudgeWaitScreen({ room }: Props) {
  const round = room.currentRound!
  const judge = room.players.find(p => p.isJudge)!
  const nonJudges = room.players.filter(p => !p.isJudge)
  const submitted = round.submissions.length

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.label}>JUDGE</Text>
        <Text style={styles.judgeName}>{judge.name}</Text>

        <View style={styles.photoWrap}>
          <PhotoCard imageAsset={round.photoCard.imageAsset!} formatHint={round.photoCard.formatHint} />
        </View>

        <Text style={styles.waitText}>
          Waiting for players to submit...
        </Text>
        <Text style={styles.countText}>{submitted} / {nonJudges.length} submitted</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  inner: { flex: 1, padding: 24, alignItems: 'center' },
  label: { color: '#6c63ff', fontSize: 11, fontWeight: '800', letterSpacing: 3, marginBottom: 4 },
  judgeName: { color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 24 },
  photoWrap: { width: '100%', marginBottom: 32 },
  waitText: { color: '#888', fontSize: 16, marginBottom: 8 },
  countText: { color: '#fff', fontSize: 24, fontWeight: '800' },
})
```

- [ ] **Step 2: Create PlayerHandScreen**

Create `src/screens/PlayerHandScreen.tsx`:
```tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native'
import { PhotoCard } from '../components/PhotoCard'
import { CardHand } from '../components/CardHand'
import { useGameStore } from '../store/gameStore'
import type { Room } from '../types/game'

type Props = {
  room: Room
  currentPlayerId: string
}

export function PlayerHandScreen({ room, currentPlayerId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const submitCard = useGameStore(s => s.submitCard)
  const round = room.currentRound!
  const player = room.players.find(p => p.id === currentPlayerId)!

  function handleSubmit() {
    if (!selectedId) return
    submitCard(currentPlayerId, selectedId)
    setSelectedId(null)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.prompt}>{player.name}'s turn</Text>

        <View style={styles.photoWrap}>
          <PhotoCard imageAsset={round.photoCard.imageAsset!} formatHint={round.photoCard.formatHint} />
        </View>

        <Text style={styles.instruction}>Pick a caption card</Text>

        <CardHand
          cards={player.hand}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <TouchableOpacity
          style={[styles.submitBtn, !selectedId && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selectedId}
        >
          <Text style={styles.submitTxt}>Submit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  inner: { flex: 1, padding: 24 },
  prompt: { color: '#6c63ff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  photoWrap: { marginBottom: 20 },
  instruction: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  submitBtn: { backgroundColor: '#6c63ff', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { backgroundColor: '#2a2a4a' },
  submitTxt: { color: '#fff', fontSize: 18, fontWeight: '800' },
})
```

- [ ] **Step 3: Create RevealScreen**

Create `src/screens/RevealScreen.tsx`:
```tsx
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useGameStore } from '../store/gameStore'
import { CaptionCard } from '../components/CaptionCard'
import { PhotoCard } from '../components/PhotoCard'
import type { Room } from '../types/game'

type Props = { room: Room }

export function RevealScreen({ room }: Props) {
  const revealNext = useGameStore(s => s.revealNext)
  const round = room.currentRound!
  const allRevealed = round.revealIndex >= round.submissions.length

  function handleReveal() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    revealNext()
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Reveal</Text>
        <View style={styles.photoWrap}>
          <PhotoCard imageAsset={round.photoCard.imageAsset!} formatHint={round.photoCard.formatHint} />
        </View>

        <View style={styles.cardsRow}>
          {round.submissions.map((sub, i) => (
            <CaptionCard
              key={sub.id}
              text={sub.card.text ?? ''}
              revealed={sub.revealed}
              onPress={!sub.revealed && i === round.revealIndex ? handleReveal : undefined}
            />
          ))}
        </View>

        {!allRevealed && (
          <Text style={styles.hint}>Tap the face-down card to reveal</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  photoWrap: { marginBottom: 24 },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 },
  hint: { color: '#888', fontSize: 14, textAlign: 'center' },
})
```

- [ ] **Step 4: Create PickWinnerScreen**

Create `src/screens/PickWinnerScreen.tsx`:
```tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList } from 'react-native'
import { useGameStore } from '../store/gameStore'
import type { Room } from '../types/game'

type Props = { room: Room }

export function PickWinnerScreen({ room }: Props) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null)
  const pickWinner = useGameStore(s => s.pickWinner)
  const round = room.currentRound!

  function handlePick() {
    if (!selectedSubmissionId) return
    const sub = round.submissions.find(s => s.id === selectedSubmissionId)!
    pickWinner(sub.playerId)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Pick the Winner</Text>

        <FlatList
          data={round.submissions}
          keyExtractor={s => s.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.option, selectedSubmissionId === item.id && styles.optionSelected]}
              onPress={() => setSelectedSubmissionId(item.id)}
            >
              <Text style={styles.optionText}>{item.card.text}</Text>
            </TouchableOpacity>
          )}
          style={styles.list}
        />

        <TouchableOpacity
          style={[styles.pickBtn, !selectedSubmissionId && styles.pickBtnDisabled]}
          onPress={handlePick}
          disabled={!selectedSubmissionId}
        >
          <Text style={styles.pickTxt}>Crown Winner</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  inner: { flex: 1, padding: 24 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 24 },
  list: { flex: 1 },
  option: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#2a2a4a',
  },
  optionSelected: { borderColor: '#6c63ff', backgroundColor: '#1e1b3a' },
  optionText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  pickBtn: { backgroundColor: '#6c63ff', padding: 18, borderRadius: 16, alignItems: 'center' },
  pickBtnDisabled: { backgroundColor: '#2a2a4a' },
  pickTxt: { color: '#fff', fontSize: 18, fontWeight: '800' },
})
```

- [ ] **Step 5: Create RoundResultScreen**

Create `src/screens/RoundResultScreen.tsx`:
```tsx
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native'
import type { Room } from '../types/game'

type Props = { room: Room }

export function RoundResultScreen({ room }: Props) {
  const round = room.currentRound!
  const winner = room.players.find(p => p.id === round.winnerId)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.crown}>👑</Text>
        <Text style={styles.winnerName}>{winner?.name}</Text>
        <Text style={styles.winnerCaption}>{round.submissions.find(s => s.playerId === round.winnerId)?.card.text}</Text>

        <View style={styles.scores}>
          {room.players.map(p => (
            <View key={p.id} style={styles.scoreRow}>
              <Text style={styles.scoreName}>{p.name}</Text>
              <Text style={styles.scoreValue}>{p.score} pts</Text>
            </View>
          ))}
        </View>

        <Text style={styles.nextHint}>Next round starting...</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  inner: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  crown: { fontSize: 64, marginBottom: 16 },
  winnerName: { color: '#fff', fontSize: 36, fontWeight: '900', marginBottom: 8 },
  winnerCaption: { color: '#6c63ff', fontSize: 16, textAlign: 'center', marginBottom: 40, fontStyle: 'italic' },
  scores: { width: '100%', marginBottom: 32 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  scoreName: { color: '#fff', fontSize: 18 },
  scoreValue: { color: '#6c63ff', fontSize: 18, fontWeight: '700' },
  nextHint: { color: '#555', fontSize: 14 },
})
```

- [ ] **Step 6: Create game.tsx — the phase router**

Create `app/game.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { useGameStore } from '../src/store/gameStore'
import { JudgeWaitScreen } from '../src/screens/JudgeWaitScreen'
import { PlayerHandScreen } from '../src/screens/PlayerHandScreen'
import { RevealScreen } from '../src/screens/RevealScreen'
import { PickWinnerScreen } from '../src/screens/PickWinnerScreen'
import { RoundResultScreen } from '../src/screens/RoundResultScreen'

export default function GameScreen() {
  const room = useGameStore(s => s.room)
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)

  useEffect(() => {
    if (!room) {
      router.replace('/')
      return
    }
    if (room.state === 'ended') {
      router.replace('/end')
    }
  }, [room?.state])

  if (!room || !room.currentRound) return null

  const round = room.currentRound
  const nonJudges = room.players.filter(p => !p.isJudge)

  // submitting phase: cycle through non-judge players
  if (round.phase === 'submitting') {
    const submittedIds = round.submissions.map(s => s.playerId)
    const nextPlayer = nonJudges.find(p => !submittedIds.includes(p.id))

    if (!nextPlayer) return null // all submitted, store will transition phase

    const isCurrentJudgeView = !nextPlayer // judge waiting view
    const judge = room.players.find(p => p.isJudge)!

    // If the current player on screen is the judge, show judge wait
    // Otherwise show the player's hand
    // We use a "pass the phone" flow: judge sees wait, then each player picks
    if (submittedIds.length === 0 && currentPlayerIndex === 0) {
      // First: show judge wait screen so judge can see the photo, then pass to player 1
      return <JudgeWaitScreen room={room} />
    }

    return (
      <PlayerHandScreen
        room={room}
        currentPlayerId={nextPlayer.id}
      />
    )
  }

  if (round.phase === 'revealing') {
    const allRevealed = round.revealIndex >= round.submissions.length
    if (allRevealed) {
      return <PickWinnerScreen room={room} />
    }
    return <RevealScreen room={room} />
  }

  if (round.phase === 'complete') {
    return <RoundResultScreen room={room} />
  }

  return null
}
```

- [ ] **Step 7: Create EndScreen**

Create `app/end.tsx`:
```tsx
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList } from 'react-native'
import { router } from 'expo-router'
import { useGameStore } from '../src/store/gameStore'

export default function EndScreen() {
  const room = useGameStore(s => s.room)
  const reset = useGameStore(s => s.reset)

  if (!room) {
    router.replace('/')
    return null
  }

  const sorted = [...room.players].sort((a, b) => b.score - a.score)
  const winner = sorted[0]

  function handlePlayAgain() {
    reset()
    router.replace('/')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.trophy}>🏆</Text>
        <Text style={styles.winnerLabel}>WINNER</Text>
        <Text style={styles.winnerName}>{winner.name}</Text>
        <Text style={styles.winnerScore}>{winner.score} points</Text>

        <FlatList
          data={sorted}
          keyExtractor={p => p.id}
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowScore}>{item.score}</Text>
            </View>
          )}
          style={styles.list}
        />

        <TouchableOpacity onPress={handlePlayAgain} style={styles.btn}>
          <Text style={styles.btnTxt}>Play Again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  inner: { flex: 1, padding: 24, alignItems: 'center' },
  trophy: { fontSize: 80, marginTop: 24, marginBottom: 8 },
  winnerLabel: { color: '#6c63ff', fontSize: 12, fontWeight: '800', letterSpacing: 4 },
  winnerName: { color: '#fff', fontSize: 40, fontWeight: '900', marginTop: 4 },
  winnerScore: { color: '#888', fontSize: 18, marginBottom: 32 },
  list: { width: '100%', flex: 1 },
  row: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  rank: { color: '#555', fontSize: 16, width: 36 },
  rowName: { flex: 1, color: '#fff', fontSize: 16 },
  rowScore: { color: '#6c63ff', fontSize: 16, fontWeight: '700' },
  btn: { backgroundColor: '#6c63ff', padding: 18, borderRadius: 16, alignItems: 'center', width: '100%', marginTop: 16 },
  btnTxt: { color: '#fff', fontSize: 18, fontWeight: '800' },
})
```

- [ ] **Step 8: Run all tests**

```bash
npx jest
```

Expected: all tests pass.

- [ ] **Step 9: Verify full game loop in simulator**

```bash
npx expo start --ios
```

Walk through: enter 3 names → Deal Cards → pass phone to each player to pick cards → reveal → pick winner → see result → repeat until someone wins → End screen → Play Again returns to Home.

Expected: full round plays end-to-end without crashes.

- [ ] **Step 10: Commit**

```bash
git add app/game.tsx app/end.tsx src/screens/
git commit -m "feat: add game screen phases and full round loop"
```

---

## Task 12: Polish & Haptics

**Files:**
- Modify: `src/screens/PlayerHandScreen.tsx`
- Modify: `src/screens/PickWinnerScreen.tsx`
- Modify: `src/screens/RoundResultScreen.tsx`

- [ ] **Step 1: Add haptics to card selection in PlayerHandScreen**

In `src/screens/PlayerHandScreen.tsx`, add import at the top:
```tsx
import * as Haptics from 'expo-haptics'
```

Update `CardHand`'s `onSelect` call to trigger haptic:
```tsx
onSelect={(id) => {
  Haptics.selectionAsync()
  setSelectedId(id)
}}
```

- [ ] **Step 2: Add haptics to winner crown in PickWinnerScreen**

In `src/screens/PickWinnerScreen.tsx`, add import:
```tsx
import * as Haptics from 'expo-haptics'
```

Update `handlePick`:
```tsx
function handlePick() {
  if (!selectedSubmissionId) return
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  const sub = round.submissions.find(s => s.id === selectedSubmissionId)!
  pickWinner(sub.playerId)
}
```

- [ ] **Step 3: Auto-advance RoundResultScreen after 3 seconds**

In `src/screens/RoundResultScreen.tsx`, add import:
```tsx
import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
```

Add inside component (before return):
```tsx
const room = useGameStore(s => s.room)
useEffect(() => {
  if (room?.currentRound?.phase === 'complete' && room.state === 'playing') {
    // next round already started in store — this screen shows briefly then game re-renders
  }
}, [])
```

Note: the `RoundResultScreen` is shown while `phase === 'complete'`, but `pickWinner` in the store already starts the next round and sets phase back to `'submitting'`. The screen will naturally be replaced by the next `PlayerHandScreen` as soon as Zustand re-renders. Add a 2-second delay before the store transitions to give time to read the result.

Update `pickWinner` in `src/store/gameStore.ts` — wrap the final `set` call in the non-ending branch with a timeout:
```ts
// Replace the final set({ room: withNewRound }) with:
setTimeout(() => {
  set({ room: withNewRound })
}, 2000)
```

- [ ] **Step 4: Run all tests**

```bash
npx jest
```

Expected: all tests still pass (timeout doesn't affect test logic since jest uses fake timers by default for async).

- [ ] **Step 5: Commit**

```bash
git add src/screens/ src/store/gameStore.ts
git commit -m "feat: add haptics and round result auto-advance"
```

---

## Self-Review

**Spec coverage check:**

- ✅ Local-first pass-and-play — Tasks 1-12 build fully offline single-device game
- ✅ Expo + TypeScript — Task 1 scaffolds with Expo Router
- ✅ Pre-written deck (200 cards) — Task 4
- ✅ Photo cards as placeholders (AI art deferred, stubs in place) — Task 9
- ✅ Family mode toggle — `familyMode` in `RoomConfig`, `buildDeck` filters cards — Task 5
- ✅ 3D flip reveal → caption list pick — Tasks 8, 11
- ✅ First to N scoring — `pickWinner` checks `targetScore` — Task 5
- ✅ `judgeExplainsWhy` — field on `RoomConfig`, `ExplainScreen` deferred to post-MVP per spec
- ✅ Rapid fire timer — field on `RoomConfig`, `timerExpiresAt` on `Round`, UI deferred to post-MVP per spec
- ✅ No accounts — session-only, no auth — consistent throughout
- ✅ Data model online-ready — `Player.id` is uuid, `Room.id` is uuid, all mutations in store actions
- ✅ Minimal vertical slice — 3 players, full round, score increment, end screen

**ExplainScreen:** Spec calls it out as a screen but marks it out of scope for the MVP slice. It's defined in the file structure but not implemented — intentional per spec.

**Timer UI:** `rapidFireSeconds` is in the data model and config. Timer countdown UI (`Timer.tsx` component) is in the file map but not in MVP tasks — intentional per spec scope. The `timerExpiresAt` field is set on round creation; enforcement (auto-submit on expiry) is a post-MVP task.
