import { request } from './http'
import type {
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponse,
  RegisterPayload,
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
