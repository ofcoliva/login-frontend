import { API_BASE_URL } from '@/config/api'
import type { ApiErrorBody } from '@/types/auth'

export const UNAUTHORIZED_EVENT = 'auth:unauthorized'

export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

const DEFAULT_TIMEOUT_MS = 15000

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Marca a chamada como dependente de sessão: um 401 aqui significa sessão inválida/expirada. */
  auth?: boolean
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = options

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  const headers: Record<string, string> = {}
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      if (auth && res.status === 401) {
        notifyUnauthorized()
      }
      throw await toHttpError(res)
    }

    return await parseResponse<T>(res)
  } catch (error) {
    if (error instanceof HttpError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new HttpError(0, 'Tempo de conexão esgotado')
    }
    throw new HttpError(0, 'Falha de conexão com o servidor')
  } finally {
    clearTimeout(timeout)
  }
}

function notifyUnauthorized(): void {
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T

  const text = await res.text()
  if (!text) return undefined as T

  try {
    return JSON.parse(text) as T
  } catch {
    return undefined as T
  }
}

async function toHttpError(res: Response): Promise<HttpError> {
  let message = `Erro ${res.status}`
  const text = await res.text().catch(() => '')
  if (text) {
    try {
      const body = JSON.parse(text) as ApiErrorBody
      if (typeof body.detail === 'string' && body.detail) {
        message = body.detail
      }
    } catch {
      // corpo não-JSON: mantém a mensagem padrão
    }
  }
  return new HttpError(res.status, message)
}
