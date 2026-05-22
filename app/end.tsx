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
