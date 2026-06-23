# Real Estate Portal — Docplanner Assessment

A Polish real estate listings platform built with Next.js, Prisma, and OpenAI. Scrapes ~105 listings from otodom.pl, normalises them with GPT-4o-mini (extracting structured fields + AI summary), and presents them in a filterable browsing UI with detail pages.

---

## Tech Stack

- **Next.js 16** (App Router, server components)
- **Prisma 7** + **MySQL 8** (via Docker)
- **OpenAI GPT-4o-mini** — field extraction + Polish AI summary per listing
- **Puppeteer** — scraping otodom.pl search pages + detail pages via `_next/data` API
- **Tailwind CSS v4**

---

## Prerequisites

- Node.js 20+
- Docker Desktop (running)
- An OpenAI API key (`sk-proj-...`)

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd real-estate-portal
npm install
```

### 2. Environment variables

Copy the example and fill in your OpenAI key:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
DATABASE_URL="mysql://root:root@localhost:3306/realestate"
OPENAI_API_KEY="sk-proj-..."
```

### 3. Start the database

```bash
docker compose up -d
```

MySQL 8 starts on port 3306. Adminer (web DB browser) starts on port 8080.

### 4. Run migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. Seed the database (fast) **or** scrape live

**Fast path — restore the committed snapshot (~5 s, no OpenAI calls):**

```bash
npm run seed
```

Pipes `prisma/seed.sql` into the running MySQL container (102 listings + 105 raw rows). Idempotent — runs `TRUNCATE` first, so it's safe to re-run. Override the container name with `MYSQL_CONTAINER=<name>` if it differs.

**Or scrape fresh (~10–15 min, needs `OPENAI_API_KEY`):**

```bash
npm run rescrape
```

Clears the DB, scrapes ~105 listings from otodom.pl, normalises each with OpenAI. Use this only when you want fresh data.

### 6. Start the dev server

```bash
npm run dev
```

App runs at http://localhost:3000 (or 3001 if 3000 is in use).

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run seed` | Restore `prisma/seed.sql` snapshot into the MySQL container (fast, no OpenAI) |
| `npm run rescrape` | Clear DB → scrape otodom → normalise all with OpenAI |
| `npm run normalize` | Re-normalise existing raw listings (no scrape) |
| `npm test` | Run Jest unit tests |
| `npx playwright test` | Run the Playwright E2E suite (see `E2E-Test.md`) |

---

## Database Access

### Adminer (web UI)

Open http://localhost:8080 and log in:

| Field | Value |
|---|---|
| System | MySQL |
| Server | mysql |
| Username | root |
| Password | root |
| Database | realestate |

### CLI

```bash
docker exec -it real-estate-portal-mysql-1 mysql -u root -proot realestate
```

---

## Project Structure

```
src/
├── domain/listing/          # Entities and interfaces (no framework deps)
│   ├── Listing.ts
│   ├── ListingRepository.ts
│   └── ListingNormalizer.ts
├── application/listing/     # Use cases
│   ├── GetListings.ts
│   ├── GetListingById.ts
│   └── SeedListings.ts
├── infrastructure/
│   ├── ai/                  # OpenAIListingNormalizer (extract + summarise)
│   ├── persistence/         # PrismaListingRepository
│   └── scraping/            # Puppeteer scrapers
│       ├── BaseScraper.ts
│       └── scrapers/OtodomScraper.ts
├── app/                     # Next.js App Router pages + components
│   ├── page.tsx             # Browse / filter listings
│   ├── listing/[id]/        # Listing detail page
│   └── components/          # FilterBar, ListingCard, ListingGallery, etc.
└── lib/                     # Prisma + OpenAI client singletons
scripts/
├── rescrape.ts              # Full pipeline: scrape + normalise
└── normalize.ts             # Re-normalise only (keeps existing raw data)
prisma/
├── schema.prisma
└── migrations/
```

---

## Features

- **Browse & filter** — city, price range, rooms, market type, property type, condition, amenities (balcony, parking, garden, elevator)
- **Full descriptions** — fetched from each listing's detail page via otodom's `_next/data` API
- **Structured fields** — floor, heating type, condition, monthly fee, year built, market type extracted from otodom's internal `target` data
- **AI summary** — 2–3 sentence Polish summary generated once at scrape time, stored in DB
- **Image gallery** — 3-up grid with fullscreen lightbox, broken images skipped automatically
- **Listing detail page** — stats bar, AI summary, full description, amenities, details grid, sticky price card
