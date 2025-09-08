import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Public routes that don't require authentication
    if (pathname === '/login' || pathname === '/' || pathname === '/api/admin/seed' || pathname === '/api/debug' || pathname === '/api/fix-db-url' || pathname === '/api/simple-seed' || pathname === '/api/direct-seed') {
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
        // Allow access to login page, root, and all debug/seed APIs
        if (req.nextUrl.pathname === '/login' || 
            req.nextUrl.pathname === '/' || 
            req.nextUrl.pathname === '/api/admin/seed' ||
            req.nextUrl.pathname === '/api/debug' ||
            req.nextUrl.pathname === '/api/fix-db-url' ||
            req.nextUrl.pathname === '/api/simple-seed' ||
            req.nextUrl.pathname === '/api/direct-seed') {
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