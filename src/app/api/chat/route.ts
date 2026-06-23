import { NextRequest } from 'next/server'
import { openai } from '@/lib/openai'
import { prisma } from '@/lib/prisma'
import { PrismaListingRepository } from '@/infrastructure/persistence/PrismaListingRepository'
import { GetListings } from '@/application/listing/GetListings'

const SYSTEM_PROMPT = `Jesteś pomocnym asystentem nieruchomości dla polskiego portalu ogłoszeń NieruchomościPL.
Pomagasz użytkownikom znaleźć odpowiednie nieruchomości w Polsce.
Gdy użytkownik opisuje czego szuka, użyj narzędzia search_listings aby znaleźć pasujące oferty.
Odpowiadaj zawsze po polsku. Bądź przyjazny, zwięzły i pomocny.
Jeśli wyniki wyszukiwania są puste, zasugeruj złagodzenie kryteriów.
Nie wymyślaj ofert — bazuj tylko na wynikach z narzędzia.`

const SEARCH_TOOL = {
  type: 'function' as const,
  function: {
    name: 'search_listings',
    description: 'Wyszukaj ogłoszenia nieruchomości na podstawie kryteriów podanych przez użytkownika',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Miasto, np. Kraków, Warszawa, Gdańsk' },
        q: { type: 'string', description: 'Dowolny tekst do wyszukania w tytule i opisie' },
        priceMin: { type: 'number', description: 'Minimalna cena w PLN' },
        priceMax: { type: 'number', description: 'Maksymalna cena w PLN' },
        areaMin: { type: 'number', description: 'Minimalna powierzchnia w m²' },
        areaMax: { type: 'number', description: 'Maksymalna powierzchnia w m²' },
        rooms: { type: 'number', description: 'Dokładna liczba pokoi' },
        marketType: { type: 'string', enum: ['primary', 'secondary'], description: 'Rynek pierwotny lub wtórny' },
        propertyTypes: {
          type: 'array',
          items: { type: 'string', enum: ['apartment', 'house', 'studio'] },
          description: 'Typy nieruchomości',
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

type OpenAIMessage = {
  role: 'user' | 'assistant' | 'tool' | 'system'
  content: string | null
  tool_calls?: unknown[]
  tool_call_id?: string
}

export async function POST(request: NextRequest) {
  const { messages } = await request.json() as { messages: OpenAIMessage[] }

  const initial = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    tools: [SEARCH_TOOL],
    tool_choice: 'auto',
    temperature: 0.5,
  })

  const msg = initial.choices[0].message
  const toolCall = msg.tool_calls?.[0] as { id: string; function: { name: string; arguments: string } } | undefined

  if (toolCall?.function.name === 'search_listings') {
    const args = JSON.parse(toolCall.function.arguments)
    const repository = new PrismaListingRepository(prisma)
    const useCase = new GetListings(repository)
    const { data, total } = await useCase.execute({ ...args, limit: 6, page: 1 })

    const toolResult = JSON.stringify({
      total,
      results: data.map(l => ({
        id: l.id,
        title: l.title,
        price: l.price,
        currency: l.currency,
        city: l.city,
        district: l.district,
        area: l.area,
        rooms: l.rooms,
        propertyType: l.propertyType,
      })),
    })

    const followUp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
        msg as OpenAIMessage,
        { role: 'tool', tool_call_id: toolCall.id, content: toolResult },
      ],
      temperature: 0.5,
    })

    return Response.json({
      message: followUp.choices[0].message.content,
      listings: data,
      total,
    })
  }

  return Response.json({ message: msg.content, listings: [], total: 0 })
}
