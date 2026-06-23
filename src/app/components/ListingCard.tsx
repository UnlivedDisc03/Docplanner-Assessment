import Link from 'next/link'
import type { Listing } from '@/domain/listing/Listing'

function formatPrice(price: number | null, currency: string) {
  if (price == null) return 'Cena na zapytanie'
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price)
}

export function ListingCard({ listing }: { listing: Listing }) {
  const image = listing.images[0]
  const location = [listing.district, listing.city].filter(Boolean).join(', ')

  return (
    <Link href={`/listing/${listing.id}`} className="group block rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow bg-white">
      <div className="relative h-48 bg-gray-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Brak zdjęcia</div>
        )}
        {listing.propertyType && (
          <span className="absolute top-2 left-2 bg-white/90 text-xs font-medium px-2 py-0.5 rounded-full capitalize">
            {listing.propertyType}
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-lg font-semibold text-emerald-600">{formatPrice(listing.price, listing.currency)}</p>
        {listing.pricePerSqm && (
          <p className="text-xs text-gray-500">{listing.pricePerSqm.toLocaleString('pl-PL')} zł/m²</p>
        )}
        <h3 className="mt-1 text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{listing.title}</h3>
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
          {listing.area && <span>{listing.area} m²</span>}
          {listing.rooms && <span>{listing.rooms} pok.</span>}
          {listing.floor != null && <span>p. {listing.floor}</span>}
        </div>
        {location && <p className="mt-1 text-xs text-gray-400 truncate">{location}</p>}
      </div>
    </Link>
  )
}
