import { test, expect } from '@playwright/test'

test.describe('Listing detail', () => {
  test('clicking a card navigates to the detail page', async ({ page }) => {
    await page.goto('/')
    const firstCard = page.locator('a[href^="/listing/"]').first()
    const href = await firstCard.getAttribute('href')
    expect(href).toMatch(/^\/listing\/\d+$/)
    await firstCard.click()
    await page.waitForURL(href!)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('detail page shows price, stats bar and external link', async ({ page }) => {
    const res = await page.request.get('/api/listings?limit=1')
    const json = await res.json() as { data: { id: number }[] }
    const id = json.data[0]?.id
    expect(id, 'expected at least one listing seeded').toBeTruthy()

    await page.goto(`/listing/${id}`)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Powierzchnia')).toBeVisible()
    await expect(page.getByText('Pokoje')).toBeVisible()
    await expect(page.getByText('Piętro')).toBeVisible()
    await expect(page.getByText('Czynsz')).toBeVisible()

    const cta = page.getByRole('link', { name: /Zobacz ogłoszenie/ })
    await expect(cta).toBeVisible()
    const href = await cta.getAttribute('href')
    expect(href).toMatch(/^https?:\/\//)
    expect(await cta.getAttribute('target')).toBe('_blank')
    expect(await cta.getAttribute('rel')).toContain('noopener')

    await expect(page.getByRole('heading', { name: 'Opis' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Udogodnienia' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Szczegóły ogłoszenia' })).toBeVisible()

    const cityLink = page.getByRole('link', { name: 'Ogłoszenia' })
    await expect(cityLink).toBeVisible()
    await cityLink.click()
    await page.waitForURL('**/')
  })

  test('unknown listing id returns 404', async ({ page }) => {
    const response = await page.goto('/listing/99999999')
    expect(response?.status()).toBe(404)
  })
})
