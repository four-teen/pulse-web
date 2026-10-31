import { test } from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/[...path].js'

function response() {
  return {
    statusCode: 200, headers: {}, payload: undefined,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this },
    appendHeader(name, value) { (this.headers[name.toLowerCase()] ??= []).push(value); return this },
    status(code) { this.statusCode = code; return this },
    json(data) { this.payload = data; return this },
    send(data) { this.payload = data; return this },
  }
}

test('Vercel authentication proxy', async t => {
  const oldFetch = globalThis.fetch
  const previousOrigin = process.env.PULSE_API_ORIGIN
  const previousSecret = process.env.PULSE_PROXY_SECRET
  t.after(() => {
    globalThis.fetch = oldFetch
    if (previousOrigin === undefined) delete process.env.PULSE_API_ORIGIN
    else process.env.PULSE_API_ORIGIN = previousOrigin
    if (previousSecret === undefined) delete process.env.PULSE_PROXY_SECRET
    else process.env.PULSE_PROXY_SECRET = previousSecret
  })
  const request = { url: '/api/auth/login', method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://pulse.example.test' }, body: { passcode: 'test-only-passcode' } }
  let upstreamCalls = 0
  globalThis.fetch = async () => { upstreamCalls++; throw new Error('Unexpected upstream call') }

  await t.test('rejects unknown routes, methods, and missing configuration', async () => {
    delete process.env.PULSE_API_ORIGIN
    let result = response()
    await handler({ ...request, url: '/api/unknown' }, result)
    assert.equal(result.statusCode, 404)
    result = response()
    await handler({ ...request, method: 'GET' }, result)
    assert.equal(result.statusCode, 405)
    result = response()
    await handler(request, result)
    assert.equal(result.statusCode, 503)
    assert.equal(upstreamCalls, 0)
  })
  await t.test('forwards only the session cookie, JSON body, origin and proxy secret', async () => {
    process.env.PULSE_API_ORIGIN = 'https://api.example.test/pulse-api'
    process.env.PULSE_PROXY_SECRET = 'test-only-shared-secret'
    globalThis.fetch = async (url, options) => {
      assert.equal(url.href, 'https://api.example.test/pulse-api/auth/login')
      assert.equal(options.headers.Cookie, 'pulse_session=test-only-session')
      assert.equal(options.headers.Origin, request.headers.origin)
      assert.equal(options.headers['X-Pulse-Proxy-Secret'], process.env.PULSE_PROXY_SECRET)
      assert.deepEqual(JSON.parse(options.body), request.body)
      assert.equal(options.redirect, 'error')
      const headers = new Headers({ 'Content-Type': 'application/json' })
      headers.append('Set-Cookie', 'pulse_session=test-only-session; Path=/; HttpOnly; Secure; SameSite=Strict')
      headers.append('Set-Cookie', 'unrelated=discard; Path=/')
      return new Response('{"user":{"role":"president"}}', { status: 200, headers })
    }
    const result = response()
    await handler({ ...request, headers: { ...request.headers, cookie: 'unrelated=private; pulse_session=test-only-session' } }, result)
    assert.equal(result.statusCode, 200)
    assert.equal(result.headers['set-cookie'].length, 1)
    assert.match(result.headers['set-cookie'][0], /^pulse_session=/)
    assert.equal(result.headers['cache-control'], 'no-store')
    assert.equal(JSON.parse(result.payload).user.role, 'president')
  })
  await t.test('requires HTTPS and hides upstream failures', async () => {
    process.env.PULSE_API_ORIGIN = 'http://api.example.test'
    let result = response()
    await handler(request, result)
    assert.equal(result.statusCode, 502)
    process.env.PULSE_API_ORIGIN = 'https://api.example.test'
    globalThis.fetch = async () => new Response('<html>Hosting error with a private path</html>', { status: 500, headers: { 'Content-Type': 'text/html' } })
    result = response()
    await handler(request, result)
    assert.equal(result.statusCode, 502)
    assert.doesNotMatch(JSON.stringify(result.payload), /private path/)
  })
  await t.test('preserves rate-limit status and retry delay', async () => {
    globalThis.fetch = async () => new Response('{"message":"Please wait."}', { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '120' } })
    const result = response()
    await handler(request, result)
    assert.equal(result.statusCode, 429)
    assert.equal(result.headers['retry-after'], '120')
  })
  await t.test('forwards only allowlisted read-only dashboard routes without exposing a sync endpoint', async () => {
    for (const path of ['v1/president/dashboard', 'v1/campuses', 'v1/integrations']) {
      globalThis.fetch = async (url, options) => {
        assert.equal(url.href, `https://api.example.test/${path}`)
        assert.equal(options.method, 'GET')
        assert.equal(options.body, undefined)
        return new Response('{"schemaVersion":1}', { headers: { 'Content-Type': 'application/json' } })
      }
      const result = response()
      await handler({ ...request, url: `/api/${path}`, method: 'GET' }, result)
      assert.equal(result.statusCode, 200)
      const blocked = response()
      await handler({ ...request, url: `/api/${path}`, method: 'POST' }, blocked)
      assert.equal(blocked.statusCode, 405)
    }
    const result = response()
    await handler({ ...request, url: '/api/v1/integrations/sinq/sync' }, result)
    assert.equal(result.statusCode, 404)
  })
})
