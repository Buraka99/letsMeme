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

  it('does not clear incoming judge hand after round', () => {
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
      nonJudges.forEach(p => useGameStore.getState().submitCard(p.id, p.hand[0].id))
      nonJudges.forEach(() => useGameStore.getState().revealNext())
      useGameStore.getState().pickWinner(nonJudges[0].id)
    })
    const updated = useGameStore.getState().room!
    // The new judge (index 1 after rotation from 0) should still have cards
    const newJudge = updated.players.find(p => p.isJudge)!
    expect(newJudge.hand.length).toBeGreaterThan(0)
  })

  it('recycles photo cards when deck is exhausted', () => {
    act(() => {
      useGameStore.getState().createRoom(
        ['Alice', 'Bob'],
        { targetScore: 15, familyMode: false, rapidFireSeconds: null, judgeExplainsWhy: false, selectedDeckIds: ['base'] }
      )
      useGameStore.getState().startGame()
    })
    // Play 11 rounds (more than the 10 photo cards available)
    for (let i = 0; i < 11; i++) {
      const room = useGameStore.getState().room!
      if (room.state === 'ended') break
      const nonJudge = room.players.find(p => !p.isJudge)!
      act(() => {
        useGameStore.getState().submitCard(nonJudge.id, nonJudge.hand[0].id)
        useGameStore.getState().revealNext()
        useGameStore.getState().pickWinner(nonJudge.id)
      })
    }
    // Should not have crashed — room still has a valid photo card
    const room = useGameStore.getState().room!
    if (room.state === 'playing') {
      expect(room.currentRound).not.toBeNull()
      expect(room.currentRound!.photoCard).toBeDefined()
      expect(room.currentRound!.photoCard.type).toBe('photo')
    }
  })
})
