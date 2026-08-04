import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type DOMWrapper } from '@vue/test-utils'
import SettingsView from '@/views/SettingsView.vue'
import { useAuthStore } from '@/stores/auth'

function responseFor(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response
}

const SESSIONS = [
  {
    id: 'sessao-1',
    device: 'Chrome · Linux',
    ip: '10.0.0.1',
    last_seen: '2026-08-01T10:00:00Z',
    current: true,
  },
  {
    id: 'sessao-2',
    device: 'Firefox · Windows',
    ip: '10.0.0.2',
    last_seen: '2026-08-01T09:00:00Z',
    current: false,
  },
]

function mountSettings() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(SettingsView, {
    global: {
      plugins: [pinia],
      stubs: { Teleport: true },
    },
  })
  return wrapper
}

function findButton(wrapper: ReturnType<typeof mountSettings>, text: string): DOMWrapper<Element> {
  const button = wrapper.findAll('button').find((candidate) => candidate.text().includes(text))
  if (!button) throw new Error(`Botão com texto "${text}" não encontrado`)
  return button
}

function stubFetchWithSessions() {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/v1/sessions')) {
        return Promise.resolve(responseFor(200, SESSIONS))
      }
      return Promise.resolve(responseFor(404, { detail: 'Not found' }))
    }),
  )
}

async function openPasswordForm(wrapper: ReturnType<typeof mountSettings>) {
  await findButton(wrapper, 'Segurança').trigger('click')
  await findButton(wrapper, 'Alterar senha').trigger('click')
}

async function openEmailForm(wrapper: ReturnType<typeof mountSettings>) {
  await findButton(wrapper, 'Segurança').trigger('click')
  await findButton(wrapper, 'Trocar email').trigger('click')
}

describe('SettingsView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('renderiza a lista de grupos sem abrir os formulários', async () => {
    stubFetchWithSessions()
    const wrapper = mountSettings()

    expect(wrapper.text()).toContain('Aparência')
    expect(wrapper.text()).toContain('Segurança')
    expect(wrapper.text()).toContain('Notificações')
    expect(wrapper.text()).not.toContain('Senha atual')
    expect(wrapper.text()).not.toContain('Novo email')
    expect(wrapper.findAll('.settings-panel')).toHaveLength(0)

    await findButton(wrapper, 'Segurança').trigger('click')
    expect(wrapper.text()).toContain('Alterar senha')
    expect(wrapper.text()).toContain('Trocar email')
    expect(wrapper.text()).toContain('Gerenciar dispositivos')
  })

  it('navega do conteúdo de volta para as opções e para os grupos', async () => {
    stubFetchWithSessions()
    const wrapper = mountSettings()

    await openPasswordForm(wrapper)
    expect(wrapper.findAll('form')).toHaveLength(1)
    expect(wrapper.findAll('.settings-panel')).toHaveLength(2)

    const contentPanel = wrapper.findAll('.settings-panel')[1]!
    await contentPanel.get('button').trigger('click')
    expect(wrapper.findAll('form')).toHaveLength(0)
    expect(wrapper.findAll('.settings-panel')).toHaveLength(1)
    expect(wrapper.text()).toContain('Alterar senha')

    const optionsPanel = wrapper.findAll('.settings-panel')[0]!
    await optionsPanel.get('button').trigger('click')
    expect(wrapper.findAll('.settings-panel')).toHaveLength(0)
    expect(wrapper.text()).toContain('Segurança')
  })

  it('mostra erros de validação ao enviar o formulário de senha vazio', async () => {
    stubFetchWithSessions()
    const wrapper = mountSettings()
    await openPasswordForm(wrapper)

    await wrapper.findAll('form')[0]!.trigger('submit')

    expect(wrapper.text()).toContain('Informe a senha atual')
    expect(wrapper.text()).toContain('Informe a nova senha')
    expect(wrapper.text()).toContain('Confirme a nova senha')
  })

  it('altera a senha enviando senhas e keep_session_ids', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/v1/sessions')) {
        return Promise.resolve(responseFor(200, SESSIONS))
      }
      if (url.endsWith('/api/v1/change_password')) {
        return Promise.resolve(responseFor(204))
      }
      return Promise.resolve(responseFor(404, { detail: 'Not found' }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mountSettings()
    await openPasswordForm(wrapper)
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('este dispositivo')
    })

    const passwordForm = wrapper.findAll('form')[0]!
    await passwordForm
      .get('input[autocomplete="current-password"]')
      .setValue('SenhaAtual123!')
    const newPasswordInputs = passwordForm.findAll('input[autocomplete="new-password"]')
    await newPasswordInputs[0]!.setValue('SenhaForte123!')
    await newPasswordInputs[1]!.setValue('SenhaForte123!')
    await passwordForm.trigger('submit')

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Senha alterada com sucesso')
    })

    const [, init] = fetchMock.mock.calls.find((call) =>
      String(call[0]).endsWith('/change_password'),
    ) as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({
      current_password: 'SenhaAtual123!',
      new_password: 'SenhaForte123!',
      keep_session_ids: ['sessao-1'],
    })
  })

  it('email inválido não abre o diálogo de confirmação', async () => {
    stubFetchWithSessions()
    const wrapper = mountSettings()
    await openEmailForm(wrapper)

    const emailForm = wrapper.findAll('form')[0]!
    await emailForm.get('input[autocomplete="email"]').setValue('invalido')
    await emailForm.trigger('submit')

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Informe um email válido')
  })

  it('troca de email confirma com senha e mostra sucesso', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/v1/sessions')) {
        return Promise.resolve(responseFor(200, SESSIONS))
      }
      if (url.endsWith('/api/v1/change_email')) {
        return Promise.resolve(
          responseFor(200, { user: { username: 'joao', email: 'novo@email.com' } }),
        )
      }
      return Promise.resolve(responseFor(404, { detail: 'Not found' }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mountSettings()
    useAuthStore().user = { username: 'joao', email: 'joao@email.com' }
    await openEmailForm(wrapper)

    const emailForm = wrapper.findAll('form')[0]!
    await emailForm.get('input[autocomplete="email"]').setValue('novo@email.com')
    await emailForm.trigger('submit')

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Tem certeza que deseja trocar o email da conta para')
    expect(wrapper.text()).toContain('novo@email.com')

    const confirmButton = findButton(wrapper, 'Confirmar troca')
    await confirmButton.trigger('click')
    expect(wrapper.text()).toContain('Informe sua senha para confirmar')

    await emailForm.get('input[autocomplete="current-password"]').setValue('SenhaForte123!')
    await confirmButton.trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Email da conta alterado para')
    })
    expect(wrapper.text()).toContain('novo@email.com')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    const [, init] = fetchMock.mock.calls.find((call) =>
      String(call[0]).endsWith('/change_email'),
    ) as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({
      new_email: 'novo@email.com',
      password: 'SenhaForte123!',
    })
  })

  it('cancelar fecha o diálogo sem chamar a API', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/v1/sessions')) {
        return Promise.resolve(responseFor(200, SESSIONS))
      }
      return Promise.resolve(responseFor(404, { detail: 'Not found' }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mountSettings()
    useAuthStore().user = { username: 'joao', email: 'joao@email.com' }
    await openEmailForm(wrapper)

    const emailForm = wrapper.findAll('form')[0]!
    await emailForm.get('input[autocomplete="email"]').setValue('novo@email.com')
    await emailForm.trigger('submit')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)

    await findButton(wrapper, 'Cancelar').trigger('click')

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    const emailCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/change_email'))
    expect(emailCalls).toHaveLength(0)
  })

  it('lista dispositivos e encerra uma sessão', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/v1/sessions')) {
        return Promise.resolve(responseFor(200, SESSIONS))
      }
      if (url.endsWith('/api/v1/sessions/sessao-2')) {
        return Promise.resolve(responseFor(204))
      }
      return Promise.resolve(responseFor(404, { detail: 'Not found' }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mountSettings()
    await findButton(wrapper, 'Segurança').trigger('click')
    await findButton(wrapper, 'Gerenciar dispositivos').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Firefox · Windows')
    })

    const encerrarButton = findButton(wrapper, 'Encerrar')
    expect(encerrarButton.attributes('disabled')).toBeUndefined()
    await encerrarButton.trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.text()).not.toContain('Firefox · Windows')
    })
    expect(wrapper.text()).toContain('Chrome · Linux')

    const [, init] = fetchMock.mock.calls.find((call) =>
      String(call[0]).endsWith('/sessions/sessao-2'),
    ) as [string, RequestInit]
    expect(init.method).toBe('DELETE')
  })
})
