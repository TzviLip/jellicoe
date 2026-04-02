/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development'

// Security headers — applied in production only
// In development, Next.js injects inline scripts for hot-reloading
// which the strict CSP would block, making buttons unclickable
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      `connect-src 'self' https://*.supabase.co https://api.anthropic.com`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  async headers() {
    // Skip security headers in development so the app is interactive locally
    if (isDev) return []
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

module.exports = nextConfig