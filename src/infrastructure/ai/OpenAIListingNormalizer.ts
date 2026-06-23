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
    return JSON.parse(content) as NormalizedListing
  }
}
