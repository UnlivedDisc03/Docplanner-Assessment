import { NextRequest } from 'next/server'
import { openai } from '@/lib/openai'

const EXTRACT_TOOL = {
  type: 'function' as const,
  function: {
    name: 'apply_filters',
    description: 'Extract search filters from a natural language real estate query',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name in Polish, e.g. Kraków, Warszawa' },
        q: { type: 'string', description: 'Free-text keyword if no structured filter matches' },
        priceMin: { type: 'number' },
        priceMax: { type: 'number' },
        areaMin: { type: 'number' },
        areaMax: { type: 'number' },
        rooms: { type: 'number' },
        marketType: { type: 'string', enum: ['primary', 'secondary'] },
        propertyTypes: {
          type: 'array',
          items: { type: 'string', enum: ['apartment', 'house', 'studio'] },
        },
        hasBalcony: { type: 'boolean' },
        hasParking: { type: 'boolean' },
        hasGarden: { type: 'boolean' },
        hasElevator: { type: 'boolean' },
      },
      required: [],
    },
  },
}

export async function POST(request: NextRequest) {
  const { query } = await request.json() as { query: string }
  if (!query?.trim()) return Response.json({ params: {} })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a real estate search filter extractor. Given a user query in Polish or English about property, call apply_filters with the structured filters you can extract. Always call the function — never respond with text.',
      },
      { role: 'user', content: query },
    ],
    tools: [EXTRACT_TOOL],
    tool_choice: { type: 'function', function: { name: 'apply_filters' } },
    temperature: 0,
  })

  const toolCall = response.choices[0].message.tool_calls?.[0]
  if (!toolCall) return Response.json({ params: {} })

  const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>

  // Convert to URL-safe string params
  const params: Record<string, string> = {}
  if (args.city) params.city = String(args.city)
  if (args.q) params.q = String(args.q)
  if (args.priceMin != null) params.priceMin = String(args.priceMin)
  if (args.priceMax != null) params.priceMax = String(args.priceMax)
  if (args.areaMin != null) params.areaMin = String(args.areaMin)
  if (args.areaMax != null) params.areaMax = String(args.areaMax)
  if (args.rooms != null) params.rooms = String(args.rooms)
  if (args.marketType) params.marketType = String(args.marketType)
  if (Array.isArray(args.propertyTypes) && args.propertyTypes.length)
    params.propertyTypes = args.propertyTypes.join(',')
  if (args.hasBalcony) params.hasBalcony = '1'
  if (args.hasParking) params.hasParking = '1'
  if (args.hasGarden) params.hasGarden = '1'
  if (args.hasElevator) params.hasElevator = '1'

  return Response.json({ params })
}
