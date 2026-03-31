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
          // Compatível com o formato esperado pelo Supabase SSR
          return Array.from(cookieStore.getAll()).map(({ name, value }) => ({ name, value }));
        },
        async setAll(cookies) {
          // Next.js 15 não permite setar cookies diretamente do lado do servidor via headers/cookies API
          // (deve ser feito via Response, mas para SSR puro, normalmente não é necessário setar manualmente)
        },
      },
    }
  );
};
