import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useGameStore } from '../store/gameStore'
import { CaptionCard } from '../components/CaptionCard'
import { PhotoCard } from '../components/PhotoCard'
import type { Room } from '../types/game'

type Props = { room: Room }

export function RevealScreen({ room }: Props) {
  const revealNext = useGameStore(s => s.revealNext)
  const round = room.currentRound!
  const allRevealed = round.revealIndex >= round.submissions.length

  function handleReveal() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    revealNext()
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Reveal</Text>
        <View style={styles.photoWrap}>
          <PhotoCard imageAsset={round.photoCard.imageAsset!} formatHint={round.photoCard.formatHint} />
        </View>

        <View style={styles.cardsRow}>
          {round.submissions.map((sub, i) => (
            <CaptionCard
              key={sub.id}
              text={sub.card.text ?? ''}
              revealed={sub.revealed}
              onPress={!sub.revealed && i === round.revealIndex ? handleReveal : undefined}
            />
          ))}
        </View>

        {!allRevealed && (
          <Text style={styles.hint}>Tap the face-down card to reveal</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  photoWrap: { marginBottom: 24 },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 },
  hint: { color: '#888', fontSize: 14, textAlign: 'center' },
})
