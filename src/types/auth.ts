export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface LoginResponse {
  user?: UserInfo
  expires_at?: string
}

export interface ApiErrorBody {
  detail?: string
}

export interface UserInfo {
  username?: string
  email?: string
}

export type PasswordCheckId = 'minLength' | 'uppercase' | 'lowercase' | 'digit' | 'special' | 'utf8'

export interface PasswordCheck {
  id: PasswordCheckId
  label: string
  valid: boolean
}

export type EmailCheckId = 'format' | 'noSpaces' | 'local' | 'domain' | 'length'

export interface EmailCheck {
  id: EmailCheckId
  label: string
  valid: boolean
}
