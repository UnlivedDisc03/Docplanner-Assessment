import type { ListingRepository } from '@/domain/listing/ListingRepository'
import type { ListingNormalizer } from '@/domain/listing/ListingNormalizer'

export class SeedListings {
  constructor(
    private readonly repository: ListingRepository,
    private readonly normalizer: ListingNormalizer,
  ) {}

  async seedRaw(listings: { source: string; url: string; rawJson: Record<string, unknown> }[]): Promise<void> {
    for (const listing of listings) {
      await this.repository.saveRaw(listing)
    }
    console.log(`[seed] Saved ${listings.length} raw listings`)
  }

  async normalizeAll(concurrency = 10): Promise<void> {
    const unprocessed = await this.repository.findUnprocessedRaw()
    console.log(`[seed] Normalizing ${unprocessed.length} listings (concurrency: ${concurrency})...`)

    const processOne = async (raw: typeof unprocessed[0]) => {
      try {
        const normalized = await this.normalizer.normalize({
          source: raw.source,
          url: raw.url,
          rawJson: raw.rawJson as Record<string, unknown>,
        })
        const pricePerSqm = normalized.price && normalized.area
          ? Math.round(normalized.price / normalized.area)
          : null
        await this.repository.saveListing(raw.id, { source: raw.source, url: raw.url, ...normalized, pricePerSqm })
        console.log(`[seed] ✓ ${normalized.title || raw.url}`)
      } catch (err) {
        console.error(`[seed] ✗ ${raw.url}:`, (err as Error).message?.split('\n')[0])
      }
    }

    for (let i = 0; i < unprocessed.length; i += concurrency) {
      await Promise.all(unprocessed.slice(i, i + concurrency).map(processOne))
    }
  }
}
