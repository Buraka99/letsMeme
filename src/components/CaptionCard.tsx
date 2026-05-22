import { useEffect } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, interpolate, Extrapolation,
} from 'react-native-reanimated'

type Props = {
  text: string
  revealed: boolean
  onPress?: () => void
  selected?: boolean
  disabled?: boolean
}

export function CaptionCard({ text, revealed, onPress, selected = false, disabled = false }: Props) {
  const rotation = useSharedValue(revealed ? 180 : 0)

  useEffect(() => {
    rotation.value = withTiming(revealed ? 180 : 0, { duration: 500 })
  }, [revealed])

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${rotation.value}deg` }],
    backfaceVisibility: 'hidden',
    opacity: interpolate(rotation.value, [89, 91], [1, 0], Extrapolation.CLAMP),
  }))

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${interpolate(rotation.value, [0, 180], [180, 360])}deg` }],
    backfaceVisibility: 'hidden',
    opacity: interpolate(rotation.value, [89, 91], [0, 1], Extrapolation.CLAMP),
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  }))

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || !onPress} activeOpacity={0.85} style={styles.wrapper}>
      <View style={[styles.card, selected && styles.cardSelected]}>
        {/* Back face */}
        <Animated.View style={[styles.face, styles.back, backStyle]}>
          <Text style={styles.backText}>🃏</Text>
        </Animated.View>
        {/* Front face */}
        <Animated.View style={[styles.face, styles.front, frontStyle]}>
          <Text style={styles.captionText}>{text}</Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrapper: { margin: 6 },
  card: {
    width: 160, height: 110,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  cardSelected: {
    shadowColor: '#6c63ff',
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 16,
  },
  face: {
    width: '100%', height: '100%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  front: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4a' },
  back: { backgroundColor: '#6c63ff' },
  backText: { fontSize: 36 },
  captionText: { color: '#fff', fontSize: 14, textAlign: 'center', lineHeight: 20, fontWeight: '600' },
})
