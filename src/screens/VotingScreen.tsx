// src/screens/VotingScreen.tsx
import { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '../store/authStore'
import { useRoomStore } from '../store/roomStore'
import { PhotoCard } from '../components/PhotoCard'

export default function VotingScreen() {
  const { profile } = useAuthStore()
  const { room, castVote, tallyVotes } = useRoomStore()

  // Derive values safely before early return
  const currentRound = room?.currentRound
  const myVote = currentRound?.votes.find(v => v.voterId === (profile?.id ?? ''))
  const totalVoters = room?.players.length ?? 0
  const votesIn = currentRound?.votes.length ?? 0
  const isHost = room ? room.hostId === profile?.id : false

  // ALL hooks BEFORE early return
  useEffect(() => {
    if (isHost && votesIn >= totalVoters && currentRound?.phase === 'voting') {
      tallyVotes()
    }
  }, [votesIn, totalVoters, isHost])

  if (!room?.currentRound || !profile) return null

  // After the guard, currentRound is guaranteed non-null
  const safeRound = currentRound!

  const handleVote = (submissionId: string) => {
    if (myVote) return
    Haptics.selectionAsync()
    castVote(profile.id, submissionId)
  }

  return (
    <View style={styles.container}>
      <PhotoCard imageAsset={safeRound.photoCard.imageAsset ?? ''} />
      <Text style={styles.status}>{votesIn}/{totalVoters} voted</Text>
      <Text style={styles.prompt}>{myVote ? 'Vote cast! Waiting for others…' : 'Vote for the funniest caption'}</Text>

      <FlatList
        data={safeRound.submissions}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isOwn = item.playerId === profile.id
          const isVoted = myVote?.submissionId === item.id
          return (
            <TouchableOpacity
              style={[styles.option, isOwn && styles.optionOwn, isVoted && styles.optionVoted]}
              onPress={() => !isOwn && handleVote(item.id)}
              disabled={!!myVote || isOwn}
            >
              <Text style={styles.optionText}>{item.card.text}</Text>
              {isOwn && <Text style={styles.ownLabel}>Yours</Text>}
              {isVoted && <Text style={styles.votedLabel}>✓ Voted</Text>}
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', padding: 16, paddingTop: 48 },
  status: { color: '#8b8fa8', fontSize: 13, textAlign: 'center', marginTop: 8 },
  prompt: { color: '#ffffff', fontSize: 15, fontWeight: '600', textAlign: 'center', marginVertical: 12 },
  list: { padding: 8 },
  option: { backgroundColor: '#1a1d2e', borderRadius: 12, padding: 16, marginBottom: 10 },
  optionOwn: { opacity: 0.5 },
  optionVoted: { borderWidth: 2, borderColor: '#6366f1' },
  optionText: { color: '#ffffff', fontSize: 16 },
  ownLabel: { color: '#8b8fa8', fontSize: 12, marginTop: 4 },
  votedLabel: { color: '#6366f1', fontSize: 12, marginTop: 4, fontWeight: '600' },
})
