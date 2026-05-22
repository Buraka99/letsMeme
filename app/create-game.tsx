import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'
import { useRoomStore } from '../src/store/roomStore'
import { RoomConfig } from '../src/types/game'

export default function CreateGameScreen() {
  const { profile } = useAuthStore()
  const { createRoom } = useRoomStore()
  const [targetScore, setTargetScore] = useState(5)
  const [familyMode, setFamilyMode] = useState(false)
  const [chaoticFun, setChaoticFun] = useState(false)
  const [hostReveals, setHostReveals] = useState(false)
  const [allReady, setAllReady] = useState(false)
  const [rapidFire, setRapidFire] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      const config: RoomConfig = {
        targetScore,
        familyMode,
        selectedDeckIds: ['base'],
        chaoticFunMode: chaoticFun,
        hostRevealsCaptions: hostReveals,
        allReadyAdvance: allReady,
        rapidFireSeconds: rapidFire ? 30 : null,
      }
      await createRoom(profile.id, profile.displayName, profile.avatarColor, config)
      router.push('/lobby')
    } catch {
      setError('Could not create room. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Create Game</Text>

      <Text style={styles.label}>Points to win</Text>
      <View style={styles.scoreRow}>
        {[3, 5, 7, 10].map(n => (
          <TouchableOpacity key={n} onPress={() => setTargetScore(n)} style={[styles.scoreBtn, targetScore === n && styles.scoreBtnActive]}>
            <Text style={[styles.scoreBtnText, targetScore === n && styles.scoreBtnTextActive]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>House Rules</Text>
      {[
        { label: 'Family Mode', sub: 'Filters out adult cards', val: familyMode, set: setFamilyMode },
        { label: 'Chaotic Fun Mode', sub: 'All captions revealed at once', val: chaoticFun, set: setChaoticFun },
        { label: 'Host Reveals Captions', sub: 'Only host can flip cards', val: hostReveals, set: setHostReveals },
        { label: 'All Ready Advance', sub: 'Players tap Ready to start next round', val: allReady, set: setAllReady },
        { label: 'Rapid Fire (30s)', sub: 'Auto-submit when timer runs out', val: rapidFire, set: setRapidFire },
      ].map(row => (
        <View key={row.label} style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>{row.label}</Text>
            <Text style={styles.toggleSub}>{row.sub}</Text>
          </View>
          <Switch value={row.val} onValueChange={row.set} trackColor={{ true: '#6366f1' }} />
        </View>
      ))}

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity style={[styles.createButton, loading && styles.createButtonDisabled]} onPress={handleCreate} disabled={loading}>
        <Text style={styles.createText}>{loading ? 'Creating…' : 'Create Room'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  content: { padding: 24, paddingTop: 60 },
  back: { marginBottom: 24 },
  backText: { color: '#6366f1', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 24 },
  label: { color: '#8b8fa8', fontSize: 13, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  scoreBtn: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#1a1d2e', alignItems: 'center', justifyContent: 'center' },
  scoreBtnActive: { backgroundColor: '#6366f1' },
  scoreBtnText: { color: '#8b8fa8', fontWeight: '700', fontSize: 18 },
  scoreBtnTextActive: { color: '#ffffff' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1d2e', borderRadius: 12, padding: 16, marginBottom: 8 },
  toggleInfo: { flex: 1 },
  toggleLabel: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  toggleSub: { color: '#8b8fa8', fontSize: 13, marginTop: 2 },
  errorText: { color: '#ef4444', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  createButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  createButtonDisabled: { opacity: 0.6 },
  createText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
})
