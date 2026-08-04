<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import BaseButton from './BaseButton.vue'
import { useSessionsStore } from '@/stores/sessions'

const store = useSessionsStore()
const { sessions, loading, error, terminatingId } = storeToRefs(store)

function formatLastSeen(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR')
}

async function refresh() {
  await store.list()
}

async function handleTerminate(id: string) {
  await store.terminate(id)
}

onMounted(() => {
  store.list()
})
</script>

<template>
  <div class="sessions">
    <div class="sessions__toolbar">
      <p class="card__text">Dispositivos com acesso à sua conta.</p>
      <BaseButton variant="secondary" :loading="loading" @click="refresh">Atualizar</BaseButton>
    </div>

    <div v-if="error" class="sessions__alert" role="alert">{{ error }}</div>

    <ul v-if="sessions.length > 0" class="sessions__list">
      <li v-for="session in sessions" :key="session.id" class="sessions__item">
        <div class="sessions__info">
          <p class="sessions__device">
            {{ session.device }}
            <span v-if="session.current" class="sessions__badge">este dispositivo</span>
          </p>
          <p class="sessions__meta">
            {{ session.ip }} · visto em {{ formatLastSeen(session.last_seen) }}
          </p>
        </div>
        <BaseButton
          variant="secondary"
          :loading="terminatingId === session.id"
          :disabled="session.current || terminatingId !== null"
          @click="handleTerminate(session.id)"
        >
          {{ session.current ? 'Atual' : 'Encerrar' }}
        </BaseButton>
      </li>
    </ul>

    <p v-else-if="!loading && !error" class="sessions__empty">Nenhum dispositivo encontrado.</p>
  </div>
</template>

<style scoped>
.sessions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sessions__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.sessions__toolbar .card__text {
  margin-bottom: 0;
}

.sessions__alert {
  padding: 0.6rem 0.85rem;
  border: 1px solid color-mix(in srgb, var(--color-danger) 40%, transparent);
  border-radius: 8px;
  background-color: color-mix(in srgb, var(--color-danger) 12%, transparent);
  color: var(--color-danger);
  font-size: 0.85rem;
}

.sessions__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.sessions__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-background-mute);
}

.sessions__device {
  font-weight: 600;
  margin-bottom: 0.15rem;
}

.sessions__meta {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.sessions__badge {
  display: inline-block;
  margin-left: 0.35rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  background-color: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
}

.sessions__empty {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
</style>
