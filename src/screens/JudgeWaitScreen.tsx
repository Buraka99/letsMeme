import { View, Text, StyleSheet, SafeAreaView } from 'react-native'
import { PhotoCard } from '../components/PhotoCard'
import type { Room } from '../types/game'

type Props = { room: Room }

export function JudgeWaitScreen({ room }: Props) {
  const round = room.currentRound!
  const judge = room.players.find(p => p.isJudge)!
  const nonJudges = room.players.filter(p => !p.isJudge)
  const submitted = round.submissions.length

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.label}>JUDGE</Text>
        <Text style={styles.judgeName}>{judge.name}</Text>

        <View style={styles.photoWrap}>
          <PhotoCard imageAsset={round.photoCard.imageAsset!} formatHint={round.photoCard.formatHint} />
        </View>

        <Text style={styles.waitText}>
          Waiting for players to submit...
        </Text>
        <Text style={styles.countText}>{submitted} / {nonJudges.length} submitted</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  inner: { flex: 1, padding: 24, alignItems: 'center' },
  label: { color: '#6c63ff', fontSize: 11, fontWeight: '800', letterSpacing: 3, marginBottom: 4 },
  judgeName: { color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 24 },
  photoWrap: { width: '100%', marginBottom: 32 },
  waitText: { color: '#888', fontSize: 16, marginBottom: 8 },
  countText: { color: '#fff', fontSize: 24, fontWeight: '800' },
})
