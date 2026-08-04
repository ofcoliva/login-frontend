<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import AuthCard from '@/components/auth/AuthCard.vue'
import BaseButton from '@/components/auth/BaseButton.vue'
import TextField from '@/components/auth/TextField.vue'
import { useAuthStore } from '@/stores/auth'
import { isValidEmail } from '@/utils/validators'

const router = useRouter()
const store = useAuthStore()
const { error, forgotPasswordLoading } = storeToRefs(store)

const email = ref('')
const emailError = ref('')
const sent = ref(false)

onMounted(() => {
  store.clearError()
})

async function onSubmit() {
  emailError.value = isValidEmail(email.value) ? '' : 'Informe um email válido'
  if (emailError.value) return
  const ok = await store.forgotPassword({ email: email.value.trim() })
  if (ok) sent.value = true
}
</script>

<template>
  <main class="auth-page">
    <AuthCard
      v-if="!sent"
      title="Recuperar senha"
      subtitle="Informe seu email para receber o link de redefinição"
      :error="error"
    >
      <form class="auth-form" novalidate @submit.prevent="onSubmit">
        <TextField
          v-model="email"
          label="Email"
          type="email"
          :error="emailError"
          autocomplete="email"
        />
        <BaseButton :loading="forgotPasswordLoading" block> Enviar link </BaseButton>
      </form>
      <p class="auth-form__footer">
        Lembrou da senha?
        <RouterLink to="/login" class="auth-form__link">Voltar ao login</RouterLink>
      </p>
    </AuthCard>

    <section v-else class="auth-success">
      <div class="auth-success__icon" aria-hidden="true">✓</div>
      <h1 class="auth-success__title">Email enviado</h1>
      <p class="auth-success__text">
        Se houver uma conta associada a <strong>{{ email }}</strong
        >, você receberá um link para redefinir sua senha.
      </p>
      <BaseButton variant="secondary" @click="router.push('/login')">
        Voltar para o login
      </BaseButton>
    </section>
  </main>
</template>
