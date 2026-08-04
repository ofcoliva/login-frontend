<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import BaseButton from './BaseButton.vue'
import PasswordRequirements from './PasswordRequirements.vue'
import TextField from './TextField.vue'
import { useAuthStore } from '@/stores/auth'
import { useSessionsStore } from '@/stores/sessions'
import { isPasswordValid } from '@/utils/passwordPolicy'

const store = useAuthStore()
const sessionsStore = useSessionsStore()
const { changePasswordLoading } = storeToRefs(store)
const { sessions, loading: sessionsLoading } = storeToRefs(sessionsStore)

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const fieldErrors = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const localError = ref<string | null>(null)
const success = ref(false)
const sessionsUnavailable = ref(false)
const keepIds = ref<Set<string>>(new Set())

const newPasswordValid = computed(() => isPasswordValid(form.newPassword))

onMounted(async () => {
  const ok = await sessionsStore.list()
  if (!ok) {
    sessionsUnavailable.value = true
    return
  }
  const current = sessions.value.find((session) => session.current)
  keepIds.value = new Set(current ? [current.id] : sessions.value.map((session) => session.id))
})

function toggleKeep(id: string): void {
  const next = new Set(keepIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  keepIds.value = next
}

function validate(): boolean {
  fieldErrors.currentPassword = form.currentPassword ? '' : 'Informe a senha atual'
  fieldErrors.newPassword = !form.newPassword
    ? 'Informe a nova senha'
    : !newPasswordValid.value
      ? 'A senha não atende aos requisitos'
      : form.newPassword === form.currentPassword
        ? 'A nova senha deve ser diferente da atual'
        : ''
  fieldErrors.confirmPassword = form.confirmPassword
    ? form.confirmPassword === form.newPassword
      ? ''
      : 'As senhas não coincidem'
    : 'Confirme a nova senha'

  return Object.values(fieldErrors).every((value) => !value)
}

function buildKeepIds(): string[] | undefined {
  if (sessionsUnavailable.value || sessions.value.length === 0) return undefined
  const keep = new Set(keepIds.value)
  const current = sessions.value.find((session) => session.current)
  if (current) keep.add(current.id)
  return [...keep]
}

async function onSubmit() {
  localError.value = null
  success.value = false
  if (!validate()) return

  const keepSessionIds = buildKeepIds()
  const ok = await store.changePassword({
    current_password: form.currentPassword,
    new_password: form.newPassword,
    ...(keepSessionIds ? { keep_session_ids: keepSessionIds } : {}),
  })

  if (ok) {
    success.value = true
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
    fieldErrors.currentPassword = ''
    fieldErrors.newPassword = ''
    fieldErrors.confirmPassword = ''
  } else {
    localError.value = store.error
  }
}
</script>

<template>
  <form class="settings-form" novalidate @submit.prevent="onSubmit">
    <div v-if="success" class="settings-alert settings-alert--success" role="status">
      Senha alterada com sucesso.
    </div>
    <div v-if="localError" class="settings-alert settings-alert--error" role="alert">
      {{ localError }}
    </div>

    <TextField
      v-model="form.currentPassword"
      label="Senha atual"
      type="password"
      autocomplete="current-password"
      :error="fieldErrors.currentPassword"
    />
    <TextField
      v-model="form.newPassword"
      label="Nova senha"
      type="password"
      autocomplete="new-password"
      :error="fieldErrors.newPassword"
    />
    <PasswordRequirements v-if="form.newPassword" :value="form.newPassword" />
    <TextField
      v-model="form.confirmPassword"
      label="Confirme a nova senha"
      type="password"
      autocomplete="new-password"
      :error="fieldErrors.confirmPassword"
    />

    <fieldset class="settings-devices" :disabled="sessionsLoading">
      <legend class="settings-devices__legend">Manter conectado em:</legend>
      <p v-if="sessionsUnavailable" class="settings-devices__note">
        Não foi possível carregar os dispositivos. A senha será alterada mantendo todas as
        sessões ativas.
      </p>
      <template v-else-if="sessions.length > 0">
        <label v-for="session in sessions" :key="session.id" class="settings-devices__item">
          <input
            type="checkbox"
            :checked="keepIds.has(session.id)"
            :disabled="session.current"
            @change="toggleKeep(session.id)"
          />
          <span class="settings-devices__label">
            {{ session.device }}
            <span v-if="session.current" class="settings-devices__badge">este dispositivo</span>
          </span>
        </label>
      </template>
      <p v-else class="settings-devices__note">Nenhum dispositivo encontrado.</p>
    </fieldset>

    <BaseButton :loading="changePasswordLoading">Alterar senha</BaseButton>
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

.settings-devices {
  margin: 0;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-background-mute);
}

.settings-devices__legend {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-muted);
  padding-inline: 0.25rem;
}

.settings-devices__item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.25rem;
  cursor: pointer;
}

.settings-devices__item:disabled {
  cursor: not-allowed;
}

.settings-devices__label {
  font-size: 0.9rem;
  color: var(--color-text);
}

.settings-devices__badge {
  display: inline-block;
  margin-left: 0.35rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  background-color: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
}

.settings-devices__note {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
</style>
