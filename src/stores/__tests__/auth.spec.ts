import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AUTH_EXPIRES_AT_KEY, AUTH_SESSION_KEY, AUTH_USER_KEY } from '@/config/api'
import { useAuthStore } from '@/stores/auth'

function responseFor(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response
}

const VALID_PASSWORD = 'SenhaForte123!'

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('login ativa a sessão e guarda o usuário retornado pelo body', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          responseFor(200, { user: { username: 'joao', email: 'joao@email.com' } }),
        ),
    )

    const store = useAuthStore()
    const ok = await store.login({ username: 'joao', password: VALID_PASSWORD })

    expect(ok).toBe(true)
    expect(store.isAuthenticated).toBe(true)
    expect(store.user?.username).toBe('joao')
    expect(store.user?.email).toBe('joao@email.com')
    expect(localStorage.getItem(AUTH_SESSION_KEY)).toBe('1')
    expect(localStorage.getItem(AUTH_USER_KEY)).toContain('joao')
  })

  it('login sem user no body ainda autentica a sessão', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseFor(200, {})))

    const store = useAuthStore()
    const ok = await store.login({ username: 'joao', password: VALID_PASSWORD })

    expect(ok).toBe(true)
    expect(store.isAuthenticated).toBe(true)
    expect(store.user).toBeNull()
  })

  it('login guarda o expires_at retornado pelo body', async () => {
    const expiresAt = new Date(Date.now() + 3_600_000).toISOString()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(responseFor(200, { user: { username: 'joao' }, expires_at: expiresAt })),
    )

    const store = useAuthStore()
    await store.login({ username: 'joao', password: VALID_PASSWORD })

    expect(store.expiresAt).toBe(Date.parse(expiresAt))
    expect(localStorage.getItem(AUTH_EXPIRES_AT_KEY)).toBe(expiresAt)
    store.clearSession()
  })

  it('login sem expires_at não agenda expiração local', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseFor(200, {})))

    const store = useAuthStore()
    await store.login({ username: 'joao', password: VALID_PASSWORD })

    expect(store.expiresAt).toBeNull()
    expect(localStorage.getItem(AUTH_EXPIRES_AT_KEY)).toBeNull()
  })

  it('não dispara segunda request enquanto o login carrega', async () => {
    let resolveResponse: (value: Response) => void
    const fetchMock = vi.fn<() => Promise<Response>>().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const store = useAuthStore()
    const first = store.login({ username: 'joao', password: VALID_PASSWORD })
    const second = await store.login({ username: 'maria', password: 'OutraSenha123!' })

    expect(second).toBe(false)

    resolveResponse!(responseFor(200, {}))
    await first

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(store.isAuthenticated).toBe(true)
  })

  it('login com erro define a mensagem e não autentica', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(responseFor(401, { detail: 'Credenciais inválidas' })),
    )

    const store = useAuthStore()
    const ok = await store.login({ username: 'joao', password: 'errada' })

    expect(ok).toBe(false)
    expect(store.error).toBe('Credenciais inválidas')
    expect(store.isAuthenticated).toBe(false)
  })

  it('register confirma sucesso e trata erro 409', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseFor(201, { detail: 'ok' })))

    const store = useAuthStore()
    const ok = await store.register({
      username: 'joao',
      email: 'joao@email.com',
      password: VALID_PASSWORD,
    })
    expect(ok).toBe(true)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(responseFor(409, { detail: 'Username já existe' })),
    )
    const failed = await store.register({
      username: 'joao',
      email: 'joao@email.com',
      password: VALID_PASSWORD,
    })
    expect(failed).toBe(false)
    expect(store.error).toBe('Username já existe')
  })

  it('forgotPassword sempre retorna sucesso (resposta genérica)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseFor(200, { detail: 'ok' })))

    const store = useAuthStore()
    const ok = await store.forgotPassword({ email: 'joao@email.com' })
    expect(ok).toBe(true)
  })

  it('validateSession mantém a sessão quando /me responde 200', async () => {
    localStorage.setItem(AUTH_SESSION_KEY, '1')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          responseFor(200, { user: { username: 'joao', email: 'joao@email.com' } }),
        ),
    )

    const store = useAuthStore()
    const ok = await store.validateSession()

    expect(ok).toBe(true)
    expect(store.isAuthenticated).toBe(true)
    expect(store.user?.username).toBe('joao')
  })

  it('validateSession atualiza expires_at a partir do /me', async () => {
    localStorage.setItem(AUTH_SESSION_KEY, '1')
    const expiresAt = new Date(Date.now() + 3_600_000).toISOString()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(responseFor(200, { user: { username: 'joao' }, expires_at: expiresAt })),
    )

    const store = useAuthStore()
    expect(await store.validateSession()).toBe(true)
    expect(store.expiresAt).toBe(Date.parse(expiresAt))
    expect(localStorage.getItem(AUTH_EXPIRES_AT_KEY)).toBe(expiresAt)
    store.clearSession()
  })

  it('validateSession limpa a sessão expirada sem chamar /me', async () => {
    localStorage.setItem(AUTH_SESSION_KEY, '1')
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, new Date(Date.now() - 1000).toISOString())
    const fetchMock = vi.fn<() => Promise<unknown>>()
    vi.stubGlobal('fetch', fetchMock)

    const store = useAuthStore()
    expect(await store.validateSession()).toBe(false)
    expect(store.isAuthenticated).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('validateSession mantém a sessão quando /me responde 401', async () => {
    localStorage.setItem(AUTH_SESSION_KEY, '1')
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ username: 'joao' }))
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(responseFor(401, { detail: 'Sessão inválida' })),
    )

    const store = useAuthStore()
    const ok = await store.validateSession()

    expect(ok).toBe(false)
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(localStorage.getItem(AUTH_SESSION_KEY)).toBeNull()
  })

  it('validateSession é no-op quando não há flag de sessão', async () => {
    const fetchMock = vi.fn<() => Promise<unknown>>()
    vi.stubGlobal('fetch', fetchMock)

    const store = useAuthStore()
    expect(await store.validateSession()).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('logout limpa a sessão localmente', async () => {
    localStorage.setItem(AUTH_SESSION_KEY, '1')
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ username: 'joao' }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseFor(204)))

    const store = useAuthStore()
    await store.logout()

    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(localStorage.getItem(AUTH_SESSION_KEY)).toBeNull()
    expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull()
  })

  it('restaura a sessão a partir do localStorage', () => {
    localStorage.setItem(AUTH_SESSION_KEY, '1')
    localStorage.setItem(
      AUTH_USER_KEY,
      JSON.stringify({ username: 'joao', email: 'joao@email.com' }),
    )

    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(true)
    expect(store.user?.username).toBe('joao')
  })

  it('sessionExpired é true quando a expiração local passou', () => {
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, new Date(Date.now() - 1000).toISOString())

    const store = useAuthStore()
    expect(store.sessionExpired()).toBe(true)
  })

  it('sessionExpired é false com expiração futura ou ausente', () => {
    const store = useAuthStore()
    expect(store.sessionExpired()).toBe(false)

    localStorage.setItem(AUTH_EXPIRES_AT_KEY, new Date(Date.now() + 60_000).toISOString())
    expect(useAuthStore().sessionExpired()).toBe(false)
  })

  it('desloga sozinho quando o expires_at é atingido', async () => {
    vi.useFakeTimers()
    try {
      const expiresAt = new Date(Date.now() + 60_000).toISOString()
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            responseFor(200, { user: { username: 'joao' }, expires_at: expiresAt }),
          ),
      )

      const store = useAuthStore()
      await store.login({ username: 'joao', password: VALID_PASSWORD })

      expect(store.isAuthenticated).toBe(true)

      vi.advanceTimersByTime(59_000)
      expect(store.isAuthenticated).toBe(true)

      vi.advanceTimersByTime(2_000)
      expect(store.isAuthenticated).toBe(false)
      expect(localStorage.getItem(AUTH_EXPIRES_AT_KEY)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('clearSession limpa estado e storage', () => {
    localStorage.setItem(AUTH_SESSION_KEY, '1')
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ username: 'joao' }))

    const store = useAuthStore()
    store.clearSession()

    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(localStorage.getItem(AUTH_SESSION_KEY)).toBeNull()
  })
})
