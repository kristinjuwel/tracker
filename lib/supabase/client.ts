// lib/supabase/client.ts
"use client";

import { createBrowserClient } from "@supabase/ssr";

function mask(s?: string) {
  if (!s) return "undefined";
  return s.length > 8 ? `${s.slice(0, 4)}…${s.slice(-4)}` : "too-short";
}

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // Return cached instance to avoid recreating the client
  if (clientInstance) {
    return clientInstance;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    // legacy fallback if you had this earlier
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "";

  // Helpful dev logs (safe: anon key is public)
  if (process.env.NODE_ENV !== "production") {
    // will print in the browser console
    console.log("[supabase] URL:", url);
    console.log("[supabase] ANON:", mask(anon));
  }

  if (!url || !anon) {
    throw new Error(
      "Supabase env vars missing. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart dev server."
    );
  }

  // Create browser client - the SSR helper handles API key headers automatically
  clientInstance = createBrowserClient(url, anon);

  return clientInstance;
}
