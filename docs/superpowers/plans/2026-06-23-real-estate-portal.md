# Real Estate Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real estate listings platform that scrapes ~100 Polish property listings from 5 websites, normalises them with OpenAI, and exposes them via a Next.js web app with DDD architecture.

**Architecture:** Next.js monorepo with standalone scraper script. DDD layers: Domain (entities + interfaces) → Application (use cases) → Infrastructure (Prisma, Puppeteer, OpenAI) → Presentation (Next.js pages + API routes). MySQL in Docker Compose.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Prisma, MySQL 8, Puppeteer, OpenAI SDK (gpt-4o-mini), Tailwind CSS, Docker Compose, Jest + ts-jest

---

### Task 1: Bootstrap Next.js project

**Files:**
- Create: `package.json` (via CLI)
- Create: `.env.local`
- Create: `jest.config.ts`

- [ ] **Step 1: Initialise Next.js**

```bash
cd C:\Users\Unliv\Docplanner-Assessment
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --no-eslint
```

Accept all defaults when prompted.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install prisma @prisma/client openai puppeteer dotenv
npm install --save-dev tsx @types/node jest ts-jest @types/jest
```

- [ ] **Step 3: Create directory structure**

```bash
mkdir -p src/domain/listing src/application/listing src/infrastructure/persistence src/infrastructure/scraping/scrapers src/infrastructure/ai src/lib scripts
```

- [ ] **Step 4: Create `.env.local`**

```
DATABASE_URL="mysql://root:root@localhost:3306/realestate"
OPENAI_API_KEY="your-key-here"
```

- [ ] **Step 5: Create `jest.config.ts`**

```typescript
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

export default config
```

- [ ] **Step 6: Add scripts to `package.json`**

Add inside the `"scripts"` block:
```json
"test": "jest",
"scrape": "tsx scripts/scrape.ts"
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: bootstrap Next.js project with dependencies"
```

---

### Task 2: Docker Compose + Prisma schema + migration

**Files:**
- Create: `docker-compose.yml`
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: realestate
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  adminer:
    image: adminer
    ports:
      - "8080:8080"

volumes:
  mysql_data:
```

- [ ] **Step 2: Start MySQL**

```bash
docker compose up -d
```

Wait ~10 seconds for MySQL to initialise.

- [ ] **Step 3: Initialise Prisma**

```bash
npx prisma init --datasource-provider mysql
```

- [ ] **Step 4: Replace `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model RawListing {
  id        Int      @id @default(autoincrement())
  source    String
  url       String   @unique
  rawHtml   String?  @db.LongText
  rawJson   Json
  scrapedAt DateTime @default(now())

  listing   Listing?
}

model Listing {
  id          Int        @id @default(autoincrement())
  rawId       Int        @unique
  raw         RawListing @relation(fields: [rawId], references: [id])
  source      String
  url         String     @unique

  title       String
  description String     @db.Text
  price       Int?
  pricePerSqm Int?
  currency    String     @default("PLN")
  area        Float?
  rooms       Int?
  floor       Int?
  totalFloors Int?
  yearBuilt   Int?

  city        String?
  district    String?
  address     String?
  lat         Float?
  lng         Float?

  images      String     @db.Text

  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([city])
  @@index([price])
  @@index([area])
}
```

- [ ] **Step 5: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: migration created and applied, Prisma Client generated.

- [ ] **Step 6: Create `src/lib/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Docker Compose, Prisma schema, and DB migration"
```

---

### Task 3: Domain layer — entity and interfaces

**Files:**
- Create: `src/domain/listing/Listing.ts`
- Create: `src/domain/listing/ListingRepository.ts`
- Create: `src/domain/listing/ListingNormalizer.ts`
- Create: `src/domain/listing/__tests__/Listing.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/domain/listing/__tests__/Listing.test.ts`:

```typescript
import type { Listing, ListingFilters } from '../Listing'

describe('Listing domain types', () => {
  it('accepts a valid Listing object', () => {
    const listing: Listing = {
      id: 1, rawId: 1, source: 'otodom', url: 'https://otodom.pl/1',
      title: 'Mieszkanie Kraków', description: 'Opis',
      price: 500000, pricePerSqm: 10000, currency: 'PLN',
      area: 50, rooms: 3, floor: 2, totalFloors: 5, yearBuilt: 2010,
      city: 'Kraków', district: 'Śródmieście', address: null,
      lat: null, lng: null, images: [], createdAt: new Date(), updatedAt: new Date(),
    }
    expect(listing.city).toBe('Kraków')
  })

  it('accepts partial filters', () => {
    const filters: ListingFilters = { city: 'Kraków', priceMax: 600000, page: 1, limit: 20 }
    expect(filters.city).toBe('Kraków')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest src/domain/listing/__tests__/Listing.test.ts
```

Expected: FAIL — cannot find module `../Listing`

- [ ] **Step 3: Create `src/domain/listing/Listing.ts`**

```typescript
export interface Listing {
  id: number
  rawId: number
  source: string
  url: string
  title: string
  description: string
  price: number | null
  pricePerSqm: number | null
  currency: string
  area: number | null
  rooms: number | null
  floor: number | null
  totalFloors: number | null
  yearBuilt: number | null
  city: string | null
  district: string | null
  address: string | null
  lat: number | null
  lng: number | null
  images: string[]
  createdAt: Date
  updatedAt: Date
}

export interface ListingFilters {
  q?: string
  city?: string
  priceMin?: number
  priceMax?: number
  areaMin?: number
  areaMax?: number
  rooms?: number
  page?: number
  limit?: number
}

export interface PaginatedListings {
  data: Listing[]
  total: number
  page: number
  totalPages: number
}
```

- [ ] **Step 4: Create `src/domain/listing/ListingRepository.ts`**

```typescript
import type { Listing, ListingFilters, PaginatedListings } from './Listing'

export interface RawListingInput {
  source: string
  url: string
  rawJson: Record<string, unknown>
  rawHtml?: string
}

export interface UnprocessedRaw {
  id: number
  source: string
  url: string
  rawJson: unknown
}

export interface ListingInput {
  source: string
  url: string
  title: string
  description: string
  price: number | null
  pricePerSqm: number | null
  currency: string
  area: number | null
  rooms: number | null
  floor: number | null
  totalFloors: number | null
  yearBuilt: number | null
  city: string | null
  district: string | null
  address: string | null
  lat: number | null
  lng: number | null
  images: string[]
}

export interface ListingRepository {
  findAll(filters: ListingFilters): Promise<PaginatedListings>
  findById(id: number): Promise<Listing | null>
  saveRaw(data: RawListingInput): Promise<number>
  saveListing(rawId: number, data: ListingInput): Promise<void>
  findUnprocessedRaw(): Promise<UnprocessedRaw[]>
}
```

- [ ] **Step 5: Create `src/domain/listing/ListingNormalizer.ts`**

```typescript
export interface NormalizedListing {
  title: string
  description: string
  price: number | null
  currency: string
  area: number | null
  rooms: number | null
  floor: number | null
  totalFloors: number | null
  yearBuilt: number | null
  city: string | null
  district: string | null
  address: string | null
  lat: number | null
  lng: number | null
  images: string[]
}

export interface RawForNormalization {
  source: string
  url: string
  rawJson: Record<string, unknown>
}

export interface ListingNormalizer {
  normalize(raw: RawForNormalization): Promise<NormalizedListing>
}
```

- [ ] **Step 6: Run test — expect PASS**

```bash
npx jest src/domain/listing/__tests__/Listing.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/domain
git commit -m "feat: add domain layer — Listing entity, repository and normalizer interfaces"
```

---

### Task 4: PrismaListingRepository

**Files:**
- Create: `src/infrastructure/persistence/PrismaListingRepository.ts`
- Create: `src/infrastructure/persistence/__tests__/PrismaListingRepository.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/infrastructure/persistence/__tests__/PrismaListingRepository.test.ts`:

```typescript
import { PrismaListingRepository } from '../PrismaListingRepository'

const mockPrisma = {
  rawListing: { upsert: jest.fn(), findMany: jest.fn() },
  listing: { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn(), upsert: jest.fn() },
}

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

const baseRow = {
  id: 1, rawId: 1, source: 'otodom', url: 'https://otodom.pl/1',
  title: 'Test', description: 'Desc', price: 300000, pricePerSqm: 6000,
  currency: 'PLN', area: 50, rooms: 2, floor: 1, totalFloors: 5,
  yearBuilt: 2005, city: 'Kraków', district: null, address: null,
  lat: null, lng: null, images: '[]', createdAt: new Date(), updatedAt: new Date(),
}

describe('PrismaListingRepository', () => {
  let repo: PrismaListingRepository

  beforeEach(() => { jest.clearAllMocks(); repo = new PrismaListingRepository() })

  it('returns paginated listings and parses images JSON', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([baseRow])
    mockPrisma.listing.count.mockResolvedValue(1)

    const result = await repo.findAll({ page: 1, limit: 20 })

    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.data[0].images).toEqual([])
  })

  it('applies city filter with insensitive mode', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([])
    mockPrisma.listing.count.mockResolvedValue(0)

    await repo.findAll({ city: 'Kraków', page: 1, limit: 20 })

    expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          city: { contains: 'Kraków', mode: 'insensitive' },
        }),
      })
    )
  })

  it('returns null when listing not found', async () => {
    mockPrisma.listing.findUnique.mockResolvedValue(null)
    expect(await repo.findById(999)).toBeNull()
  })

  it('upserts raw listing and returns id', async () => {
    mockPrisma.rawListing.upsert.mockResolvedValue({ id: 42 })
    const id = await repo.saveRaw({ source: 'otodom', url: 'https://otodom.pl/1', rawJson: { text: 'test' } })
    expect(id).toBe(42)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest src/infrastructure/persistence/__tests__/PrismaListingRepository.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `src/infrastructure/persistence/PrismaListingRepository.ts`**

```typescript
import { prisma } from '@/lib/prisma'
import type { ListingRepository, RawListingInput, UnprocessedRaw, ListingInput } from '@/domain/listing/ListingRepository'
import type { Listing, ListingFilters, PaginatedListings } from '@/domain/listing/Listing'

type ListingRow = {
  id: number; rawId: number; source: string; url: string; title: string;
  description: string; price: number | null; pricePerSqm: number | null;
  currency: string; area: number | null; rooms: number | null; floor: number | null;
  totalFloors: number | null; yearBuilt: number | null; city: string | null;
  district: string | null; address: string | null; lat: number | null; lng: number | null;
  images: string; createdAt: Date; updatedAt: Date;
}

export class PrismaListingRepository implements ListingRepository {
  async findAll(filters: ListingFilters): Promise<PaginatedListings> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const skip = (page - 1) * limit
    const where = this.buildWhere(filters)

    const [rows, total] = await Promise.all([
      prisma.listing.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.listing.count({ where }),
    ])

    return { data: rows.map(r => this.mapRow(r as ListingRow)), total, page, totalPages: Math.ceil(total / limit) }
  }

  async findById(id: number): Promise<Listing | null> {
    const row = await prisma.listing.findUnique({ where: { id } })
    return row ? this.mapRow(row as ListingRow) : null
  }

  async saveRaw(data: RawListingInput): Promise<number> {
    const row = await prisma.rawListing.upsert({
      where: { url: data.url },
      update: { rawJson: data.rawJson, rawHtml: data.rawHtml },
      create: { source: data.source, url: data.url, rawJson: data.rawJson, rawHtml: data.rawHtml },
    })
    return row.id
  }

  async saveListing(rawId: number, data: ListingInput): Promise<void> {
    const payload = { ...data, images: JSON.stringify(data.images) }
    await prisma.listing.upsert({
      where: { rawId },
      update: payload,
      create: { rawId, ...payload },
    })
  }

  async findUnprocessedRaw(): Promise<UnprocessedRaw[]> {
    const rows = await prisma.rawListing.findMany({ where: { listing: null } })
    return rows.map(r => ({ id: r.id, source: r.source, url: r.url, rawJson: r.rawJson }))
  }

  private buildWhere(filters: ListingFilters): Record<string, unknown> {
    const where: Record<string, unknown> = {}
    if (filters.q) where.OR = [
      { title: { contains: filters.q, mode: 'insensitive' } },
      { description: { contains: filters.q, mode: 'insensitive' } },
    ]
    if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' }
    if (filters.rooms != null) where.rooms = filters.rooms
    if (filters.priceMin != null || filters.priceMax != null) {
      where.price = {
        ...(filters.priceMin != null && { gte: filters.priceMin }),
        ...(filters.priceMax != null && { lte: filters.priceMax }),
      }
    }
    if (filters.areaMin != null || filters.areaMax != null) {
      where.area = {
        ...(filters.areaMin != null && { gte: filters.areaMin }),
        ...(filters.areaMax != null && { lte: filters.areaMax }),
      }
    }
    return where
  }

  private mapRow(row: ListingRow): Listing {
    return { ...row, images: JSON.parse(row.images || '[]') }
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest src/infrastructure/persistence/__tests__/PrismaListingRepository.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/persistence
git commit -m "feat: add PrismaListingRepository"
```

---

### Task 5: OpenAI client + OpenAIListingNormalizer

**Files:**
- Create: `src/lib/openai.ts`
- Create: `src/infrastructure/ai/OpenAIListingNormalizer.ts`
- Create: `src/infrastructure/ai/__tests__/OpenAIListingNormalizer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/infrastructure/ai/__tests__/OpenAIListingNormalizer.test.ts`:

```typescript
import { OpenAIListingNormalizer } from '../OpenAIListingNormalizer'

const mockCreate = jest.fn()
jest.mock('@/lib/openai', () => ({ openai: { chat: { completions: { create: mockCreate } } } }))

describe('OpenAIListingNormalizer', () => {
  let normalizer: OpenAIListingNormalizer

  beforeEach(() => { jest.clearAllMocks(); normalizer = new OpenAIListingNormalizer() })

  it('parses OpenAI JSON response into NormalizedListing', async () => {
    const payload = {
      title: 'Mieszkanie Kraków', description: 'Piękne', price: 450000, currency: 'PLN',
      area: 55, rooms: 3, floor: 2, totalFloors: 6, yearBuilt: 2015,
      city: 'Kraków', district: 'Krowodrza', address: null, lat: null, lng: null,
      images: ['https://img.example.com/1.jpg'],
    }
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(payload) } }] })

    const result = await normalizer.normalize({ source: 'otodom', url: 'https://otodom.pl/1', rawJson: { text: 'raw text' } })

    expect(result.price).toBe(450000)
    expect(result.city).toBe('Kraków')
    expect(result.images).toEqual(['https://img.example.com/1.jpg'])
  })

  it('tolerates null fields from OpenAI', async () => {
    const payload = {
      title: 'Unknown', description: '', price: null, currency: 'PLN',
      area: null, rooms: null, floor: null, totalFloors: null, yearBuilt: null,
      city: null, district: null, address: null, lat: null, lng: null, images: [],
    }
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(payload) } }] })

    const result = await normalizer.normalize({ source: 'otodom', url: 'https://otodom.pl/2', rawJson: { text: '' } })
    expect(result.price).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest src/infrastructure/ai/__tests__/OpenAIListingNormalizer.test.ts
```

- [ ] **Step 3: Create `src/lib/openai.ts`**

```typescript
import OpenAI from 'openai'

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
```

- [ ] **Step 4: Create `src/infrastructure/ai/OpenAIListingNormalizer.ts`**

```typescript
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
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npx jest src/infrastructure/ai/__tests__/OpenAIListingNormalizer.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/openai.ts src/infrastructure/ai
git commit -m "feat: add OpenAI client and listing normalizer"
```

---

### Task 6: IScraper interface + BaseScraper

**Files:**
- Create: `src/infrastructure/scraping/IScraper.ts`
- Create: `src/infrastructure/scraping/BaseScraper.ts`

- [ ] **Step 1: Create `src/infrastructure/scraping/IScraper.ts`**

```typescript
export interface ScrapedRaw {
  url: string
  rawJson: { text: string; images: string[] }
}

export interface IScraper {
  source: string
  scrape(): Promise<ScrapedRaw[]>
}
```

- [ ] **Step 2: Create `src/infrastructure/scraping/BaseScraper.ts`**

```typescript
import puppeteer, { Browser, Page } from 'puppeteer'

export abstract class BaseScraper {
  protected browser: Browser | null = null

  protected async launch(): Promise<void> {
    this.browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  }

  protected async close(): Promise<void> {
    await this.browser?.close()
    this.browser = null
  }

  protected async newPage(): Promise<Page> {
    if (!this.browser) throw new Error('Browser not launched')
    const page = await this.browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    return page
  }

  protected async extractPageContent(page: Page): Promise<{ text: string; images: string[] }> {
    return page.evaluate(() => {
      const text = (document.body.innerText ?? '').slice(0, 8000)
      const images = Array.from(document.querySelectorAll('img'))
        .map(img => img.src)
        .filter(src => src.startsWith('http') && !src.includes('icon') && !src.includes('logo'))
        .slice(0, 20)
      return { text, images }
    })
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/infrastructure/scraping/IScraper.ts src/infrastructure/scraping/BaseScraper.ts
git commit -m "feat: add IScraper interface and BaseScraper"
```

---

### Task 7: Five site scrapers

**Files:**
- Create: `src/infrastructure/scraping/scrapers/OtodomScraper.ts`
- Create: `src/infrastructure/scraping/scrapers/TabelaofertScraper.ts`
- Create: `src/infrastructure/scraping/scrapers/OkolicaScraper.ts`
- Create: `src/infrastructure/scraping/scrapers/PropertystarScraper.ts`
- Create: `src/infrastructure/scraping/scrapers/RealtingScraper.ts`

- [ ] **Step 1: Create `src/infrastructure/scraping/scrapers/OtodomScraper.ts`**

```typescript
import { BaseScraper } from '../BaseScraper'
import type { IScraper, ScrapedRaw } from '../IScraper'

export class OtodomScraper extends BaseScraper implements IScraper {
  source = 'otodom'

  async scrape(): Promise<ScrapedRaw[]> {
    await this.launch()
    const results: ScrapedRaw[] = []
    try {
      const indexPage = await this.newPage()
      await indexPage.goto('https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/cala-polska?limit=24', { waitUntil: 'networkidle2', timeout: 30000 })
      try { await indexPage.click('[id*="onetrust-accept"]', { timeout: 3000 }) } catch {}
      await indexPage.waitForSelector('article, [data-cy="listing-item"]', { timeout: 10000 }).catch(() => {})

      const urls: string[] = await indexPage.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/oferta/"]')) as HTMLAnchorElement[]
        return [...new Set(links.map(a => a.href))].slice(0, 20)
      })
      await indexPage.close()

      for (const url of urls) {
        try {
          const page = await this.newPage()
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
          results.push({ url, rawJson: await this.extractPageContent(page) })
          await page.close()
          await this.delay(500)
        } catch (e) { console.warn(`[otodom] skip ${url}`, e) }
      }
    } finally { await this.close() }
    return results
  }
}
```

- [ ] **Step 2: Create `src/infrastructure/scraping/scrapers/TabelaofertScraper.ts`**

```typescript
import { BaseScraper } from '../BaseScraper'
import type { IScraper, ScrapedRaw } from '../IScraper'

export class TabelaofertScraper extends BaseScraper implements IScraper {
  source = 'tabelaofert'

  async scrape(): Promise<ScrapedRaw[]> {
    await this.launch()
    const results: ScrapedRaw[] = []
    try {
      const indexPage = await this.newPage()
      await indexPage.goto('https://tabelaofert.pl/sprzedaz-mieszkania', { waitUntil: 'networkidle2', timeout: 30000 })

      const urls: string[] = await indexPage.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[]
        return [...new Set(
          links.map(a => a.href).filter(h => h.includes('tabelaofert.pl') && (h.includes('/oferta/') || h.includes('/mieszkan')))
        )].slice(0, 20)
      })
      await indexPage.close()

      for (const url of urls) {
        try {
          const page = await this.newPage()
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
          results.push({ url, rawJson: await this.extractPageContent(page) })
          await page.close()
          await this.delay(500)
        } catch (e) { console.warn(`[tabelaofert] skip ${url}`, e) }
      }
    } finally { await this.close() }
    return results
  }
}
```

- [ ] **Step 3: Create `src/infrastructure/scraping/scrapers/OkolicaScraper.ts`**

```typescript
import { BaseScraper } from '../BaseScraper'
import type { IScraper, ScrapedRaw } from '../IScraper'

export class OkolicaScraper extends BaseScraper implements IScraper {
  source = 'okolica'

  async scrape(): Promise<ScrapedRaw[]> {
    await this.launch()
    const results: ScrapedRaw[] = []
    try {
      const indexPage = await this.newPage()
      await indexPage.goto('https://www.okolica.pl/nieruchomosci/sprzedaz/mieszkania', { waitUntil: 'networkidle2', timeout: 30000 })

      const urls: string[] = await indexPage.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[]
        return [...new Set(
          links.map(a => a.href).filter(h => h.includes('okolica.pl') && h.length > 30)
        )].filter(h => !h.endsWith('/nieruchomosci/sprzedaz/mieszkania')).slice(0, 20)
      })
      await indexPage.close()

      for (const url of urls) {
        try {
          const page = await this.newPage()
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
          results.push({ url, rawJson: await this.extractPageContent(page) })
          await page.close()
          await this.delay(500)
        } catch (e) { console.warn(`[okolica] skip ${url}`, e) }
      }
    } finally { await this.close() }
    return results
  }
}
```

- [ ] **Step 4: Create `src/infrastructure/scraping/scrapers/PropertystarScraper.ts`**

```typescript
import { BaseScraper } from '../BaseScraper'
import type { IScraper, ScrapedRaw } from '../IScraper'

export class PropertystarScraper extends BaseScraper implements IScraper {
  source = 'properstar'

  async scrape(): Promise<ScrapedRaw[]> {
    await this.launch()
    const results: ScrapedRaw[] = []
    try {
      const indexPage = await this.newPage()
      await indexPage.goto('https://www.properstar.co.uk/poland/buy', { waitUntil: 'networkidle2', timeout: 30000 })

      const urls: string[] = await indexPage.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[]
        return [...new Set(
          links.map(a => a.href).filter(h => h.includes('properstar') && (h.includes('/listing') || h.includes('/property')))
        )].slice(0, 20)
      })
      await indexPage.close()

      for (const url of urls) {
        try {
          const page = await this.newPage()
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
          results.push({ url, rawJson: await this.extractPageContent(page) })
          await page.close()
          await this.delay(500)
        } catch (e) { console.warn(`[properstar] skip ${url}`, e) }
      }
    } finally { await this.close() }
    return results
  }
}
```

- [ ] **Step 5: Create `src/infrastructure/scraping/scrapers/RealtingScraper.ts`**

```typescript
import { BaseScraper } from '../BaseScraper'
import type { IScraper, ScrapedRaw } from '../IScraper'

export class RealtingScraper extends BaseScraper implements IScraper {
  source = 'realting'

  async scrape(): Promise<ScrapedRaw[]> {
    await this.launch()
    const results: ScrapedRaw[] = []
    try {
      const indexPage = await this.newPage()
      await indexPage.goto('https://realting.com/poland/property', { waitUntil: 'networkidle2', timeout: 30000 })

      const urls: string[] = await indexPage.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[]
        return [...new Set(
          links.map(a => a.href).filter(h => h.includes('realting.com') && (h.includes('/property/') || h.includes('/real-estate/')))
        )].slice(0, 20)
      })
      await indexPage.close()

      for (const url of urls) {
        try {
          const page = await this.newPage()
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
          results.push({ url, rawJson: await this.extractPageContent(page) })
          await page.close()
          await this.delay(500)
        } catch (e) { console.warn(`[realting] skip ${url}`, e) }
      }
    } finally { await this.close() }
    return results
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/scraping/scrapers
git commit -m "feat: add five site scrapers"
```

---

### Task 8: ScrapingOrchestrator + SeedListings + scrape.ts

**Files:**
- Create: `src/infrastructure/scraping/ScrapingOrchestrator.ts`
- Create: `src/application/listing/SeedListings.ts`
- Create: `scripts/scrape.ts`

- [ ] **Step 1: Create `src/infrastructure/scraping/ScrapingOrchestrator.ts`**

```typescript
import type { IScraper } from './IScraper'
import { OtodomScraper } from './scrapers/OtodomScraper'
import { TabelaofertScraper } from './scrapers/TabelaofertScraper'
import { OkolicaScraper } from './scrapers/OkolicaScraper'
import { PropertystarScraper } from './scrapers/PropertystarScraper'
import { RealtingScraper } from './scrapers/RealtingScraper'

export class ScrapingOrchestrator {
  private scrapers: IScraper[] = [
    new OtodomScraper(),
    new TabelaofertScraper(),
    new OkolicaScraper(),
    new PropertystarScraper(),
    new RealtingScraper(),
  ]

  async scrapeAll(): Promise<{ source: string; url: string; rawJson: Record<string, unknown> }[]> {
    const all: { source: string; url: string; rawJson: Record<string, unknown> }[] = []
    for (const scraper of this.scrapers) {
      console.log(`[scrape] Starting ${scraper.source}...`)
      try {
        const results = await scraper.scrape()
        console.log(`[scrape] ${scraper.source}: ${results.length} listings`)
        all.push(...results.map(r => ({ source: scraper.source, url: r.url, rawJson: r.rawJson })))
      } catch (err) {
        console.error(`[scrape] ${scraper.source} failed:`, err)
      }
    }
    return all
  }
}
```

- [ ] **Step 2: Create `src/application/listing/SeedListings.ts`**

```typescript
import type { ListingRepository } from '@/domain/listing/ListingRepository'
import type { ListingNormalizer } from '@/domain/listing/ListingNormalizer'

export class SeedListings {
  constructor(
    private readonly repository: ListingRepository,
    private readonly normalizer: ListingNormalizer,
  ) {}

  async seedRaw(listings: { source: string; url: string; rawJson: Record<string, unknown> }[]): Promise<void> {
    for (const listing of listings) {
      await this.repository.saveRaw(listing)
    }
    console.log(`[seed] Saved ${listings.length} raw listings`)
  }

  async normalizeAll(): Promise<void> {
    const unprocessed = await this.repository.findUnprocessedRaw()
    console.log(`[seed] Normalizing ${unprocessed.length} listings...`)

    for (const raw of unprocessed) {
      try {
        const normalized = await this.normalizer.normalize({
          source: raw.source,
          url: raw.url,
          rawJson: raw.rawJson as Record<string, unknown>,
        })
        const pricePerSqm = normalized.price && normalized.area
          ? Math.round(normalized.price / normalized.area)
          : null

        await this.repository.saveListing(raw.id, { source: raw.source, url: raw.url, ...normalized, pricePerSqm })
        console.log(`[seed] ✓ ${normalized.title || raw.url}`)
      } catch (err) {
        console.error(`[seed] ✗ ${raw.url}:`, err)
      }
    }
  }
}
```

- [ ] **Step 3: Create `scripts/scrape.ts`**

```typescript
import 'dotenv/config'
import { ScrapingOrchestrator } from '../src/infrastructure/scraping/ScrapingOrchestrator'
import { PrismaListingRepository } from '../src/infrastructure/persistence/PrismaListingRepository'
import { OpenAIListingNormalizer } from '../src/infrastructure/ai/OpenAIListingNormalizer'
import { SeedListings } from '../src/application/listing/SeedListings'

async function main() {
  const repository = new PrismaListingRepository()
  const normalizer = new OpenAIListingNormalizer()
  const seed = new SeedListings(repository, normalizer)
  const orchestrator = new ScrapingOrchestrator()

  console.log('[scrape] Phase 1: Scraping...')
  const raw = await orchestrator.scrapeAll()
  await seed.seedRaw(raw)

  console.log('[scrape] Phase 2: Normalizing...')
  await seed.normalizeAll()

  console.log('[scrape] Done.')
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
```

- [ ] **Step 4: Run the scrape script**

Make sure Docker is running and `.env.local` has a valid `OPENAI_API_KEY`, then:

```bash
npm run scrape
```

Expected: logs showing each site being scraped, then normalization. Verify data at http://localhost:8080 (Adminer — server: `mysql`, user: `root`, password: `root`, database: `realestate`).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/scraping/ScrapingOrchestrator.ts src/application/listing/SeedListings.ts scripts/scrape.ts
git commit -m "feat: add ScrapingOrchestrator, SeedListings use case, and scrape script"
```

---

### Task 9: GetListings + GetListingById use cases

**Files:**
- Create: `src/application/listing/GetListings.ts`
- Create: `src/application/listing/GetListingById.ts`
- Create: `src/application/listing/__tests__/GetListings.test.ts`
- Create: `src/application/listing/__tests__/GetListingById.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/application/listing/__tests__/GetListings.test.ts`:

```typescript
import { GetListings } from '../GetListings'
import type { ListingRepository } from '@/domain/listing/ListingRepository'

const mockRepo: jest.Mocked<ListingRepository> = {
  findAll: jest.fn(), findById: jest.fn(),
  saveRaw: jest.fn(), saveListing: jest.fn(), findUnprocessedRaw: jest.fn(),
}

describe('GetListings', () => {
  let useCase: GetListings
  beforeEach(() => { jest.clearAllMocks(); useCase = new GetListings(mockRepo) })

  it('applies default page and limit', async () => {
    mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 0 })
    await useCase.execute({})
    expect(mockRepo.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 })
  })

  it('passes filters through', async () => {
    mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 2, totalPages: 5 })
    await useCase.execute({ city: 'Kraków', priceMax: 500000, page: 2 })
    expect(mockRepo.findAll).toHaveBeenCalledWith({ city: 'Kraków', priceMax: 500000, page: 2, limit: 20 })
  })
})
```

Create `src/application/listing/__tests__/GetListingById.test.ts`:

```typescript
import { GetListingById } from '../GetListingById'
import type { ListingRepository } from '@/domain/listing/ListingRepository'

const mockRepo: jest.Mocked<ListingRepository> = {
  findAll: jest.fn(), findById: jest.fn(),
  saveRaw: jest.fn(), saveListing: jest.fn(), findUnprocessedRaw: jest.fn(),
}

describe('GetListingById', () => {
  let useCase: GetListingById
  beforeEach(() => { jest.clearAllMocks(); useCase = new GetListingById(mockRepo) })

  it('delegates to repository', async () => {
    mockRepo.findById.mockResolvedValue(null)
    const result = await useCase.execute(999)
    expect(mockRepo.findById).toHaveBeenCalledWith(999)
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest src/application/listing/__tests__/
```

- [ ] **Step 3: Create `src/application/listing/GetListings.ts`**

```typescript
import type { ListingRepository } from '@/domain/listing/ListingRepository'
import type { ListingFilters, PaginatedListings } from '@/domain/listing/Listing'

export class GetListings {
  constructor(private readonly repository: ListingRepository) {}

  async execute(filters: ListingFilters): Promise<PaginatedListings> {
    return this.repository.findAll({ page: 1, limit: 20, ...filters })
  }
}
```

- [ ] **Step 4: Create `src/application/listing/GetListingById.ts`**

```typescript
import type { ListingRepository } from '@/domain/listing/ListingRepository'
import type { Listing } from '@/domain/listing/Listing'

export class GetListingById {
  constructor(private readonly repository: ListingRepository) {}

  async execute(id: number): Promise<Listing | null> {
    return this.repository.findById(id)
  }
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx jest src/application/listing/__tests__/
```

- [ ] **Step 6: Commit**

```bash
git add src/application/listing
git commit -m "feat: add GetListings and GetListingById use cases"
```

---

### Task 10: API routes

**Files:**
- Create: `src/app/api/listings/route.ts`
- Create: `src/app/api/listings/[id]/route.ts`

- [ ] **Step 1: Create `src/app/api/listings/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { GetListings } from '@/application/listing/GetListings'
import { PrismaListingRepository } from '@/infrastructure/persistence/PrismaListingRepository'

const getListings = new GetListings(new PrismaListingRepository())

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const result = await getListings.execute({
    q: p.get('q') ?? undefined,
    city: p.get('city') ?? undefined,
    priceMin: p.get('priceMin') ? Number(p.get('priceMin')) : undefined,
    priceMax: p.get('priceMax') ? Number(p.get('priceMax')) : undefined,
    areaMin: p.get('areaMin') ? Number(p.get('areaMin')) : undefined,
    areaMax: p.get('areaMax') ? Number(p.get('areaMax')) : undefined,
    rooms: p.get('rooms') ? Number(p.get('rooms')) : undefined,
    page: p.get('page') ? Number(p.get('page')) : 1,
    limit: 20,
  })
  return NextResponse.json(result)
}
```

- [ ] **Step 2: Create `src/app/api/listings/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { GetListingById } from '@/application/listing/GetListingById'
import { PrismaListingRepository } from '@/infrastructure/persistence/PrismaListingRepository'

const getListingById = new GetListingById(new PrismaListingRepository())

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  const listing = await getListingById.execute(id)
  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(listing)
}
```

- [ ] **Step 3: Start dev server and verify**

```bash
npm run dev
```

Visit:
- `http://localhost:3000/api/listings` → JSON array of listings
- `http://localhost:3000/api/listings?city=Kraków` → filtered results
- `http://localhost:3000/api/listings/1` → single listing

- [ ] **Step 4: Commit**

```bash
git add src/app/api
git commit -m "feat: add listings API routes"
```

---

### Task 11: Shared UI components

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/components/ListingCard.tsx`
- Create: `src/app/components/FilterBar.tsx`

- [ ] **Step 1: Update `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NieruchomościPL',
  description: 'Przeglądaj oferty nieruchomości w Polsce',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <a href="/" className="text-xl font-semibold text-green-700 hover:text-green-800">
            NieruchomościPL
          </a>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Create `src/app/components/ListingCard.tsx`**

```tsx
import type { Listing } from '@/domain/listing/Listing'
import Link from 'next/link'

export function ListingCard({ listing }: { listing: Listing }) {
  const thumbnail = listing.images?.[0] ?? null

  return (
    <Link href={`/listing/${listing.id}`} className="block bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-48 bg-gray-100 overflow-hidden">
        {thumbnail
          ? <img src={thumbnail} alt={listing.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Brak zdjęcia</div>
        }
      </div>
      <div className="p-4">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">{listing.title}</h3>
        <div className="text-green-700 font-bold text-lg">
          {listing.price ? `${listing.price.toLocaleString('pl-PL')} PLN` : 'Cena nieznana'}
        </div>
        {listing.pricePerSqm && (
          <div className="text-gray-500 text-xs">{listing.pricePerSqm.toLocaleString('pl-PL')} PLN/m²</div>
        )}
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
          {listing.area && <span>{listing.area} m²</span>}
          {listing.rooms && <span>{listing.rooms} pok.</span>}
          {listing.city && <span>{listing.city}{listing.district ? `, ${listing.district}` : ''}</span>}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Create `src/app/components/FilterBar.tsx`**

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function FilterBar() {
  const router = useRouter()
  const sp = useSearchParams()

  const [q, setQ] = useState(sp.get('q') ?? '')
  const [city, setCity] = useState(sp.get('city') ?? '')
  const [priceMin, setPriceMin] = useState(sp.get('priceMin') ?? '')
  const [priceMax, setPriceMax] = useState(sp.get('priceMax') ?? '')
  const [areaMin, setAreaMin] = useState(sp.get('areaMin') ?? '')
  const [areaMax, setAreaMax] = useState(sp.get('areaMax') ?? '')
  const [rooms, setRooms] = useState(sp.get('rooms') ?? '')

  function apply() {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (city) params.set('city', city)
    if (priceMin) params.set('priceMin', priceMin)
    if (priceMax) params.set('priceMax', priceMax)
    if (areaMin) params.set('areaMin', areaMin)
    if (areaMax) params.set('areaMax', areaMax)
    if (rooms) params.set('rooms', rooms)
    router.push(`/?${params.toString()}`)
  }

  function reset() {
    setQ(''); setCity(''); setPriceMin(''); setPriceMax(''); setAreaMin(''); setAreaMax(''); setRooms('')
    router.push('/')
  }

  const inputClass = 'border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <input className={`col-span-2 ${inputClass}`} placeholder="Szukaj (np. kawalerka Warszawa)..."
          value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && apply()} />
        <input className={inputClass} placeholder="Miasto" value={city} onChange={e => setCity(e.target.value)} />
        <select className={inputClass} value={rooms} onChange={e => setRooms(e.target.value)}>
          <option value="">Liczba pokoi</option>
          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} {n === 1 ? 'pokój' : 'pokoje'}</option>)}
        </select>
        <input className={inputClass} placeholder="Cena od (PLN)" type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} />
        <input className={inputClass} placeholder="Cena do (PLN)" type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} />
        <input className={inputClass} placeholder="Pow. od (m²)" type="number" value={areaMin} onChange={e => setAreaMin(e.target.value)} />
        <input className={inputClass} placeholder="Pow. do (m²)" type="number" value={areaMax} onChange={e => setAreaMax(e.target.value)} />
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={apply} className="bg-green-700 text-white px-5 py-2 rounded text-sm font-medium hover:bg-green-800">Szukaj</button>
        <button onClick={reset} className="border border-gray-300 px-4 py-2 rounded text-sm text-gray-600 hover:bg-gray-50">Wyczyść</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/components
git commit -m "feat: add shared UI components — layout, ListingCard, FilterBar"
```

---

### Task 12: Listings page with lazy loading

**Files:**
- Create: `src/app/components/ListingsGrid.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create `src/app/components/ListingsGrid.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Listing } from '@/domain/listing/Listing'
import { ListingCard } from './ListingCard'

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-5 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  )
}

interface Props {
  initialListings: Listing[]
  initialTotal: number
  searchParams: Record<string, string>
}

export function ListingsGrid({ initialListings, initialTotal, searchParams }: Props) {
  const [listings, setListings] = useState<Listing[]>(initialListings)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialListings.length < initialTotal)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setListings(initialListings)
    setPage(1)
    setHasMore(initialListings.length < initialTotal)
  }, [initialListings, initialTotal])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    const nextPage = page + 1
    const params = new URLSearchParams({ ...searchParams, page: String(nextPage), limit: '20' })
    const res = await fetch(`/api/listings?${params}`)
    const data = await res.json()
    setListings(prev => [...prev, ...data.data])
    setPage(nextPage)
    setHasMore(nextPage < data.totalPages)
    setLoading(false)
  }, [loading, hasMore, page, searchParams])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [loadMore])

  if (listings.length === 0 && !loading) {
    return <div className="text-center py-16 text-gray-500">Nie znaleziono ogłoszeń spełniających kryteria.</div>
  }

  return (
    <>
      <p className="text-sm text-gray-500 mb-4">{initialTotal} ogłoszeń</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map(l => <ListingCard key={l.id} listing={l} />)}
        {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div ref={sentinelRef} className="h-10" />
    </>
  )
}
```

- [ ] **Step 2: Replace `src/app/page.tsx`**

```tsx
import { Suspense } from 'react'
import { GetListings } from '@/application/listing/GetListings'
import { PrismaListingRepository } from '@/infrastructure/persistence/PrismaListingRepository'
import { FilterBar } from './components/FilterBar'
import { ListingsGrid } from './components/ListingsGrid'

interface PageProps {
  searchParams: Record<string, string>
}

export default async function HomePage({ searchParams }: PageProps) {
  const getListings = new GetListings(new PrismaListingRepository())

  const { data, total } = await getListings.execute({
    q: searchParams.q,
    city: searchParams.city,
    priceMin: searchParams.priceMin ? Number(searchParams.priceMin) : undefined,
    priceMax: searchParams.priceMax ? Number(searchParams.priceMax) : undefined,
    areaMin: searchParams.areaMin ? Number(searchParams.areaMin) : undefined,
    areaMax: searchParams.areaMax ? Number(searchParams.areaMax) : undefined,
    rooms: searchParams.rooms ? Number(searchParams.rooms) : undefined,
    page: 1,
    limit: 20,
  })

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Oferty nieruchomości</h1>
      <Suspense>
        <FilterBar />
      </Suspense>
      <ListingsGrid initialListings={data} initialTotal={total} searchParams={searchParams} />
    </>
  )
}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Open http://localhost:3000 — cards visible, filters work, scrolling loads more listings.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/components/ListingsGrid.tsx
git commit -m "feat: add listings page with filter bar and lazy loading"
```

---

### Task 13: Offer detail page

**Files:**
- Create: `src/app/listing/[id]/page.tsx`

- [ ] **Step 1: Create `src/app/listing/[id]/page.tsx`**

```tsx
import { GetListingById } from '@/application/listing/GetListingById'
import { PrismaListingRepository } from '@/infrastructure/persistence/PrismaListingRepository'
import { notFound } from 'next/navigation'
import Link from 'next/link'

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`font-semibold mt-0.5 ${highlight ? 'text-green-700 text-lg' : 'text-gray-900'}`}>{value}</div>
    </div>
  )
}

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const listing = await new GetListingById(new PrismaListingRepository()).execute(Number(params.id))
  if (!listing) notFound()

  const images = listing.images ?? []

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/" className="text-sm text-green-700 hover:underline mb-4 inline-block">← Wróć do ogłoszeń</Link>

      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto mb-6">
          {images.slice(0, 8).map((src, i) => (
            <img key={i} src={src} alt={`${listing.title} – ${i + 1}`} className="h-64 w-auto flex-shrink-0 rounded-lg object-cover" />
          ))}
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-4">{listing.title}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <Stat label="Cena" value={listing.price ? `${listing.price.toLocaleString('pl-PL')} PLN` : '—'} highlight />
        <Stat label="Cena/m²" value={listing.pricePerSqm ? `${listing.pricePerSqm.toLocaleString('pl-PL')} PLN/m²` : '—'} />
        <Stat label="Powierzchnia" value={listing.area ? `${listing.area} m²` : '—'} />
        <Stat label="Pokoje" value={listing.rooms ? String(listing.rooms) : '—'} />
        <Stat label="Piętro" value={listing.floor != null ? `${listing.floor}${listing.totalFloors ? `/${listing.totalFloors}` : ''}` : '—'} />
        <Stat label="Rok budowy" value={listing.yearBuilt ? String(listing.yearBuilt) : '—'} />
        <Stat label="Miasto" value={[listing.city, listing.district].filter(Boolean).join(', ') || '—'} />
        <Stat label="Adres" value={listing.address ?? '—'} />
      </div>

      {listing.description && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-gray-700 mb-2">Opis</h2>
          <p className="text-gray-700 whitespace-pre-line text-sm leading-relaxed">{listing.description}</p>
        </div>
      )}

      <div className="text-sm text-gray-500">
        Źródło: <span className="capitalize">{listing.source}</span> ·{' '}
        <a href={listing.url} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">
          Zobacz oryginalne ogłoszenie ↗
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:3000/listing/1 — should show image gallery, stats grid, description, source link.

- [ ] **Step 3: Commit**

```bash
git add src/app/listing
git commit -m "feat: add offer detail page"
```

---

### Task 14 (Optional): AI Chat Search

*Implement only if time permits after Task 13 is verified working.*

**Files:**
- Create: `src/app/api/listings/chat-search/route.ts`
- Create: `src/app/components/ChatSearch.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create `src/app/api/listings/chat-search/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { GetListings } from '@/application/listing/GetListings'
import { PrismaListingRepository } from '@/infrastructure/persistence/PrismaListingRepository'

const getListings = new GetListings(new PrismaListingRepository())

const SYSTEM_PROMPT = `Extract property search filters from natural language. Return ONLY valid JSON:
{
  "city": string | null,
  "priceMin": number | null,
  "priceMax": number | null,
  "areaMin": number | null,
  "areaMax": number | null,
  "rooms": number | null,
  "q": string | null
}
Examples:
- "cheap flat 40m in Kraków" → {"city":"Kraków","areaMin":35,"areaMax":50,"priceMax":400000}
- "3 room Warsaw under 800k" → {"city":"Warszawa","rooms":3,"priceMax":800000}
No markdown. JSON only.`

export async function POST(req: NextRequest) {
  const { query } = await req.json()
  if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: query },
    ],
    temperature: 0,
  })

  const filters = JSON.parse(response.choices[0]?.message?.content ?? '{}')
  const result = await getListings.execute(filters)
  return NextResponse.json({ filters, ...result })
}
```

- [ ] **Step 2: Create `src/app/components/ChatSearch.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { Listing } from '@/domain/listing/Listing'
import { ListingCard } from './ListingCard'

export function ChatSearch() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Listing[] | null>(null)
  const [total, setTotal] = useState(0)
  const [detectedFilters, setDetectedFilters] = useState<Record<string, unknown>>({})

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    const res = await fetch('/api/listings/chat-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    const data = await res.json()
    setResults(data.data)
    setTotal(data.total)
    setDetectedFilters(data.filters)
    setLoading(false)
  }

  return (
    <div className="mb-6">
      <div className="bg-white border border-green-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Szukaj naturalnym językiem</label>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="np. tanie mieszkanie 40m w Krakowie..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
          <button
            onClick={search}
            disabled={loading}
            className="bg-green-700 text-white px-5 py-2 rounded text-sm font-medium hover:bg-green-800 disabled:opacity-50"
          >
            {loading ? 'Szukam...' : 'Szukaj'}
          </button>
        </div>
        {Object.keys(detectedFilters).length > 0 && (
          <div className="mt-2 text-xs text-gray-400">Wykryte filtry: {JSON.stringify(detectedFilters)}</div>
        )}
      </div>

      {results !== null && (
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-3">{total} wyników</p>
          {results.length === 0
            ? <p className="text-center text-gray-500 py-8">Brak wyników.</p>
            : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map(l => <ListingCard key={l.id} listing={l} />)}
              </div>
          }
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add `ChatSearch` to `src/app/page.tsx`**

Add import at the top:
```tsx
import { ChatSearch } from './components/ChatSearch'
```

Add above `<FilterBar />` in the JSX:
```tsx
<ChatSearch />
```

- [ ] **Step 4: Verify chat search in browser**

Type "tanie mieszkanie 40m w Krakowie" into the chat box and submit. Expected: results filtered by Kraków + area ~40m².

- [ ] **Step 5: Commit**

```bash
git add src/app/api/listings/chat-search src/app/components/ChatSearch.tsx src/app/page.tsx
git commit -m "feat: add optional AI chat search"
```

---

## Self-Review

**Spec coverage:**
- ✅ 5-site scraping — Tasks 7, 8
- ✅ Raw + normalised two-table storage — Tasks 2, 8
- ✅ OpenAI normalisation — Tasks 5, 8
- ✅ DDD layers (domain, application, infrastructure, presentation) — Tasks 3, 4, 5, 9, 10
- ✅ Listings page with search + filters — Tasks 11, 12
- ✅ Lazy loading — Task 12
- ✅ Offer detail page — Task 13
- ✅ Optional AI chat search — Task 14
- ✅ Docker + MySQL — Task 2
- ✅ Prisma — Tasks 2, 4

**Placeholder scan:** No TBDs. All code blocks are complete. ✓

**Type consistency:**
- `ListingRepository` interface (Task 3) → implemented in `PrismaListingRepository` (Task 4) → used in Tasks 9, 10, 12, 13. ✓
- `ListingNormalizer` interface (Task 3) → implemented in `OpenAIListingNormalizer` (Task 5) → used in Task 8. ✓
- `Listing` domain type used uniformly; `images` is always `string[]` in domain, serialised as `JSON.stringify` in DB, deserialised in `mapRow`. ✓
- `NormalizedListing` returned by normalizer consumed in `SeedListings.normalizeAll()` → spread directly into `saveListing` call. ✓
