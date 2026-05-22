import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'

export default function RootLayout() {
  const initialize = useAuthStore(s => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  )
}
