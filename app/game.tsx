import { useEffect } from 'react'
import { router } from 'expo-router'
import { useGameStore } from '../src/store/gameStore'
import { JudgeWaitScreen } from '../src/screens/JudgeWaitScreen'
import { PlayerHandScreen } from '../src/screens/PlayerHandScreen'
import { RevealScreen } from '../src/screens/RevealScreen'
import { PickWinnerScreen } from '../src/screens/PickWinnerScreen'
import { RoundResultScreen } from '../src/screens/RoundResultScreen'

export default function GameScreen() {
  const room = useGameStore(s => s.room)

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

  if (round.phase === 'submitting') {
    const submittedIds = round.submissions.map(s => s.playerId)
    const nextPlayer = nonJudges.find(p => !submittedIds.includes(p.id))

    if (submittedIds.length === 0) {
      return <JudgeWaitScreen room={room} />
    }

    if (!nextPlayer) {
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
