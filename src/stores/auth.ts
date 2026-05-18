import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<any>(JSON.parse(localStorage.getItem('user') || 'null'))

  const isAuthenticated = computed(() => !!token.value && user.value !== null)

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  const setUser = (userData: any) => {
    user.value = userData
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const checkAuth = async () => {
    if (!token.value) return false

    try {
      const response = await fetch('http://localhost:8000/api/v1/users/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
        credentials: 'include',
      })

      if (response.ok) {
        user.value = await response.json()
        localStorage.setItem('user', JSON.stringify(user.value))
        return true
      }

      // Se o erro for 401 ou 403, o token é inválido/expirado, então fazemos logout
      if (response.status === 401 || response.status === 403) {
        throw new Error('Token inválido ou expirado')
      }

      // Se for outro erro (ex: 404 porque a rota não existe no seu backend),
      // nós mantemos o login baseado no que está salvo, para não quebrar a tela.
      return true
    } catch (error) {
      console.error('Erro ao validar token:', error)
      // Se falhou a validação do token por não estar autorizado, deslogamos
      logout()
      return false
    }
  }

  return { token, user, isAuthenticated, setToken, setUser, logout, checkAuth }
})
