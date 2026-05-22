import { useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList } from 'react-native'
import { router } from 'expo-router'
import { useGameStore } from '../src/store/gameStore'

export default function LobbyScreen() {
  const room = useGameStore(s => s.room)
  const startGame = useGameStore(s => s.startGame)

  useEffect(() => {
    if (!room) router.replace('/')
  }, [room])

  if (!room) return null

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
