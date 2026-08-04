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

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
  /** IDs de sessões a MANTER; ausente = manter todas. Sessões fora da lista são encerradas. */
  keep_session_ids?: string[]
}

export interface ChangeEmailPayload {
  new_email: string
  password: string
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

export interface SessionInfo {
  id: string
  device: string
  ip: string
  last_seen: string
  current: boolean
}

export type SessionsResponse = SessionInfo[]

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
