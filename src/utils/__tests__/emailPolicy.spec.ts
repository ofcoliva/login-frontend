import { describe, expect, it } from 'vitest'
import { checkEmail, emailChecksList, isEmailValid } from '@/utils/emailPolicy'
import { isValidEmail } from '@/utils/validators'

describe('checkEmail', () => {
  it('aceita email com todos os requisitos', () => {
    const checks = checkEmail('joao.silva@exemplo.com')
    expect(checks.format).toBe(true)
    expect(checks.noSpaces).toBe(true)
    expect(checks.local).toBe(true)
    expect(checks.domain).toBe(true)
    expect(checks.length).toBe(true)
    expect(isEmailValid('joao.silva@exemplo.com')).toBe(true)
    expect(isValidEmail('joao.silva@exemplo.com')).toBe(true)
  })

  it('rejeita sem @', () => {
    expect(checkEmail('joaoexemplo.com').format).toBe(false)
    expect(isEmailValid('joaoexemplo.com')).toBe(false)
  })

  it('rejeita com dois @', () => {
    expect(checkEmail('joao@exemplo@com').format).toBe(false)
    expect(isEmailValid('joao@exemplo@com')).toBe(false)
  })

  it('rejeita com espaços', () => {
    const checks = checkEmail('joao silva@exemplo.com')
    expect(checks.noSpaces).toBe(false)
    expect(isEmailValid('joao silva@exemplo.com')).toBe(false)
  })

  it('rejeita nome com pontos seguidos', () => {
    expect(checkEmail('joao..silva@exemplo.com').local).toBe(false)
  })

  it('rejeita nome começando ou terminando com ponto', () => {
    expect(checkEmail('.joao@exemplo.com').local).toBe(false)
    expect(checkEmail('joao.@exemplo.com').local).toBe(false)
  })

  it('rejeita domínio sem ponto', () => {
    expect(checkEmail('joao@exemplo').domain).toBe(false)
  })

  it('rejeita TLD de uma letra', () => {
    expect(checkEmail('joao@exemplo.c').domain).toBe(false)
  })

  it('rejeita domínio com caracteres inválidos', () => {
    expect(checkEmail('joao@exem_plo.com').domain).toBe(false)
  })

  it('rejeita email acima de 254 caracteres', () => {
    const longLocal = 'a'.repeat(250)
    expect(checkEmail(`${longLocal}@exemplo.com`).length).toBe(false)
    expect(isEmailValid(`${longLocal}@exemplo.com`)).toBe(false)
  })

  it('rejeita email vazio', () => {
    expect(isEmailValid('')).toBe(false)
  })

  it('lista requisitos com rótulos', () => {
    const list = emailChecksList('abc')
    expect(list).toHaveLength(5)
    for (const item of list) {
      expect(item.label).toBeTruthy()
      expect(typeof item.valid).toBe('boolean')
    }
  })
})
