export interface NormalizedListing {
  title: string
  description: string
  price: number | null
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
}

export interface RawForNormalization {
  source: string
  url: string
  rawJson: Record<string, unknown>
}

export interface ListingNormalizer {
  normalize(raw: RawForNormalization): Promise<NormalizedListing>
}
