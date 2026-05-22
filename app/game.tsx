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
