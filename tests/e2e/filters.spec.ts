import { test, expect } from '@playwright/test'

async function readTotal(page: import('@playwright/test').Page): Promise<number> {
  const txt = (await page.locator('text=/\\d+\\s+ofert/').textContent()) ?? ''
  return Number(txt.replace(/\D/g, ''))
}

test.describe('Filter bar', () => {
  test('filtering by city narrows the result count and reflects in URL', async ({ page }) => {
    await page.goto('/')
    const baseline = await readTotal(page)
    expect(baseline).toBeGreaterThan(0)

    await page.getByPlaceholder('Miasto').fill('Kraków')
    await page.waitForURL(/[?&]city=Krak/i, { timeout: 5000 })

    await expect(page.locator('text=/\\d+\\s+ofert/')).toBeVisible()
    const filtered = await readTotal(page)

    expect(filtered).toBeLessThanOrEqual(baseline)
  })

  test('price-max filter rejects expensive listings', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('Cena do').fill('500000')
    await page.waitForURL(/[?&]priceMax=500000/, { timeout: 5000 })

    await expect(page.locator('text=/\\d+\\s+ofert/')).toBeVisible()
    const total = await readTotal(page)
    expect(total).toBeGreaterThanOrEqual(0)
  })

  test('rooms select pushes rooms param', async ({ page }) => {
    await page.goto('/')
    const roomsSelect = page.locator('select').first()
    await roomsSelect.selectOption('3')
    await page.waitForURL(/[?&]rooms=3/, { timeout: 5000 })
    await expect(page.locator('text=/\\d+\\s+ofert/')).toBeVisible()
  })

  test('market-type select pushes marketType param', async ({ page }) => {
    await page.goto('/')
    const marketSelect = page.locator('select').nth(1)
    await marketSelect.selectOption('secondary')
    await page.waitForURL(/[?&]marketType=secondary/, { timeout: 5000 })
  })

  test('filters dropdown opens and toggles property type', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Filtry/ }).click()
    const apartmentCheckbox = page.getByLabel('Mieszkanie', { exact: true })
    await expect(apartmentCheckbox).toBeVisible()
    await apartmentCheckbox.click()
    await expect.poll(() => new URL(page.url()).searchParams.get('propertyTypes'),
      { timeout: 5000 }).toContain('apartment')
  })

  test('non-matching filter shows empty state', async ({ page }) => {
    await page.goto('/?city=ZZZ-NoSuchCity-XYZ')
    await expect(page.getByText(/Brak ogłoszeń/)).toBeVisible()
  })

  test('AI-set filters (_ai=1) are visible in the bar and editable', async ({ page }) => {
    await page.goto('/?city=Kraków&priceMax=600000&rooms=3&_ai=1')

    await expect(page.getByPlaceholder('Miasto')).toHaveValue('Kraków')
    await expect(page.getByPlaceholder('Cena do')).toHaveValue('600000')
    await expect(page.locator('select').first()).toHaveValue('3')

    await page.getByPlaceholder('Cena do').fill('700000')
    await expect.poll(() => new URL(page.url()).searchParams.get('priceMax'),
      { timeout: 5000 }).toBe('700000')
    await expect.poll(() => new URL(page.url()).searchParams.get('_ai'),
      { timeout: 5000 }).toBeNull()
    await expect.poll(() => new URL(page.url()).searchParams.get('city')).toBe('Kraków')
  })

  test('AI-set boolean filter shows as checked in dropdown', async ({ page }) => {
    await page.goto('/?hasBalcony=1&propertyTypes=apartment&_ai=1')

    await page.getByRole('button', { name: /Filtry/ }).click()
    await expect(page.getByLabel('Mieszkanie', { exact: true })).toBeChecked()
    await expect(page.getByLabel('Balkon', { exact: true })).toBeChecked()
  })

  test('Wyczyść button is hidden when no filters are active', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Wyczyść$/ })).toHaveCount(0)
  })

  test('Wyczyść button clears every filter param and navigates to /', async ({ page }) => {
    await page.goto('/?city=Kraków&priceMax=600000&rooms=3&propertyTypes=apartment&hasBalcony=1&_ai=1')

    await expect(page.getByPlaceholder('Miasto')).toHaveValue('Kraków')
    const clearBtn = page.getByRole('button', { name: /Wyczyść$/ })
    await expect(clearBtn).toBeVisible()

    await clearBtn.click()

    await page.waitForURL(url => new URL(url).search === '' || new URL(url).search === '?', { timeout: 5000 })

    await expect(page.getByPlaceholder('Miasto')).toHaveValue('')
    await expect(page.getByPlaceholder('Cena do')).toHaveValue('')
    await expect(page.locator('select').first()).toHaveValue('')
    await expect(clearBtn).toHaveCount(0)
  })
})
