import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { AppleLogo, GoogleLogo } from './brandLogos'

/** App Store / web review demo account — typing this email reveals a password field. */
const REVIEW_LOGIN_EMAIL = 'review@myfilr.app'

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [showEmail, setShowEmail] = useState(false)
  const [busy, setBusy] = useState<null | 'apple' | 'google' | 'email'>(null)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [reviewPassword, setReviewPassword] = useState('')
  const [reviewPasswordVisible, setReviewPasswordVisible] = useState(false)

  async function signInWithProvider(provider: 'apple' | 'google') {
    setBusy(provider)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
      // On success the browser redirects to the provider; keep the spinner until it does.
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not continue with ${provider}.`)
      setBusy(null)
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim()
    if (!value) return

    const isReview = value.toLowerCase() === REVIEW_LOGIN_EMAIL

    // First press on the review email: reveal the password field instead of sending a link.
    if (isReview && !reviewPasswordVisible) {
      setReviewPasswordVisible(true)
      setError(null)
      return
    }

    setBusy('email')
    setError(null)
    try {
      if (isReview) {
        const { error } = await supabase.auth.signInWithPassword({
          email: REVIEW_LOGIN_EMAIL,
          password: reviewPassword.trim(),
        })
        if (error) throw error
        // onAuthStateChange swaps to the workspace automatically.
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email: value,
          options: { emailRedirectTo: window.location.origin, shouldCreateUser: true },
        })
        if (error) throw error
        setSent(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="page-gradient flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-9 flex flex-col items-center text-center">
          <img src="/filr-logo.svg" alt="Filr" className="h-14 w-14" />
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Welcome to Filr</h1>
          <p className="mt-1.5 text-sm text-filr-muted">
            Sign in to reach the documents from your phone.
          </p>
        </div>

        {sent ? (
          <MagicLinkSent email={email.trim()} onBack={() => setSent(false)} />
        ) : (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => signInWithProvider('apple')}
              disabled={busy !== null}
              className="inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] bg-white text-[15px] font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
            >
              <AppleLogo className="h-5 w-5" />
              {busy === 'apple' ? 'Continuing…' : 'Continue with Apple'}
            </button>

            <button
              onClick={() => signInWithProvider('google')}
              disabled={busy !== null}
              className="inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] border border-filr-border bg-filr-surface text-[15px] font-semibold text-filr-text transition hover:border-filr-accent/60 hover:bg-filr-surface-2 disabled:opacity-60"
            >
              <GoogleLogo className="h-5 w-5" />
              {busy === 'google' ? 'Continuing…' : 'Continue with Google'}
            </button>

            <div className="my-1 flex items-center gap-3 text-xs text-filr-muted/70">
              <span className="h-px flex-1 bg-filr-border" />
              or
              <span className="h-px flex-1 bg-filr-border" />
            </div>

            {!showEmail ? (
              <button
                onClick={() => setShowEmail(true)}
                className="inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] border border-filr-border bg-filr-surface text-[15px] font-semibold text-filr-text transition hover:border-filr-accent/60 hover:bg-filr-surface-2"
              >
                Continue with Email
              </button>
            ) : (
              <form onSubmit={submitEmail} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError(null)
                    // Hide the review password field if the email no longer matches.
                    if (e.target.value.trim().toLowerCase() !== REVIEW_LOGIN_EMAIL) {
                      setReviewPasswordVisible(false)
                      setReviewPassword('')
                    }
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                  className="h-12 rounded-[10px] border border-filr-border bg-filr-bg/60 px-4 text-sm text-filr-text outline-none transition placeholder:text-filr-muted/50 focus:border-filr-accent"
                />
                {reviewPasswordVisible && (
                  <input
                    type="password"
                    value={reviewPassword}
                    onChange={(e) => setReviewPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    autoFocus
                    className="h-12 rounded-[10px] border border-filr-border bg-filr-bg/60 px-4 text-sm text-filr-text outline-none transition placeholder:text-filr-muted/50 focus:border-filr-accent"
                  />
                )}
                <button
                  type="submit"
                  disabled={busy !== null}
                  className="inline-flex h-12 items-center justify-center rounded-[10px] bg-filr-accent text-[15px] font-semibold text-filr-bg transition hover:bg-filr-accent/90 disabled:opacity-60"
                >
                  {busy === 'email'
                    ? reviewPasswordVisible
                      ? 'Signing in…'
                      : 'Sending…'
                    : reviewPasswordVisible
                      ? 'Sign in'
                      : 'Send link'}
                </button>
              </form>
            )}

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
            )}
          </div>
        )}

        <p className="mt-7 text-center text-xs leading-relaxed text-filr-muted/70">
          Uses the same account as the Filr mobile app.
        </p>
      </div>
    </div>
  )
}

function MagicLinkSent({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="rounded-2xl border border-filr-border bg-filr-surface/60 p-6 text-center backdrop-blur">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-filr-accent/15">
        <svg className="h-6 w-6 text-filr-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-semibold">Check your inbox</h2>
      <p className="mt-1.5 text-sm text-filr-muted">
        We sent a magic link to <span className="text-filr-text">{email}</span>. Open it on this
        device to sign in.
      </p>
      <button
        onClick={onBack}
        className="mt-5 text-sm font-medium text-filr-accent transition hover:text-filr-accent/80"
      >
        Use a different email
      </button>
    </div>
  )
}
