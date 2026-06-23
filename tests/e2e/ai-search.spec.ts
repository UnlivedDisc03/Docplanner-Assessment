import { test, expect } from '@playwright/test'

test.describe('AI features (require OPENAI_API_KEY)', () => {
  test('header search calls /api/search-interpret and redirects with _ai=1', async ({ page }) => {
    await page.goto('/')

    const interpretPromise = page.waitForResponse(r =>
      r.url().includes('/api/search-interpret') && r.request().method() === 'POST',
    )

    await page.getByPlaceholder('Opisz czego szukasz...').first().fill('mieszkanie w Krakowie do 600000')
    await page.getByRole('button', { name: 'Szukaj' }).click()

    const response = await interpretPromise
    expect(response.status()).toBe(200)
    const body = await response.json() as { params: Record<string, string> }
    expect(body).toHaveProperty('params')

    await page.waitForURL(/_ai=1/, { timeout: 15_000 })
    await expect(page.locator('text=/\\d+\\s+ofert/')).toBeVisible()
  })

  test('chat widget submits message and shows assistant reply', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Chat z asystentem').click()

    const chatInput = page.getByPlaceholder('Opisz czego szukasz...').last()
    await chatInput.fill('Pokaż mieszkania w Warszawie')

    const chatPromise = page.waitForResponse(r =>
      r.url().includes('/api/chat') && r.request().method() === 'POST',
      { timeout: 30_000 },
    )

    await chatInput.press('Enter')

    const response = await chatPromise
    expect(response.status()).toBe(200)
    const body = await response.json() as { message: string; listings: unknown[] }
    expect(typeof body.message).toBe('string')
    expect(Array.isArray(body.listings)).toBe(true)

    await expect(page.getByText('Pokaż mieszkania w Warszawie')).toBeVisible()
  })

  test('search-interpret returns structured params for explicit query', async ({ request }) => {
    const res = await request.post('/api/search-interpret', {
      data: { query: 'tanie mieszkanie 2 pokoje w Krakowie do 500000 zl' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json() as { params: Record<string, string> }
    expect(body.params).toBeDefined()
  })
})
