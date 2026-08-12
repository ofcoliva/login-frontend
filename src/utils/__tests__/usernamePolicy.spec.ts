import { describe, expect, it } from 'vitest'
import { isUsernameValid, USERNAME_MAX_LENGTH } from '@/utils/usernamePolicy'

describe('usernamePolicy', () => {
  it('aceita letras, números e underscore', () => {
    expect(isUsernameValid('joao')).toBe(true)
    expect(isUsernameValid('joao_2026')).toBe(true)
    expect(isUsernameValid('Joao_2026')).toBe(true)
    expect(isUsernameValid('_abc123')).toBe(true)
  })

  it('rejeita vazio', () => {
    expect(isUsernameValid('')).toBe(false)
  })

  it('rejeita mais de 30 caracteres', () => {
    expect(isUsernameValid('a'.repeat(USERNAME_MAX_LENGTH))).toBe(true)
    expect(isUsernameValid('a'.repeat(USERNAME_MAX_LENGTH + 1))).toBe(false)
  })

  it('rejeita espaços, acentos e caracteres especiais (sem normalização)', () => {
    expect(isUsernameValid('joao silva')).toBe(false)
    expect(isUsernameValid(' joao')).toBe(false)
    expect(isUsernameValid('joao ')).toBe(false)
    expect(isUsernameValid('joão')).toBe(false)
    expect(isUsernameValid('joao-silva')).toBe(false)
    expect(isUsernameValid('joao.silva')).toBe(false)
    expect(isUsernameValid('joao@')).toBe(false)
  })
})
