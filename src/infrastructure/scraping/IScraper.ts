export interface ScrapedRaw {
  url: string
  rawJson: Record<string, unknown>
}

export interface IScraper {
  source: string
  scrape(): Promise<ScrapedRaw[]>
}
