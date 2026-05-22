import { View, Text, StyleSheet } from 'react-native'

const PLACEHOLDER_COLOR: Record<string, string> = {
  meme_approval: '#e94560',
  meme_distracted: '#f5a623',
  meme_disaster: '#7ed321',
  meme_dog_computer: '#4a90e2',
  meme_thinking: '#9b59b6',
  meme_running: '#e67e22',
  meme_success: '#2ecc71',
  meme_side_eye: '#e74c3c',
  meme_nope: '#1abc9c',
  meme_waiting: '#3498db',
}

type Props = {
  imageAsset: string
  formatHint?: string
  captionOverlay?: string
}

export function PhotoCard({ imageAsset, formatHint, captionOverlay }: Props) {
  const color = PLACEHOLDER_COLOR[imageAsset] ?? '#6c63ff'

  return (
    <View style={styles.container}>
      <View style={[styles.imagePlaceholder, { backgroundColor: color }]}>
        <Text style={styles.placeholderLabel}>{imageAsset.replace('meme_', '').toUpperCase()}</Text>
        {formatHint && <Text style={styles.formatHint}>{formatHint}</Text>}
      </View>
      {captionOverlay && (
        <View style={styles.captionBar}>
          <Text style={styles.captionText} numberOfLines={3}>{captionOverlay}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  formatHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  captionBar: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 12,
  },
  captionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
})
