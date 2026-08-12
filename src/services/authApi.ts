import { request } from './http'
import type {
  ChangeEmailPayload,
  ChangePasswordPayload,
  ChangeUsernamePayload,
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  SessionsResponse,
  UserInfo,
} from '@/types/auth'

export interface MeResponse {
  user?: UserInfo
  expires_at?: string
}

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return request<LoginResponse>('/login', { method: 'POST', body: payload })
}

export function register(payload: RegisterPayload): Promise<void> {
  return request<void>('/register', { method: 'POST', body: payload })
}

export function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  return request<void>('/forgot_password', { method: 'POST', body: payload })
}

export function me(): Promise<MeResponse> {
  return request<MeResponse>('/me', { auth: true })
}

export function logout(): Promise<void> {
  return request<void>('/logout', { method: 'POST', auth: true })
}

export function changePassword(payload: ChangePasswordPayload): Promise<void> {
  return request<void>('/change_password', { method: 'PATCH', body: payload, auth: true })
}

export function changeEmail(payload: ChangeEmailPayload): Promise<MeResponse> {
  return request<MeResponse>('/change_email', { method: 'PATCH', body: payload, auth: true })
}

export function changeUsername(payload: ChangeUsernamePayload): Promise<MeResponse> {
  return request<MeResponse>('/change_username', { method: 'PATCH', body: payload, auth: true })
}

export function listSessions(): Promise<SessionsResponse> {
  return request<SessionsResponse>('/sessions', { auth: true })
}

export function terminateSession(id: string): Promise<void> {
  return request<void>(`/sessions/${id}`, { method: 'DELETE', auth: true })
}
