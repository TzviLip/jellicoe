// Strips trailing slash so URLs like APP_URL + '/path' never produce double slashes
export function appUrl(path: string): string {
    const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '')
    const clean = path.startsWith('/') ? path : `/${path}`
    return `${base}${clean}`
  }