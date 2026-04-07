import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

// NEXT_PUBLIC_ vars are inlined at build time. When the build env doesn't
// have them (Cloudflare Workers build), the bundled JS has empty strings.
// Fallback to the known public values so the client-side code always works.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://fxlpelewdkugkthcvazi.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_zve6Ro59kiEyS0oWK7TmdQ_qoATOaXm";

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return (_supabase as unknown as Record<string, unknown>)[prop as string];
  },
});
