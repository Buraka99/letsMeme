import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'
import { useRoomStore } from '../src/store/roomStore'

export default function JoinGameScreen() {
  const { profile } = useAuthStore()
  const { joinRoom } = useRoomStore()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    if (!profile || code.trim().length !== 6) {
      setError('Enter a 6-character room code')
      return
    }
    setLoading(true)
    setError('')
    try {
      await joinRoom(code.trim(), profile.id, profile.displayName, profile.avatarColor)
      router.push('/lobby')
    } catch (e: any) {
      setError(e.message ?? 'Could not join room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Join Game</Text>
      <Text style={styles.sub}>Ask the host for their 6-character room code</Text>

      <TextInput
        style={styles.input}
        value={code}
        onChangeText={t => setCode(t.toUpperCase())}
        placeholder="ABC123"
        placeholderTextColor="#8b8fa8"
        maxLength={6}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={[styles.joinButton, loading && styles.joinButtonDisabled]} onPress={handleJoin} disabled={loading}>
        <Text style={styles.joinText}>{loading ? 'Joining…' : 'Join Room'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', padding: 24, paddingTop: 60 },
  back: { marginBottom: 24 },
  backText: { color: '#6366f1', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  sub: { color: '#8b8fa8', fontSize: 15, marginBottom: 32 },
  input: { backgroundColor: '#1a1d2e', borderRadius: 12, padding: 16, color: '#ffffff', fontSize: 32, fontWeight: '800', textAlign: 'center', letterSpacing: 6, marginBottom: 12 },
  error: { color: '#ef4444', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  joinButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center' },
  joinButtonDisabled: { opacity: 0.6 },
  joinText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
})
