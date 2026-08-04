<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const store = useAuthStore()
const { isAuthenticated } = storeToRefs(store)
</script>

<template>
  <main class="page">
    <template v-if="isAuthenticated">
      <section class="page__header">
        <h1 class="page__title">Dashboard</h1>
        <p class="page__subtitle">Bem-vindo, {{ store.user?.username ?? 'usuário' }}.</p>
      </section>

      <section class="grid">
        <article class="card">
          <h2 class="card__title">Visão geral</h2>
          <p class="card__text">
            Este espaço exibirá um resumo da sua conta e das suas atividades.
          </p>
        </article>

        <article class="card">
          <h2 class="card__title">Atividade recente</h2>
          <p class="card__text">Em breve: últimos acessos e eventos relacionados à sua conta.</p>
        </article>

        <article class="card">
          <h2 class="card__title">Segurança</h2>
          <p class="card__text">
            Sessão ativa. Gerencie sua senha e dispositivos nas Configurações.
          </p>
        </article>
      </section>
    </template>

    <template v-else>
      <section class="page__header page__header--center">
        <h1 class="page__title">Autenticação simples e segura</h1>
        <p class="page__subtitle">
          Crie sua conta e acesse sua área com segurança. Sem complicação, sem senha fraca.
        </p>
        <div class="landing__actions">
          <RouterLink to="/register" class="landing__btn landing__btn--primary">
            Criar conta
          </RouterLink>
          <RouterLink to="/login" class="landing__btn landing__btn--secondary">Entrar</RouterLink>
        </div>
      </section>

      <section class="grid">
        <article class="card">
          <h2 class="card__title">Conta protegida</h2>
          <p class="card__text">Senhas com requisitos rigorosos e sessões seguras por padrão.</p>
        </article>

        <article class="card">
          <h2 class="card__title">Recuperação de acesso</h2>
          <p class="card__text">Esqueceu a senha? Solicite a redefinição em poucos cliques.</p>
        </article>

        <article class="card">
          <h2 class="card__title">Tema próprio</h2>
          <p class="card__text">Alternne entre claro e escuro conforme a sua preferência.</p>
        </article>
      </section>
    </template>
  </main>
</template>

<style scoped>
.page__header--center {
  text-align: center;
  max-width: 42rem;
  margin-inline: auto;
}

.landing__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.landing__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  border: 1px solid transparent;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    color 0.2s,
    filter 0.2s;
}

.landing__btn--primary {
  background-color: var(--color-primary);
  color: #fff;
}

.landing__btn--primary:hover {
  filter: brightness(1.08);
}

.landing__btn--secondary {
  background-color: var(--color-background-mute);
  color: var(--color-text);
  border-color: var(--color-border);
}

.landing__btn--secondary:hover {
  border-color: var(--color-border-hover);
}
</style>
