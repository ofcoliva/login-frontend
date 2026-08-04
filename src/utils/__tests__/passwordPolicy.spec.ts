import { describe, expect, it } from 'vitest'
import {
  checkPassword,
  defaultPasswordPolicy,
  isPasswordValid,
  passwordChecksList,
} from '@/utils/passwordPolicy'

describe('checkPassword', () => {
  it('aceita senha com todos os requisitos', () => {
    const checks = checkPassword('SenhaForte123!')
    expect(checks.minLength).toBe(true)
    expect(checks.uppercase).toBe(true)
    expect(checks.lowercase).toBe(true)
    expect(checks.digit).toBe(true)
    expect(checks.special).toBe(true)
    expect(checks.utf8).toBe(true)
    expect(isPasswordValid('SenhaForte123!')).toBe(true)
  })

  it('rejeita senha curta', () => {
    expect(checkPassword('A1b2C3d4!').minLength).toBe(false)
    expect(isPasswordValid('A1b2C3d4!')).toBe(false)
  })

  it('rejeita sem letra maiúscula', () => {
    expect(checkPassword('senhaforte123!').uppercase).toBe(false)
  })

  it('rejeita sem letra minúscula', () => {
    expect(checkPassword('SENHAFORTE123!').lowercase).toBe(false)
  })

  it('rejeita sem número', () => {
    expect(checkPassword('SenhaForte!!!').digit).toBe(false)
  })

  it('rejeita sem caractere especial', () => {
    expect(checkPassword('SenhaForte123').special).toBe(false)
  })

  it('aceita caracteres acentuados (UTF-8)', () => {
    expect(checkPassword('SénhaFörte123!').special).toBe(true)
    expect(isPasswordValid('SénhaFörte123!')).toBe(true)
  })

  it('rejeita caracteres de controle', () => {
    expect(checkPassword('SenhaForte123\u0000!').utf8).toBe(false)
  })

  it('rejeita lone surrogate (UTF-8 mal formado)', () => {
    expect(checkPassword('SenhaForte123\uD800!').utf8).toBe(false)
  })

  it('lista requisitos com rótulos', () => {
    const list = passwordChecksList('abc')
    expect(list).toHaveLength(6)
    for (const item of list) {
      expect(item.label).toBeTruthy()
      expect(typeof item.valid).toBe('boolean')
    }
  })

  it('permite relaxar a política de complexidade', () => {
    const relaxed = { ...defaultPasswordPolicy, requireSpecial: false }
    expect(checkPassword('SenhaForte123', relaxed).special).toBe(true)
    expect(isPasswordValid('SenhaForte123', relaxed)).toBe(true)
  })
})
