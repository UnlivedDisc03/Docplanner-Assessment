import { test, expect } from '@playwright/test'

test.describe('API: /api/listings', () => {
  test('returns paginated payload with data and total', async ({ request }) => {
    const res = await request.get('/api/listings?limit=5')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('total')
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeLessThanOrEqual(5)
    expect(typeof body.total).toBe('number')
  })

  test('city filter narrows result set', async ({ request }) => {
    const all = await (await request.get('/api/listings?limit=1')).json()
    const filtered = await (await request.get('/api/listings?city=Warszawa&limit=1')).json()
    expect(filtered.total).toBeLessThanOrEqual(all.total)
  })

  test('priceMax filter excludes listings priced higher', async ({ request }) => {
    const res = await request.get('/api/listings?priceMax=400000&limit=20')
    const body = await res.json() as { data: { price: number | null }[] }
    for (const l of body.data) {
      if (l.price != null) expect(l.price).toBeLessThanOrEqual(400000)
    }
  })

  test('rooms filter returns matching room count', async ({ request }) => {
    const res = await request.get('/api/listings?rooms=2&limit=20')
    const body = await res.json() as { data: { rooms: number | null }[] }
    for (const l of body.data) {
      if (l.rooms != null) expect(l.rooms).toBe(2)
    }
  })

  test('pagination returns different results on different pages', async ({ request }) => {
    const p1 = await (await request.get('/api/listings?limit=5&page=1')).json()
    const p2 = await (await request.get('/api/listings?limit=5&page=2')).json()
    if (p1.total > 5) {
      const ids1 = new Set(p1.data.map((l: { id: number }) => l.id))
      const overlap = p2.data.filter((l: { id: number }) => ids1.has(l.id))
      expect(overlap.length).toBe(0)
    }
  })
})

test.describe('API: /api/listings/[id]', () => {
  test('returns a single listing by id', async ({ request }) => {
    const list = await (await request.get('/api/listings?limit=1')).json() as { data: { id: number }[] }
    const id = list.data[0]?.id
    expect(id).toBeTruthy()

    const res = await request.get(`/api/listings/${id}`)
    expect(res.status()).toBe(200)
    const listing = await res.json()
    expect(listing.id).toBe(id)
    expect(listing).toHaveProperty('title')
    expect(listing).toHaveProperty('price')
    expect(listing).toHaveProperty('images')
  })

  test('returns 404 for unknown id', async ({ request }) => {
    const res = await request.get('/api/listings/99999999')
    expect(res.status()).toBe(404)
  })
})
