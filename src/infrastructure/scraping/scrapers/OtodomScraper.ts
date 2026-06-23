import { BaseScraper } from '../BaseScraper'
import type { IScraper, ScrapedRaw } from '../IScraper'

export class OtodomScraper extends BaseScraper implements IScraper {
  source = 'otodom'

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

    const items = await page.evaluate(`(function() {
      try {
        var el = document.getElementById('__NEXT_DATA__')
        if (!el) return []
        var data = JSON.parse(el.textContent || '{}')
        var pp = data.props && data.props.pageProps
        if (!pp) return []
        var items = (pp.data && pp.data.searchAds && pp.data.searchAds.items) ||
                    (pp.adsData && pp.adsData.items) ||
                    pp.listings || []
        return items.map(function(item) {
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
      } catch(e) { return [] }
    })()`) as Record<string, unknown>[]

    await page.close()
    console.log(`[otodom] ${items.length} items from ${label}`)
    return items.map(item => ({ url: item.url as string, rawJson: item }))
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
      // General listings
      for (const { url, label } of generalPages) {
        if (general.length >= maxGeneral) break
        const items = await this.scrapeSearchPage(url, label)
        for (const item of items) {
          if (general.length >= maxGeneral) break
          if (!seen.has(item.url)) { seen.add(item.url); general.push(item) }
        }
        await this.delay(1200)
      }

      // Kraków-specific (additional guaranteed listings)
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
    return total
  }
}
