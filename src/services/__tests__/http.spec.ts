import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError, UNAUTHORIZED_EVENT, request } from '@/services/http'

function responseFor(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response
}

describe('http request', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('faz GET sem corpo e retorna JSON', async () => {
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValue(responseFor(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    const data = await request<{ ok: boolean }>('/health')

    expect(data).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/health'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('enviar corpo serializa como JSON e define Content-Type', async () => {
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValue(responseFor(201, { detail: 'ok' }))
    vi.stubGlobal('fetch', fetchMock)

    await request('/register', { method: 'POST', body: { username: 'joao' } })

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init.body).toBe(JSON.stringify({ username: 'joao' }))
  })

  it('401 em chamada autenticada dispara o evento auth:unauthorized', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(responseFor(401, { detail: 'Sessão inválida' })),
    )

    const listener = vi.fn<(event: Event) => void>()
    window.addEventListener(UNAUTHORIZED_EVENT, listener)

    await expect(request('/me', { auth: true })).rejects.toThrow(HttpError)

    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener(UNAUTHORIZED_EVENT, listener)
  })

  it('401 em chamada pública não dispara o evento auth:unauthorized', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(responseFor(401, { detail: 'Credenciais inválidas' })),
    )

    const listener = vi.fn<(event: Event) => void>()
    window.addEventListener(UNAUTHORIZED_EVENT, listener)

    await expect(request('/login', { method: 'POST', body: {} })).rejects.toThrow(HttpError)

    expect(listener).not.toHaveBeenCalled()
    window.removeEventListener(UNAUTHORIZED_EVENT, listener)
  })

  it('erro com detail vira HttpError com a mensagem do backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(responseFor(409, { detail: 'Username já existe' })),
    )

    await expect(request('/register', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 409,
      message: 'Username já existe',
    })
  })

  it('204 retorna undefined sem tentar parsear corpo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseFor(204)))

    const data = await request<void>('/logout', { method: 'POST', auth: true })
    expect(data).toBeUndefined()
  })

  it('falha de rede vira HttpError de conexão', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')))

    await expect(request('/health')).rejects.toMatchObject({
      status: 0,
      message: 'Falha de conexão com o servidor',
    })
  })
})
