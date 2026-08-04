import type { PasswordCheck, PasswordCheckId } from '@/types/auth'

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireDigit: boolean
  requireSpecial: boolean
}

export const defaultPasswordPolicy: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
}

const UPPERCASE_RE = /\p{Lu}/u
const LOWERCASE_RE = /\p{Ll}/u
const DIGIT_RE = /\p{N}/u
const SPECIAL_RE = /[^\p{L}\p{N}\s]/u
const LONE_SURROGATE_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

function hasControlCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0)
    if (
      code !== undefined &&
      ((code >= 0x0000 && code <= 0x001f) || (code >= 0x007f && code <= 0x009f))
    ) {
      return true
    }
  }
  return false
}

function isWellFormed(value: string): boolean {
  const maybeWellFormed = (
    value as string & {
      isWellFormed?: () => boolean
    }
  ).isWellFormed
  if (typeof maybeWellFormed === 'function') {
    return maybeWellFormed.call(value)
  }
  return !LONE_SURROGATE_RE.test(value)
}

export interface PasswordChecks {
  minLength: boolean
  uppercase: boolean
  lowercase: boolean
  digit: boolean
  special: boolean
  utf8: boolean
}

export function checkPassword(
  value: string,
  policy: PasswordPolicy = defaultPasswordPolicy,
): PasswordChecks {
  return {
    minLength: value.length >= policy.minLength,
    uppercase: !policy.requireUppercase || UPPERCASE_RE.test(value),
    lowercase: !policy.requireLowercase || LOWERCASE_RE.test(value),
    digit: !policy.requireDigit || DIGIT_RE.test(value),
    special: !policy.requireSpecial || SPECIAL_RE.test(value),
    utf8: isWellFormed(value) && !hasControlCharacter(value),
  }
}

const CHECK_LABELS: Record<PasswordCheckId, (policy: PasswordPolicy) => string> = {
  minLength: (policy) => `Pelo menos ${policy.minLength} caracteres`,
  uppercase: () => 'Uma letra maiúscula',
  lowercase: () => 'Uma letra minúscula',
  digit: () => 'Um número',
  special: () => 'Um caractere especial',
  utf8: () => 'Apenas caracteres válidos (UTF-8)',
}

const CHECK_IDS: PasswordCheckId[] = [
  'minLength',
  'uppercase',
  'lowercase',
  'digit',
  'special',
  'utf8',
]

export function passwordChecksList(
  value: string,
  policy: PasswordPolicy = defaultPasswordPolicy,
): PasswordCheck[] {
  const checks = checkPassword(value, policy)
  return CHECK_IDS.map((id) => ({
    id,
    label: CHECK_LABELS[id](policy),
    valid: checks[id],
  }))
}

export function isPasswordValid(
  value: string,
  policy: PasswordPolicy = defaultPasswordPolicy,
): boolean {
  const checks = checkPassword(value, policy)
  return (
    checks.minLength &&
    checks.uppercase &&
    checks.lowercase &&
    checks.digit &&
    checks.special &&
    checks.utf8
  )
}
