<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <section class="auth-card">
    <header class="auth-card__header">
      <h1 class="auth-card__title">{{ title }}</h1>
      <p v-if="subtitle" class="auth-card__subtitle">{{ subtitle }}</p>
    </header>

    <slot />
  </section>
</template>

<style scoped>
.auth-card {
  width: 100%;
  max-width: 26rem;
  padding: 2.25rem;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background-color: var(--color-background-soft);
  box-shadow: 0 20px 60px rgb(0 0 0 / 0.08);
  animation: card-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  transition:
    background-color 0.3s,
    border-color 0.3s;
}

.auth-card__header {
  margin-bottom: 1.5rem;
}

.auth-card__title {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.auth-card__subtitle {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
</style>
