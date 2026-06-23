import { openai } from '@/lib/openai'
import type { ListingNormalizer, NormalizedListing, RawForNormalization } from '@/domain/listing/ListingNormalizer'

const SYSTEM_PROMPT = `You are a real estate data extractor. Given raw text from a Polish or English property listing page, extract structured information and return ONLY valid JSON with exactly these fields:
{
  "title": string,
  "description": string (the main listing description, not navigation text),
  "price": number | null (convert to PLN integers, use null if unclear),
  "currency": string (default "PLN", use "EUR" or "USD" if listing is in that currency),
  "area": number | null (m², decimals ok),
  "rooms": number | null (total room count, integer),
  "floor": number | null (integer, 0 = ground floor/parter),
  "totalFloors": number | null (total floors in building),
  "yearBuilt": number | null (4-digit year),
  "monthlyFee": number | null (czynsz/maintenance fee in PLN, integer),
  "propertyType": string | null (one of: "apartment", "house", "studio", "commercial"),
  "marketType": string | null (one of: "primary", "secondary"),
  "condition": string | null (one of: "move_in_ready", "needs_renovation", "high_standard", "developer_state"),
  "heatingType": string | null (one of: "district", "gas", "electric", "floor", "other"),
  "hasBalcony": boolean | null,
  "hasParking": boolean | null (true if garage, parking spot, or miejsce postojowe mentioned),
  "hasGarden": boolean | null,
  "hasElevator": boolean | null,
  "extras": object | null (any other notable features as key-value pairs, e.g. {"storage": true, "airConditioning": true}),
  "city": string | null,
  "district": string | null,
  "address": string | null,
  "lat": number | null,
  "lng": number | null,
  "images": string[] (full image URLs found in the data, empty array if none)
}
Polish hints: cena=price, powierzchnia/pow.=area, pokoje/pok.=rooms, piętro=floor, parter=ground floor, rok budowy=year built, dzielnica=district, czynsz=monthlyFee, balkon=balcony, winda=elevator, garaż/parking=hasParking, ogród=garden, pierwotny=primary market, wtórny=secondary market, do zamieszkania=move_in_ready, do remontu=needs_renovation, ogrzewanie miejskie=district heating.
Return ONLY the JSON object. No markdown, no explanation.`

export class OpenAIListingNormalizer implements ListingNormalizer {
  async normalize(raw: RawForNormalization): Promise<NormalizedListing> {
    const rawText = typeof raw.rawJson.text === 'string' ? raw.rawJson.text : JSON.stringify(raw.rawJson)
    const text = rawText.slice(0, 3000)
    const fullDescription = typeof raw.rawJson.fullDescription === 'string' && raw.rawJson.fullDescription.length > 20
      ? raw.rawJson.fullDescription
      : null
    const images = Array.isArray(raw.rawJson.images) ? `\nImages: ${JSON.stringify(raw.rawJson.images)}` : ''

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Source: ${raw.source}\nURL: ${raw.url}\n\n${text}${images}` },
      ],
      temperature: 0,
    })

    const content = response.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(content) as NormalizedListing

    // Use the full scraped description verbatim — never let AI truncate it
    if (fullDescription) {
      parsed.description = fullDescription
    } else if (typeof parsed.description === 'string') {
      parsed.description = parsed.description
        .replace(/<\/p>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n').replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n').trim()
    }

    // Generate AI summary from the full description + key fields
    parsed.aiSummary = await this.generateSummary(parsed)

    return parsed
  }

  async generateSummary(data: {
    title?: string; city?: string | null; district?: string | null
    price?: number | null; currency?: string; area?: number | null; rooms?: number | null
    floor?: number | null; totalFloors?: number | null; condition?: string | null
    hasBalcony?: boolean | null; hasParking?: boolean | null
    hasGarden?: boolean | null; hasElevator?: boolean | null
    description?: string
  }): Promise<string> {
    const lines = [
      data.title ? `Tytuł: ${data.title}` : null,
      [data.district, data.city].filter(Boolean).length ? `Lokalizacja: ${[data.district, data.city].filter(Boolean).join(', ')}` : null,
      data.price ? `Cena: ${data.price.toLocaleString('pl-PL')} ${data.currency ?? 'PLN'}` : null,
      data.area ? `Powierzchnia: ${data.area} m²` : null,
      data.rooms ? `Pokoje: ${data.rooms}` : null,
      data.floor != null ? `Piętro: ${data.floor === 0 ? 'parter' : `${data.floor}/${data.totalFloors ?? '?'}`}` : null,
      data.condition ? `Stan: ${data.condition}` : null,
      [data.hasBalcony && 'balkon', data.hasParking && 'parking', data.hasGarden && 'ogród', data.hasElevator && 'winda'].filter(Boolean).join(', ') || null,
      data.description ? `Opis: ${data.description.slice(0, 800)}` : null,
    ].filter(Boolean).join('\n')

    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Jesteś asystentem nieruchomości. Na podstawie danych ogłoszenia napisz zwięzłe podsumowanie po polsku (2–3 zdania), podkreślając najważniejsze zalety tej nieruchomości. Bądź konkretny i pomocny. Bez punktów, bez markdown.',
          },
          { role: 'user', content: lines },
        ],
        temperature: 0.4,
        max_tokens: 160,
      })
      return res.choices[0]?.message?.content?.trim() ?? ''
    } catch {
      return ''
    }
  }
}
