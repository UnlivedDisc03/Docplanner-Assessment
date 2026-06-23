import 'dotenv/config'
import { BaseScraper } from '../src/infrastructure/scraping/BaseScraper'
import type { IScraper, ScrapedRaw } from '../src/infrastructure/scraping/IScraper'
import { PrismaListingRepository } from '../src/infrastructure/persistence/PrismaListingRepository'

class OtodomKrakowScraper extends BaseScraper implements IScraper {
  source = 'otodom'
  async scrape(): Promise<ScrapedRaw[]> {
    await this.launch()
    const results: ScrapedRaw[] = []
    try {
      const indexPage = await this.newPage()
      await indexPage.goto('https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/malopolskie/krakow?limit=24', { waitUntil: 'networkidle2', timeout: 30000 })
      try { await indexPage.click('[id*="onetrust-accept"]') } catch {}
      await indexPage.waitForSelector('article, [data-cy="listing-item"]', { timeout: 10000 }).catch(() => {})
      const urls: string[] = await indexPage.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/oferta/"]')) as HTMLAnchorElement[]
        return [...new Set(links.map(a => a.href))].slice(0, 12)
      })
      await indexPage.close()
      for (const url of urls) {
        try {
          const page = await this.newPage()
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
          results.push({ url, rawJson: await this.extractPageContent(page) })
          await page.close()
          await this.delay(500)
        } catch (e) { console.warn(`[otodom-krakow] skip ${url}`, e) }
      }
    } finally { await this.close() }
    return results
  }
}

class TabelaofertKrakowScraper extends BaseScraper implements IScraper {
  source = 'tabelaofert'
  async scrape(): Promise<ScrapedRaw[]> {
    await this.launch()
    const results: ScrapedRaw[] = []
    try {
      const indexPage = await this.newPage()
      await indexPage.goto('https://tabelaofert.pl/sprzedaz-mieszkania/krakow', { waitUntil: 'networkidle2', timeout: 30000 })
      const urls: string[] = await indexPage.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[]
        return [...new Set(
          links.map(a => a.href).filter(h => h.includes('tabelaofert.pl') && (h.includes('/oferta/') || h.includes('/mieszkan')))
        )].slice(0, 12)
      })
      await indexPage.close()
      for (const url of urls) {
        try {
          const page = await this.newPage()
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
          results.push({ url, rawJson: await this.extractPageContent(page) })
          await page.close()
          await this.delay(500)
        } catch (e) { console.warn(`[tabelaofert-krakow] skip ${url}`, e) }
      }
    } finally { await this.close() }
    return results
  }
}

class RealtingKrakowScraper extends BaseScraper implements IScraper {
  source = 'realting'
  async scrape(): Promise<ScrapedRaw[]> {
    await this.launch()
    const results: ScrapedRaw[] = []
    try {
      const indexPage = await this.newPage()
      await indexPage.goto('https://realting.com/poland/krakow/property', { waitUntil: 'networkidle2', timeout: 30000 })
      const urls: string[] = await indexPage.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[]
        return [...new Set(
          links.map(a => a.href).filter(h => h.includes('realting.com') && (h.includes('/property/') || h.includes('/real-estate/')))
        )].slice(0, 12)
      })
      await indexPage.close()
      for (const url of urls) {
        try {
          const page = await this.newPage()
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
          results.push({ url, rawJson: await this.extractPageContent(page) })
          await page.close()
          await this.delay(500)
        } catch (e) { console.warn(`[realting-krakow] skip ${url}`, e) }
      }
    } finally { await this.close() }
    return results
  }
}

async function main() {
  const repository = new PrismaListingRepository()
  const scrapers: IScraper[] = [new OtodomKrakowScraper(), new TabelaofertKrakowScraper(), new RealtingKrakowScraper()]
  let total = 0
  for (const scraper of scrapers) {
    console.log(`[krakow] Scraping ${scraper.source}...`)
    try {
      const results = await scraper.scrape()
      console.log(`[krakow] ${scraper.source}: ${results.length} listings`)
      for (const r of results) {
        await repository.saveRaw({ source: scraper.source, url: r.url, rawJson: r.rawJson })
      }
      total += results.length
    } catch (e) { console.error(`[krakow] ${scraper.source} failed:`, e) }
  }
  console.log(`[krakow] Done. ${total} Kraków listings saved.`)
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
