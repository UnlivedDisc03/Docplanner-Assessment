# Real Estate Portal — Design Spec
**Date:** 2026-06-23
**Project:** Docplanner Assessment

---

## 1. Overview

A simplified real estate listings platform inspired by otodom.pl and tabelaofert.pl. The system scrapes ~100 listings from five Polish real estate websites, normalises them using OpenAI, stores them in MySQL, and exposes a Next.js web app for browsing and searching.

---

## 2. Architecture

**Pattern:** Option A — Next.js monorepo with a standalone scraper script.

- The Next.js app handles UI, API routes, and DB access via Prisma. It is a pure read layer at runtime.
- A standalone `scripts/scrape.ts` runs once to populate the database. It is never called from the web app.
- MySQL runs in Docker Compose.
- OpenAI (`gpt-4o-mini`) is used only during the scrape/normalise pass, not at query time.

**Architectural style:** Domain-Driven Design (DDD) with four layers:

| Layer | Responsibility |
|---|---|
| Domain | `Listing` entity, repository interface, normalizer interface — no framework dependencies |
| Application | Use cases: `GetListings`, `GetListingById`, `SeedListings` |
| Infrastructure | Prisma repository, OpenAI normalizer, per-site Puppeteer scrapers |
| Presentation | Next.js pages and API routes — calls application use cases only |

---

## 3. Project Structure

```
docplanner-assessment/
├── docker-compose.yml
├── prisma/
│   └── schema.prisma
├── scripts/
│   ├── scrape.ts                         # Orchestrator
│   └── scrapers/
│       ├── OtodomScraper.ts
│       ├── TabelaofertScraper.ts
│       ├── OkolicaScraper.ts
│       ├── PropertystarScraper.ts
│       └── RealtingScraper.ts
└── src/
    ├── domain/
    │   └── listing/
    │       ├── Listing.ts
    │       ├── ListingRepository.ts       # Interface (port)
    │       └── ListingNormalizer.ts       # Interface (port)
    ├── application/
    │   └── listing/
    │       ├── GetListings.ts
    │       ├── GetListingById.ts
    │       └── SeedListings.ts
    ├── infrastructure/
    │   ├── persistence/
    │   │   └── PrismaListingRepository.ts
    │   ├── scraping/
    │   │   └── ScrapingOrchestrator.ts
    │   └── ai/
    │       └── OpenAIListingNormalizer.ts
    ├── presentation/
    │   └── app/
    │       ├── page.tsx                   # Listings page
    │       ├── listing/[id]/page.tsx      # Detail page
    │       └── api/
    │           └── listings/
    │               ├── route.ts
    │               └── [id]/route.ts
    └── lib/
        ├── prisma.ts
        └── openai.ts
```

---

## 4. Data Model

Two tables: a raw staging table and a normalised listings table.

```prisma
// Staging — raw scraped data, one row per listing page
model RawListing {
  id        Int      @id @default(autoincrement())
  source    String   // "otodom" | "tabelaofert" | "okolica" | "properstar" | "realting"
  url       String   @unique
  rawHtml   String?  @db.LongText
  rawJson   Json
  scrapedAt DateTime @default(now())

  listing   Listing?
}

// Normalised — cleaned, typed, queryable
model Listing {
  id          Int        @id @default(autoincrement())
  rawId       Int        @unique
  raw         RawListing @relation(fields: [rawId], references: [id])
  source      String
  url         String     @unique

  title       String
  description String     @db.Text
  price       Int?       // PLN
  pricePerSqm Int?       // derived: price / area
  currency    String     @default("PLN")
  area        Float?     // m²
  rooms       Int?
  floor       Int?
  totalFloors Int?
  yearBuilt   Int?

  city        String?
  district    String?
  address     String?
  lat         Float?
  lng         Float?

  images      String     @db.Text  // JSON array of image URLs

  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([city])
  @@index([price])
  @@index([area])
}
```

`RawListing.rawJson` stores whatever OpenAI extracted without validation — used for analysis and re-normalization without re-scraping. The `Listing` table is populated in a second pass after the raw data is collected.

---

## 5. Scraping & Normalisation

**Sources (target ~20 listings each):**
- otodom.pl
- tabelaofert.pl
- okolica.pl
- properstar.co.uk/poland/buy
- realting.com/poland/property

**Scraper interface:**
```typescript
interface IScraper {
  source: string;
  scrape(): Promise<{ url: string; rawJson: Record<string, unknown> }[]>;
}
```

Each scraper uses Puppeteer (headless Chrome) to navigate listing index pages, visit each listing, extract visible text, and pass it to OpenAI. No per-field CSS selectors — the AI handles field extraction, keeping scrapers resilient to layout changes.

**Rate limiting:** 500ms delay between page loads per site, scrapers run sequentially.

**Normalisation:**
- One `gpt-4o-mini` call per listing
- System prompt instructs the model to extract fields matching the `Listing` schema from raw Polish real estate text
- Missing or unparseable fields returned as `null`
- `pricePerSqm` derived at normalise time if both `price` and `area` are present

**Re-run safety:** `url @unique` on both tables prevents duplicate entries on repeated runs.

**Scrape flow:**
```
scripts/scrape.ts
  → for each scraper: scrape() → upsert RawListing rows
  → for each RawListing without a linked Listing: normalise() → insert Listing
```

---

## 6. API Routes

### `GET /api/listings`

| Param | Type | Description |
|---|---|---|
| `q` | string | Full-text search on title + description |
| `city` | string | Case-insensitive exact match |
| `priceMin` | number | PLN |
| `priceMax` | number | PLN |
| `areaMin` | number | m² |
| `areaMax` | number | m² |
| `rooms` | number | Exact match |
| `page` | number | Default 1 |
| `limit` | number | Default 20 |

**Response:**
```json
{ "data": [...], "total": 100, "page": 1, "totalPages": 5 }
```

### `GET /api/listings/[id]`

Returns a single `Listing` object (full fields including description and images).

Search uses Prisma `where` clauses (`contains` for text, range filters for numeric fields). No full-text index needed at 100-listing scale.

---

## 7. Frontend UI

**Technology:** Next.js (App Router), Tailwind CSS. Mobile-responsive. No auth.

### Listings page (`/`)
- Top bar: text search input + filter dropdowns (city, price range, area range, rooms)
- Results: card-based grid (2–3 columns)
- Each card: thumbnail, title, price, pricePerSqm, area, rooms, city/district
- Lazy loading via Intersection Observer — fetches next 20 on scroll, appends to list
- Loading skeleton cards while fetching
- Empty state message when filters return no results

### Offer detail page (`/listing/[id]`)
- Image gallery (horizontal scroll)
- Key stats row: price, pricePerSqm, area, rooms, floor, totalFloors, yearBuilt
- Full description block
- Location: city, district, address
- "View original listing" link to source URL
- Back navigation preserving scroll position and active filters

**UI semantic reference:** otodom.pl, tabelaofert.pl — card-based listings grid, sidebar-style filters, clean offer detail layout.

---

## 8. Optional Feature — AI Chat Search

*Implement last, only if time permits.*

A natural language search input replaces or supplements the filter bar. The user types freeform intent (e.g. "cheap flat around 40m² in Kraków") and the app:

1. Sends the query to a `/api/listings/search` route
2. Route calls `gpt-4o-mini` with the query + filter schema
3. Model returns a structured filter object `{ city, priceMax, areaMin, areaMax, rooms }`
4. Route runs the standard `GetListings` use case with those filters
5. Returns results to the frontend

No vector DB or embeddings needed — the model is sufficient for parsing intent into filters at this scale.

---

## 9. Infrastructure

**docker-compose.yml:**
```yaml
services:
  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: realestate
    ports:
      - "3306:3306"
  adminer:
    image: adminer
    ports:
      - "8080:8080"
```

**Environment variables:**
```
DATABASE_URL=mysql://root:root@localhost:3306/realestate
OPENAI_API_KEY=...
```

---

## 10. Key Decisions & Tradeoffs

| Decision | Rationale |
|---|---|
| Puppeteer over Cheerio | Target sites are JS-rendered (otodom uses React) |
| `gpt-4o-mini` for normalisation | Cheap (~$0.03 for 100 listings), handles Polish field names well |
| Two-table design | Decouples scraping from normalisation; raw data preserved for schema analysis |
| No full-text index | 100 listings is small enough for `LIKE` queries via Prisma |
| Lazy loading over pagination | More consistent with target site UX patterns |
| DDD layering | Demonstrates architectural thinking; keeps domain logic testable and framework-independent |

---

## 11. Out of Scope

- User authentication
- Favourites / saved searches
- Map view
- Scheduled re-scraping
- Deduplication across sources (different URLs for same property)
