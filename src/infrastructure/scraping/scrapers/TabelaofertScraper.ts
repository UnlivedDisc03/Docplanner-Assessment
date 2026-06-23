import { BaseScraper } from '../BaseScraper'
import type { IScraper, ScrapedRaw } from '../IScraper'

export class TabelaofertScraper extends BaseScraper implements IScraper {
  source = 'tabelaofert'

  async scrape(): Promise<ScrapedRaw[]> {
    await this.launch()
    const results: ScrapedRaw[] = []
    try {
      const indexPage = await this.newPage()
      await indexPage.goto('https://tabelaofert.pl/sprzedaz-mieszkania', { waitUntil: 'networkidle2', timeout: 30000 })

      const urls: string[] = await indexPage.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[]
        return [...new Set(
          links.map(a => a.href).filter(h => h.includes('tabelaofert.pl') && (h.includes('/oferta/') || h.includes('/mieszkan')))
        )].slice(0, 35)
      })
      await indexPage.close()

      for (const url of urls) {
        try {
          const page = await this.newPage()
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
          results.push({ url, rawJson: await this.extractPageContent(page) })
          await page.close()
          await this.delay(500)
        } catch (e) { console.warn(`[tabelaofert] skip ${url}`, e) }
      }
    } finally { await this.close() }
    return results
  }
}
