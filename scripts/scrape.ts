import 'dotenv/config'
import { ScrapingOrchestrator } from '../src/infrastructure/scraping/ScrapingOrchestrator'
import { PrismaListingRepository } from '../src/infrastructure/persistence/PrismaListingRepository'
import { OpenAIListingNormalizer } from '../src/infrastructure/ai/OpenAIListingNormalizer'
import { SeedListings } from '../src/application/listing/SeedListings'

async function main() {
  const repository = new PrismaListingRepository()
  const normalizer = new OpenAIListingNormalizer()
  const seed = new SeedListings(repository, normalizer)
  const orchestrator = new ScrapingOrchestrator()

  console.log('[scrape] Phase 1: Scraping raw listings...')
  const raw = await orchestrator.scrapeAll()
  await seed.seedRaw(raw)

  console.log(`[scrape] Phase 1 complete. ${raw.length} raw listings saved to DB.`)
  console.log('[scrape] Stopping here for schema analysis.')
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
