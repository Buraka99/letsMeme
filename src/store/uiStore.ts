import { create } from 'zustand'

type UIState = {
  selectedCardId: string | null
  selectCard: (id: string | null) => void
  clearSelection: () => void
}

export const useUIStore = create<UIState>((set) => ({
  selectedCardId: null,
  selectCard: (id) => set({ selectedCardId: id }),
  clearSelection: () => set({ selectedCardId: null }),
}))
