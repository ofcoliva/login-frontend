import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from '@/router'
import { AUTH_EXPIRES_AT_KEY, AUTH_SESSION_KEY } from '@/config/api'

describe('router guard', () => {
  beforeEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    await router.push('/')
  })

  it('permite acessar a home sem login', async () => {
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('redireciona /profile para o login sem sessão', async () => {
    await router.push('/profile')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('permite /profile com sessão ativa', async () => {
    localStorage.setItem(AUTH_SESSION_KEY, '1')
    setActivePinia(createPinia())
    await router.push('/profile')
    expect(router.currentRoute.value.name).toBe('profile')
  })

  it('redireciona /profile para o login quando a sessão expirou', async () => {
    localStorage.setItem(AUTH_SESSION_KEY, '1')
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, new Date(Date.now() - 1000).toISOString())
    setActivePinia(createPinia())
    await router.push('/profile')
    expect(router.currentRoute.value.name).toBe('login')
  })
})
