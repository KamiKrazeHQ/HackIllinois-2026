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
    <div className="min-h-screen bg-cat-dark flex flex-col">
      {/* Yellow header strip */}
      <div className="bg-cat px-8 py-5 flex items-center gap-4">
        <div className="bg-cat-black px-3 py-2 flex-shrink-0">
          <span className="font-condensed font-black text-cat text-xl leading-none tracking-tighter">CAT</span>
        </div>
        <div>
          <h1 className="font-condensed font-black text-cat-black text-2xl uppercase leading-none">CAT SENSE</h1>
          <p className="font-condensed text-cat-black/60 text-[11px] uppercase tracking-[0.2em] font-semibold leading-none mt-0.5">
            Heavy Machinery Diagnostics
          </p>
        </div>
      </div>

      {/* Login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Card with yellow left border */}
          <div className="bg-cat-black border-l-4 border-cat p-8">
            <h2 className="font-condensed font-black text-white text-3xl uppercase leading-none mb-1">ACCESS SYSTEM</h2>
            <p className="text-[#555] text-sm mb-8">Enter your credentials to continue</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block font-condensed font-bold uppercase tracking-widest text-[10px] text-cat mb-2">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="you@example.com"
                  className="w-full bg-[#111] border border-[#2A2A2A] rounded-none px-4 py-3 text-sm text-white placeholder-[#333] outline-none focus:border-cat/60 transition-all"
                />
              </div>
              <div>
                <label className="block font-condensed font-bold uppercase tracking-widest text-[10px] text-cat mb-2">
                  PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  className="w-full bg-[#111] border border-[#2A2A2A] rounded-none px-4 py-3 text-sm text-white placeholder-[#333] outline-none focus:border-cat/60 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="mb-5 border-l-2 border-red-500 pl-4 py-2 bg-red-950/30">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleLogin}
                disabled={!!loading || !email || !password}
                className="w-full py-4 bg-cat text-black font-condensed font-black uppercase tracking-widest text-sm disabled:opacity-30 hover:bg-yellow-300 hover:shadow-[0_0_36px_rgba(255,205,17,0.65)] active:scale-[0.98] transition-all duration-150"
              >
                {loading === 'login' ? 'SIGNING IN...' : 'SIGN IN'}
              </button>
              <button
                onClick={handleSignUp}
                disabled={!!loading || !email || !password}
                className="w-full py-4 border border-cat/20 text-cat/50 font-condensed font-black uppercase tracking-widest text-sm disabled:opacity-30 hover:border-cat hover:text-cat hover:bg-cat/5 hover:shadow-[0_0_20px_rgba(255,205,17,0.15)] active:scale-[0.98] transition-all duration-150"
              >
                {loading === 'signup' ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </button>
            </div>
          </div>

          <p className="text-center text-[#333] text-[10px] font-condensed uppercase tracking-widest mt-6">
            CAT SENSE · Diagnostic Platform
          </p>
        </div>
      </div>
    </div>
  )
}
