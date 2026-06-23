import { type PrismaClient, Prisma } from '@prisma/client'
import { prisma as defaultPrisma } from '@/lib/prisma'
import type { ListingRepository, RawListingInput, UnprocessedRaw, ListingInput } from '@/domain/listing/ListingRepository'
import type { Listing, ListingFilters, PaginatedListings } from '@/domain/listing/Listing'

type ListingRow = {
  id: number; rawId: number; source: string; url: string; title: string;
  description: string; price: number | null; pricePerSqm: number | null;
  currency: string; area: number | null; rooms: number | null; floor: number | null;
  totalFloors: number | null; yearBuilt: number | null;
  monthlyFee: number | null; propertyType: string | null; marketType: string | null;
  condition: string | null; heatingType: string | null;
  hasBalcony: boolean | null; hasParking: boolean | null; hasGarden: boolean | null; hasElevator: boolean | null;
  extras: unknown;
  city: string | null; district: string | null; address: string | null;
  lat: number | null; lng: number | null;
  images: string; aiSummary: string | null; createdAt: Date; updatedAt: Date;
}

export class PrismaListingRepository implements ListingRepository {
  private readonly prisma: PrismaClient

  constructor(client?: PrismaClient) {
    this.prisma = client ?? defaultPrisma
  }

  async findAll(filters: ListingFilters): Promise<PaginatedListings> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const skip = (page - 1) * limit
    const where = this.buildWhere(filters)

    const [rows, total] = await Promise.all([
      this.prisma.listing.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.listing.count({ where }),
    ])

    return { data: rows.map(r => this.mapRow(r as ListingRow)), total, page, totalPages: Math.ceil(total / limit) }
  }

  async findById(id: number): Promise<Listing | null> {
    const row = await this.prisma.listing.findUnique({ where: { id } })
    return row ? this.mapRow(row as ListingRow) : null
  }

  async saveRaw(data: RawListingInput): Promise<number> {
    const row = await this.prisma.rawListing.upsert({
      where: { url: data.url },
      update: { rawJson: data.rawJson as Prisma.InputJsonValue, rawHtml: data.rawHtml },
      create: { source: data.source, url: data.url, rawJson: data.rawJson as Prisma.InputJsonValue, rawHtml: data.rawHtml },
    })
    return row.id
  }

  async saveListing(rawId: number, data: ListingInput): Promise<void> {
    const payload = {
      ...data,
      title: data.title ?? 'Bez tytułu',
      description: data.description ?? '',
      images: JSON.stringify(Array.isArray(data.images) ? data.images : []),
      extras: data.extras != null ? (data.extras as Prisma.InputJsonValue) : Prisma.DbNull,
    }
    await this.prisma.listing.upsert({
      where: { rawId },
      update: payload,
      create: { rawId, ...payload },
    })
  }

  async findUnprocessedRaw(): Promise<UnprocessedRaw[]> {
    const rows = await this.prisma.rawListing.findMany({ where: { listing: null } })
    return rows.map(r => ({ id: r.id, source: r.source, url: r.url, rawJson: r.rawJson }))
  }

  private buildWhere(filters: ListingFilters): Record<string, unknown> {
    const where: Record<string, unknown> = {}
    if (filters.q) where.OR = [
      { title: { contains: filters.q } },
      { description: { contains: filters.q } },
    ]
    if (filters.city) where.city = { contains: filters.city }
    if (filters.rooms != null) where.rooms = filters.rooms
    if (filters.marketType) where.marketType = filters.marketType
    if (filters.priceMin != null || filters.priceMax != null) {
      where.price = {
        ...(filters.priceMin != null && { gte: filters.priceMin }),
        ...(filters.priceMax != null && { lte: filters.priceMax }),
      }
    }
    if (filters.areaMin != null || filters.areaMax != null) {
      where.area = {
        ...(filters.areaMin != null && { gte: filters.areaMin }),
        ...(filters.areaMax != null && { lte: filters.areaMax }),
      }
    }
    if (filters.propertyTypes?.length) where.propertyType = { in: filters.propertyTypes }
    if (filters.conditions?.length) where.condition = { in: filters.conditions }
    if (filters.hasBalcony) where.hasBalcony = true
    if (filters.hasParking) where.hasParking = true
    if (filters.hasGarden) where.hasGarden = true
    if (filters.hasElevator) where.hasElevator = true
    if (filters.hasExtras) where.extras = { not: null }
    return where
  }

  private mapRow(row: ListingRow): Listing {
    return {
      ...row,
      images: JSON.parse(row.images || '[]'),
      extras: (row.extras as Record<string, unknown>) ?? null,
    }
  }
}
