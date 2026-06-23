# Real Estate Portal — Docplanner Assessment

A Polish real estate listings platform. Scrapes ~100 listings from 5 sites, normalises them with OpenAI, and exposes them via a Next.js web app.

---

## Prerequisites

- Node.js 18+
- Docker Desktop (running)
- An OpenAI API key

---

## Setup

### 1. Environment variables

Create `.env.local` in the project root:

```
DATABASE_URL="mysql://root:root@localhost:3306/realestate"
OPENAI_API_KEY="sk-..."
```

### 2. Start the database

```bash
docker compose up -d
```

MySQL 8 starts on port 3306. Adminer (DB browser) starts on port 8080.

### 3. Install dependencies

```bash
npm install
```

### 4. Run DB migrations (first time only)

```bash
npx prisma migrate dev
```

---

## Database Access

### Via Adminer (web UI)

Open http://localhost:8080 in your browser and log in:

| Field    | Value      |
|----------|------------|
| System   | MySQL      |
| Server   | mysql      |
| Username | root       |
| Password | root       |
| Database | realestate |

### Via CLI

```bash
docker exec -it real-estate-portal-mysql-1 mysql -u root -proot realestate
```

---

## Scraping & Seeding

The scraper runs in two phases. **You need your OpenAI API key in `.env.local` before Phase 2.**

### Phase 1 — Scrape raw listings (no API key needed)

```bash
npm run scrape
```

Visits 5 Polish real estate sites with Puppeteer and saves raw text to the `RawListing` table. Takes ~5-15 minutes. Safe to re-run (duplicate URLs are skipped).

**Current status:** Phase 1 complete — 60 raw listings in DB.

### ⚠️ PAUSE — Schema analysis required before Phase 2

Before running normalization, browse the `RawListing` table in Adminer and inspect the `rawJson` column. Decide what extra fields to add to the `Listing` table, update `prisma/schema.prisma`, then run:

```bash
npx prisma migrate dev --name <your-migration-name>
```

### Phase 2 — Normalize with OpenAI (API key required)

Once the schema is finalised, run:

```bash
npm run normalize
```

---

## Development

```bash
npm run dev
```

App runs at http://localhost:3000.

---

## Project Structure

```
src/
├── domain/listing/          # Entities and interfaces (no framework deps)
├── application/listing/     # Use cases (GetListings, GetListingById, SeedListings)
├── infrastructure/
│   ├── ai/                  # OpenAIListingNormalizer
│   ├── persistence/         # PrismaListingRepository
│   └── scraping/            # Puppeteer scrapers (5 sites)
├── app/                     # Next.js pages and API routes
└── lib/                     # Prisma + OpenAI singletons
scripts/
└── scrape.ts                # Phase 1 scrape script
```

---

## Scraping Status

| Site             | Status            | Listings |
|------------------|-------------------|----------|
| otodom.pl        | ✅ Success        | 20       |
| tabelaofert.pl   | ✅ Success        | 20       |
| okolica.pl       | ❌ 0 found        | 0        |
| properstar.co.uk | ❌ Nav error      | 0        |
| realting.com     | ✅ Success        | 20       |
| **Total**        |                   | **60**   |

Okolica and Properstar scrapers may need selector fixes — see `src/infrastructure/scraping/scrapers/`.

---

## TODO

- [ ] Add OpenAI API key to `.env.local`
- [ ] Analyze `RawListing.rawJson` in Adminer to decide final `Listing` schema fields
- [ ] Update `prisma/schema.prisma` with any new fields and run migration
- [ ] Run Phase 2 normalization (`npm run normalize`)
- [ ] Fix OkolicaScraper (0 listings — likely wrong index page selectors)
- [ ] Fix PropertystarScraper (Puppeteer navigation race condition)
- [ ] Implement API routes (`/api/listings`, `/api/listings/[id]`)
- [ ] Build listings page with filter bar and lazy loading
- [ ] Build offer detail page
- [ ] (Optional) AI chat search
