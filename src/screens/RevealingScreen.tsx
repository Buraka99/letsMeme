// src/screens/RevealingScreen.tsx
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '../store/authStore'
import { useRoomStore } from '../store/roomStore'
import { CaptionCard } from '../components/CaptionCard'
import { PhotoCard } from '../components/PhotoCard'

export default function RevealingScreen() {
  const { profile } = useAuthStore()
  const { room, revealNext } = useRoomStore()

  if (!room?.currentRound || !profile) return null

  const { currentRound, config } = room
  const isHost = room.hostId === profile.id
  const canTap = !config.hostRevealsCaptions || isHost
  const nextToReveal = currentRound.revealIndex

  const handleFlip = () => {
    if (!canTap) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    revealNext()
  }

  return (
    <View style={styles.container}>
      <PhotoCard imageAsset={currentRound.photoCard.imageAsset ?? ''} />
      <Text style={styles.prompt}>
        {canTap ? 'Tap a card to reveal' : 'Waiting for host to reveal…'}
      </Text>
      <FlatList
        horizontal
        data={currentRound.submissions}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.cardList}
        renderItem={({ item, index }) => (
          <TouchableOpacity onPress={index === nextToReveal ? handleFlip : undefined} activeOpacity={index === nextToReveal ? 0.7 : 1}>
            <CaptionCard
              text={item.card.text ?? ''}
              revealed={item.revealed}
              onPress={index === nextToReveal ? handleFlip : undefined}
              disabled={index !== nextToReveal || !canTap}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', padding: 16, paddingTop: 48 },
  prompt: { color: '#8b8fa8', fontSize: 14, textAlign: 'center', marginVertical: 12 },
  cardList: { paddingHorizontal: 16, gap: 12 },
})
