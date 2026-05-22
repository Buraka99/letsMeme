import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { useGameStore } from '../src/store/gameStore'
import type { RoomConfig } from '../src/types/game'

export default function HomeScreen() {
  const [names, setNames] = useState(['', '', ''])
  const createRoom = useGameStore(s => s.createRoom)

  function addPlayer() {
    if (names.length < 8) setNames([...names, ''])
  }

  function updateName(index: number, value: string) {
    setNames(names.map((n, i) => (i === index ? value : n)))
  }

  function removePlayer(index: number) {
    if (names.length <= 2) return
    setNames(names.filter((_, i) => i !== index))
  }

  function handleStart() {
    const validNames = names.map(n => n.trim()).filter(Boolean)
    if (validNames.length < 2) return
    const config: RoomConfig = {
      targetScore: 5,
      familyMode: false,
      rapidFireSeconds: null,
      judgeExplainsWhy: false,
      selectedDeckIds: ['base'],
    }
    createRoom(validNames, config)
    router.push('/lobby')
  }

  const canStart = names.filter(n => n.trim()).length >= 2

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Let's Meme</Text>
          <Text style={styles.subtitle}>Add players to get started</Text>

          {names.map((name, i) => (
            <View key={`player-slot-${i}-${names.length}`} style={styles.row}>
              <TextInput
                style={styles.input}
                placeholder={`Player ${i + 1}`}
                placeholderTextColor="#555"
                value={name}
                onChangeText={v => updateName(i, v)}
                maxLength={20}
                autoCapitalize="words"
              />
              {names.length > 2 && (
                <TouchableOpacity onPress={() => removePlayer(i)} style={styles.removeBtn}>
                  <Text style={styles.removeTxt}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {names.length < 8 && (
            <TouchableOpacity onPress={addPlayer} style={styles.addBtn}>
              <Text style={styles.addTxt}>+ Add Player</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleStart}
            style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
            disabled={!canStart}
          >
            <Text style={styles.startTxt}>Start Game</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  flex: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 40, fontWeight: '900', color: '#fff', textAlign: 'center', marginTop: 32, marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  input: {
    flex: 1, backgroundColor: '#1a1a2e', color: '#fff', fontSize: 18,
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a',
  },
  removeBtn: { marginLeft: 12, padding: 8 },
  removeTxt: { color: '#555', fontSize: 18 },
  addBtn: { alignItems: 'center', padding: 14, marginBottom: 24 },
  addTxt: { color: '#6c63ff', fontSize: 16, fontWeight: '600' },
  startBtn: {
    backgroundColor: '#6c63ff', padding: 18, borderRadius: 16,
    alignItems: 'center', marginTop: 8,
  },
  startBtnDisabled: { backgroundColor: '#2a2a4a' },
  startTxt: { color: '#fff', fontSize: 20, fontWeight: '800' },
})
