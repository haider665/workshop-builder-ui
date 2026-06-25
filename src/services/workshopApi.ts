const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export type CWUserDto = {
  id: string
  fullName: string
  email: string
  mobile: string
  roleIds: string[]
  shopIds: string[]
  status: string
  createdAt: string
  updatedAt: string
}

export type AuthSessionDto = {
  ok?: boolean
  user: CWUserDto
  capabilities: string[]
}

type FrappeResponse<T> = {
  message: T
}

async function readMessage<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as FrappeResponse<T>
  return payload.message
}

async function ensureOk(response: Response, fallbackMessage: string) {
  if (response.ok) return

  let message = fallbackMessage
  try {
    const payload = (await response.json()) as { message?: unknown; exception?: string }
    if (typeof payload.message === 'string') message = payload.message
    else if (payload.exception) message = payload.exception
  } catch {
    // Response was not JSON; keep the fallback message.
  }

  throw new Error(message)
}

export const workshopApi = {
  async login(username: string, password: string): Promise<AuthSessionDto> {
    const body = new URLSearchParams()
    body.set('usr', username)
    body.set('pwd', password)

    const response = await fetch(`${apiBaseUrl}/api/method/workshop.api.auth.login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      credentials: 'include',
    })

    await ensureOk(response, 'Login failed')
    return readMessage<AuthSessionDto>(response)
  },

  async me(): Promise<AuthSessionDto | null> {
    const response = await fetch(`${apiBaseUrl}/api/method/workshop.api.auth.me`, {
      credentials: 'include',
    })

    if (response.status === 401 || response.status === 403) return null

    await ensureOk(response, 'Failed to restore session')
    return readMessage<AuthSessionDto>(response)
  },

  async logout(): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/api/method/workshop.api.auth.logout`, {
      method: 'POST',
      credentials: 'include',
    })

    if (response.status === 401) return
    await ensureOk(response, 'Logout failed')
  },
}
