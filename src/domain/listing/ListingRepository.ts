import type { Listing, ListingFilters, PaginatedListings } from './Listing'

export interface RawListingInput {
  source: string
  url: string
  rawJson: Record<string, unknown>
  rawHtml?: string
}

export interface UnprocessedRaw {
  id: number
  source: string
  url: string
  rawJson: unknown
}

export interface ListingInput {
  source: string
  url: string
  title: string
  description: string
  price: number | null
  pricePerSqm: number | null
  currency: string
  area: number | null
  rooms: number | null
  floor: number | null
  totalFloors: number | null
  yearBuilt: number | null
  city: string | null
  district: string | null
  address: string | null
  lat: number | null
  lng: number | null
  images: string[]
}

export interface ListingRepository {
  findAll(filters: ListingFilters): Promise<PaginatedListings>
  findById(id: number): Promise<Listing | null>
  saveRaw(data: RawListingInput): Promise<number>
  saveListing(rawId: number, data: ListingInput): Promise<void>
  findUnprocessedRaw(): Promise<UnprocessedRaw[]>
}
