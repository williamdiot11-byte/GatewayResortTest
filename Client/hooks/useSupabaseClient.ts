import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials in .env.local');
}

/**
 * Custom hook to create Supabase client with Clerk JWT
 * This ensures RLS policies work correctly with Clerk authentication
 * 
 * Usage:
 * ```tsx
 * const supabase = useSupabaseClient();
 * const { data } = await supabase.from('profiles').select('*');
 * ```
 */
export function useSupabaseClient(): SupabaseClient {
  const { getToken } = useAuth();
  const [client] = useState(() =>
    createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
          const token = await getToken();
          const headers = new Headers(options?.headers);
          
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          
          return fetch(url, {
            ...options,
            headers,
          });
        },
      },
    })
  );

  return client;
}


