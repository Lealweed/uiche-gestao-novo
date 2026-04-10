import { createServerClient } from '@supabase/ssr';
import { cookies as nextCookies } from 'next/headers';

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY devem estar definidos em .env.local');
  }

  return createServerClient(url, anonKey, {
      cookies: {
        async getAll() {
          const cookieStore = await nextCookies();
          return Array.from(cookieStore.getAll()).map(({ name, value }) => ({ name, value }));
        },
        async setAll(cookies) {
          try {
            const cookieStore = await nextCookies();
            for (const { name, value, ...options } of cookies) {
              cookieStore.set({ name, value, ...options });
            }
          } catch {
            // setAll pode falhar em Server Components (somente leitura).
            // Funciona corretamente em Route Handlers e Server Actions.
          }
        },
      },
    }
  );
};
