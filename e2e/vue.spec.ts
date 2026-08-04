import { test, expect } from '@playwright/test'

test('login page renders and validates empty submit', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()

  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByText('Informe seu usuário')).toBeVisible()
  await expect(page.getByText('Informe sua senha')).toBeVisible()
})

test('signup page shows password requirements', async ({ page }) => {
  await page.goto('/register')
  await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible()

  const password = page.getByLabel('Senha')
  await password.fill('abc')

  await expect(page.getByText('Pelo menos 12 caracteres')).toBeVisible()
  await expect(page.getByText('Uma letra maiúscula')).toBeVisible()
})
