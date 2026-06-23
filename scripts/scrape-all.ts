import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })

import { prisma } from '@/lib/prisma'
import { PrismaListingRepository } from '@/infrastructure/persistence/PrismaListingRepository'
import { SeedListings } from '@/application/listing/SeedListings'
import { OtodomScraper } from '@/infrastructure/scraping/scrapers/OtodomScraper'
import { RealtingScraper } from '@/infrastructure/scraping/scrapers/RealtingScraper'
import { OpenAIListingNormalizer } from '@/infrastructure/ai/OpenAIListingNormalizer'

async function main() {
  console.log('[scrape-all] Clearing database...')
  await prisma.listing.deleteMany()
  await prisma.rawListing.deleteMany()
  console.log('[scrape-all] Database cleared.')

  const repository = new PrismaListingRepository(prisma)
  const normalizer = new OpenAIListingNormalizer()
  const seeder = new SeedListings(repository, normalizer)

  // ── Otodom (extracts from __NEXT_DATA__ — no per-listing 403s) ──────────
  console.log('\n[scrape-all] === Otodom ===')
  const otodom = new OtodomScraper()
  const otodomResults = await otodom.scrape()
  console.log(`[scrape-all] Otodom: ${otodomResults.length} listings scraped`)
  if (otodomResults.length > 0) {
    await seeder.seedRaw(otodomResults.map(r => ({ ...r, source: otodom.source })))
  }

  // ── Realting (individual listing pages with JSON-LD) ────────────────────
  console.log('\n[scrape-all] === Realting ===')
  const realting = new RealtingScraper()
  const realtingResults = await realting.scrape()
  console.log(`[scrape-all] Realting: ${realtingResults.length} listings scraped`)
  if (realtingResults.length > 0) {
    await seeder.seedRaw(realtingResults.map(r => ({ ...r, source: realting.source })))
  }

  const totalRaw = otodomResults.length + realtingResults.length
  console.log(`\n[scrape-all] Total raw: ${totalRaw}`)

  // ── Normalize all ───────────────────────────────────────────────────────
  console.log('\n[scrape-all] === Normalizing ===')
  await seeder.normalizeAll()

  const total = await prisma.listing.count()
  const krakowCount = await prisma.listing.count({ where: { city: { contains: 'rakow' } } })
  console.log(`\n[scrape-all] Done. ${total} listings in DB, ~${krakowCount} in Kraków.`)

  await prisma.$disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })
