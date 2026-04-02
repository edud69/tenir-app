import createMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // First, handle Supabase session
  const sessionResponse = await updateSession(request);

  // If Supabase redirected, return that redirect
  if (sessionResponse.headers.get('location')) {
    return sessionResponse;
  }

  // Then handle i18n routing
  const intlResponse = intlMiddleware(request);

  // Merge Supabase cookies into the intl response
  sessionResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  return intlResponse;
}

export const config = {
  matcher: ['/', '/(fr|en)/:path*'],
};
