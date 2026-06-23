require('dotenv').config({ path: '.env.local' });
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { PrismaClient } = require('@prisma/client');

const url = process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/realestate';
const m = url.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);
const [, user, password, host, port, database] = m;
const adapter = new PrismaMariaDb({ host, port: Number(port), user, password, database });
const prisma = new PrismaClient({ adapter });

const keywords = [
  // Price
  'cena', 'zł', 'czynsz', 'prowizja', 'kredyt', 'hipoteka', 'EUR', 'PLN',
  // Size
  'powierzchnia', 'm²', 'metraż',
  // Rooms
  'pokój', 'pokoje', 'pokoi', 'sypialnia', 'salon', 'kuchnia', 'łazienka', 'wc', 'toaleta', 'przedpokój', 'gabinet', 'garderoba',
  // Floor / building
  'piętro', 'parter', 'budynek', 'blok', 'kamienica', 'kondygnacja',
  // Features
  'balkon', 'taras', 'loggia', 'ogród', 'piwnica', 'garaż', 'parking', 'miejsce postojowe', 'winda', 'komórka', 'pralnia', 'klimatyzacja',
  // Condition
  'remont', 'wykończenie', 'stan', 'deweloper', 'pierwotny', 'wtórny', 'do zamieszkania', 'do remontu', 'wysoki standard', 'nowy', 'nowe',
  // Heating
  'ogrzewanie', 'miejskie', 'gazowe', 'elektryczne', 'podłogowe',
  // Ownership
  'własność', 'spółdzielcze', 'księga wieczysta',
  // Location
  'centrum', 'osiedle', 'metro', 'tramwaj', 'autobus', 'komunikacja', 'szkoła', 'przedszkole', 'sklep', 'park', 'zieleń',
  // Cities
  'Warszawa', 'Kraków', 'Wrocław', 'Poznań', 'Gdańsk', 'Łódź', 'Katowice',
  // Property type
  'mieszkanie', 'apartament', 'kawalerka', 'dom', 'lokal',
  // Year
  'rok budowy',
  // English (realting)
  'bedroom', 'bathroom', 'living room', 'floor', 'apartment', 'property', 'price', 'area', 'garage', 'garden', 'balcony', 'elevator', 'renovation',
];

async function main() {
  const rows = await prisma.rawListing.findMany({ select: { source: true, rawJson: true } });
  console.log('Total listings:', rows.length);

  const sourceCounts = {};
  const freq = {};
  keywords.forEach(k => freq[k] = 0);

  rows.forEach(row => {
    sourceCounts[row.source] = (sourceCounts[row.source] || 0) + 1;
    const text = (row.rawJson.text || '').toLowerCase();
    keywords.forEach(kw => {
      const escaped = kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = (text.match(new RegExp(escaped, 'g')) || []).length;
      freq[kw] += matches;
    });
  });

  console.log('\nSource counts:', JSON.stringify(sourceCounts, null, 2));
  console.log('\nKeyword frequencies (sorted):');
  Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v > 0)
    .forEach(([k, v]) => console.log(`  ${v}\t${k}`));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
