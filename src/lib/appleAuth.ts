import { supabase } from './supabase'

export async function signInWithAppleWeb(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: 'https://web.myfilr.app',
      scopes: 'name email',
    },
  })
  if (error) throw error
}
