<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import AuthCard from '@/components/auth/AuthCard.vue'
import BaseButton from '@/components/auth/BaseButton.vue'
import TextField from '@/components/auth/TextField.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const store = useAuthStore()
const { error, loginLoading } = storeToRefs(store)

const form = reactive({ username: '', password: '' })
const fieldErrors = reactive({ username: '', password: '' })

onMounted(() => {
  store.clearError()
})

function validate(): boolean {
  fieldErrors.username = form.username.trim() ? '' : 'Informe seu usuário'
  fieldErrors.password = form.password ? '' : 'Informe sua senha'
  return !fieldErrors.username && !fieldErrors.password
}

async function onSubmit() {
  if (!validate()) return
  const ok = await store.login({
    username: form.username.trim(),
    password: form.password,
  })
  if (ok) await router.push('/')
}
</script>

<template>
  <main class="auth-page">
    <AuthCard title="Entrar" subtitle="Acesse sua conta para continuar" :error="error">
      <form class="auth-form" novalidate @submit.prevent="onSubmit">
        <TextField
          v-model="form.username"
          label="Usuário"
          :error="fieldErrors.username"
          autocomplete="username"
        />
        <TextField
          v-model="form.password"
          label="Senha"
          type="password"
          :error="fieldErrors.password"
          autocomplete="current-password"
        />
        <div class="auth-form__row">
          <RouterLink to="/forgot-password" class="auth-form__link"> Esqueceu a senha? </RouterLink>
        </div>
        <BaseButton :loading="loginLoading" block>Entrar</BaseButton>
      </form>
      <p class="auth-form__footer">
        Não tem uma conta?
        <RouterLink to="/register" class="auth-form__link">Cadastre-se</RouterLink>
      </p>
    </AuthCard>
  </main>
</template>
