import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native'
import { PhotoCard } from '../components/PhotoCard'
import { CardHand } from '../components/CardHand'
import { useGameStore } from '../store/gameStore'
import type { Room } from '../types/game'

type Props = {
  room: Room
  currentPlayerId: string
}

export function PlayerHandScreen({ room, currentPlayerId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const submitCard = useGameStore(s => s.submitCard)
  const round = room.currentRound!
  const player = room.players.find(p => p.id === currentPlayerId)!

  function handleSubmit() {
    if (!selectedId) return
    submitCard(currentPlayerId, selectedId)
    setSelectedId(null)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.prompt}>{player.name}'s turn</Text>

        <View style={styles.photoWrap}>
          <PhotoCard imageAsset={round.photoCard.imageAsset!} formatHint={round.photoCard.formatHint} />
        </View>

        <Text style={styles.instruction}>Pick a caption card</Text>

        <CardHand
          cards={player.hand}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <TouchableOpacity
          style={[styles.submitBtn, !selectedId && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selectedId}
        >
          <Text style={styles.submitTxt}>Submit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  inner: { flex: 1, padding: 24 },
  prompt: { color: '#6c63ff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  photoWrap: { marginBottom: 20 },
  instruction: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  submitBtn: { backgroundColor: '#6c63ff', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { backgroundColor: '#2a2a4a' },
  submitTxt: { color: '#fff', fontSize: 18, fontWeight: '800' },
})
