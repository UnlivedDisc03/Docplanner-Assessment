export interface ScrapedRaw {
  url: string
  rawJson: { text: string; images: string[] }
}

export interface IScraper {
  source: string
  scrape(): Promise<ScrapedRaw[]>
}
