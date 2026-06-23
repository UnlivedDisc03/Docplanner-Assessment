import { unstable_cache } from 'next/cache'
import { openai } from '@/lib/openai'
import type { Listing } from '@/domain/listing/Listing'

function buildPrompt(listing: Listing, description: string): string {
  return [
    `Tytuł: ${listing.title}`,
    [listing.district, listing.city].filter(Boolean).length
      ? `Lokalizacja: ${[listing.district, listing.city].filter(Boolean).join(', ')}`
      : null,
    listing.price ? `Cena: ${listing.price.toLocaleString('pl-PL')} ${listing.currency}` : null,
    listing.area ? `Powierzchnia: ${listing.area} m²` : null,
    listing.rooms ? `Pokoje: ${listing.rooms}` : null,
    listing.floor != null
      ? `Piętro: ${listing.floor === 0 ? 'parter' : `${listing.floor}/${listing.totalFloors ?? '?'}`}`
      : null,
    listing.condition ? `Stan: ${listing.condition}` : null,
    [listing.hasBalcony && 'balkon', listing.hasParking && 'parking', listing.hasGarden && 'ogród', listing.hasElevator && 'winda']
      .filter(Boolean).join(', ') || null,
    description ? `Opis: ${description.slice(0, 600)}` : null,
  ].filter(Boolean).join('\n')
}

const fetchSummary = unstable_cache(
  async (listingId: number, prompt: string): Promise<string> => {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Jesteś asystentem nieruchomości. Na podstawie danych ogłoszenia napisz zwięzłe podsumowanie po polsku (2–3 zdania), podkreślając najważniejsze zalety tej nieruchomości. Bądź konkretny i pomocny. Bez punktów, bez markdown.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 160,
    })
    return res.choices[0]?.message?.content?.trim() ?? ''
  },
  ['listing-ai-summary'],
  { revalidate: 60 * 60 * 24 }
)

export async function AISummary({ listing, description }: { listing: Listing; description: string }) {
  let summary = ''
  try {
    summary = await fetchSummary(listing.id, buildPrompt(listing, description))
  } catch {
    return null
  }
  if (!summary) return null

  return (
    <div className="bg-gradient-to-br from-[#f0fdf8] to-[#f5fffc] border border-[#00C97A]/30 rounded-xl p-4 mb-5">
      <div className="flex items-center gap-1.5 mb-2">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="#00C97A" stroke="none">
          <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74z"/>
          <path d="M19 2l.94 2.06L22 5l-2.06.94L19 8l-.94-2.06L16 5l2.06-.94z" opacity=".6"/>
        </svg>
        <span className="text-[11px] font-bold text-[#00C97A] uppercase tracking-wider">Podsumowanie AI</span>
      </div>
      <p className="text-sm text-[#444] leading-relaxed">{summary}</p>
    </div>
  )
}
