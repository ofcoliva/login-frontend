<script setup lang="ts">
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <main class="dashboard-container">
    <div class="dashboard-header">
      <h1>Dashboard Privada</h1>
    </div>

    <div class="dashboard-content">
      <div class="card welcome-card">
        <h2>Olá, {{ authStore.user?.username || 'Usuário' }}!</h2>
        <p>Bem-vindo à sua área restrita autenticada.</p>
      </div>

      <div class="card preferences-card">
        <h3>Suas Preferências</h3>
        <ul v-if="authStore.user?.preferences">
          <li v-for="(value, key) in authStore.user.preferences" :key="key">
            <strong>{{ key }}:</strong> {{ value }}
          </li>
        </ul>
        <p v-else>Nenhuma preferência configurada no momento.</p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.dashboard-container {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

h1 {
  font-size: 2rem;
  color: var(--color-heading);
}

.dashboard-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .dashboard-content {
    grid-template-columns: 1fr 1fr;
  }
}

.card {
  background: var(--color-background-soft);
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

h2,
h3 {
  color: var(--color-heading);
  margin-bottom: 1rem;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

li:last-child {
  border-bottom: none;
}
</style>
