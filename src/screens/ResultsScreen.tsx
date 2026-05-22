// src/screens/ResultsScreen.tsx
import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '../store/authStore'
import { useRoomStore } from '../store/roomStore'

export default function ResultsScreen() {
  const { profile } = useAuthStore()
  const { room, advanceRound, setReady } = useRoomStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Derive values safely (may be null before early return)
  const currentRound = room?.currentRound
  const config = room?.config
  const isHost = room ? room.hostId === profile?.id : false
  const winners = room && currentRound ? room.players.filter(p => currentRound.winnerIds.includes(p.profileId)) : []
  const iWon = currentRound ? currentRound.winnerIds.includes(profile?.id ?? '') : false

  // ALL hooks BEFORE any early return
  useEffect(() => {
    if (iWon) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }, [iWon])

  useEffect(() => {
    if (!config || config.allReadyAdvance) return
    if (!isHost) return
    timerRef.current = setTimeout(() => {
      advanceRound()
    }, 3000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [config?.allReadyAdvance, isHost])

  // Early return AFTER all hooks
  if (!room?.currentRound || !profile) return null

  // After the guard, config and currentRound are guaranteed non-null
  const safeConfig = config!

  const handleReady = () => {
    if (!profile) return
    setReady(profile.id, true)
    if (isHost) {
      // Read fresh state after setReady updates the store
      const freshRoom = useRoomStore.getState().room
      if (freshRoom && freshRoom.players.every(p => p.isReady)) {
        advanceRound()
      }
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

      {safeConfig.allReadyAdvance && (
        <TouchableOpacity style={styles.readyButton} onPress={handleReady}>
          <Text style={styles.readyText}>Ready →</Text>
        </TouchableOpacity>
      )}
      {!safeConfig.allReadyAdvance && !isHost && (
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
