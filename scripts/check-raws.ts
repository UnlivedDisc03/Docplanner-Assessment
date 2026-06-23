import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })
import { prisma } from '@/lib/prisma'

async function main() {
  const total = await prisma.rawListing.count()
  const sample = await prisma.rawListing.findFirst({ orderBy: { id: 'desc' } })
  const j = sample?.rawJson as Record<string, unknown>
  console.log('Total raws:', total)
  console.log('characteristics:', j?.characteristics ? String(j.characteristics).slice(0, 400) : 'MISSING')
  console.log('fullDescription:', j?.fullDescription ? String(j.fullDescription).slice(0, 100) : 'MISSING')
  await prisma.$disconnect()
}
main()
