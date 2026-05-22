// src/screens/SubmittingScreen.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '../store/authStore'
import { useRoomStore } from '../store/roomStore'
import { useUIStore } from '../store/uiStore'
import { PhotoCard } from '../components/PhotoCard'
import { CardHand } from '../components/CardHand'

export default function SubmittingScreen() {
  const { profile } = useAuthStore()
  const { room, submitCard } = useRoomStore()
  const { selectedCardId, selectCard, clearSelection } = useUIStore()

  if (!room?.currentRound || !profile) return null

  const { currentRound } = room
  const me = room.players.find(p => p.profileId === profile.id)
  const alreadySubmitted = currentRound.submissions.some(s => s.playerId === profile.id)

  const handleSelect = (cardId: string) => {
    Haptics.selectionAsync()
    selectCard(cardId)
  }

  const handleSubmit = () => {
    const card = me?.hand.find(c => c.id === selectedCardId)
    if (!card) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    submitCard(profile.id, card)
    clearSelection()
  }

  const submitted = currentRound.submissions.length
  const total = room.players.length

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{submitted}/{total} submitted</Text>
      <PhotoCard imageAsset={currentRound.photoCard.imageAsset ?? ''} />

      {alreadySubmitted ? (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>Waiting for others…</Text>
        </View>
      ) : (
        <>
          <Text style={styles.prompt}>Pick your funniest caption</Text>
          <CardHand
            cards={me?.hand ?? []}
            selectedId={selectedCardId}
            onSelect={handleSelect}
          />
          <TouchableOpacity
            style={[styles.submitButton, !selectedCardId && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!selectedCardId}
          >
            <Text style={styles.submitText}>Submit Caption</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', padding: 16, paddingTop: 48 },
  status: { color: '#8b8fa8', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  prompt: { color: '#ffffff', fontSize: 16, fontWeight: '600', textAlign: 'center', marginVertical: 12 },
  waitingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  waitingText: { color: '#8b8fa8', fontSize: 16 },
  submitButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center', margin: 16 },
  submitButtonDisabled: { backgroundColor: '#1a1d2e' },
  submitText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
})
