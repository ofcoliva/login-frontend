<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import AuthCard from '@/components/auth/AuthCard.vue'
import BaseButton from '@/components/auth/BaseButton.vue'
import EmailRequirements from '@/components/auth/EmailRequirements.vue'
import FormAlert from '@/components/auth/FormAlert.vue'
import PasswordRequirements from '@/components/auth/PasswordRequirements.vue'
import TextField from '@/components/auth/TextField.vue'
import { useAuthStore } from '@/stores/auth'
import { isEmailValid } from '@/utils/emailPolicy'
import { isPasswordValid } from '@/utils/passwordPolicy'

const router = useRouter()
const store = useAuthStore()
const { error, registerLoading } = storeToRefs(store)

const form = reactive({
  username: '',
  email: '',
  confirmEmail: '',
  password: '',
  confirmPassword: '',
})

const fieldErrors = reactive({
  username: '',
  email: '',
  confirmEmail: '',
  password: '',
  confirmPassword: '',
})

const success = ref(false)

const passwordValid = computed(() => isPasswordValid(form.password))

onMounted(() => {
  store.clearError()
})

function validate(): boolean {
  fieldErrors.username = form.username.trim() ? '' : 'Informe um nome de usuário'
  fieldErrors.email = isEmailValid(form.email) ? '' : 'Informe um email válido'
  fieldErrors.confirmEmail =
    form.confirmEmail && form.confirmEmail === form.email ? '' : 'Os emails não coincidem'
  fieldErrors.password = form.password
    ? passwordValid.value
      ? ''
      : 'A senha não atende aos requisitos'
    : 'Informe uma senha'
  fieldErrors.confirmPassword = form.confirmPassword
    ? form.confirmPassword === form.password
      ? ''
      : 'As senhas não coincidem'
    : 'Confirme a senha'

  return Object.values(fieldErrors).every((value) => !value)
}

async function onSubmit() {
  if (!validate()) return
  const ok = await store.register({
    username: form.username.trim(),
    email: form.email.trim(),
    password: form.password,
  })
  if (ok) success.value = true
}
</script>

<template>
  <main class="auth-page">
    <AuthCard
      v-if="!success"
      title="Criar conta"
      subtitle="Registre-se para começar"
    >
      <form class="auth-form" novalidate @submit.prevent="onSubmit">
        <TextField
          v-model="form.username"
          label="Usuário"
          :error="fieldErrors.username"
          autocomplete="username"
        />
        <TextField
          v-model="form.email"
          label="Email"
          type="email"
          :error="fieldErrors.email"
          autocomplete="email"
        />
        <EmailRequirements v-if="form.email" :value="form.email" />
        <TextField
          v-model="form.confirmEmail"
          label="Confirme o email"
          type="email"
          :error="fieldErrors.confirmEmail"
          autocomplete="email"
        />
        <TextField
          v-model="form.password"
          label="Senha"
          type="password"
          :error="fieldErrors.password"
          autocomplete="new-password"
        />
        <PasswordRequirements v-if="form.password" :value="form.password" />
        <TextField
          v-model="form.confirmPassword"
          label="Confirme a senha"
          type="password"
          :error="fieldErrors.confirmPassword"
          autocomplete="new-password"
        />
        <FormAlert :message="error" />
        <BaseButton :loading="registerLoading" block>Cadastrar</BaseButton>
      </form>
      <p class="auth-form__footer">
        Já tem uma conta?
        <RouterLink to="/login" class="auth-form__link">Entrar</RouterLink>
      </p>
    </AuthCard>

    <section v-else class="auth-success">
      <div class="auth-success__icon" aria-hidden="true">✓</div>
      <h1 class="auth-success__title">Verifique seu email</h1>
      <p class="auth-success__text">
        Enviamos um link de confirmação para
        <strong>{{ form.email }}</strong
        >. Abra o email e clique no link para ativar sua conta.
      </p>
      <BaseButton variant="secondary" @click="router.push('/login')">
        Voltar para o login
      </BaseButton>
    </section>
  </main>
</template>
