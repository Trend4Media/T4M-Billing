import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Public routes that don't require authentication
    if (pathname === '/login' || pathname === '/') {
      return NextResponse.next()
    }

    // Redirect to login if not authenticated
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Role-based access control
    const userRole = token.role

    // Admin routes
    if (pathname.startsWith('/admin')) {
      if (userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Finance routes (Admin and Finance roles)
    if (pathname.startsWith('/finance')) {
      if (userRole !== 'ADMIN' && userRole !== 'FINANCE') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to login page and root
        if (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/') {
          return true
        }
        // Require token for all other routes
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}