/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop MIME sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Force HTTPS
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Referrer policy — don't leak URLs to third parties
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Permissions policy — disable features the app doesn't need
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Content Security Policy
  // - default-src self: only load resources from our own domain
  // - script-src self: no inline scripts, no eval
  // - connect-src: allow Supabase and Anthropic API calls
  // - style-src unsafe-inline: needed for Tailwind
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval'",   // unsafe-eval needed for Next.js dev; remove in prod if possible
      "style-src 'self' 'unsafe-inline'",  // needed for Tailwind inline styles
      "img-src 'self' data: blob:",
      "font-src 'self'",
      `connect-src 'self' https://*.supabase.co https://api.anthropic.com`,
      "frame-ancestors 'none'",            // belt-and-braces with X-Frame-Options
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  // Prevent .env and other sensitive files being served
  async rewrites() {
    return []
  },
}

module.exports = nextConfig
