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
