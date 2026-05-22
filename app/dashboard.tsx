import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'

export default function DashboardScreen() {
  const { profile, signOut } = useAuthStore()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hey, {profile?.displayName ?? 'Player'}</Text>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <View style={[styles.avatar, { backgroundColor: profile?.avatarColor ?? '#6366f1' }]}>
            <Text style={styles.avatarText}>{(profile?.displayName ?? 'P')[0].toUpperCase()}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.card, styles.primaryCard]} onPress={() => router.push('/create-game')}>
        <Text style={styles.cardTitle}>Create Game</Text>
        <Text style={styles.cardSub}>Start a new room</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/join-game')}>
        <Text style={styles.cardTitle}>Join Game</Text>
        <Text style={styles.cardSub}>Enter a room code</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/store')}>
        <Text style={styles.cardTitle}>Game Store</Text>
        <Text style={styles.cardSub}>Unlock new decks</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  card: { backgroundColor: '#1a1d2e', borderRadius: 16, padding: 20, marginBottom: 12 },
  primaryCard: { backgroundColor: '#6366f1' },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginBottom: 4 },
  cardSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  signOutButton: { marginTop: 24, alignItems: 'center' },
  signOutText: { color: '#8b8fa8', fontSize: 15 },
})
