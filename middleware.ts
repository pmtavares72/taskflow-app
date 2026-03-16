import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'

// Lightweight config for Edge Runtime — no DB imports
const { auth } = NextAuth({
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: '/login' },
  providers: [],
})

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthRoute = req.nextUrl.pathname.startsWith('/login')
  const isApi = req.nextUrl.pathname.startsWith('/api/')

  // Las rutas API manejan su propia autenticación via api-auth.ts
  if (isApi) return NextResponse.next()
  if (isAuthRoute) {
    if (isLoggedIn) return NextResponse.redirect(new URL('/inbox', req.nextUrl))
    return NextResponse.next()
  }
  if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
