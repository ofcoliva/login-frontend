<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import BaseButton from './BaseButton.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    confirmText?: string
    cancelText?: string
    loading?: boolean
    danger?: boolean
  }>(),
  {
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    loading: false,
    danger: false,
  },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const panel = ref<HTMLElement | null>(null)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('cancel')
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      document.addEventListener('keydown', onKeydown)
      await nextTick()
      panel.value?.focus()
    } else {
      document.removeEventListener('keydown', onKeydown)
    }
  },
)

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div v-if="open" class="confirm-overlay" @click.self="emit('cancel')">
        <div
          ref="panel"
          class="confirm"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
        >
          <h2 class="confirm__title">{{ title }}</h2>
          <div class="confirm__content">
            <slot />
          </div>
          <div class="confirm__actions">
            <BaseButton type="button" variant="ghost" :disabled="loading" @click="emit('cancel')">
              {{ cancelText }}
            </BaseButton>
            <BaseButton
              type="button"
              :variant="danger ? 'danger' : 'primary'"
              :loading="loading"
              @click="emit('confirm')"
            >
              {{ confirmText }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: rgb(0 0 0 / 0.45);
  backdrop-filter: blur(2px);
}

.confirm {
  width: 100%;
  max-width: 26rem;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background-color: var(--color-background-soft);
  box-shadow: 0 20px 60px rgb(0 0 0 / 0.25);
  outline: none;
  transition:
    background-color 0.3s,
    border-color 0.3s;
}

.confirm__title {
  font-size: 1.2rem;
  margin-bottom: 0.75rem;
}

.confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-enter-active .confirm,
.confirm-leave-active .confirm {
  transition: transform 0.2s ease;
}

.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}

.confirm-enter-from .confirm,
.confirm-leave-to .confirm {
  transform: translateY(8px) scale(0.98);
}
</style>
