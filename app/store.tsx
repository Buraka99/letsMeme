import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'

const PACKS = [
  { id: 'office-life', name: 'Office Life', description: '100 work-from-home meme captions', price: '$1.99' },
  { id: 'internet-culture', name: 'Internet Culture', description: '100 chronically-online captions', price: '$1.99' },
  { id: 'danish-base', name: 'Danish Pack', description: 'Full base deck in Danish', price: '$0.99' },
]

export default function StoreScreen() {
  const { profile } = useAuthStore()
  const isGuest = !profile || profile.displayName === 'Guest'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Game Store</Text>

      {isGuest && (
        <View style={styles.guestBanner}>
          <Text style={styles.guestBannerText}>Sign in to purchase and keep decks across devices.</Text>
          <TouchableOpacity onPress={() => router.replace('/')}>
            <Text style={styles.guestBannerCta}>Sign In →</Text>
          </TouchableOpacity>
        </View>
      )}

      {PACKS.map(pack => (
        <View key={pack.id} style={styles.packCard}>
          <View style={styles.packInfo}>
            <Text style={styles.packName}>{pack.name}</Text>
            <Text style={styles.packDesc}>{pack.description}</Text>
          </View>
          <TouchableOpacity style={styles.buyButton} disabled={isGuest}>
            <Text style={styles.buyText}>{pack.price}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  content: { padding: 24, paddingTop: 60 },
  back: { marginBottom: 24 },
  backText: { color: '#6366f1', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 24 },
  guestBanner: { backgroundColor: '#1a1d2e', borderRadius: 12, padding: 16, marginBottom: 24, borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
  guestBannerText: { color: '#ffffff', fontSize: 14, marginBottom: 8 },
  guestBannerCta: { color: '#f59e0b', fontWeight: '700' },
  packCard: { backgroundColor: '#1a1d2e', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  packInfo: { flex: 1 },
  packName: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  packDesc: { color: '#8b8fa8', fontSize: 13 },
  buyButton: { backgroundColor: '#6366f1', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  buyText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
})
