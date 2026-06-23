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
Map any language or encoding to the schema fields. Examples: area_m2/powierzchnia/m²→area, rent_pln/czynsz→monthlyFee, floor_1/piętro 1→floor:1, floor_0/parter→floor:0, total_floors/building_floors_num→totalFloors, build_year/rok budowy→yearBuilt, ready_to_use/do zamieszkania→condition:move_in_ready, to_renovation/do remontu→needs_renovation, developer_state→developer_state, high_standard→high_standard, urban/miejskie/district heating→heatingType:district, gas/gazowe→gas, electric→electric, primary/pierwotny→marketType:primary, secondary/wtórny→secondary. For extras: include basement, separate_kitchen, equipment_types, security_types etc. as key:true pairs. lift/winda yes→hasElevator:true.
Return ONLY the JSON object. No markdown, no explanation.`

export class OpenAIListingNormalizer implements ListingNormalizer {
  async normalize(raw: RawForNormalization): Promise<NormalizedListing> {
    const r = raw.rawJson as Record<string, unknown>

    // Build focused input: structured fields first so they're never truncated
    const parts: string[] = []
    if (typeof r.title === 'string') parts.push(`Title: ${r.title}`)
    if (typeof r.characteristics === 'string' && r.characteristics) parts.push(r.characteristics)
    // Short description for context only — fullDescription is used verbatim separately
    const shortDesc = typeof r.description === 'string' ? r.description.slice(0, 800) : ''
    if (shortDesc) parts.push(`Description excerpt: ${shortDesc}`)
    const text = parts.join('\n').slice(0, 4000)

    const fullDescription = typeof r.fullDescription === 'string' && r.fullDescription.length > 20
      ? r.fullDescription : null
    const images = Array.isArray(r.images) ? `\nImages: ${JSON.stringify(r.images)}` : ''

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

    parsed.images = Array.isArray(parsed.images) ? parsed.images : []

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
