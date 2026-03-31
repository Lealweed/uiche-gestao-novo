import { createServerClient } from '@supabase/ssr';
import { cookies as nextCookies } from 'next/headers';

export const createClient = () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const cookieStore = await nextCookies();
          return Array.from(cookieStore.getAll()).map(({ name, value }) => ({ name, value }));
        },
        async setAll(cookiesToSet) {
          try {
            const cookieStore = await nextCookies();
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options ?? {});
            });
          } catch {
            // Em Server Components o cookie só pode ser setado via Route Handler ou Server Action
          }
        },
      },
    }
  );
};
