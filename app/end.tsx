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
