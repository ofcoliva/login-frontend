export const USERNAME_MAX_LENGTH = 30
export const USERNAME_RE = /^[A-Za-z0-9_]+$/

/**
 * Espelha a política de conteúdo do backend (`username_policy.py`):
 * charset `[A-Za-z0-9_]`, não vazio e até 30 caracteres.
 * Sem normalização: o valor não é trimado nem lowercased — espaços/acentos
 * são considerados inválidos. O termo ofensivo é validado apenas no backend.
 */
export function isUsernameValid(value: string): boolean {
  return value.length > 0 && value.length <= USERNAME_MAX_LENGTH && USERNAME_RE.test(value)
}
