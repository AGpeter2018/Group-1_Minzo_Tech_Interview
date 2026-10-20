import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://spbrsszzhnnbgjismuhr.supabase.co';
const supabaseKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwYnJzc3p6aG5uYmdqaXNtdWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NTE0MzMsImV4cCI6MjEwNzQyNzQzM30.TwfOPxGiXKJGiHXIjgH_qmBH7CRwXcasy0J6OlmKcWM'
).replace(/^public-/, '').trim();

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Server-side privileged client using the service role key.
 * Only use this on the server (API routes, server actions, background agents).
 */
export const getServiceSupabase = () => {
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwYnJzc3p6aG5uYmdqaXNtdWhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTg1MTQzMywiZXhwIjoyMTA3NDI3NDMzfQ.B3HQ9CS5A7n_qEALsuKx2v0_4FWj4iIkxoI4uQc3Wt0'
  ).replace(/^public-/, '').trim();
  return createClient(supabaseUrl, serviceKey);
};
