import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import { useAuthStore } from '@/stores/auth'

function mountLogin() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div>home</div>' } },
      { path: '/login', name: 'login', component: LoginView },
      {
        path: '/forgot-password',
        name: 'forgot-password',
        component: { template: '<div>forgot</div>' },
      },
      {
        path: '/register',
        name: 'register',
        component: { template: '<div>register</div>' },
      },
    ],
  })

  const wrapper = mount(LoginView, {
    global: { plugins: [pinia, router] },
  })

  return { wrapper, router, store: useAuthStore() }
}

function responseFor(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response
}

describe('LoginView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('mostra erros de validação ao enviar formulário vazio', async () => {
    const { wrapper } = mountLogin()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Informe seu usuário')
    expect(wrapper.text()).toContain('Informe sua senha')
  })

  it('não dispara request com formulário inválido', async () => {
    const fetchMock = vi.fn<() => Promise<unknown>>()
    vi.stubGlobal('fetch', fetchMock)

    const { wrapper } = mountLogin()
    await wrapper.find('form').trigger('submit')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('chama login e redireciona para a home', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          responseFor(200, { user: { username: 'joao', email: 'joao@email.com' } }),
        ),
    )

    const { wrapper, router, store } = mountLogin()

    await wrapper.get('input[autocomplete="username"]').setValue('joao')
    await wrapper.get('input[autocomplete="current-password"]').setValue('SenhaForte123!')
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => {
      expect(store.isAuthenticated).toBe(true)
    })

    expect(store.user?.username).toBe('joao')
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('mantém o botão desabilitado durante o loading', async () => {
    let resolveResponse: (value: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<Response>>().mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            resolveResponse = resolve
          }),
      ),
    )

    const { wrapper } = mountLogin()

    await wrapper.get('input[autocomplete="username"]').setValue('joao')
    await wrapper.get('input[autocomplete="current-password"]').setValue('SenhaForte123!')
    await wrapper.find('form').trigger('submit')

    const button = wrapper.get('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()

    resolveResponse!(responseFor(200, { user: { username: 'joao' } }))
    await vi.waitFor(() => {
      expect(button.attributes('disabled')).toBeUndefined()
    })
  })
})
