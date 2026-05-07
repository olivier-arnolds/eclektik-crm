import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)
const ALLOWED_DOMAIN = 'eclectik.co'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      validateAndSet(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      validateAndSet(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  function validateAndSet(session) {
    if (!session) {
      setSession(null)
      return
    }
    const email = session.user?.email || ''
    if (!email.endsWith('@' + ALLOWED_DOMAIN)) {
      supabase.auth.signOut()
      setError('Only @eclectik.co accounts have access.')
      setSession(null)
      return
    }
    if (session.provider_token) {
      localStorage.setItem('graph_token', session.provider_token)
    }
    setSession(session)
    setError(null)
  }

  async function login() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email profile openid User.Read Mail.Read Mail.Send Calendars.ReadWrite Chat.Read ChatMessage.Read',
        redirectTo: window.location.origin + (window.location.pathname.startsWith('/old') ? '/old' : '')
      }
    })
    if (error) setError(error.message)
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem('graph_token')
    setSession(null)
  }

  async function reconnectMicrosoft() {
    // Force a new OAuth flow to get a fresh provider_token (for Graph API)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email profile openid User.Read Mail.Read Mail.Send Calendars.ReadWrite Chat.Read ChatMessage.Read',
        redirectTo: window.location.origin + (window.location.pathname.startsWith('/old') ? '/old' : '')
      }
    })
    if (error) setError(error.message)
  }

  // Reactive graph-token state: updates when another tab changes it, when we
  // poll, and when validateAndSet is called (after OAuth redirect).
  const [hasGraphToken, setHasGraphToken] = useState(() => !!localStorage.getItem('graph_token'))
  useEffect(() => {
    const update = () => setHasGraphToken(!!localStorage.getItem('graph_token'))
    update()
    // Listen to cross-tab storage changes
    window.addEventListener('storage', update)
    // Poll every 5s in case graph.js silently removed the token on 401
    const t = setInterval(update, 5000)
    return () => { window.removeEventListener('storage', update); clearInterval(t) }
  }, [session])

  return (
    <AuthContext.Provider value={{ session, loading, error, login, logout, reconnectMicrosoft, hasGraphToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
