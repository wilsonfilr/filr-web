import { supabase } from './supabase'

const APPLE_SCRIPT_SRC =
  'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'

type AppleAuthResponse = {
  authorization: {
    code: string
    id_token: string
    state?: string
  }
  user?: {
    email?: string
    name?: {
      firstName?: string
      lastName?: string
    }
  }
}

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string
          scope: string
          redirectURI: string
          state?: string
          usePopup?: boolean
        }) => void
        signIn: () => Promise<AppleAuthResponse>
      }
    }
  }
}

let appleScriptPromise: Promise<void> | null = null

function getAppleServicesId(): string | undefined {
  const value = import.meta.env.VITE_APPLE_SERVICES_ID?.trim()
  return value || undefined
}

function getAppleRedirectUri(): string {
  return import.meta.env.VITE_SITE_URL?.trim() || window.location.origin
}

function loadAppleScript(): Promise<void> {
  if (window.AppleID) {
    return Promise.resolve()
  }
  if (appleScriptPromise) {
    return appleScriptPromise
  }

  appleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${APPLE_SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Sign in with Apple.')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = APPLE_SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Sign in with Apple.'))
    document.head.appendChild(script)
  })

  return appleScriptPromise
}

function isAppleUserCancelError(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false
  }
  const code = (err as { error?: string }).error
  return code === 'popup_closed_by_user' || code === 'user_cancelled_authorize'
}

/** Sign in with Apple on the web using Apple's JS SDK → Supabase `signInWithIdToken`. */
export async function signInWithAppleWeb(): Promise<void> {
  const clientId = getAppleServicesId()
  if (!clientId) {
    throw new Error(
      'Apple web sign-in is not configured. Set VITE_APPLE_SERVICES_ID in your deployment environment.',
    )
  }

  await loadAppleScript()
  if (!window.AppleID) {
    throw new Error('Sign in with Apple failed to initialize.')
  }

  const redirectURI = getAppleRedirectUri()

  window.AppleID.auth.init({
    clientId,
    scope: 'name email',
    redirectURI,
    usePopup: true,
  })

  let response: AppleAuthResponse
  try {
    response = await window.AppleID.auth.signIn()
  } catch (err) {
    if (isAppleUserCancelError(err)) {
      return
    }
    throw err instanceof Error ? err : new Error('Apple sign-in failed.')
  }

  const idToken = response.authorization.id_token
  if (!idToken) {
    throw new Error('Apple did not return an identity token.')
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: idToken,
  })
  if (error) {
    throw error
  }

  const fullName = [response.user?.name?.firstName, response.user?.name?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()

  if (fullName && data.user) {
    try {
      await supabase.auth.updateUser({ data: { full_name: fullName } })
    } catch {
      // Best-effort only — Apple only sends the name on first sign-in.
    }
  }
}

/** OAuth redirect fallback when Apple JS is unavailable. */
export async function signInWithAppleOAuth(): Promise<void> {
  const redirectTo = `${getAppleRedirectUri()}/`
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo,
      scopes: 'email name',
    },
  })
  if (error) {
    throw error
  }
}

export async function signInWithApple(): Promise<void> {
  if (getAppleServicesId()) {
    await signInWithAppleWeb()
    return
  }
  await signInWithAppleOAuth()
}
