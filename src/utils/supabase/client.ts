import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://spbrsszzhnnbgjismuhr.supabase.co';
const supabaseKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwYnJzc3p6aG5uYmdqaXNtdWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NTE0MzMsImV4cCI6MjEwNzQyNzQzM30.TwfOPxGiXKJGiHXIjgH_qmBH7CRwXcasy0J6OlmKcWM'
).replace(/^public-/, '').trim();

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );
