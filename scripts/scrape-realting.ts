import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })

import { prisma } from '@/lib/prisma'
import { PrismaListingRepository } from '@/infrastructure/persistence/PrismaListingRepository'
import { SeedListings } from '@/application/listing/SeedListings'
import { RealtingScraper } from '@/infrastructure/scraping/scrapers/RealtingScraper'
import { OpenAIListingNormalizer } from '@/infrastructure/ai/OpenAIListingNormalizer'

async function main() {
  const repository = new PrismaListingRepository(prisma)
  const normalizer = new OpenAIListingNormalizer()
  const seeder = new SeedListings(repository, normalizer)

  console.log('[realting] Scraping individual listings...')
  const scraper = new RealtingScraper()
  const results = await scraper.scrape()
  console.log(`[realting] Found ${results.length} listings`)

  await seeder.seedRaw(results.map(r => ({ ...r, source: scraper.source })))

  console.log('[realting] Normalizing...')
  await seeder.normalizeAll()

  await prisma.$disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })
