import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4']

export default function ProfileScreen() {
  const { profile, updateProfile } = useAuthStore()
  const [name, setName] = useState(profile?.displayName ?? '')
  const [color, setColor] = useState(profile?.avatarColor ?? '#6366f1')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await updateProfile({ displayName: name.trim() || 'Player', avatarColor: color })
      router.back()
    } catch {
      setSaveError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Profile</Text>

      <View style={[styles.bigAvatar, { backgroundColor: color }]}>
        <Text style={styles.bigAvatarText}>{(name || 'P')[0].toUpperCase()}</Text>
      </View>

      <Text style={styles.label}>Display Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor="#8b8fa8"
        maxLength={20}
      />

      <Text style={styles.label}>Avatar Color</Text>
      <View style={styles.colorRow}>
        {AVATAR_COLORS.map(c => (
          <TouchableOpacity key={c} onPress={() => setColor(c)} style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSelected]} />
        ))}
      </View>

      <Text style={styles.label}>Stats</Text>
      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={styles.statNum}>{profile?.stats.gamesPlayed ?? 0}</Text><Text style={styles.statLabel}>Games</Text></View>
        <View style={styles.stat}><Text style={styles.statNum}>{profile?.stats.wins ?? 0}</Text><Text style={styles.statLabel}>Wins</Text></View>
        <View style={styles.stat}><Text style={styles.statNum}>{profile?.stats.roundsWon ?? 0}</Text><Text style={styles.statLabel}>Rounds Won</Text></View>
      </View>

      {!!saveError && <Text style={styles.errorText}>{saveError}</Text>}
      <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
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
  bigAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 32 },
  bigAvatarText: { color: '#ffffff', fontWeight: '700', fontSize: 32 },
  label: { color: '#8b8fa8', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#1a1d2e', borderRadius: 12, padding: 14, color: '#ffffff', fontSize: 16 },
  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorSwatch: { width: 36, height: 36, borderRadius: 18 },
  colorSelected: { borderWidth: 3, borderColor: '#ffffff' },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: '#1a1d2e', borderRadius: 12, padding: 16, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  statLabel: { fontSize: 12, color: '#8b8fa8', marginTop: 4 },
  saveButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 32 },
  saveText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  errorText: { color: '#ef4444', fontSize: 14, textAlign: 'center', marginTop: 8 },
})
