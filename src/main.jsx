import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider, useAuth } from './lib/auth'
import BDDashboard from './App'
import LoginScreen from './components/auth/LoginScreen'

function Root() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#F1EFE8', fontFamily: "'DM Sans', sans-serif", color: '#888780'
      }}>
        Laden...
      </div>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  return <BDDashboard />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>
)
