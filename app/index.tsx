import { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { supabase } from '../src/lib/supabase'
import { useAuthStore } from '../src/store/authStore'

WebBrowser.maybeCompleteAuthSession()

export default function AuthScreen() {
  const { profile, loading, signInAsGuest } = useAuthStore()

  useEffect(() => {
    if (!loading && profile) {
      router.replace('/dashboard')
    }
  }, [profile, loading])

  const handleAppleSignIn = async () => {
    const redirectUri = makeRedirectUri({ scheme: 'letsmeme' })
    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: redirectUri },
    })
    if (data?.url) await WebBrowser.openAuthSessionAsync(data.url, redirectUri)
  }

  const handleGoogleSignIn = async () => {
    const redirectUri = makeRedirectUri({ scheme: 'letsmeme' })
    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUri },
    })
    if (data?.url) await WebBrowser.openAuthSessionAsync(data.url, redirectUri)
  }

  const handleGuest = async () => {
    await signInAsGuest()
    router.replace('/dashboard')
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Let's Meme</Text>
      <Text style={styles.subtitle}>The meme card party game</Text>

      <TouchableOpacity style={[styles.button, styles.appleButton]} onPress={handleAppleSignIn}>
        <Text style={styles.buttonText}>Sign in with Apple</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.googleButton]} onPress={handleGoogleSignIn}>
        <Text style={styles.buttonText}>Sign in with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.guestButton} onPress={handleGuest}>
        <Text style={styles.guestText}>Play as Guest</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 42, fontWeight: '900', color: '#ffffff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#8b8fa8', marginBottom: 48 },
  button: { width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  appleButton: { backgroundColor: '#ffffff' },
  googleButton: { backgroundColor: '#4285f4' },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#0f1117' },
  guestButton: { marginTop: 16 },
  guestText: { color: '#8b8fa8', fontSize: 15 },
})
