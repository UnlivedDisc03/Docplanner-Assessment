import type { ListingRepository } from '@/domain/listing/ListingRepository'
import type { ListingFilters, PaginatedListings } from '@/domain/listing/Listing'

export class GetListings {
  constructor(private readonly repository: ListingRepository) {}

  async execute(filters: ListingFilters): Promise<PaginatedListings> {
    return this.repository.findAll(filters)
  }
}
