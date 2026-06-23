export interface Listing {
  id: number
  rawId: number
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
  monthlyFee: number | null
  propertyType: string | null
  marketType: string | null
  condition: string | null
  heatingType: string | null
  hasBalcony: boolean | null
  hasParking: boolean | null
  hasGarden: boolean | null
  hasElevator: boolean | null
  extras: Record<string, unknown> | null
  city: string | null
  district: string | null
  address: string | null
  lat: number | null
  lng: number | null
  images: string[]
  aiSummary: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ListingFilters {
  q?: string
  city?: string
  priceMin?: number
  priceMax?: number
  areaMin?: number
  areaMax?: number
  rooms?: number
  marketType?: 'primary' | 'secondary'
  propertyTypes?: string[]
  conditions?: string[]
  hasBalcony?: boolean
  hasParking?: boolean
  hasGarden?: boolean
  hasElevator?: boolean
  hasExtras?: boolean
  page?: number
  limit?: number
}

export interface PaginatedListings {
  data: Listing[]
  total: number
  page: number
  totalPages: number
}
