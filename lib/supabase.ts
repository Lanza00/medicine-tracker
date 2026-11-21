import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isDemo } from "./demoMode";

let client: SupabaseClient | null = null;

export function hasSupabaseEnv(): boolean {
  if (isDemo()) return true; // the demo uses sample data instead of a database
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Server-only Supabase client using the service role key.
 * RLS is enabled with no policies, so this is the ONLY way to reach the data.
 * Never import this file from a client component.
 */
export function db(): SupabaseClient {
  // Safety net: the demo must never reach a real database, even if keys are set by mistake.
  if (isDemo()) throw new Error("The database is turned off in demo mode.");
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
