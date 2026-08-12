import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { AUTH_EXPIRES_AT_KEY, AUTH_SESSION_KEY, AUTH_USER_KEY } from '@/config/api'
import * as authApi from '@/services/authApi'
import { HttpError } from '@/services/http'
import type {
  ChangeEmailPayload,
  ChangePasswordPayload,
  ChangeUsernamePayload,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
} from '@/types/auth'
import type { UserInfo } from '@/types/auth'

const MAX_TIMEOUT_MS = 2_147_000_000

export const useAuthStore = defineStore('auth', () => {
  const sessionActive = ref<boolean>(readStoredSession())
  const user = ref<UserInfo | null>(readStoredUser())
  const expiresAt = ref<number | null>(readStoredExpiresAt())
  const sessionChecking = ref(false)
  const error = ref<string | null>(null)
  const loginLoading = ref(false)
  const registerLoading = ref(false)
  const forgotPasswordLoading = ref(false)
  const logoutLoading = ref(false)
  const changePasswordLoading = ref(false)
  const changeEmailLoading = ref(false)
  const changeUsernameLoading = ref(false)

  let expiryTimer: ReturnType<typeof setTimeout> | null = null

  const isAuthenticated = computed(() => sessionActive.value)

  function readStoredSession(): boolean {
    try {
      return localStorage.getItem(AUTH_SESSION_KEY) === '1'
    } catch {
      return false
    }
  }

  function readStoredUser(): UserInfo | null {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as UserInfo
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
      return null
    }
  }

  function readStoredExpiresAt(): number | null {
    try {
      return parseExpiresAt(localStorage.getItem(AUTH_EXPIRES_AT_KEY))
    } catch {
      return null
    }
  }

  function parseExpiresAt(value: string | null | undefined): number | null {
    if (!value) return null
    const ms = Date.parse(value)
    return Number.isFinite(ms) ? ms : null
  }

  function persistSession(): void {
    try {
      localStorage.setItem(AUTH_SESSION_KEY, '1')
    } catch {
      // storage indisponível — segue apenas em memória
    }
  }

  function persistUser(value: UserInfo | null): void {
    try {
      if (value) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(value))
      } else {
        localStorage.removeItem(AUTH_USER_KEY)
      }
    } catch {
      // ignore
    }
  }

  function persistExpiresAt(value: number | null): void {
    try {
      if (value === null) {
        localStorage.removeItem(AUTH_EXPIRES_AT_KEY)
      } else {
        localStorage.setItem(AUTH_EXPIRES_AT_KEY, new Date(value).toISOString())
      }
    } catch {
      // ignore
    }
  }

  function clearExpiryTimer(): void {
    if (expiryTimer !== null) {
      clearTimeout(expiryTimer)
      expiryTimer = null
    }
  }

  function scheduleSessionExpiry(): void {
    clearExpiryTimer()
    if (expiresAt.value === null) return
    const remaining = expiresAt.value - Date.now()
    if (remaining <= 0) {
      clearSession()
      return
    }
    expiryTimer = setTimeout(
      () => {
        expiryTimer = null
        scheduleSessionExpiry()
      },
      Math.min(remaining, MAX_TIMEOUT_MS),
    )
  }

  function sessionExpired(): boolean {
    return expiresAt.value !== null && Date.now() >= expiresAt.value
  }

  function clearSession(): void {
    clearExpiryTimer()
    sessionActive.value = false
    user.value = null
    expiresAt.value = null
    try {
      localStorage.removeItem(AUTH_SESSION_KEY)
      localStorage.removeItem(AUTH_USER_KEY)
      localStorage.removeItem(AUTH_EXPIRES_AT_KEY)
    } catch {
      // ignore
    }
  }

  function clearError(): void {
    error.value = null
  }

  function setError(err: unknown): void {
    if (err instanceof HttpError) {
      error.value = err.message
    } else if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'Ocorreu um erro inesperado'
    }
  }

  async function login(payload: LoginPayload): Promise<boolean> {
    if (loginLoading.value) return false
    loginLoading.value = true
    error.value = null
    try {
      const response = await authApi.login(payload)
      sessionActive.value = true
      persistSession()
      user.value = response.user ?? null
      persistUser(user.value)
      expiresAt.value = parseExpiresAt(response.expires_at)
      persistExpiresAt(expiresAt.value)
      scheduleSessionExpiry()
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      loginLoading.value = false
    }
  }

  async function register(payload: RegisterPayload): Promise<boolean> {
    if (registerLoading.value) return false
    registerLoading.value = true
    error.value = null
    try {
      await authApi.register(payload)
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      registerLoading.value = false
    }
  }

  async function forgotPassword(payload: ForgotPasswordPayload): Promise<boolean> {
    if (forgotPasswordLoading.value) return false
    forgotPasswordLoading.value = true
    error.value = null
    try {
      await authApi.forgotPassword(payload)
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      forgotPasswordLoading.value = false
    }
  }

  async function changePassword(payload: ChangePasswordPayload): Promise<boolean> {
    if (changePasswordLoading.value) return false
    changePasswordLoading.value = true
    error.value = null
    try {
      await authApi.changePassword(payload)
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      changePasswordLoading.value = false
    }
  }

  async function changeEmail(payload: ChangeEmailPayload): Promise<boolean> {
    if (changeEmailLoading.value) return false
    changeEmailLoading.value = true
    error.value = null
    try {
      const response = await authApi.changeEmail(payload)
      user.value = { ...user.value, ...(response.user ?? { email: payload.new_email }) }
      persistUser(user.value)
      if (response.expires_at !== undefined) {
        expiresAt.value = parseExpiresAt(response.expires_at)
        persistExpiresAt(expiresAt.value)
        scheduleSessionExpiry()
      }
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      changeEmailLoading.value = false
    }
  }

  async function changeUsername(payload: ChangeUsernamePayload): Promise<boolean> {
    if (changeUsernameLoading.value) return false
    changeUsernameLoading.value = true
    error.value = null
    try {
      const response = await authApi.changeUsername(payload)
      user.value = { ...user.value, ...(response.user ?? { username: payload.new_username }) }
      persistUser(user.value)
      if (response.expires_at !== undefined) {
        expiresAt.value = parseExpiresAt(response.expires_at)
        persistExpiresAt(expiresAt.value)
        scheduleSessionExpiry()
      }
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      changeUsernameLoading.value = false
    }
  }

  async function validateSession(): Promise<boolean> {
    if (!sessionActive.value) return false
    if (sessionExpired()) {
      clearSession()
      return false
    }
    sessionChecking.value = true
    try {
      const response = await authApi.me()
      user.value = response.user ?? null
      persistUser(user.value)
      if (response.expires_at !== undefined) {
        expiresAt.value = parseExpiresAt(response.expires_at)
        persistExpiresAt(expiresAt.value)
        scheduleSessionExpiry()
      }
      return true
    } catch {
      clearSession()
      return false
    } finally {
      sessionChecking.value = false
    }
  }

  async function logout(): Promise<void> {
    if (logoutLoading.value) return
    logoutLoading.value = true
    try {
      await authApi.logout()
    } catch {
      // sessão local é limpa mesmo se a API falhar
    } finally {
      clearSession()
      error.value = null
      logoutLoading.value = false
    }
  }

  return {
    user,
    isAuthenticated,
    expiresAt,
    sessionChecking,
    error,
    loginLoading,
    registerLoading,
    forgotPasswordLoading,
    logoutLoading,
    changePasswordLoading,
    changeEmailLoading,
    changeUsernameLoading,
    login,
    register,
    forgotPassword,
    changePassword,
    changeEmail,
    changeUsername,
    validateSession,
    sessionExpired,
    logout,
    clearSession,
    clearError,
  }
})
