import { createClient } from '@supabase/supabase-js';

// This file is only ever imported from server-side code (API routes).
// The service_role key must NEVER be prefixed with NEXT_PUBLIC_ or shipped
// to the client bundle — it fully bypasses row level security.
function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function supabaseServer() {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}
