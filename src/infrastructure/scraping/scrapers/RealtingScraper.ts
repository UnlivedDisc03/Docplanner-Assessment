import { BaseScraper } from '../BaseScraper'
import type { IScraper, ScrapedRaw } from '../IScraper'

export class RealtingScraper extends BaseScraper implements IScraper {
  source = 'realting'

  private async collectUrls(indexUrl: string): Promise<string[]> {
    const indexPage = await this.newPage()
    await indexPage.goto(indexUrl, { waitUntil: 'networkidle2', timeout: 30000 })
    const urls: string[] = await indexPage.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[]
      return [...new Set(
        links.map(a => a.href).filter(h => /realting\.com\/[a-z-]+\/property\/\d+$/.test(h))
      )]
    })
    await indexPage.close()
    return urls
  }

  async scrape(): Promise<ScrapedRaw[]> {
    await this.launch()
    const results: ScrapedRaw[] = []
    const seen = new Set<string>()

    const indexPages = [
      'https://realting.com/poland/property',
      'https://realting.com/poland/krakow/property',
      'https://realting.com/poland/warsaw/property',
      'https://realting.com/poland/wroclaw/property',
    ]

    try {
      const allUrls: string[] = []
      for (const indexUrl of indexPages) {
        console.log(`[realting] collecting from ${indexUrl}`)
        const urls = await this.collectUrls(indexUrl)
        for (const u of urls) {
          if (!seen.has(u)) { seen.add(u); allUrls.push(u) }
        }
        console.log(`[realting] total unique urls so far: ${allUrls.length}`)
        await this.delay(500)
      }

      const targets = allUrls.slice(0, 60)
      for (const url of targets) {
        try {
          const page = await this.newPage()
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
          results.push({ url, rawJson: await this.extractPageContent(page) })
          await page.close()
          await this.delay(500)
        } catch (e) { console.warn(`[realting] skip ${url}`, e) }
      }
    } finally {
      await this.close()
    }

    return results
  }
}
