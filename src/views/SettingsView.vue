<script setup lang="ts">
import ThemeToggle from '@/components/auth/ThemeToggle.vue'
</script>

<template>
  <main class="page">
    <section class="page__header">
      <h1 class="page__title">Configurações</h1>
      <p class="page__subtitle">Preferências da sua conta.</p>
    </section>

    <section class="card">
      <h2 class="card__title">Aparência</h2>
      <div class="settings-row">
        <div class="settings-row__text">
          <p class="settings-row__label">Tema</p>
          <p class="card__text">Alterne entre os temas claro e escuro.</p>
        </div>
        <ThemeToggle />
      </div>
    </section>

    <section class="card">
      <h2 class="card__title">Notificações</h2>
      <p class="card__text">Preferências de email e alertas chegarão em breve.</p>
    </section>
  </main>
</template>

<style scoped>
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.settings-row__label {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.settings-row__text .card__text {
  margin-bottom: 0;
}
</style>
