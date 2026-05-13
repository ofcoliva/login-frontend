<script setup lang="ts">
import { ref, reactive } from 'vue'

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
        // Aqui pegamos o campo 'detail' que você mencionou
        messageToShow = errorData.detail || errorData.message || messageToShow
      } catch {
        // Caso o corpo da resposta não seja um JSON válido
        messageToShow = `Erro: ${response.statusText}`
      }

      throw new Error(messageToShow)
    }

    const result = await response.json()
    console.log('Sucesso:', result)

    // Limpar form após sucesso
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
</script>

<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="logo">
        <img src="https://avatars.githubusercontent.com/u/108588087?v=4" alt="logo" />
        <h2>{{ isLogin ? 'Bem-vindo de volta' : 'Crie sua conta' }}</h2>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <TransitionGroup name="staggered">
          <!-- USUÁRIO -->
          <div class="input-group" key="username">
            <label>Usuário</label>
            <input v-model="form.username" type="text" placeholder="Seu usuário" required />
          </div>

          <!-- EMAIL (Cadastro) -->
          <div v-if="!isLogin" class="input-group" key="email">
            <label>E-mail</label>
            <input v-model="form.email" type="email" placeholder="exemplo@email.com" required />
          </div>

          <!-- SENHA -->
          <div class="input-group" key="password">
            <label>Senha</label>
            <input v-model="form.password" type="password" placeholder="••••••••" required />
          </div>

          <!-- EXTRAS (Cadastro) -->
          <div v-if="!isLogin" class="extra-fields" key="extras">
            <div class="input-group">
              <label>Confirmar Senha</label>
              <input
                v-model="form.confirmPassword"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>

            <div class="checkbox-group">
              <div class="custom-checkbox">
                <input v-model="form.agreeTerms" type="checkbox" id="terms" required />
                <span class="checkmark"></span>
              </div>
              <label for="terms">Eu concordo com os termos</label>
            </div>
          </div>
        </TransitionGroup>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <button type="submit" class="btn-primary" :disabled="isLoading">
          {{ isLoading ? 'Processando...' : isLogin ? 'Entrar' : 'Registrar' }}
        </button>
      </form>

      <p class="toggle-text">
        {{ isLogin ? 'Não tem uma conta?' : 'Já possui conta?' }}
        <span @click="toggleAuth">{{ isLogin ? 'Cadastre-se' : 'Faça Login' }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped src="../assets/login_style.css"></style>
