<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
import TheWelcome from '../components/TheWelcome.vue'

const authStore = useAuthStore()
</script>

<template>
  <main class="home-container">
    <div v-if="authStore.isAuthenticated" class="auth-welcome">
      <h1>Você está logado!</h1>
      <p>Sua sessão está ativa e o token é válido.</p>
    </div>
    <div v-else>
      <TheWelcome />
    </div>
  </main>
</template>

<style scoped>
.home-container {
  padding: 2rem;
}

.auth-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin-top: 3rem;
  padding: 2rem;
  background: var(--color-background-soft);
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.auth-welcome h1 {
  color: var(--color-heading);
  margin-bottom: 1rem;
}

.auth-welcome p {
  margin-bottom: 2rem;
}

.btn-dashboard {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background-color: hsla(160, 100%, 37%, 1);
  color: var(--color-background);
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
  transition: all 0.2s ease;
}

.btn-dashboard:hover {
  background-color: hsla(160, 100%, 37%, 0.8);
  transform: translateY(-2px);
}
</style>
