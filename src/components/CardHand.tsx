import { ScrollView, StyleSheet, View } from 'react-native'
import { CaptionCard } from './CaptionCard'
import type { Card } from '../types/game'

type Props = {
  cards: Card[]
  selectedId: string | null
  onSelect: (cardId: string) => void
  disabled?: boolean
}

export function CardHand({ cards, selectedId, onSelect, disabled = false }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {cards.map((card, i) => {
          const angle = ((i - (cards.length - 1) / 2) * 4)
          return (
            <View
              key={card.id}
              style={[
                styles.cardWrapper,
                { transform: [
                  { rotate: `${angle}deg` },
                  { translateY: selectedId === card.id ? -12 : Math.abs(angle) * 1.5 },
                ]},
              ]}
            >
              <CaptionCard
                text={card.text ?? ''}
                revealed
                onPress={() => onSelect(card.id)}
                selected={selectedId === card.id}
                disabled={disabled}
              />
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingVertical: 16 },
  scroll: { paddingHorizontal: 24, alignItems: 'flex-end', paddingBottom: 8 },
  cardWrapper: { marginHorizontal: -6 },
})
