<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import BaseButton from './BaseButton.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import TextField from './TextField.vue'
import { useAuthStore } from '@/stores/auth'
import { isUsernameValid } from '@/utils/usernamePolicy'

const store = useAuthStore()
const { changeUsernameLoading } = storeToRefs(store)

const form = reactive({ newUsername: '' })
const fieldError = ref('')
const success = ref(false)

const dialogOpen = ref(false)
const dialogPassword = ref('')
const dialogPasswordError = ref('')

const currentUsername = computed(() => store.user?.username ?? '')

onMounted(() => {
  store.clearError()
})

function validate(): boolean {
  fieldError.value = ''
  if (!form.newUsername) {
    fieldError.value = 'Informe um nome de usuário'
  } else if (!isUsernameValid(form.newUsername)) {
    fieldError.value =
      'Username inválido. Use apenas letras, números e underscore (a-z, A-Z, 0-9, _).'
  } else if (form.newUsername === currentUsername.value) {
    fieldError.value = 'O novo username deve ser diferente do atual.'
  }
  return !fieldError.value
}

function openDialog() {
  success.value = false
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

  const ok = await store.changeUsername({
    new_username: form.newUsername,
    password: dialogPassword.value,
  })

  if (ok) {
    dialogOpen.value = false
    form.newUsername = ''
    success.value = true
  } else {
    dialogOpen.value = false
    fieldError.value = store.error ?? 'Ocorreu um erro inesperado'
  }
}
</script>

<template>
  <form class="settings-form" novalidate @submit.prevent="openDialog">
    <div v-if="success" class="settings-alert settings-alert--success" role="status">
      Username da conta alterado para <strong>{{ store.user?.username }}</strong
      >.
    </div>

    <TextField
      v-model="form.newUsername"
      label="Novo username"
      autocomplete="username"
      :error="fieldError"
      :hint="`Username atual: ${currentUsername}`"
    />
    <BaseButton :loading="changeUsernameLoading">Trocar username</BaseButton>

    <ConfirmDialog
      :open="dialogOpen"
      title="Trocar username da conta"
      confirm-text="Confirmar troca"
      cancel-text="Cancelar"
      :loading="changeUsernameLoading"
      danger
      @confirm="confirmDialog"
      @cancel="dialogOpen = false"
    >
      <p class="confirm-dialog__message">
        Tem certeza que deseja trocar o username da conta para
        <strong>{{ form.newUsername }}</strong
        >?
      </p>
      <TextField
        v-model="dialogPassword"
        label="Confirme com sua senha"
        type="password"
        autocomplete="current-password"
        :error="dialogPasswordError"
      />
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

.confirm-dialog__message {
  margin-bottom: 1rem;
  color: var(--color-text);
  line-height: 1.5;
}
</style>
