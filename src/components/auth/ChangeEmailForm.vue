<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import BaseButton from './BaseButton.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import EmailRequirements from './EmailRequirements.vue'
import TextField from './TextField.vue'
import { useAuthStore } from '@/stores/auth'
import { isEmailValid } from '@/utils/emailPolicy'

const store = useAuthStore()
const { changeEmailLoading } = storeToRefs(store)

const form = reactive({ newEmail: '' })
const fieldError = ref('')
const success = ref(false)

const dialogOpen = ref(false)
const dialogPassword = ref('')
const dialogPasswordError = ref('')
const dialogError = ref<string | null>(null)

const currentEmail = computed(() => store.user?.email ?? '')

onMounted(() => {
  store.clearError()
})

function validate(): boolean {
  fieldError.value = ''
  if (!isEmailValid(form.newEmail)) {
    fieldError.value = 'Informe um email válido'
  } else if (form.newEmail.trim().toLowerCase() === currentEmail.value.trim().toLowerCase()) {
    fieldError.value = 'O novo email deve ser diferente do atual'
  }
  return !fieldError.value
}

function openDialog() {
  success.value = false
  dialogError.value = null
  dialogPassword.value = ''
  dialogPasswordError.value = ''
  if (!validate()) return
  dialogOpen.value = true
}

async function confirmDialog() {
  if (!dialogPassword.value) {
    dialogPasswordError.value = 'Informe sua senha para confirmar'
    return
  }
  dialogPasswordError.value = ''
  dialogError.value = null

  const ok = await store.changeEmail({
    new_email: form.newEmail.trim(),
    password: dialogPassword.value,
  })

  if (ok) {
    dialogOpen.value = false
    form.newEmail = ''
    success.value = true
  } else {
    dialogError.value = store.error
  }
}
</script>

<template>
  <form class="settings-form" novalidate @submit.prevent="openDialog">
    <div v-if="success" class="settings-alert settings-alert--success" role="status">
      Email da conta alterado para <strong>{{ store.user?.email }}</strong>.
    </div>

    <TextField
      v-model="form.newEmail"
      label="Novo email"
      type="email"
      autocomplete="email"
      :error="fieldError"
      :hint="`Email atual: ${currentEmail}`"
    />
    <EmailRequirements v-if="form.newEmail" :value="form.newEmail" />
    <BaseButton :loading="changeEmailLoading">Trocar email</BaseButton>

    <ConfirmDialog
      :open="dialogOpen"
      title="Trocar email da conta"
      confirm-text="Confirmar troca"
      cancel-text="Cancelar"
      :loading="changeEmailLoading"
      danger
      @confirm="confirmDialog"
      @cancel="dialogOpen = false"
    >
      <p class="confirm-dialog__message">
        Tem certeza que deseja trocar o email da conta para
        <strong>{{ form.newEmail }}</strong>?
      </p>
      <TextField
        v-model="dialogPassword"
        label="Confirme com sua senha"
        type="password"
        autocomplete="current-password"
        :error="dialogPasswordError"
      />
      <div v-if="dialogError" class="settings-alert settings-alert--error" role="alert">
        {{ dialogError }}
      </div>
    </ConfirmDialog>
  </form>
</template>

<style scoped>
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-alert {
  padding: 0.6rem 0.85rem;
  border-radius: 8px;
  font-size: 0.85rem;
  animation: fade-in 0.25s ease;
}

.settings-alert--success {
  border: 1px solid color-mix(in srgb, var(--color-success) 40%, transparent);
  background-color: color-mix(in srgb, var(--color-success) 12%, transparent);
  color: var(--color-success);
}

.settings-alert--error {
  border: 1px solid color-mix(in srgb, var(--color-danger) 40%, transparent);
  background-color: color-mix(in srgb, var(--color-danger) 12%, transparent);
  color: var(--color-danger);
}

.confirm-dialog__message {
  margin-bottom: 1rem;
  color: var(--color-text);
  line-height: 1.5;
}
</style>
