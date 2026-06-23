import type { IScraper } from './IScraper'
import { OtodomScraper } from './scrapers/OtodomScraper'
import { TabelaofertScraper } from './scrapers/TabelaofertScraper'
import { OkolicaScraper } from './scrapers/OkolicaScraper'
import { PropertystarScraper } from './scrapers/PropertystarScraper'
import { RealtingScraper } from './scrapers/RealtingScraper'

export class ScrapingOrchestrator {
  private scrapers: IScraper[] = [
    new OtodomScraper(),
    new TabelaofertScraper(),
    new OkolicaScraper(),
    new PropertystarScraper(),
    new RealtingScraper(),
  ]

  async scrapeAll(): Promise<{ source: string; url: string; rawJson: Record<string, unknown> }[]> {
    const all: { source: string; url: string; rawJson: Record<string, unknown> }[] = []
    for (const scraper of this.scrapers) {
      console.log(`[scrape] Starting ${scraper.source}...`)
      try {
        const results = await scraper.scrape()
        console.log(`[scrape] ${scraper.source}: ${results.length} listings`)
        all.push(...results.map(r => ({ source: scraper.source, url: r.url, rawJson: r.rawJson })))
      } catch (err) {
        console.error(`[scrape] ${scraper.source} failed:`, err)
      }
    }
    return all
  }
}
