import { supabase } from './supabase'

/**
 * Permanently deletes the authenticated user's account and all associated data.
 * Invokes the `delete-account` Edge Function (storage cleanup + auth user delete),
 * then clears the local session.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account')
  if (error) throw error
  try {
    await supabase.auth.signOut()
  } catch {
    const { error: localSignOutError } = await supabase.auth.signOut({ scope: 'local' })
    if (localSignOutError) throw localSignOutError
  }
}
