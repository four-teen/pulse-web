import { parseDashboard } from './modules/president/data'

export type President = { name: string; role: string }

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new ApiError('Unable to reach the presidential service. Please check your connection and try again.', 0)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(data?.message || 'The presidential service is temporarily unavailable. Please try again.', response.status)
  return data as T
}

export const auth = {
  session: () => request<{ user: President }>('/auth/session'),
  login: (passcode: string) => request<{ user: President }>('/auth/login', { passcode }),
  logout: () => request<{ message: string }>('/auth/logout', {}),
}

export const presidentApi = {
  dashboard: async () => {
    const data = await request<unknown>('/v1/president/dashboard')
    try { return parseDashboard(data) }
    catch { throw new ApiError('University records could not be read. Please try again or contact your system administrator.', 502) }
  },
}
