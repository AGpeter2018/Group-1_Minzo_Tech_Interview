import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://spbrsszzhnnbgjismuhr.supabase.co';
// Automatically sanitize key if prefixed with 'public-'
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseKey = rawKey.replace(/^public-/, '');

if (!supabaseUrl || !supabaseKey) {
  if (typeof window !== 'undefined') {
    console.warn("Missing Supabase URL or anon key. Check your .env / .env.local file.");
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Server-side privileged client using the service role key.
 * Only use this on the server (API routes, server actions, background agents).
 */
export const getServiceSupabase = () => {
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey).replace(/^public-/, '');
  return createClient(supabaseUrl, serviceKey);
};
