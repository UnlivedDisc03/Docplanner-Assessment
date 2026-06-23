import { BaseScraper } from '../BaseScraper'
import type { IScraper, ScrapedRaw } from '../IScraper'

export class OtodomScraper extends BaseScraper implements IScraper {
  source = 'otodom'
  private buildId: string | null = null

  private async scrapeSearchPage(url: string, label: string): Promise<ScrapedRaw[]> {
    const page = await this.newPage()
    console.log(`[otodom] loading ${label}...`)
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 })
    } catch {
      await page.close()
      return []
    }
    try { await page.click('[id*="onetrust-accept"]') } catch {}
    await this.delay(1500)

    const result = await page.evaluate(`(function() {
      try {
        var el = document.getElementById('__NEXT_DATA__')
        if (!el) return { items: [], buildId: null }
        var data = JSON.parse(el.textContent || '{}')
        var buildId = data.buildId || null
        var pp = data.props && data.props.pageProps
        if (!pp) return { items: [], buildId: buildId }
        var items = (pp.data && pp.data.searchAds && pp.data.searchAds.items) ||
                    (pp.adsData && pp.adsData.items) ||
                    pp.listings || []
        var mapped = items.map(function(item) {
          var imgs = []
          if (item.images) {
            imgs = item.images.map(function(img) {
              return (typeof img === 'string') ? img : (img.large || img.medium || img.thumbnail || '')
            }).filter(function(s) { return s && s.startsWith('http') })
          }
          var loc = item.location || {}
          var addr = loc.address || {}
          return {
            url: item.slug ? 'https://www.otodom.pl/pl/oferta/' + item.slug : null,
            slug: item.slug || null,
            title: item.title || item.name || null,
            price: (item.totalPrice && item.totalPrice.value) || (item.price && item.price.value) || null,
            currency: (item.totalPrice && item.totalPrice.currency) || 'PLN',
            area: item.areaInSquareMeters || item.area || null,
            rooms: item.roomsNumber || item.rooms || null,
            city: (addr.city && addr.city.name) || null,
            district: (addr.district && addr.district.name) || null,
            address: (addr.street && addr.street.name) || null,
            lat: (loc.coordinates && loc.coordinates.latitude) || null,
            lng: (loc.coordinates && loc.coordinates.longitude) || null,
            images: imgs,
            description: item.shortDescription || item.description || '',
            floor: item.floor || null,
            totalFloors: item.totalFloors || null,
            propertyType: item.estate || 'apartment',
            marketType: item.market === 'PRIMARY' ? 'primary' : item.market === 'SECONDARY' ? 'secondary' : null,
            yearBuilt: item.buildYear || null,
            pricePerSqm: (item.pricePerSquareMeter && item.pricePerSquareMeter.value) || null,
          }
        }).filter(function(item) { return item.url && item.title })
        return { items: mapped, buildId: buildId }
      } catch(e) { return { items: [], buildId: null } }
    })()`) as { items: Record<string, unknown>[], buildId: string | null }

    await page.close()
    if (!this.buildId && result.buildId) this.buildId = result.buildId
    console.log(`[otodom] ${result.items.length} items from ${label}`)
    return result.items.map(item => ({ url: item.url as string, rawJson: item }))
  }

  private async fetchListingDetails(slug: string): Promise<{
    description: string | null
    characteristics: string
    images: string[]
  }> {
    if (!this.buildId) return { description: null, characteristics: '', images: [] }
    try {
      const apiUrl = `https://www.otodom.pl/_next/data/${this.buildId}/pl/oferta/${slug}.json`
      const res = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'pl-PL,pl;q=0.9',
          'Referer': 'https://www.otodom.pl/',
        },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) return { description: null, characteristics: '', images: [] }
      const data = await res.json() as Record<string, unknown>
      const ad = (data as Record<string, Record<string, unknown>>)?.pageProps?.ad as Record<string, unknown> | undefined
      if (!ad) return { description: null, characteristics: '', images: [] }

      const description = typeof ad.description === 'string' && ad.description.length > 50
        ? ad.description : null

      // Use ad.target — clean key-value pairs with actual values (localizedValue is empty for most fields)
      const target = (ad.target as Record<string, unknown>) || {}
      const charLines: string[] = []
      const arrayVal = (v: unknown) => Array.isArray(v) ? v.join(', ') : String(v ?? '')
      if (target.Area) charLines.push(`area_m2: ${target.Area}`)
      if (target.Rent) charLines.push(`rent_pln: ${target.Rent}`)
      if (target.Price) charLines.push(`price_pln: ${target.Price}`)
      if (target.Rooms_num) charLines.push(`rooms: ${arrayVal(target.Rooms_num)}`)
      if (target.Floor_no) charLines.push(`floor: ${arrayVal(target.Floor_no)}`)
      if (target.Building_floors_num) charLines.push(`total_floors: ${target.Building_floors_num}`)
      if (target.Construction_status) charLines.push(`construction_status: ${arrayVal(target.Construction_status)}`)
      if (target.MarketType) charLines.push(`market: ${target.MarketType}`)
      if (target.Heating) charLines.push(`heating: ${arrayVal(target.Heating)}`)
      if (target.Build_year) charLines.push(`build_year: ${target.Build_year}`)
      if (target.Building_type) charLines.push(`building_type: ${arrayVal(target.Building_type)}`)
      if (target.Building_material) charLines.push(`building_material: ${arrayVal(target.Building_material)}`)
      if (target.Building_ownership) charLines.push(`ownership: ${arrayVal(target.Building_ownership)}`)
      if (target.Extras_types) charLines.push(`extras: ${arrayVal(target.Extras_types)}`)
      if (target.Equipment_types) charLines.push(`equipment: ${arrayVal(target.Equipment_types)}`)
      if (target.Security_types) charLines.push(`security: ${arrayVal(target.Security_types)}`)
      if (target.City) charLines.push(`city: ${target.City}`)
      // lift field: "::n" = no, "::y" = yes
      const lift = ad.additionalInformation && (ad.additionalInformation as unknown[])
        .find((x): x is Record<string, unknown> => (x as Record<string, unknown>)?.label === 'lift')
      if (lift) {
        const liftVal = Array.isArray((lift as Record<string, unknown>).values)
          ? ((lift as Record<string, unknown>).values as string[])[0] : ''
        charLines.push(`lift: ${liftVal.includes('::y') ? 'yes' : 'no'}`)
      }
      const chars = charLines.join('\n')

      // Higher-res images from detail page
      const images = ((ad.images as unknown[]) || [])
        .filter((img): img is Record<string, unknown> => !!img && typeof img === 'object')
        .map(img => (img.large || img.medium || img.thumbnail || '') as string)
        .filter(s => s.startsWith('http'))

      return { description, characteristics: chars, images }
    } catch {
      return { description: null, characteristics: '', images: [] }
    }
  }

  async scrape(maxGeneral = 100, krakowExtra = 5): Promise<ScrapedRaw[]> {
    await this.launch()
    const general: ScrapedRaw[] = []
    const krakow: ScrapedRaw[] = []
    const seen = new Set<string>()

    const generalPages = [
      { url: 'https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/cala-polska?limit=72', label: 'Polska p1' },
      { url: 'https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/cala-polska?limit=72&page=2', label: 'Polska p2' },
      { url: 'https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/cala-polska?limit=72&page=3', label: 'Polska p3' },
    ]

    try {
      for (const { url, label } of generalPages) {
        if (general.length >= maxGeneral) break
        const items = await this.scrapeSearchPage(url, label)
        for (const item of items) {
          if (general.length >= maxGeneral) break
          if (!seen.has(item.url)) { seen.add(item.url); general.push(item) }
        }
        await this.delay(1200)
      }

      const krakowItems = await this.scrapeSearchPage(
        'https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/malopolskie/krakow/krakow?limit=36',
        'Kraków'
      )
      for (const item of krakowItems) {
        if (krakow.length >= krakowExtra) break
        if (!seen.has(item.url)) { seen.add(item.url); krakow.push(item) }
      }
    } finally {
      await this.close()
    }

    const total = [...general, ...krakow]
    console.log(`[otodom] total: ${total.length} (${general.length} general + ${krakow.length} Kraków)`)

    if (this.buildId) {
      console.log(`[otodom] fetching full details for ${total.length} listings (buildId: ${this.buildId})...`)
      const concurrency = 10
      let fetched = 0
      for (let i = 0; i < total.length; i += concurrency) {
        const batch = total.slice(i, i + concurrency)
        await Promise.all(batch.map(async (item) => {
          const slug = (item.rawJson as Record<string, unknown>).slug as string || item.url.split('/').pop() || ''
          const details = await this.fetchListingDetails(slug)
          const raw = item.rawJson as Record<string, unknown>
          if (details.description) raw.fullDescription = details.description
          if (details.characteristics) raw.characteristics = details.characteristics
          if (details.images.length > 0) raw.images = details.images
          if (details.description || details.characteristics) fetched++
        }))
      }
      console.log(`[otodom] full details fetched for ${fetched}/${total.length} listings`)
    } else {
      console.warn('[otodom] buildId not found — skipping full detail fetch')
    }

    return total
  }
}
