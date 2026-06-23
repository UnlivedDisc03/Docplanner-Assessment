import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })
import { prisma } from '@/lib/prisma'
import { PrismaListingRepository } from '@/infrastructure/persistence/PrismaListingRepository'
import { OpenAIListingNormalizer } from '@/infrastructure/ai/OpenAIListingNormalizer'
import { SeedListings } from '@/application/listing/SeedListings'

async function main() {
  const repository = new PrismaListingRepository(prisma)
  const normalizer = new OpenAIListingNormalizer()
  const seeder = new SeedListings(repository, normalizer)
  await seeder.normalizeAll()
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
