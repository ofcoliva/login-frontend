<script setup lang="ts">
import { computed, ref } from 'vue'
import ChangeEmailForm from '@/components/auth/ChangeEmailForm.vue'
import ChangePasswordForm from '@/components/auth/ChangePasswordForm.vue'
import ChangeUsernameForm from '@/components/auth/ChangeUsernameForm.vue'
import DeviceSessions from '@/components/auth/DeviceSessions.vue'
import ThemeToggle from '@/components/auth/ThemeToggle.vue'

interface SettingsOption {
  key: string
  label: string
  description: string
}

interface SettingsGroup {
  key: string
  label: string
  description: string
  options: SettingsOption[]
}

const groups: SettingsGroup[] = [
  {
    key: 'appearance',
    label: 'Aparência',
    description: 'Tema claro ou escuro.',
    options: [
      { key: 'theme', label: 'Tema', description: 'Alterne entre os temas claro e escuro.' },
    ],
  },
  {
    key: 'security',
    label: 'Segurança',
    description: 'Gerencie sua senha, email e dispositivos conectados.',
    options: [
      {
        key: 'change-password',
        label: 'Alterar senha',
        description: 'Defina uma nova senha e escolha quais dispositivos permanecem conectados.',
      },
      {
        key: 'change-username',
        label: 'Trocar username',
        description: 'Altere o nome de usuário usado para acessar a conta.',
      },
      {
        key: 'change-email',
        label: 'Trocar email',
        description: 'Altere o email usado para acessar a conta.',
      },
      {
        key: 'manage-devices',
        label: 'Gerenciar dispositivos',
        description: 'Revise os dispositivos ativos e encerre os que não reconhece.',
      },
    ],
  },
  {
    key: 'notifications',
    label: 'Notificações',
    description: 'Preferências de email e alertas.',
    options: [
      {
        key: 'preferences',
        label: 'Preferências',
        description: 'Configuração de alertas por email.',
      },
    ],
  },
]

const activeGroup = ref<string | null>(null)
const activeOption = ref<string | null>(null)

const currentGroup = computed(() => groups.find((group) => group.key === activeGroup.value) ?? null)
const currentOption = computed(
  () => currentGroup.value?.options.find((option) => option.key === activeOption.value) ?? null,
)

function openGroup(key: string): void {
  activeGroup.value = key
  activeOption.value = null
}

function openOption(key: string): void {
  activeOption.value = key
}

function backToGroups(): void {
  activeGroup.value = null
  activeOption.value = null
}

function backToOptions(): void {
  activeOption.value = null
}
</script>

<template>
  <main class="page">
    <section class="page__header">
      <h1 class="page__title">Configurações</h1>
      <p class="page__subtitle">Preferências e segurança da sua conta.</p>
    </section>

    <div class="settings">
      <section class="card settings__card" aria-label="Grupos de configurações">
        <h2 class="card__title">Configurações</h2>
        <ul class="settings-menu">
          <li v-for="group in groups" :key="group.key">
            <button
              type="button"
              class="settings-row"
              :aria-current="activeGroup === group.key ? 'true' : undefined"
              @click="openGroup(group.key)"
            >
              <span class="settings-row__text">
                <span class="settings-row__label">{{ group.label }}</span>
                <span class="settings-row__description">{{ group.description }}</span>
              </span>
              <span class="settings-row__chevron" aria-hidden="true">›</span>
            </button>
          </li>
        </ul>
      </section>

      <Transition name="page" mode="out-in">
        <section v-if="currentGroup" class="settings-panel" aria-label="Opções">
          <button type="button" class="settings-back" @click="backToGroups">
            <span aria-hidden="true">‹</span>
            <span class="settings-back__label">Voltar</span>
          </button>
          <h2 class="settings-panel__title">{{ currentGroup.label }}</h2>
          <ul class="settings-menu">
            <li v-for="option in currentGroup.options" :key="option.key">
              <button
                type="button"
                class="settings-row"
                :aria-current="activeOption === option.key ? 'true' : undefined"
                @click="openOption(option.key)"
              >
                <span class="settings-row__text">
                  <span class="settings-row__label">{{ option.label }}</span>
                  <span class="settings-row__description">{{ option.description }}</span>
                </span>
                <span class="settings-row__chevron" aria-hidden="true">›</span>
              </button>
            </li>
          </ul>
        </section>
      </Transition>

      <Transition name="page" mode="out-in">
        <section v-if="currentOption" class="settings-panel" :aria-label="currentOption.label">
          <button type="button" class="settings-back" @click="backToOptions">
            <span aria-hidden="true">‹</span>
            <span class="settings-back__label">Voltar</span>
          </button>
          <h2 class="settings-panel__title">{{ currentOption.label }}</h2>
          <p class="card__text">{{ currentOption.description }}</p>

          <div v-if="activeOption === 'theme'" class="settings-content">
            <div class="settings-row">
              <div class="settings-row__text">
                <span class="settings-row__label">Tema</span>
                <span class="settings-row__description"
                  >Alterne entre os temas claro e escuro.</span
                >
              </div>
              <ThemeToggle />
            </div>
          </div>

          <div v-else-if="activeOption === 'change-password'" class="settings-content">
            <ChangePasswordForm />
          </div>

          <div v-else-if="activeOption === 'change-username'" class="settings-content">
            <ChangeUsernameForm />
          </div>

          <div v-else-if="activeOption === 'change-email'" class="settings-content">
            <ChangeEmailForm />
          </div>

          <div v-else-if="activeOption === 'manage-devices'" class="settings-content">
            <DeviceSessions />
          </div>

          <div v-else class="settings-content">
            <p class="card__text">Preferências de email e alertas chegarão em breve.</p>
          </div>
        </section>
      </Transition>
    </div>
  </main>
</template>

<style scoped>
.settings {
  position: relative;
}

.settings__card {
  margin-bottom: 0;
}

.settings-menu {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 0.85rem 0.5rem;
  border: none;
  border-radius: 8px;
  background-color: transparent;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.settings-row:hover {
  background-color: var(--color-background-mute);
}

.settings-row[aria-current='true'] {
  background-color: color-mix(in srgb, var(--color-primary) 12%, transparent);
}

.settings-row__text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.settings-row__label {
  font-weight: 600;
  color: var(--color-text);
}

.settings-row__description {
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.settings-row__chevron {
  color: var(--color-text-muted);
  font-size: 1.25rem;
  line-height: 1;
}

.settings-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  min-height: 100%;
  z-index: 2;
  padding: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background-color: var(--color-background);
}

.settings-back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  margin-bottom: 0.75rem;
  border: none;
  border-radius: 8px;
  background-color: transparent;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  cursor: pointer;
  transition:
    color 0.2s,
    background-color 0.2s;
}

.settings-back:hover {
  color: var(--color-text);
  background-color: var(--color-background-mute);
}

.settings-back__label {
  font-weight: 600;
}

.settings-panel__title {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.settings-content {
  margin-top: 1rem;
}
</style>
