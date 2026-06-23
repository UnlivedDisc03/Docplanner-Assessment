import Link from 'next/link'
import type { Listing } from '@/domain/listing/Listing'

function formatPrice(price: number | null, currency: string) {
  if (price == null) return 'Cena na zapytanie'
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price)
}

const LOGO_PATTERNS = ['s=314x236', 's=256x', 'thumbnail', 'thumbs120', 'logo', 'icon', 'avatar', 'agent']

function isListingPhoto(src: string) {
  return !LOGO_PATTERNS.some(p => src.includes(p))
}

function getBestImage(images: string[]) {
  return images.find(isListingPhoto) ?? images.find(src => !src.includes('s=314x236')) ?? images[0]
}

function Badge({ variant, label }: { variant: 'primary' | 'secondary', label: string }) {
  const cls = variant === 'primary'
    ? 'bg-[#1C1C21] text-white'
    : 'bg-white/90 text-[#555] border border-[#ddd]'
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${cls}`}>{label}</span>
}

const AreaIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const RoomsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7v13h18V7"/><path d="M3 7l9-4 9 4"/><rect x="9" y="10" width="6" height="10"/>
  </svg>
)
const FloorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
  </svg>
)
const PinIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
)
const PhotoIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
  </svg>
)

export function ListingCard({ listing }: { listing: Listing }) {
  const image = getBestImage(listing.images)
  const location = [listing.district, listing.city].filter(Boolean).join(', ')

  const floorLabel = listing.floor == null ? null
    : listing.floor === 0 ? 'Parter'
    : `p. ${listing.floor}${listing.totalFloors ? '/' + listing.totalFloors : ''}`

  const roomsLabel = listing.rooms == null ? null
    : listing.rooms === 1 ? '1 pokój'
    : `${listing.rooms} pokoje`

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="group block bg-white rounded-xl border border-[#e8e8e8] overflow-hidden hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Image */}
      <div className="relative h-[180px] bg-[#e0e0e0] overflow-hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={listing.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#aaa] text-sm">Brak zdjęcia</div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {listing.marketType === 'primary' && <Badge variant="primary" label="Pierwotny" />}
          {listing.marketType === 'secondary' && <Badge variant="secondary" label="Wtórny" />}
        </div>

        {/* Save */}
        <div className="absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-base hover:bg-white cursor-pointer transition-colors">
          ♡
        </div>

        {/* Photo count */}
        {listing.images.length > 1 && (
          <div className="absolute bottom-2.5 right-2.5 bg-black/50 text-white text-[11px] px-2 py-0.5 rounded flex items-center gap-1">
            <PhotoIcon />
            {listing.images.length}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pt-3.5 pb-4">
        <div className="text-xl font-bold text-[#1a1a1a]">{formatPrice(listing.price, listing.currency)}</div>
        {listing.pricePerSqm && (
          <div className="text-xs text-[#888] mt-0.5">{listing.pricePerSqm.toLocaleString('pl-PL')} zł/m²</div>
        )}

        <h3 className="text-sm text-[#333] mt-2 line-clamp-2 leading-snug">{listing.title}</h3>

        {/* Stats */}
        <div className="flex gap-3.5 mt-2.5 pt-2.5 border-t border-[#f0f0f0] flex-wrap">
          {listing.area && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-[#444]">
              <span className="text-[#999]"><AreaIcon /></span>
              {listing.area} m²
            </div>
          )}
          {roomsLabel && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-[#444]">
              <span className="text-[#999]"><RoomsIcon /></span>
              {roomsLabel}
            </div>
          )}
          {floorLabel && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-[#444]">
              <span className="text-[#999]"><FloorIcon /></span>
              {floorLabel}
            </div>
          )}
        </div>

        {/* Location */}
        {location && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-[#888]">
            <PinIcon />
            {location}
          </div>
        )}

        <div className="text-[10px] text-[#bbb] uppercase tracking-wide mt-1.5">{listing.source}</div>
      </div>
    </Link>
  )
}
