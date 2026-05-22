import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList } from 'react-native'
import { useGameStore } from '../store/gameStore'
import type { Room } from '../types/game'

type Props = { room: Room }

export function PickWinnerScreen({ room }: Props) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null)
  const pickWinner = useGameStore(s => s.pickWinner)
  const round = room.currentRound!

  function handlePick() {
    if (!selectedSubmissionId) return
    const sub = round.submissions.find(s => s.id === selectedSubmissionId)!
    pickWinner(sub.playerId)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Pick the Winner</Text>

        <FlatList
          data={round.submissions}
          keyExtractor={s => s.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.option, selectedSubmissionId === item.id && styles.optionSelected]}
              onPress={() => setSelectedSubmissionId(item.id)}
            >
              <Text style={styles.optionText}>{item.card.text}</Text>
            </TouchableOpacity>
          )}
          style={styles.list}
        />

        <TouchableOpacity
          style={[styles.pickBtn, !selectedSubmissionId && styles.pickBtnDisabled]}
          onPress={handlePick}
          disabled={!selectedSubmissionId}
        >
          <Text style={styles.pickTxt}>Crown Winner</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  inner: { flex: 1, padding: 24 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 24 },
  list: { flex: 1 },
  option: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#2a2a4a',
  },
  optionSelected: { borderColor: '#6c63ff', backgroundColor: '#1e1b3a' },
  optionText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  pickBtn: { backgroundColor: '#6c63ff', padding: 18, borderRadius: 16, alignItems: 'center' },
  pickBtnDisabled: { backgroundColor: '#2a2a4a' },
  pickTxt: { color: '#fff', fontSize: 18, fontWeight: '800' },
})
