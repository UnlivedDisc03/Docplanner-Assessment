import { BaseScraper } from '../BaseScraper'
import type { IScraper, ScrapedRaw } from '../IScraper'

export class OkolicaScraper extends BaseScraper implements IScraper {
  source = 'okolica'

  async scrape(): Promise<ScrapedRaw[]> {
    await this.launch()
    const results: ScrapedRaw[] = []
    try {
      const indexPage = await this.newPage()
      await indexPage.goto('https://www.okolica.pl/nieruchomosci/sprzedaz/mieszkania', { waitUntil: 'networkidle2', timeout: 30000 })

      const urls: string[] = await indexPage.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[]
        return [...new Set(
          links.map(a => a.href).filter(h => h.includes('okolica.pl') && h.length > 40)
        )].filter(h => !h.endsWith('/mieszkania')).slice(0, 20)
      })
      await indexPage.close()

      for (const url of urls) {
        try {
          const page = await this.newPage()
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
          results.push({ url, rawJson: await this.extractPageContent(page) })
          await page.close()
          await this.delay(500)
        } catch (e) { console.warn(`[okolica] skip ${url}`, e) }
      }
    } finally { await this.close() }
    return results
  }
}
