<script setup lang="ts">
import { useRouter } from 'vue-router'
import BaseButton from '@/components/auth/BaseButton.vue'
import { useAuthStore } from '@/stores/auth'

const store = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await store.logout()
  await router.push('/login')
}
</script>

<template>
  <main class="page">
    <section class="page__header">
      <h1 class="page__title">Perfil</h1>
      <p class="page__subtitle">Informações da sua conta.</p>
    </section>

    <section class="card">
      <div class="profile">
        <div class="profile__avatar" aria-hidden="true">
          {{ store.user?.username?.charAt(0)?.toUpperCase() ?? '?' }}
        </div>
        <div class="profile__info">
          <h2 class="card__title">{{ store.user?.username ?? 'Usuário' }}</h2>
          <p class="card__text">{{ store.user?.email ?? '—' }}</p>
        </div>
      </div>
    </section>

    <section class="card">
      <h2 class="card__title">Sessão</h2>
      <p class="card__text">Encerre a sessão atual neste dispositivo.</p>
      <BaseButton variant="secondary" :loading="store.logoutLoading" @click="handleLogout">
        Sair da conta
      </BaseButton>
    </section>
  </main>
</template>

<style scoped>
.profile {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.profile__avatar {
  flex-shrink: 0;
  width: 3.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
  font-size: 1.4rem;
  font-weight: 700;
}

.profile__info .card__text {
  margin-bottom: 0;
}
</style>
