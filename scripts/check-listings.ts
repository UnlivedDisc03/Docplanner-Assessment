import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })
import { prisma } from '@/lib/prisma'

async function main() {
  const total = await prisma.listing.count()
  const withSummary = await prisma.listing.count({ where: { aiSummary: { not: null } } })
  const sample = await prisma.listing.findFirst({ where: { aiSummary: { not: null } }, select: { aiSummary: true } })
  console.log('Total listings:', total)
  console.log('With aiSummary:', withSummary)
  console.log('Sample:', sample?.aiSummary?.slice(0, 150) ?? 'none found')
  await prisma.$disconnect()
}
main()
