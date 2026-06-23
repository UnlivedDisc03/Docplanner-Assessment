import { BaseScraper } from '../BaseScraper'
import type { IScraper, ScrapedRaw } from '../IScraper'

export class RealtingScraper extends BaseScraper implements IScraper {
  source = 'realting'

  async scrape(): Promise<ScrapedRaw[]> {
    await this.launch()
    const results: ScrapedRaw[] = []
    try {
      const indexPage = await this.newPage()
      await indexPage.goto('https://realting.com/poland/property', { waitUntil: 'networkidle2', timeout: 30000 })

      const urls: string[] = await indexPage.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[]
        return [...new Set(
          links.map(a => a.href).filter(h => h.includes('realting.com') && (h.includes('/property/') || h.includes('/real-estate/')))
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
        } catch (e) { console.warn(`[realting] skip ${url}`, e) }
      }
    } finally { await this.close() }
    return results
  }
}
