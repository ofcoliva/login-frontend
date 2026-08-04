<script setup lang="ts">
import { computed } from 'vue'
import { defaultPasswordPolicy, passwordChecksList } from '@/utils/passwordPolicy'

const props = defineProps<{ value: string }>()

const checks = computed(() => passwordChecksList(props.value, defaultPasswordPolicy))
const allValid = computed(() => checks.value.every((check) => check.valid))
const metCount = computed(() => checks.value.filter((check) => check.valid).length)
</script>

<template>
  <div class="password-requirements" :class="{ 'password-requirements--valid': allValid }">
    <p class="password-requirements__title">A senha precisa de:</p>
    <ul class="password-requirements__list">
      <li
        v-for="check in checks"
        :key="check.id"
        class="password-requirements__item"
        :class="{ 'password-requirements__item--met': check.valid }"
      >
        <span class="password-requirements__mark" aria-hidden="true">
          {{ check.valid ? '✓' : '·' }}
        </span>
        {{ check.label }}
      </li>
    </ul>
    <p class="password-requirements__progress" :aria-live="allValid ? 'polite' : undefined">
      {{ metCount }}/{{ checks.length }} requisitos atendidos
    </p>
  </div>
</template>

<style scoped>
.password-requirements {
  padding: 0.75rem 0.85rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background-mute);
  transition:
    border-color 0.2s,
    background-color 0.3s;
}

.password-requirements--valid {
  border-color: color-mix(in srgb, var(--color-success) 50%, transparent);
}

.password-requirements__title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.password-requirements__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.password-requirements__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: var(--color-text-muted);
  transition: color 0.2s;
}

.password-requirements__item--met {
  color: var(--color-text);
}

.password-requirements__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1rem;
  color: var(--color-text-muted);
  font-weight: 700;
  transition: color 0.2s;
}

.password-requirements__item--met .password-requirements__mark {
  color: var(--color-success);
}

.password-requirements__progress {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>
