import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PrismaListingRepository } from '@/infrastructure/persistence/PrismaListingRepository'
import { GetListingById } from '@/application/listing/GetListingById'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full">{children}</span>
}

export default async function ListingPage(props: PageProps<'/listing/[id]'>) {
  const { id } = await props.params
  const repository = new PrismaListingRepository(prisma)
  const useCase = new GetListingById(repository)
  const listing = await useCase.execute(Number(id))
  if (!listing) notFound()

  const price = listing.price
    ? new Intl.NumberFormat('pl-PL', { style: 'currency', currency: listing.currency, maximumFractionDigits: 0 }).format(listing.price)
    : 'Cena na zapytanie'

  const amenities = [
    listing.hasBalcony && 'Balkon',
    listing.hasParking && 'Parking',
    listing.hasGarden && 'Ogród',
    listing.hasElevator && 'Winda',
  ].filter(Boolean)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link href="/" className="text-sm text-emerald-600 hover:underline mb-4 inline-block">← Wróć do listy</Link>

      {listing.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-6 rounded-xl overflow-hidden">
          {listing.images.filter(src => !src.includes('s=314x236') && !src.includes('thumbnail')).slice(0, 4).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt={listing.title} className={`w-full object-cover ${i === 0 ? 'col-span-2 h-72' : 'h-40'}`} />
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{listing.title}</h1>
            {(listing.district || listing.city) && (
              <p className="text-sm text-gray-500 mt-1">{[listing.address, listing.district, listing.city].filter(Boolean).join(', ')}</p>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Opis</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
          </div>

          {amenities.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Udogodnienia</h2>
              <div className="flex flex-wrap gap-2">
                {amenities.map(a => <Badge key={a as string}>{a}</Badge>)}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 h-fit space-y-1">
          <p className="text-2xl font-bold text-emerald-600 mb-3">{price}</p>
          {listing.pricePerSqm && <p className="text-xs text-gray-400 mb-3">{listing.pricePerSqm.toLocaleString('pl-PL')} zł/m²</p>}
          <Row label="Powierzchnia" value={listing.area ? `${listing.area} m²` : null} />
          <Row label="Pokoje" value={listing.rooms} />
          <Row label="Piętro" value={listing.floor != null ? `${listing.floor} / ${listing.totalFloors ?? '?'}` : null} />
          <Row label="Rok budowy" value={listing.yearBuilt} />
          <Row label="Czynsz" value={listing.monthlyFee ? `${listing.monthlyFee.toLocaleString('pl-PL')} zł` : null} />
          <Row label="Typ" value={listing.propertyType} />
          <Row label="Rynek" value={listing.marketType === 'primary' ? 'Pierwotny' : listing.marketType === 'secondary' ? 'Wtórny' : null} />
          <Row label="Stan" value={listing.condition} />
          <Row label="Ogrzewanie" value={listing.heatingType} />
          <div className="pt-3">
            <a href={listing.url} target="_blank" rel="noopener noreferrer"
              className="block w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
              Zobacz ogłoszenie →
            </a>
            <p className="text-xs text-center text-gray-400 mt-1">Źródło: {listing.source}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
