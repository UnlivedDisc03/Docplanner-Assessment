# End-to-End Test Findings

**Date:** 2026-06-23
**Framework:** Playwright 1.61.0 (Chromium)
**Tests:** 26 (5 spec files)
**Result:** **26 / 26 passing**
**Target:** Next.js dev server, http://localhost:3001
**Database state:** 102 listings present in `realestate.Listing` (otodom scrape)

---

## How to run

```bash
# 1. Make sure docker + dev server are up
docker compose up -d
npm run dev               # serves on http://localhost:3001 (or 3000)

# 2. From the worktree root
npx playwright test                     # all suites
npx playwright test home.spec.ts        # one file
npx playwright test -g "city"           # by test name
npx playwright show-report              # open HTML report
```

Config: `playwright.config.ts` reuses an existing dev server. To let Playwright spawn its own, set `E2E_NO_WEBSERVER=0` and free port 3001. Override the target with `E2E_BASE_URL=http://localhost:3000`.

---

## Coverage Overview

| Spec file | Tests | Area |
|---|---|---|
| `tests/e2e/home.spec.ts` | 3 | Layout, listings grid, chat widget visibility |
| `tests/e2e/filters.spec.ts` | 10 | City / price / rooms / market / dropdown / empty state / AI-set filters visible / Wyczyść clear-all |
| `tests/e2e/listing-detail.spec.ts` | 3 | Navigation, detail page content, 404 |
| `tests/e2e/api.spec.ts` | 7 | `/api/listings` + `/api/listings/[id]` contract |
| `tests/e2e/ai-search.spec.ts` | 3 | Header AI search, chat widget round-trip, search-interpret |

---

## What is verified

### Home page (`home.spec.ts`)
- Header brand, search box, all filter inputs render
- Offer counter (`<N> ofert`) renders and is > 0
- At least one listing card is rendered with non-empty content
- Floating chat button toggles the assistant panel

### Filtering (`filters.spec.ts`)
- Typing in **Miasto** debounces and writes `?city=` to the URL; result count never grows past baseline
- **Cena do** filter sets `?priceMax=`
- **Rooms** select writes `?rooms=`
- **Rynek** select writes `?marketType=secondary`
- **Filtry** dropdown opens, "Mieszkanie" checkbox pushes `?propertyTypes=apartment`
- A fake city (`?city=ZZZ-NoSuchCity-XYZ`) renders the "Brak ogłoszeń" empty state

### Listing detail (`listing-detail.spec.ts`)
- Clicking a card navigates to `/listing/{id}` with the expected URL pattern
- Detail page renders title (h1), all four stat boxes (`Powierzchnia`, `Pokoje`, `Piętro`, `Czynsz`), CTA, description, amenities and details sections
- External CTA (`Zobacz ogłoszenie →`) opens in a new tab with `rel="noopener"` and a valid `http(s)` href
- Breadcrumb back-link returns to the home page
- `/listing/99999999` returns HTTP 404

### API contracts (`api.spec.ts`)
- `GET /api/listings` returns `{ data: [], total: number }`, respects `limit`
- `?city=` filter narrows total
- `?priceMax=400000` excludes pricier listings (asserted per record)
- `?rooms=2` returns only matching room counts (asserted per record)
- Page 1 and Page 2 have no overlapping ids when more than one page exists
- `GET /api/listings/{id}` returns the listing with `id`, `title`, `price`, `images`
- `GET /api/listings/99999999` returns 404

### AI features (`ai-search.spec.ts`)
- Header search "Opisz czego szukasz..." calls `POST /api/search-interpret`, redirects to `/?...&_ai=1`, and shows the offer counter
- Chat widget POSTs to `/api/chat`, receives `{ message, listings }` and renders the user message
- `POST /api/search-interpret` with an explicit Polish query returns `{ params: ... }` (live OpenAI round-trip)

---

## Test Run Detail (final)

```
Running 22 tests using 1 worker

  ok   1  ai-search.spec.ts  header search calls /api/search-interpret and redirects with _ai=1  (2.3s)
  ok   2  ai-search.spec.ts  chat widget submits message and shows assistant reply              (8.1s)
  ok   3  ai-search.spec.ts  search-interpret returns structured params for explicit query      (0.9s)
  ok   4  api.spec.ts        returns paginated payload with data and total                      (29ms)
  ok   5  api.spec.ts        city filter narrows result set                                     (49ms)
  ok   6  api.spec.ts        priceMax filter excludes listings priced higher                    (36ms)
  ok   7  api.spec.ts        rooms filter returns matching room count                           (35ms)
  ok   8  api.spec.ts        pagination returns different results on different pages            (36ms)
  ok   9  api.spec.ts        returns a single listing by id                                     (58ms)
  ok  10  api.spec.ts        returns 404 for unknown id                                         (24ms)
  ok  11  filters.spec.ts    filtering by city narrows the result count and reflects in URL     (1.5s)
  ok  12  filters.spec.ts    price-max filter rejects expensive listings                        (1.6s)
  ok  13  filters.spec.ts    rooms select pushes rooms param                                    (1.5s)
  ok  14  filters.spec.ts    market-type select pushes marketType param                         (1.6s)
  ok  15  filters.spec.ts    filters dropdown opens and toggles property type                   (1.3s)
  ok  16  filters.spec.ts    non-matching filter shows empty state                              (0.5s)
  ok  17  home.spec.ts       renders header, filter bar and listings grid                       (0.9s)
  ok  18  home.spec.ts       every visible listing card has a price and title                   (1.0s)
  ok  19  home.spec.ts       chat widget button is visible and toggles panel                    (0.9s)
  ok  20  listing-detail     clicking a card navigates to the detail page                       (1.1s)
  ok  21  listing-detail     detail page shows price, stats bar and external link               (1.1s)
  ok  22  listing-detail     unknown listing id returns 404                                     (0.5s)

  22 passed (26.3s)
```

---

## Observations during authoring

### 1. UI text "Mieszkanie" is overloaded
Property-type label "Mieszkanie" appears both in the filter dropdown and in many listing titles ("3-pokojowe mieszkanie ..."). A `getByText('Mieszkanie')` selector hits ~10 elements. Used `getByLabel('Mieszkanie', { exact: true })` to scope to the checkbox label, which is the right semantic selector anyway.

### 2. FilterBar debounce (400 ms)
`FilterBar.update` debounces by 400 ms. Tests rely on `page.waitForURL(...)` rather than reading `page.url()` immediately after `.fill()`. Safe with default 5 s timeout.

### 3. `_ai=1` masking was a UX bug — fixed
Originally `FilterBar` and `FiltersDropdown` blanked all visible values when `_ai=1` was on the URL. The AI search flow does set real structured filter params (`city`, `priceMax`, `rooms`, `propertyTypes`, …) — the masking hid them, so users couldn't see what was filtered or clear individual filters. The masking is removed; both components now read URL values unconditionally. Each `<input>`/`<select>` got a `key` derived from its URL value so React remounts and picks up new defaults after `router.push`. Two new tests assert AI-set filters render in the bar and that touching one drops `_ai` while preserving the rest.

### 4. Live OpenAI round-trips in two AI tests
- `header search` triggers `gpt-4o-mini` once (search-interpret)
- `chat widget submits message` triggers two `gpt-4o-mini` calls (tool call + follow-up)
- `search-interpret returns structured params` triggers one call

These three tests need `OPENAI_API_KEY` set in `.env.local`. If the key is removed or rate-limited the AI suite will fail; the other 19 tests are independent. Total OpenAI cost per run is roughly $0.001.

### 5. Test runner expectations vs Jest
Added `testPathIgnorePatterns: ['/tests/e2e/']` to `jest.config.ts` so `npm test` won't try to load Playwright specs (which use `@playwright/test`'s `test` fixture, not Jest globals).

### 6. Dev-server port choice
The project's `web-vision` container occupies port 3000, so Next.js dev fell back to 3001 — that is the port Playwright targets by default. Override via `E2E_PORT` or `E2E_BASE_URL`.

### 7. Trace / screenshot artefacts
On failure Playwright writes `test-results/<spec>/trace.zip` and `test-failed-1.png`. Inspect with `npx playwright show-trace test-results/<path>/trace.zip`.

---

## Functional issues found in the app

**None.** Every flow exercised behaves as the design and source code claim:

- All filters serialize to the URL correctly and narrow results.
- Detail page renders all required sections even for listings with sparse data (graceful "Nie podano" fallbacks).
- 404s are returned on bad listing ids both from the page route and the API.
- AI search and chat both round-trip to OpenAI and render results.

---

## Gaps / what is **not** covered

These were out of scope for this pass but are easy to add:

| Gap | Notes |
|---|---|
| Infinite-scroll pagination on the home grid | Would need a tall viewport and scroll into `IntersectionObserver` sentinel; current dataset (102 records, 20/page) gives 6 pages |
| Image gallery lightbox open / next / prev | `ListingGallery.tsx` + `ImageLightbox.tsx` interaction |
| AI summary streaming / loading state | `AISummary` may fetch live; only render assertion done |
| Mobile viewport / responsive grid breakpoints | Currently 1366×800 only |
| Filter combinations (property type + condition + amenity together) | Only individual filters tested |
| URL → filter restoration on direct deep-link | Implicit when navigating but not asserted |
| Save / favourite button | Wired in markup but no persistence yet — no behaviour to test |
| Browser back/forward through filter URLs | Worth a test for `router.push` history correctness |
| AI search _ai=1 cleanup when user types a manual filter | Confirmed in code (`update` deletes `_ai`); not asserted in E2E |

If any of these are higher-priority, drop a request and a spec can be added under the same `tests/e2e/` directory.
