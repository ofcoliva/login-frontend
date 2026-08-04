<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    modelValue: string
    type?: 'text' | 'email' | 'password'
    autocomplete?: string
    error?: string | null
    hint?: string
  }>(),
  {
    type: 'text',
    autocomplete: 'off',
    error: null,
    hint: '',
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const showPassword = ref(false)

const inputType = computed(() =>
  props.type === 'password' && showPassword.value ? 'text' : props.type,
)

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <label class="text-field" :class="{ 'text-field--error': error }">
    <span class="text-field__label">{{ label }}</span>
    <span class="text-field__control">
      <input
        :type="inputType"
        class="text-field__input"
        :class="{ 'text-field__input--password': type === 'password' }"
        :value="modelValue"
        :autocomplete="autocomplete"
        :aria-invalid="error ? 'true' : undefined"
        @input="onInput"
      />
      <button
        v-if="type === 'password'"
        type="button"
        class="text-field__toggle"
        :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
        @click="showPassword = !showPassword"
      >
        <svg
          v-if="showPassword"
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" x2="22" y1="2" y2="22" />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </span>
    <span v-if="error" class="text-field__error" role="alert">{{ error }}</span>
    <span v-else-if="hint" class="text-field__hint">{{ hint }}</span>
  </label>
</template>

<style scoped>
.text-field {
  display: block;
}

.text-field__label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.text-field__control {
  position: relative;
  display: block;
}

.text-field__input {
  width: 100%;
  padding: 0.6rem 0.85rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background-mute);
  color: var(--color-text);
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    background-color 0.3s;
}

.text-field__input::placeholder {
  color: var(--color-text-muted);
}

.text-field__input--password {
  padding-right: 2.5rem;
}

.text-field__input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent);
}

.text-field--error .text-field__input {
  border-color: var(--color-danger);
}

.text-field--error .text-field__input:focus {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-danger) 25%, transparent);
}

.text-field__toggle {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.2s;
}

.text-field__toggle:hover {
  color: var(--color-text);
}

.text-field__error {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: var(--color-danger);
}

.text-field__hint {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
</style>
