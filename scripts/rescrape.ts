import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })

import { prisma } from '@/lib/prisma'
import { OtodomScraper } from '@/infrastructure/scraping/scrapers/OtodomScraper'
import { PrismaListingRepository } from '@/infrastructure/persistence/PrismaListingRepository'
import { OpenAIListingNormalizer } from '@/infrastructure/ai/OpenAIListingNormalizer'
import { SeedListings } from '@/application/listing/SeedListings'

async function main() {
  // ── 1. Clear existing data ────────────────────────────────────────────────
  console.log('[rescrape] Clearing database...')
  await prisma.listing.deleteMany()
  await prisma.rawListing.deleteMany()
  console.log('[rescrape] Database cleared.\n')

  const repository = new PrismaListingRepository(prisma)
  const normalizer = new OpenAIListingNormalizer()
  const seed = new SeedListings(repository, normalizer)

  // ── 2. Scrape otodom: 100 general + 5 guaranteed Kraków ──────────────────
  console.log('[rescrape] Scraping otodom...')
  const otodom = new OtodomScraper()
  const otodomResults = await otodom.scrape(100, 5)
  const all = otodomResults.map(r => ({ source: 'otodom', url: r.url, rawJson: r.rawJson }))
  console.log(`[rescrape] otodom: ${otodomResults.length} listings\n`)

  console.log(`[rescrape] Total raw scraped: ${all.length}`)
  await seed.seedRaw(all)

  // ── 3. Normalize ──────────────────────────────────────────────────────────
  console.log('\n[rescrape] Normalizing all listings...')
  await seed.normalizeAll(10)

  await prisma.$disconnect()
  console.log('\n[rescrape] Complete!')
}

main().catch(err => { console.error(err); process.exit(1) })
