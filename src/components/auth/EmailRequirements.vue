<script setup lang="ts">
import { computed } from 'vue'
import { emailChecksList } from '@/utils/emailPolicy'

const props = defineProps<{ value: string }>()

const checks = computed(() => emailChecksList(props.value))
const allValid = computed(() => checks.value.every((check) => check.valid))
const metCount = computed(() => checks.value.filter((check) => check.valid).length)
</script>

<template>
  <div class="email-requirements" :class="{ 'email-requirements--valid': allValid }">
    <p class="email-requirements__title">O email precisa de:</p>
    <ul class="email-requirements__list">
      <li
        v-for="check in checks"
        :key="check.id"
        class="email-requirements__item"
        :class="{ 'email-requirements__item--met': check.valid }"
      >
        <span class="email-requirements__mark" aria-hidden="true">
          {{ check.valid ? '✓' : '·' }}
        </span>
        {{ check.label }}
      </li>
    </ul>
    <p class="email-requirements__progress" :aria-live="allValid ? 'polite' : undefined">
      {{ metCount }}/{{ checks.length }} requisitos atendidos
    </p>
  </div>
</template>

<style scoped>
.email-requirements {
  padding: 0.75rem 0.85rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background-mute);
  transition:
    border-color 0.2s,
    background-color 0.3s;
}

.email-requirements--valid {
  border-color: color-mix(in srgb, var(--color-success) 50%, transparent);
}

.email-requirements__title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.email-requirements__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.email-requirements__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: var(--color-text-muted);
  transition: color 0.2s;
}

.email-requirements__item--met {
  color: var(--color-text);
}

.email-requirements__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1rem;
  color: var(--color-text-muted);
  font-weight: 700;
  transition: color 0.2s;
}

.email-requirements__item--met .email-requirements__mark {
  color: var(--color-success);
}

.email-requirements__progress {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>
