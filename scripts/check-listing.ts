import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })
import { prisma } from '@/lib/prisma'

async function main() {
  const id = Number(process.argv[2] || 1263)
  const row = await prisma.listing.findUnique({ where: { id } })
  if (!row) { console.log('Not found'); process.exit(1) }
  console.log('images raw:', String(row.images).slice(0, 200))
  try { JSON.parse(row.images as string); console.log('images JSON: OK') }
  catch (e) { console.log('images JSON: INVALID —', e) }
  await prisma.$disconnect()
}
main()
