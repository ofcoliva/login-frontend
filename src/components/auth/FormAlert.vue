<script setup lang="ts">
defineProps<{
  message?: string | null
}>()
</script>

<template>
  <div v-if="message" :key="message" class="form-alert" role="alert">
    {{ message }}
  </div>
</template>

<style scoped>
.form-alert {
  padding: 0.6rem 0.85rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--color-danger) 40%, transparent);
  background-color: color-mix(in srgb, var(--color-danger) 12%, transparent);
  color: var(--color-danger);
  font-size: 0.85rem;
  animation:
    fade-in 0.25s ease,
    shake 0.4s ease;
}
</style>
