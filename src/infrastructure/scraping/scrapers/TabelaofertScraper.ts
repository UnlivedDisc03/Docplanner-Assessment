import { BaseScraper } from '../BaseScraper'
import type { IScraper, ScrapedRaw } from '../IScraper'

export class TabelaofertScraper extends BaseScraper implements IScraper {
  source = 'tabelaofert'

  async scrape(max = 30): Promise<ScrapedRaw[]> {
    await this.launch()
    const results: ScrapedRaw[] = []
    const seen = new Set<string>()

    // Individual listing URLs have a numeric ID segment after /oferta/
    const isListingUrl = (h: string) =>
      /tabelaofert\.pl\/oferta\/[^/]*\d{4,}/.test(h)

    const searchPages = [
      'https://tabelaofert.pl/sprzedaz/mieszkania',
      'https://tabelaofert.pl/sprzedaz/mieszkania?page=2',
      'https://tabelaofert.pl/sprzedaz/mieszkania/krakow',
    ]

    try {
      const allUrls: string[] = []

      for (const searchUrl of searchPages) {
        if (allUrls.length >= max * 2) break
        const indexPage = await this.newPage()
        try {
          await indexPage.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 })
          // Dismiss cookie consent if present
          try { await indexPage.click('[id*="accept"], [class*="accept"], button[data-accept]') } catch {}
          await this.delay(1000)

          const isBlocked: boolean = await indexPage.evaluate(`(function() {
            var t = document.title || ''
            var b = document.body ? document.body.innerText : ''
            return t.includes('Cloudflare') || t.includes('Just a moment') ||
                   b.includes('Performing security verification') || b.includes('Please wait')
          })()`) as boolean

          if (isBlocked) {
            console.log(`[tabelaofert] Cloudflare block on ${searchUrl}, skipping`)
            await indexPage.close()
            continue
          }

          const urls: string[] = await indexPage.evaluate(`(function() {
            return Array.from(document.querySelectorAll('a[href]'))
              .map(function(a) { return a.href })
              .filter(function(h) {
                return h.includes('tabelaofert.pl/oferta/') && /\\d{4,}/.test(h)
              })
          })()`) as string[]

          allUrls.push(...urls.filter(u => !seen.has(u)))
          console.log(`[tabelaofert] found ${urls.length} listing URLs on ${searchUrl}`)
        } catch (e) {
          console.warn(`[tabelaofert] failed to load ${searchUrl}:`, (e as Error).message?.slice(0, 80))
        }
        await indexPage.close()
        await this.delay(1500)
      }

      // Deduplicate
      const uniqueUrls = [...new Set(allUrls)].slice(0, max)
      console.log(`[tabelaofert] visiting ${uniqueUrls.length} unique listing pages`)

      for (const url of uniqueUrls) {
        if (results.length >= max) break
        if (seen.has(url)) continue
        seen.add(url)

        const page = await this.newPage()
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
          await this.delay(800)

          const isBlocked: boolean = await page.evaluate(`(function() {
            var t = document.title || ''
            var b = document.body ? document.body.innerText : ''
            return t.includes('Cloudflare') || t.includes('Just a moment') ||
                   b.includes('Performing security verification') || b.includes('Please wait')
          })()`) as boolean

          if (isBlocked) {
            console.log(`[tabelaofert] blocked on ${url}, skipping`)
            await page.close()
            continue
          }

          const content = await this.extractPageContent(page)
          if (content.text.length > 100) {
            results.push({ url, rawJson: content })
            console.log(`[tabelaofert] ✓ ${url}`)
          }
        } catch (e) {
          console.warn(`[tabelaofert] skip ${url}:`, (e as Error).message?.slice(0, 80))
        }
        await page.close()
        await this.delay(1000)
      }
    } finally {
      await this.close()
    }

    console.log(`[tabelaofert] scraped ${results.length} listings`)
    return results
  }
}
