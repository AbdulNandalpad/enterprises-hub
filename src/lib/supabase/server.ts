/**
 * Supabase server client — uses the service role key.
 *
 * NEVER import this on the client side or in Edge Middleware.
 * For Edge Middleware use the REST fetch approach in middleware.ts.
 * For API routes (Node.js runtime) use this.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
}

/** Service-role client — bypasses RLS. For use in /api routes and server actions only. */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
