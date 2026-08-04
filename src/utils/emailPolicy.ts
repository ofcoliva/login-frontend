import type { EmailCheck, EmailCheckId } from '@/types/auth'

const MAX_LENGTH = 254
const LOCAL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/
const DOMAIN_RE =
  /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$/
const TLD_RE = /\.[A-Za-z]{2,}$/

export interface EmailChecks {
  format: boolean
  noSpaces: boolean
  local: boolean
  domain: boolean
  length: boolean
}

export function checkEmail(value: string): EmailChecks {
  const trimmed = value.trim()
  const atCount = (trimmed.match(/@/g) ?? []).length
  const [local = '', domain = ''] = trimmed.split('@')

  return {
    format: atCount === 1 && local.length > 0 && domain.length > 0,
    noSpaces: !/\s/.test(value),
    local:
      atCount === 1 &&
      local.length > 0 &&
      !local.startsWith('.') &&
      !local.endsWith('.') &&
      !local.includes('..') &&
      LOCAL_RE.test(local),
    domain: atCount === 1 && domain.length > 0 && DOMAIN_RE.test(domain) && TLD_RE.test(domain),
    length: trimmed.length <= MAX_LENGTH,
  }
}

const CHECK_LABELS: Record<EmailCheckId, () => string> = {
  format: () => 'Exatamente um @, com nome e domínio',
  noSpaces: () => 'Sem espaços',
  local: () => 'Nome válido (letras, números, . _ -)',
  domain: () => 'Domínio com ponto válido (ex.: gmail.com)',
  length: () => 'Até 254 caracteres',
}

const CHECK_IDS: EmailCheckId[] = ['format', 'noSpaces', 'local', 'domain', 'length']

export function emailChecksList(value: string): EmailCheck[] {
  const checks = checkEmail(value)
  return CHECK_IDS.map((id) => ({
    id,
    label: CHECK_LABELS[id](),
    valid: checks[id],
  }))
}

export function isEmailValid(value: string): boolean {
  const checks = checkEmail(value)
  return checks.format && checks.noSpaces && checks.local && checks.domain && checks.length
}
