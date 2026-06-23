import { openai } from '@/lib/openai'
import type { ListingNormalizer, NormalizedListing, RawForNormalization } from '@/domain/listing/ListingNormalizer'

const SYSTEM_PROMPT = `You are a real estate data extractor. Given raw text from a Polish property listing page, extract structured information and return ONLY valid JSON:
{
  "title": string,
  "description": string,
  "price": number | null (PLN integers only),
  "currency": string (default "PLN"),
  "area": number | null (m², decimals ok),
  "rooms": number | null (integer),
  "floor": number | null (integer, 0 = ground floor),
  "totalFloors": number | null,
  "yearBuilt": number | null (4-digit year),
  "city": string | null,
  "district": string | null,
  "address": string | null,
  "lat": number | null,
  "lng": number | null,
  "images": string[] (full image URLs from the data)
}
Polish hints: cena=price, powierzchnia/pow.=area, pokoje/pok.=rooms, piętro=floor, rok budowy=year built, dzielnica=district.
Return ONLY the JSON object. No markdown, no explanation.`

export class OpenAIListingNormalizer implements ListingNormalizer {
  async normalize(raw: RawForNormalization): Promise<NormalizedListing> {
    const text = typeof raw.rawJson.text === 'string' ? raw.rawJson.text : JSON.stringify(raw.rawJson)
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
