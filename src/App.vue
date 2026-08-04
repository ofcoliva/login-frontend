<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { storeToRefs } from 'pinia'
import ThemeToggle from '@/components/auth/ThemeToggle.vue'
import { useAuthStore } from '@/stores/auth'

const store = useAuthStore()
const { isAuthenticated, sessionChecking } = storeToRefs(store)
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <RouterLink to="/" class="app-header__brand">vue/auth</RouterLink>

      <nav v-if="isAuthenticated" class="app-header__nav">
        <RouterLink to="/" class="app-header__link">Dashboard</RouterLink>
        <RouterLink to="/profile" class="app-header__link">Perfil</RouterLink>
        <RouterLink to="/settings" class="app-header__link"> Configurações </RouterLink>
      </nav>
      <nav v-else class="app-header__nav">
        <RouterLink to="/login" class="app-header__link">Entrar</RouterLink>
        <RouterLink to="/register" class="app-header__link">Criar conta</RouterLink>
      </nav>

      <ThemeToggle class="app-header__theme" />
    </header>

    <RouterView v-if="!sessionChecking" v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
    <div v-else class="app-shell__loading">Verificando sessão…</div>
  </div>
</template>

<style scoped>
.app-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.app-shell__loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.9rem 2rem;
  border-bottom: 1px solid var(--color-border);
  background-color: color-mix(in srgb, var(--color-background) 85%, transparent);
  backdrop-filter: blur(8px);
  transition:
    background-color 0.3s,
    border-color 0.3s;
}

.app-header__brand {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--color-text);
  text-decoration: none;
}

.app-header__brand:hover {
  text-decoration: none;
  color: var(--color-primary);
}

.app-header__nav {
  display: flex;
  gap: 0.25rem;
}

.app-header__link {
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  text-decoration: none;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.app-header__link:hover {
  background-color: var(--color-background-mute);
  color: var(--color-text);
  text-decoration: none;
}

.app-header__link.router-link-exact-active {
  background-color: var(--color-background-mute);
  color: var(--color-text);
}

.app-header__theme {
  margin-left: auto;
}
</style>
