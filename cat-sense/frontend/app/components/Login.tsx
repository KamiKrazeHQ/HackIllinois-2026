'use client'
import { useState } from 'react'
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { app } from '../firebase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState<'login' | 'signup' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const auth = getAuth(app)

  async function handleLogin() {
    if (!email || !password) return
    setLoading('login')
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message.replace('Firebase: ', '').replace(/ \(auth\/.*\)\.?/, '') : 'Login failed')
      setLoading(null)
    }
  }

  async function handleSignUp() {
    if (!email || !password) return
    setLoading('signup')
    setError(null)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message.replace('Firebase: ', '').replace(/ \(auth\/.*\)\.?/, '') : 'Sign up failed')
      setLoading(null)
    }
  }

  return (
    <>
      <style>{`
        .lc-btn { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .lc-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.3); }
        .lc-btn:active:not(:disabled) { transform: translateY(0); }
        .lc-input::placeholder { color: #666; }
        .lc-input:focus { border-color: #D4A500 !important; outline: none; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: '#030712',
      }}>
        {/* Caution-tape stripe border */}
        <div style={{
          padding: '8px',
          borderRadius: '28px',
          background: 'repeating-linear-gradient(45deg, #2E2725 0px, #2E2725 8px, #D4A500 8px, #D4A500 16px)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            backgroundColor: '#111827',
            borderRadius: '20px',
            padding: '2.5rem',
            width: '360px',
          }}>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                backgroundColor: '#D4A500',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 900,
                color: '#111',
                letterSpacing: '-0.5px',
                marginBottom: '12px',
              }}>CAT</div>
              <h1 style={{
                margin: 0,
                fontSize: '1.6rem',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '-0.03em',
              }}>CAT Sense</h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                Heavy Machinery Diagnostics
              </p>
            </div>

            {/* Email */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: 500, color: '#d1d5db' }}>
                Email
              </label>
              <input
                className="lc-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  padding: '0.7rem 1rem',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  borderRadius: '12px',
                  border: '1px solid #374151',
                  backgroundColor: '#1f2937',
                  color: '#fff',
                  transition: 'border-color 0.15s',
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: 500, color: '#d1d5db' }}>
                Password
              </label>
              <input
                className="lc-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.7rem 1rem',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  borderRadius: '12px',
                  border: '1px solid #374151',
                  backgroundColor: '#1f2937',
                  color: '#fff',
                  transition: 'border-color 0.15s',
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <p style={{
                marginBottom: '1rem',
                padding: '0.6rem 0.9rem',
                borderRadius: '10px',
                backgroundColor: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5',
                fontSize: '0.78rem',
                margin: '0 0 1rem 0',
              }}>{error}</p>
            )}

            {/* Login button */}
            <button
              className="lc-btn"
              onClick={handleLogin}
              disabled={!!loading || !email || !password}
              style={{
                width: '100%',
                padding: '0.8rem',
                marginBottom: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                border: 'none',
                borderRadius: '14px',
                backgroundColor: '#D4A500',
                color: '#111',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading === 'login' ? 'Signing in…' : 'Login'}
            </button>

            {/* Sign up button */}
            <button
              className="lc-btn"
              onClick={handleSignUp}
              disabled={!!loading || !email || !password}
              style={{
                width: '100%',
                padding: '0.8rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                border: '2px solid #D4A500',
                borderRadius: '14px',
                backgroundColor: 'transparent',
                color: '#D4A500',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading === 'signup' ? 'Creating account…' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
