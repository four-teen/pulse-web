// Keep the API domain server-side and the session cookie first-party on Vercel.
const allowedRoutes = new Map([
  ['auth/login', 'POST'],
  ['auth/session', 'GET'],
  ['auth/logout', 'POST'],
  ['v1/president/dashboard', 'GET'],
  ['v1/campuses', 'GET'],
  ['v1/integrations', 'GET'],
  ['v1/faculty-profiles', 'GET'],
])

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  const requestUrl = new URL(request.url, 'https://pulse.local')
  // Vercel's Vite preset needs an explicit rewrite to this named function.
  // Accept both the original URL and the rewritten function URL.
  const path = requestUrl.pathname === '/api/proxy'
    ? requestUrl.searchParams.get('__pulse_path') ?? ''
    : requestUrl.pathname.replace(/^\/api\//, '')
  requestUrl.searchParams.delete('__pulse_path')
  if (!allowedRoutes.has(path)) return response.status(404).json({ message: 'Not found.' })
  if (request.method !== allowedRoutes.get(path)) {
    response.setHeader('Allow', allowedRoutes.get(path))
    return response.status(405).json({ message: 'Method not allowed.' })
  }

  const configuredOrigin = process.env.PULSE_API_ORIGIN
  if (!configuredOrigin) return response.status(503).json({ message: 'The presidential portal is not configured yet. Please contact your system administrator.' })

  try {
    const origin = new URL(configuredOrigin.endsWith('/') ? configuredOrigin : `${configuredOrigin}/`)
    if (origin.protocol !== 'https:') throw new Error('HTTPS required')
    const headers = { Accept: 'application/json' }
    const sessionCookie = request.headers.cookie?.split(';').map(cookie => cookie.trim()).find(cookie => cookie.startsWith('pulse_session='))
    if (sessionCookie) headers.Cookie = sessionCookie
    if (request.headers.origin) headers.Origin = request.headers.origin
    // Optional shared secret lets PHP reject direct traffic to these routes.
    if (process.env.PULSE_PROXY_SECRET) headers['X-Pulse-Proxy-Secret'] = process.env.PULSE_PROXY_SECRET
    const upstreamUrl = new URL(path, origin)
    upstreamUrl.search = requestUrl.search
    const options = { method: request.method, headers, redirect: 'error', signal: AbortSignal.timeout(12000) }
    if (request.method === 'POST') {
      if (!request.headers['content-type']?.startsWith('application/json')) {
        return response.status(415).json({ message: 'JSON content is required.' })
      }
      options.headers['Content-Type'] = 'application/json'
      options.body = JSON.stringify(request.body ?? {})
      if (Buffer.byteLength(options.body) > 4096) return response.status(413).json({ message: 'Request is too large.' })
    }
    const upstream = await fetch(upstreamUrl, options)
    for (const cookie of upstream.headers.getSetCookie()) {
      if (cookie.startsWith('pulse_session=')) response.appendHeader('Set-Cookie', cookie)
    }
    const retryAfter = upstream.headers.get('retry-after')
    if (retryAfter) response.setHeader('Retry-After', retryAfter)
    const content = await upstream.text()
    if (!upstream.headers.get('content-type')?.includes('application/json')) throw new Error('Invalid API response')
    return response.status(upstream.status).setHeader('Content-Type', 'application/json').send(content)
  } catch {
    return response.status(502).json({ message: 'The presidential service is temporarily unavailable. Please try again shortly.' })
  }
}
