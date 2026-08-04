import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { API_BASE_URL } from '@/config/api'
import { useSessionsStore } from '@/stores/sessions'

function responseFor(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response
}

const SESSIONS = [
  {
    id: 'sessao-1',
    device: 'Chrome · Linux',
    ip: '10.0.0.1',
    last_seen: '2026-08-01T10:00:00Z',
    current: true,
  },
  {
    id: 'sessao-2',
    device: 'Firefox · Windows',
    ip: '10.0.0.2',
    last_seen: '2026-08-01T09:00:00Z',
    current: false,
  },
]

describe('sessions store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('list carrega as sessões', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseFor(200, SESSIONS)))

    const store = useSessionsStore()
    const ok = await store.list()

    expect(ok).toBe(true)
    expect(store.sessions).toHaveLength(2)
    expect(store.sessions[0]!.current).toBe(true)
  })

  it('list com erro define a mensagem', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(responseFor(500, { detail: 'Erro interno' })),
    )

    const store = useSessionsStore()
    const ok = await store.list()

    expect(ok).toBe(false)
    expect(store.error).toBe('Erro interno')
  })

  it('não dispara segunda request enquanto a lista carrega', async () => {
    let resolveResponse: (value: Response) => void
    const fetchMock = vi.fn<() => Promise<Response>>().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const store = useSessionsStore()
    const first = store.list()
    const second = await store.list()

    expect(second).toBe(false)

    resolveResponse!(responseFor(200, { sessions: [] }))
    await first

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('terminate remove a sessão da lista via DELETE', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(responseFor(204))
    vi.stubGlobal('fetch', fetchMock)

    const store = useSessionsStore()
    store.sessions = [...SESSIONS]
    const ok = await store.terminate('sessao-2')

    expect(ok).toBe(true)
    expect(store.sessions.some((session) => session.id === 'sessao-2')).toBe(false)
    expect(store.sessions.some((session) => session.id === 'sessao-1')).toBe(true)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${API_BASE_URL}/sessions/sessao-2`)
    expect(init.method).toBe('DELETE')
  })

  it('terminate com erro mantém a sessão e define a mensagem', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(responseFor(400, { detail: 'Não é possível encerrar a sessão atual' })),
    )

    const store = useSessionsStore()
    store.sessions = [...SESSIONS]
    const ok = await store.terminate('sessao-2')

    expect(ok).toBe(false)
    expect(store.error).toBe('Não é possível encerrar a sessão atual')
    expect(store.sessions).toHaveLength(2)
  })
})
