import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })

import { prisma } from '@/lib/prisma'
import { PrismaListingRepository } from '@/infrastructure/persistence/PrismaListingRepository'
import { SeedListings } from '@/application/listing/SeedListings'
import { OtodomScraper } from '@/infrastructure/scraping/scrapers/OtodomScraper'
import { OpenAIListingNormalizer } from '@/infrastructure/ai/OpenAIListingNormalizer'

async function main() {
  console.log('[scrape-all] Clearing database...')
  await prisma.listing.deleteMany()
  await prisma.rawListing.deleteMany()
  console.log('[scrape-all] Database cleared.')

  const repository = new PrismaListingRepository(prisma)
  const normalizer = new OpenAIListingNormalizer()
  const seeder = new SeedListings(repository, normalizer)

  console.log('\n[scrape-all] === Otodom ===')
  const otodom = new OtodomScraper()
  const results = await otodom.scrape()
  console.log(`[scrape-all] Otodom: ${results.length} listings scraped`)
  if (results.length > 0) {
    await seeder.seedRaw(results.map(r => ({ ...r, source: otodom.source })))
  }

  console.log(`\n[scrape-all] Total raw: ${results.length}`)

  console.log('\n[scrape-all] === Normalizing ===')
  await seeder.normalizeAll()

  const total = await prisma.listing.count()
  const krakowCount = await prisma.listing.count({ where: { city: { contains: 'rakow' } } })
  console.log(`\n[scrape-all] Done. ${total} listings in DB, ~${krakowCount} in Kraków.`)

  await prisma.$disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })
