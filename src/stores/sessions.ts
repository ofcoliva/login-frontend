import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/services/authApi'
import { HttpError } from '@/services/http'
import type { SessionInfo } from '@/types/auth'

export const useSessionsStore = defineStore('sessions', () => {
  const sessions = ref<SessionInfo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const terminatingId = ref<string | null>(null)

  function setError(err: unknown): void {
    if (err instanceof HttpError) {
      error.value = err.message
    } else if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'Ocorreu um erro inesperado'
    }
  }

  function clearError(): void {
    error.value = null
  }

  async function list(): Promise<boolean> {
    if (loading.value) return false
    loading.value = true
    error.value = null
    try {
      const response = await authApi.listSessions()
      sessions.value = response
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      loading.value = false
    }
  }

  async function terminate(id: string): Promise<boolean> {
    if (terminatingId.value !== null) return false
    terminatingId.value = id
    error.value = null
    try {
      await authApi.terminateSession(id)
      sessions.value = sessions.value.filter((session) => session.id !== id)
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      terminatingId.value = null
    }
  }

  return {
    sessions,
    loading,
    error,
    terminatingId,
    list,
    terminate,
    clearError,
  }
})
