import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../types/game'

type AuthState = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  initialize: () => Promise<void>
  signInAsGuest: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Pick<Profile, 'displayName' | 'avatarColor'>>) => Promise<void>
  incrementStat: (stat: 'gamesPlayed' | 'wins' | 'roundsWon') => Promise<void>
}

function rowToProfile(row: any): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarColor: row.avatar_color,
    stats: {
      gamesPlayed: row.games_played,
      wins: row.wins,
      roundsWon: row.rounds_won,
      favoriteDeckId: row.favorite_deck_id,
    },
  }
}

async function fetchOrCreateProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (data) return rowToProfile(data)

  // Profile doesn't exist yet — create it
  const { data: created, error: createError } = await supabase
    .from('profiles')
    .insert({ id: userId, display_name: 'Guest', avatar_color: '#6366f1' })
    .select()
    .single()

  if (createError) throw createError
  return rowToProfile(created)
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const profile = await fetchOrCreateProfile(session.user.id)
      set({ session, profile, loading: false })
    } else {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchOrCreateProfile(session.user.id)
        set({ session, profile })
      } else {
        set({ session: null, profile: null })
      }
    })
  },

  signInAsGuest: async () => {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    if (data.user) {
      const profile = await fetchOrCreateProfile(data.user.id)
      set({ profile })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null })
  },

  updateProfile: async (updates) => {
    const { profile } = get()
    if (!profile) return
    const dbUpdates: any = {}
    if (updates.displayName) dbUpdates.display_name = updates.displayName
    if (updates.avatarColor) dbUpdates.avatar_color = updates.avatarColor
    await supabase.from('profiles').update(dbUpdates).eq('id', profile.id)
    set({ profile: { ...profile, ...updates } })
  },

  incrementStat: async (stat) => {
    const { profile } = get()
    if (!profile) return
    const col = stat === 'gamesPlayed' ? 'games_played' : stat === 'wins' ? 'wins' : 'rounds_won'
    await supabase.from('profiles').update({ [col]: profile.stats[stat] + 1 }).eq('id', profile.id)
    set({ profile: { ...profile, stats: { ...profile.stats, [stat]: profile.stats[stat] + 1 } } })
  },
}))
