export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'

export const AUTH_SESSION_KEY = 'auth_session'
export const AUTH_USER_KEY = 'auth_user'
export const AUTH_EXPIRES_AT_KEY = 'auth_expires_at'
