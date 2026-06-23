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
      // 1. JSON-LD structured data (most reliable source)
      const jsonLdBlocks: Record<string, unknown>[] = []
      document.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
        try { jsonLdBlocks.push(JSON.parse(el.textContent ?? '')) } catch {}
      })

      // 2. OpenGraph / meta tags
      const meta = (name: string) =>
        (document.querySelector(`meta[property="${name}"]`) as HTMLMetaElement)?.content ??
        (document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement)?.content ?? ''

      const ogData = {
        title: meta('og:title') || document.title,
        description: meta('og:description') || meta('description'),
        price: meta('product:price:amount') || meta('og:price:amount'),
        currency: meta('product:price:currency') || meta('og:price:currency'),
      }

      // 3. Fallback: visible body text, trimmed aggressively
      const bodyText = (document.body.innerText ?? '').slice(0, 3000)

      const structured = jsonLdBlocks.length > 0
        ? JSON.stringify(jsonLdBlocks)
        : ''

      const text = [
        structured,
        ogData.title ? `Title: ${ogData.title}` : '',
        ogData.description ? `Description: ${ogData.description}` : '',
        ogData.price ? `Price: ${ogData.price} ${ogData.currency}` : '',
        !structured ? bodyText : '',
      ].filter(Boolean).join('\n').slice(0, 6000)

      // 4. Images — prefer srcset largest, then data-src, then src
      const bestSrc = (img: HTMLImageElement): string => {
        if (img.srcset) {
          const parts = img.srcset.split(',').map(s => s.trim().split(/\s+/))
          const sorted = parts
            .filter(p => p[0]?.startsWith('http'))
            .sort((a, b) => parseFloat(b[1] ?? '0') - parseFloat(a[1] ?? '0'))
          if (sorted[0]?.[0]) return sorted[0][0]
        }
        const dataSrc = img.getAttribute('data-src') ?? img.getAttribute('data-lazy-src')
        if (dataSrc?.startsWith('http')) return dataSrc
        return img.src
      }

      const images = Array.from(document.querySelectorAll('img'))
        .map(bestSrc)
        .filter(src =>
          src.startsWith('http') &&
          !src.includes('icon') &&
          !src.includes('logo') &&
          !src.includes('s=314x236') &&
          !src.includes('s=256x') &&
          !src.includes('thumbnail') &&
          src.length > 20
        )
        .filter((src, i, arr) => arr.indexOf(src) === i)
        .slice(0, 20)

      return { text, images }
    })
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
