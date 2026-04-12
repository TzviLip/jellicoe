import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isProtected =
    pathname.startsWith('/radiographer') ||
    pathname.startsWith('/doctor') ||
    pathname.startsWith('/admin')

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname === '/login' && user) {
    // Redirect to the right dashboard based on role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    const role = roleData?.role
    const dest = role === 'doctor' || role === 'admin' ? '/doctor' : '/radiographer'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return response
}

export const config = {
  matcher: ['/radiographer/:path*', '/doctor/:path*', '/admin/:path*', '/login'],
}