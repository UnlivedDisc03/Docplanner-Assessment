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
