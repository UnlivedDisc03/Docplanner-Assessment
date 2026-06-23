import type { ListingRepository } from '@/domain/listing/ListingRepository'
import type { Listing } from '@/domain/listing/Listing'

export class GetListingById {
  constructor(private readonly repository: ListingRepository) {}

  async execute(id: number): Promise<Listing | null> {
    return this.repository.findById(id)
  }
}
