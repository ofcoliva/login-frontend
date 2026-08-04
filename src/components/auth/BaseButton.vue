<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'button' | 'submit'
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    loading?: boolean
    disabled?: boolean
    block?: boolean
  }>(),
  {
    type: 'submit',
    variant: 'primary',
    loading: false,
    disabled: false,
    block: false,
  },
)
</script>

<template>
  <button
    :type="type"
    class="base-button"
    :class="[`base-button--${variant}`, { 'base-button--block': block }]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="base-button__spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  border: 1px solid transparent;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    color 0.2s,
    box-shadow 0.2s,
    transform 0.1s,
    opacity 0.2s;
}

.base-button:active:not(:disabled) {
  transform: translateY(1px);
}

.base-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.base-button--primary {
  background-color: var(--color-primary);
  color: #fff;
}

.base-button--primary:hover:not(:disabled) {
  filter: brightness(1.08);
}

.base-button--secondary {
  background-color: var(--color-background-mute);
  color: var(--color-text);
  border-color: var(--color-border);
}

.base-button--secondary:hover:not(:disabled) {
  border-color: var(--color-border-hover);
}

.base-button--ghost {
  background-color: transparent;
  color: var(--color-text-muted);
}

.base-button--ghost:hover:not(:disabled) {
  color: var(--color-text);
  background-color: var(--color-background-mute);
}

.base-button--danger {
  background-color: var(--color-danger);
  color: #fff;
}

.base-button--danger:hover:not(:disabled) {
  filter: brightness(1.08);
}

.base-button--block {
  width: 100%;
}

.base-button__spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
</style>
