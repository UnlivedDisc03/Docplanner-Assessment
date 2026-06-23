import { BaseScraper } from '../BaseScraper'
import type { IScraper, ScrapedRaw } from '../IScraper'

export class OtodomScraper extends BaseScraper implements IScraper {
  source = 'otodom'

  async scrape(): Promise<ScrapedRaw[]> {
    await this.launch()
    const results: ScrapedRaw[] = []
    try {
      const indexPage = await this.newPage()
      await indexPage.goto('https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/cala-polska?limit=24', { waitUntil: 'networkidle2', timeout: 30000 })
      try { await indexPage.click('[id*="onetrust-accept"]') } catch {}
      await indexPage.waitForSelector('article, [data-cy="listing-item"]', { timeout: 10000 }).catch(() => {})

      const urls: string[] = await indexPage.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/oferta/"]')) as HTMLAnchorElement[]
        return [...new Set(links.map(a => a.href))].slice(0, 20)
      })
      await indexPage.close()

      for (const url of urls) {
        try {
          const page = await this.newPage()
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
          results.push({ url, rawJson: await this.extractPageContent(page) })
          await page.close()
          await this.delay(500)
        } catch (e) { console.warn(`[otodom] skip ${url}`, e) }
      }
    } finally { await this.close() }
    return results
  }
}
