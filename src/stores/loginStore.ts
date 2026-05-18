import { ref, reactive } from 'vue'
import { useAuthStore } from './auth'
import router from '../router'

const isLogin = ref(true)
const isLoading = ref(false)
const errorMessage = ref('')

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreeTerms: false,
})

const toggleAuth = () => {
  isLogin.value = !isLogin.value
  errorMessage.value = ''
}

const handleSubmit = async () => {
  // Validações
  if (!isLogin.value) {
    // Validar confirmação de senha
    if (form.password !== form.confirmPassword) {
      console.error('Erro: As senhas não conferem')
      // adicionar acionador do campo de erro
      errorMessage.value = 'As senhas não conferem'
      return
    }

    // Validar concordância com termos
    if (!form.agreeTerms) {
      console.error('Erro: Você deve concordar com os termos')
      return
    }
  }

  errorMessage.value = ''
  isLoading.value = true

  try {
    const endpoint = isLogin.value ? '/login' : '/register'
    const url = `http://localhost:8000/api/v1${endpoint}`

    const payload = isLogin.value
      ? { username: form.username, password: form.password }
      : { username: form.username, email: form.email, password: form.password }

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    }

    const response = await fetch(url, requestOptions)

    // LÓGICA DE TRATAMENTO DE ERRO DA API
    if (!response.ok) {
      let messageToShow = `Erro ${response.status}`

      try {
        const errorData = await response.json()
        messageToShow = errorData.detail || errorData.message || messageToShow
      } catch {
        messageToShow = `Erro: ${response.statusText}`
      }

      throw new Error(messageToShow)
    }

    const result = await response.json()
    console.log('Sucesso:', result)

    // A requisição retornou 200 OK, então o login teve sucesso.
    // O token pode vir no corpo ou via Cookie HttpOnly (credentials: 'include')
    const tokenStr = result?.access_token || result?.token || result?.auth_token || result?.jwt
    const finalToken =
      typeof tokenStr === 'string'
        ? tokenStr
        : typeof result === 'string'
          ? result
          : 'active-session'

    const authStore = useAuthStore()
    authStore.setToken(finalToken)

    // Opcionalmente definir o usuário se retornado no login
    if (result?.user) {
      authStore.setUser(result.user)
    } else {
      // Se não retornou o usuário no login, definimos um básico
      authStore.setUser({ username: form.username })
    }

    // Redirecionar para home
    router.push('/')

    Object.assign(form, {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false,
    })
  } catch (error) {
    // Aqui a mensagem do "throw new Error" cai no ref 'errorMessage'
    errorMessage.value = error instanceof Error ? error.message : 'Erro desconhecido'
  } finally {
    isLoading.value = false
  }
}

export { isLogin, handleSubmit, form, errorMessage, isLoading, toggleAuth }
