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
  city: string | null
  district: string | null
  address: string | null
  lat: number | null
  lng: number | null
  images: string[]
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
  page?: number
  limit?: number
}

export interface PaginatedListings {
  data: Listing[]
  total: number
  page: number
  totalPages: number
}
