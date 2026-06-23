import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PrismaListingRepository } from '@/infrastructure/persistence/PrismaListingRepository'
import { GetListingById } from '@/application/listing/GetListingById'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/listings/[id]'>) {
  const { id } = await ctx.params
  const repository = new PrismaListingRepository(prisma)
  const useCase = new GetListingById(repository)
  const listing = await useCase.execute(Number(id))
  if (!listing) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(listing)
}
