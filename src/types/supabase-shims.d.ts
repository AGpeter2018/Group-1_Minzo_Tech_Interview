import type { GoTrueClient } from '@supabase/auth-js';

declare module '@supabase/supabase-js' {
  interface SupabaseAuthClient extends GoTrueClient {}
}
