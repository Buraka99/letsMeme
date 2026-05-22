import { useAuthStore } from './authStore'

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signInAnonymously: jest.fn().mockResolvedValue({ data: { user: { id: 'guest-123' } }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'guest-123',
              display_name: 'Guest',
              avatar_color: '#6366f1',
              games_played: 0,
              wins: 0,
              rounds_won: 0,
              favorite_deck_id: null,
            },
            error: null,
          }),
        }),
      }),
    }),
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ profile: null, session: null, loading: true })
  })

  it('starts with null profile and loading true', () => {
    const state = useAuthStore.getState()
    expect(state.profile).toBeNull()
    expect(state.loading).toBe(true)
  })

  it('signInAsGuest sets profile with Guest display name', async () => {
    await useAuthStore.getState().signInAsGuest()
    const { profile } = useAuthStore.getState()
    expect(profile).not.toBeNull()
    expect(profile!.displayName).toBe('Guest')
    expect(profile!.id).toBe('guest-123')
  })

  it('signOut clears profile and session', async () => {
    useAuthStore.setState({ profile: { id: 'guest-123', displayName: 'Guest', avatarColor: '#6366f1', stats: { gamesPlayed: 0, wins: 0, roundsWon: 0, favoriteDeckId: null } }, session: {} as any, loading: false })
    await useAuthStore.getState().signOut()
    expect(useAuthStore.getState().profile).toBeNull()
    expect(useAuthStore.getState().session).toBeNull()
  })
})
