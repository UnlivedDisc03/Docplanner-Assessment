# Scraped Data Findings

**Date:** 2026-06-23  
**Total listings analysed:** 60  
**Sources:** otodom (20), tabelaofert (20), realting (20)

---

## Source Language Split

- **otodom.pl** — Polish only
- **tabelaofert.pl** — Polish only
- **realting.com** — English (international portal)

This means roughly 2/3 of the data is Polish and 1/3 English. The normalizer prompt already accounts for both.

---

## Keyword Frequency Analysis

### HIGH frequency (50+ appearances across all 60 listings)

These fields appear in nearly every listing and are essential to the data model.

| Keyword | Count | Meaning |
|---|---|---|
| `m²` | 585 | Area in square metres — universal |
| `apartment` | 342 | Property type (English listings) |
| `zł` | 194 | Polish złoty price — present in ~all Polish listings |
| `dom` | 151 | House/building reference |
| `bedroom` | 126 | Room count (English listings) |
| `price` | 110 | Price field (English listings) |
| `property` | 88 | Generic property reference |
| `area` | 78 | Area field (English) |
| `pokoje` | 72 | Rooms (Polish) |
| `stan` | 57 | Condition/state of the property |
| `park` | 52 | Near a park — location feature |

**Key takeaway:** Area (m²), price, and room count appear in virtually every listing across both languages. These are the most critical fields.

---

### MEDIUM frequency (10–49 appearances)

These appear in the majority of listings and should be modelled as optional fields.

| Keyword | Count | Field Implication |
|---|---|---|
| `mieszkanie` | 42 | Property type = apartment (Polish) |
| `floor` | 42 | Floor number |
| `lokal` | 38 | Local/unit reference |
| `Warszawa` | 37 | City — Warsaw dominates |
| `wc` | 26 | Toilet (separate from bathroom) |
| `parking` | 26 | Parking availability |
| `balkon` | 24 | Balcony |
| `piętro` | 21 | Floor (Polish) |
| `czynsz` | 21 | Monthly maintenance fee (rent/service charge) |
| `cena` | 20 | Price (Polish) |
| `budynek` | 20 | Building |
| `centrum` | 20 | City centre proximity |
| `metro` | 20 | Metro/subway proximity |
| `powierzchnia` | 19 | Area/surface (Polish) |
| `pokoi` | 19 | Rooms (Polish genitive) |
| `bathroom` | 18 | Bathroom count (English) |
| `deweloper` | 17 | Developer/new build |
| `pierwotny` | 17 | Primary market (new build) |
| `Gdańsk` | 17 | City — Gdańsk well represented |
| `pokój` | 14 | Room (singular, Polish) |
| `parter` | 14 | Ground floor |
| `ogrzewanie` | 14 | Heating type |
| `własność` | 13 | Ownership type |
| `blok` | 12 | Block of flats |
| `garaż` | 12 | Garage |
| `Wrocław` | 12 | City — Wrocław |
| `Poznań` | 12 | City — Poznań |
| `garden` | 12 | Garden (English) |
| `salon` | 11 | Living room (Polish) |
| `ogród` | 10 | Garden (Polish) |

**Key takeaway:** Monthly fee (czynsz), parking, balcony, heating type, and market type (primary/secondary) appear frequently enough to warrant dedicated fields. Cities are diverse — city is a critical filter field.

---

### LOW frequency (1–9 appearances)

These are niche or supplementary. Worth storing in a JSON `extras` column rather than individual fields.

| Keyword | Count | Notes |
|---|---|---|
| `do zamieszkania` | 9 | Move-in ready condition |
| `nowe` / `nowy` | 9 / 7 | New property |
| `miejskie` | 9 | District heating |
| `apartament` | 9 | High-end apartment |
| `piwnica` | 8 | Cellar/storage |
| `remont` | 8 | Recently renovated |
| `sklep` | 8 | Near shops |
| `garage` | 8 | Garage (English) |
| `winda` | 7 | Elevator/lift |
| `wtórny` | 7 | Secondary market (resale) |
| `balcony` | 7 | Balcony (English) |
| `taras` | 6 | Terrace |
| `łazienka` | 6 | Bathroom (Polish) |
| `renovation` | 6 | Renovation (English) |
| `PLN` | 5 | Currency (English listings sometimes use PLN) |
| `sypialnia` | 4 | Bedroom (Polish) |
| `kamienica` | 4 | Tenement building |
| `komórka` | 4 | Storage room/locker |
| `klimatyzacja` | 4 | Air conditioning |
| `osiedle` | 4 | Housing estate |
| `elevator` | 3 | Elevator (English) |
| `kredyt` | 2 | Mortgage |
| `do remontu` | 2 | Needs renovation |
| `kawalerka` | 2 | Studio flat |
| `tramwaj` | 1 | Near tram stop |
| `rok budowy` | 1 | Year built (appeared rarely — likely stripped from structured fields) |

---

## Recommended Schema Fields

Based on this analysis, here are the fields to add or confirm in the `Listing` table:

### Already in schema — confirmed useful
- `price` (zł/price — high frequency)
- `area` (m²/powierzchnia — highest frequency)
- `rooms` (pokoje/bedroom — high frequency)
- `floor` (piętro/floor — medium)
- `totalFloors` (kondygnacja — low but structurally important)
- `city` (Warszawa/Gdańsk/Wrocław — medium)
- `district` (dzielnica — implied in location strings)
- `yearBuilt` (rok budowy — low but valuable)
- `description`, `title`, `images`

### Recommended additions to schema
- `monthlyFee` INT NULL — czynsz appears 21 times, important for buyers
- `propertyType` ENUM('apartment','house','studio','commercial') — mieszkanie/apartament/kawalerka/dom
- `marketType` ENUM('primary','secondary') NULL — pierwotny/wtórny (17 occurrences)
- `hasBalcony` BOOLEAN NULL — balkon/balcony (31 total occurrences)
- `hasParking` BOOLEAN NULL — parking/garaż (50 total occurrences combined)
- `hasGarden` BOOLEAN NULL — ogród/garden (22 occurrences)
- `hasElevator` BOOLEAN NULL — winda/elevator (10 occurrences)
- `heatingType` VARCHAR NULL — ogrzewanie: miejskie/gazowe/elektryczne/podłogowe
- `condition` VARCHAR NULL — do zamieszkania / do remontu / wysoki standard

### Extras (JSON blob for low-frequency data)
Consider an `extras` JSON column for: air conditioning, storage room, cellar, near metro, near tram — things that appear in <5 listings and don't warrant dedicated columns.

---

## Observations

1. **Currency:** All Polish listings price in PLN. Realting.com listings show prices in EUR and USD alongside PLN equivalents — normaliser should default to PLN, store raw currency.
2. **Warsaw bias:** Warsaw dominates (37 mentions) but Gdańsk (17), Wrocław (12), Poznań (12) are well-represented. Kraków appeared 0 times in this batch — likely underrepresented.
3. **English data (realting.com):** Uses standard English real estate vocabulary. The OpenAI prompt already handles both languages.
4. **`dom` (151 occurrences):** Very high but largely from boilerplate navigation text ("Strona główna", "dom" in menus) — not all represent property type "house". Normaliser should infer property type from context.
5. **`stan` (57 occurrences):** Condition field is widely present but values vary — normaliser should map to enum values.
