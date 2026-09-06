import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// This file is only ever imported from server-side code (API routes).
// The service_role key must NEVER be prefixed with NEXT_PUBLIC_ or shipped
// to the client bundle — it fully bypasses row level security.
export function supabaseServer() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error('Missing required env var: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  if (!key)
    throw new Error('Missing required env var: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');

  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}
