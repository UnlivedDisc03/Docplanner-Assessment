import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test('renders header, filter bar and listings grid', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('link', { name: /Nieru.*chomo.*ściPL/ })).toBeVisible()

    await expect(page.getByPlaceholder('Miasto')).toBeVisible()
    await expect(page.getByPlaceholder('Cena od')).toBeVisible()
    await expect(page.getByPlaceholder('Cena do')).toBeVisible()
    await expect(page.getByRole('combobox').first()).toBeVisible()

    const offerCounter = page.locator('text=/\\d+\\s+ofert/')
    await expect(offerCounter).toBeVisible()

    const totalText = (await offerCounter.textContent()) ?? ''
    const total = Number(totalText.replace(/\D/g, ''))
    expect(total).toBeGreaterThan(0)

    const cards = page.locator('a[href^="/listing/"]')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThan(0)
  })

  test('every visible listing card has a price and title', async ({ page }) => {
    await page.goto('/')
    const cards = page.locator('a[href^="/listing/"]')
    const count = Math.min(await cards.count(), 5)
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      await expect(card).toBeVisible()
      const txt = (await card.innerText()).trim()
      expect(txt.length).toBeGreaterThan(5)
    }
  })

  test('chat widget button is visible and toggles panel', async ({ page }) => {
    await page.goto('/')
    const btn = page.getByLabel('Chat z asystentem')
    await expect(btn).toBeVisible()
    await btn.click()
    await expect(page.getByText('Asystent AI')).toBeVisible()
    await expect(page.getByPlaceholder('Opisz czego szukasz...').last()).toBeVisible()
  })
})
