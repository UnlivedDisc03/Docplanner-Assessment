import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PrismaListingRepository } from '@/infrastructure/persistence/PrismaListingRepository'
import { GetListingById } from '@/application/listing/GetListingById'
import { ListingGallery } from '@/app/components/ListingGallery'

// ── helpers ──────────────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  return html
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function formatPrice(price: number | null, currency: string) {
  if (!price) return 'Cena na zapytanie'
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency || 'PLN',
    maximumFractionDigits: 0,
  }).format(price)
}

function StatBox({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value == null || value === ''
  return (
    <div className="p-3.5 border-r border-[#ececec] last:border-r-0">
      <div className="text-[10px] text-[#999] uppercase tracking-wider">{label}</div>
      {empty
        ? <div className="text-base text-[#bbb] italic mt-0.5">Nie podano</div>
        : <div className="text-lg font-bold text-[#1a1a1a] mt-0.5">{value}</div>
      }
    </div>
  )
}

function DetailRow({ label, value, fallback }: { label: string; value?: string | number | null; fallback?: boolean }) {
  if (value == null && !fallback) return null
  return (
    <div className="flex justify-between py-3 border-b border-[#f0f0f0] text-sm last:border-b-0">
      <span className="text-[#999]">{label}</span>
      {value != null
        ? <span className="font-medium text-[#1a1a1a]">{value}</span>
        : <span className="text-[#bbb] italic">Nie podano</span>
      }
    </div>
  )
}

export default async function ListingPage(props: PageProps<'/listing/[id]'>) {
  const { id } = await props.params
  const repository = new PrismaListingRepository(prisma)
  const useCase = new GetListingById(repository)
  const listing = await useCase.execute(Number(id))
  if (!listing) notFound()

  const badPatterns = ['s=314x236', 's=256x', 'thumbnail', 'logo', 'icon', 'avatar', 'agent']
  const goodImages = listing.images.filter(src => !badPatterns.some(p => src.includes(p)))
  const price = formatPrice(listing.price, listing.currency)
  const location = [listing.address, listing.district, listing.city].filter(Boolean).join(', ')

  const amenities = [
    listing.hasBalcony && 'Balkon',
    listing.hasParking && 'Parking / Garaż',
    listing.hasGarden && 'Ogród',
    listing.hasElevator && 'Winda',
  ].filter(Boolean) as string[]

  const marketLabel = listing.marketType === 'primary' ? 'Pierwotny' : listing.marketType === 'secondary' ? 'Wtórny' : null
  const conditionLabel: Record<string, string> = { move_in_ready: 'Do zamieszkania', needs_renovation: 'Do remontu', high_standard: 'Wysoki standard', developer_state: 'Stan deweloperski' }
  const heatingLabel: Record<string, string> = { district: 'Miejskie', gas: 'Gazowe', electric: 'Elektryczne', floor: 'Podłogowe', other: 'Inne' }

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-5">
      {/* Breadcrumb */}
      <nav className="text-sm text-[#888] mb-4 flex gap-1.5 items-center">
        <Link href="/" className="text-[#00C97A] hover:underline">Ogłoszenia</Link>
        {listing.city && <><span>›</span><Link href={`/?city=${listing.city}`} className="text-[#00C97A] hover:underline">{listing.city}</Link></>}
        {listing.district && <><span>›</span><span>{listing.district}</span></>}
      </nav>

      {/* Gallery */}
      <ListingGallery images={goodImages} title={listing.title} />

      {/* 2-column layout: left content + right sticky price card */}
      <div className="grid grid-cols-[1fr_340px] gap-6 items-start">

        {/* LEFT */}
        <div>
          {/* Type badges */}
          <div className="flex gap-2 flex-wrap mb-3">
            {marketLabel && <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-[#f0f0f0] text-[#555] uppercase tracking-wide">{marketLabel}</span>}
            {listing.propertyType && <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-[#f0f0f0] text-[#555] uppercase tracking-wide capitalize">{listing.propertyType}</span>}
            {listing.condition && <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-[#f0f0f0] text-[#555] uppercase tracking-wide">{conditionLabel[listing.condition] ?? listing.condition}</span>}
          </div>

          {/* Title + location */}
          <h1 className="text-2xl font-extrabold text-[#1a1a1a] leading-tight">{listing.title}</h1>
          {location && (
            <div className="flex items-center gap-1.5 mt-2 text-sm text-[#666]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {location}
            </div>
          )}

          {/* 4-stat horizontal bar */}
          <div className="grid grid-cols-4 border border-[#ececec] rounded-xl overflow-hidden mt-5 mb-6">
            <StatBox label="Powierzchnia" value={listing.area ? `${listing.area} m²` : null} />
            <StatBox label="Pokoje" value={listing.rooms} />
            <StatBox label="Piętro" value={listing.floor != null ? (listing.floor === 0 ? 'Parter' : `${listing.floor} / ${listing.totalFloors ?? '?'}`) : null} />
            <StatBox label="Czynsz" value={listing.monthlyFee ? `${listing.monthlyFee.toLocaleString('pl-PL')} zł` : null} />
          </div>

          {/* Description */}
          <h2 className="text-base font-bold text-[#1a1a1a] mb-3">Opis</h2>
          {listing.description
            ? <p className="text-sm text-[#444] leading-relaxed whitespace-pre-line">{stripHtml(listing.description)}</p>
            : <p className="text-sm text-[#bbb] italic">Brak opisu</p>
          }

          {/* Amenities */}
          <div className="border-t border-[#ececec] my-5" />
          <h2 className="text-base font-bold text-[#1a1a1a] mb-3">Udogodnienia</h2>
          {amenities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {amenities.map(a => (
                <span key={a} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f5f5] rounded-lg text-sm text-[#333]">{a}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#bbb] italic">Nie podano</p>
          )}

          {/* Details grid */}
          <div className="border-t border-[#ececec] my-5" />
          <h2 className="text-base font-bold text-[#1a1a1a] mb-3">Szczegóły ogłoszenia</h2>
          <div className="border border-[#ececec] rounded-xl overflow-hidden">
            <DetailRow label="Typ nieruchomości" value={listing.propertyType} fallback />
            <DetailRow label="Rynek" value={marketLabel} fallback />
            <DetailRow label="Stan wykończenia" value={listing.condition ? conditionLabel[listing.condition] : null} fallback />
            <DetailRow label="Ogrzewanie" value={listing.heatingType ? heatingLabel[listing.heatingType] : null} fallback />
            <DetailRow label="Rok budowy" value={listing.yearBuilt} fallback />
            <DetailRow label="Źródło" value={listing.source} />
          </div>
        </div>

        {/* RIGHT — sticky price card */}
        <div className="bg-white border border-[#e8e8e8] rounded-xl p-6 sticky top-[80px]">
          <div className="text-3xl font-extrabold text-[#1a1a1a]">{price}</div>
          {listing.pricePerSqm && (
            <div className="text-sm text-[#888] mt-1">{listing.pricePerSqm.toLocaleString('pl-PL')} zł/m²</div>
          )}
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-[#00C97A] hover:bg-[#00b36b] text-white font-semibold py-3.5 rounded-lg mt-5 transition-colors text-sm"
          >
            Zobacz ogłoszenie →
          </a>
          <button className="w-full border border-[#ddd] hover:border-[#999] text-[#1a1a1a] font-medium py-3 rounded-lg mt-2.5 text-sm transition-colors bg-white">
            ♡ Zapisz ogłoszenie
          </button>
          <div className="border-t border-[#ececec] mt-5 pt-4 text-center">
            <div className="text-[11px] text-[#bbb] uppercase tracking-wide">Ogłoszenie z</div>
            <div className="text-sm font-semibold text-[#555] mt-1">{listing.source}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
