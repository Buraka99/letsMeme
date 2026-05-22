import { View, Text, StyleSheet, SafeAreaView } from 'react-native'
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
