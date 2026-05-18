<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
import { useAuthStore } from './stores/auth'
import { ref } from 'vue'

const authStore = useAuthStore()
const router = useRouter()
const isMenuOpen = ref(false)

const handleLogout = () => {
  authStore.logout()
  isMenuOpen.value = false
  router.push('/login')
}

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}
</script>

<template>
  <header>
    <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />

    <div class="wrapper">
      <HelloWorld msg="You did it!" />

      <nav>
        <RouterLink to="/">Home</RouterLink>

        <RouterLink v-if="authStore.isAuthenticated" to="/dashboard" class="btn-dashboard"
          >Dashboard</RouterLink
        >

        <RouterLink to="/about">About</RouterLink>

        <div class="user-menu" v-if="authStore.isAuthenticated">
          <a href="#" @click.prevent="toggleMenu" class="user-menu-btn">Opções</a>
          <div v-show="isMenuOpen" class="dropdown-content">
            <RouterLink to="/settings" @click="isMenuOpen = false">Settings</RouterLink>
            <a href="#" @click.prevent="handleLogout">Logout</a>
          </div>
        </div>

        <RouterLink to="/login" v-if="!authStore.isAuthenticated">Login</RouterLink>
      </nav>
    </div>
  </header>

  <RouterView />
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  margin-top: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a,
.user-menu-btn {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

/* Remove a borda apenas do primeiro elemento direto do nav (seja a ou div) */
nav > :first-child,
nav > :first-child > a {
  border-left: 0 !important;
}

.user-menu {
  display: flex;
  align-items: center;
  position: relative;
}

.dropdown-content {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: var(--color-background-soft);
  min-width: 120px;
  box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
  z-index: 10;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  margin-top: 0.5rem;
}

.dropdown-content a {
  color: var(--color-text);
  padding: 10px 16px;
  text-decoration: none;
  display: block;
  text-align: left;
  border-left: none;
  width: 100%;
  box-sizing: border-box;
}

.dropdown-content a:hover {
  background-color: var(--color-background-mute);
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    justify-content: flex-start;
    margin-left: -1rem;
    font-size: 1rem;
    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
