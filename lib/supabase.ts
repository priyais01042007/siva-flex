import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xjfbfkftrtsuuhokgkdt.supabase.co";

// Browser anonymous key (safe for public client if ever needed)
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_jtzx6DeKJKENQDVW-uRjyA_-cfFxZGK";

// Privileged Service Role Key (Server-side APIs only, NEVER exposed with NEXT_PUBLIC_)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

if (typeof window === "undefined" && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[SECURITY CONFIG NOTICE]: SUPABASE_SERVICE_ROLE_KEY is not defined. Ensure it is added in Netlify/production environment variables for private storage operations."
  );
}

/**
 * Server-side Supabase client for backend API routes.
 * Uses SUPABASE_SERVICE_ROLE_KEY to administer private storage buckets and sign URLs.
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Public client for client components if direct anon reads are ever needed.
 */
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const STORAGE_BUCKET = "customer-files";
