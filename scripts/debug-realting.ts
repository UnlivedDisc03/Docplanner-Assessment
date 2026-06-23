import puppeteer from 'puppeteer'

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
  await page.goto('https://realting.com/poland/property', { waitUntil: 'networkidle2', timeout: 30000 })

  const links: string[] = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(a => (a as HTMLAnchorElement).href)
      .filter(h => h.includes('realting.com'))
      .filter((h, i, arr) => arr.indexOf(h) === i)
  })

  console.log('All unique realting URLs found on index page:')
  links.forEach(l => console.log(l))
  await browser.close()
}

main()
