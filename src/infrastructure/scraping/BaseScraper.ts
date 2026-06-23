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
    // Pass as string so tsx/esbuild never transforms the browser-context code
    return page.evaluate(`(function() {
      var jsonLdBlocks = [];
      document.querySelectorAll('script[type="application/ld+json"]').forEach(function(el) {
        try { jsonLdBlocks.push(JSON.parse(el.textContent || '')); } catch(e) {}
      });

      function getMeta(name) {
        var byProp = document.querySelector('meta[property="' + name + '"]');
        var byName = document.querySelector('meta[name="' + name + '"]');
        return (byProp && byProp.content) || (byName && byName.content) || '';
      }

      var structured = jsonLdBlocks.length > 0 ? JSON.stringify(jsonLdBlocks) : '';
      var ogTitle = getMeta('og:title') || document.title;
      var ogDesc = getMeta('og:description') || getMeta('description');
      var ogPrice = getMeta('product:price:amount') || getMeta('og:price:amount');
      var ogCurrency = getMeta('product:price:currency') || getMeta('og:price:currency');
      var bodyText = (document.body.innerText || '').slice(0, 3000);

      var parts = [];
      if (structured) parts.push(structured);
      if (ogTitle) parts.push('Title: ' + ogTitle);
      if (ogDesc) parts.push('Description: ' + ogDesc);
      if (ogPrice) parts.push('Price: ' + ogPrice + ' ' + ogCurrency);
      if (!structured) parts.push(bodyText);
      var text = parts.join('\\n').slice(0, 6000);

      var images = Array.from(document.querySelectorAll('img')).map(function(img) {
        if (img.srcset) {
          var parts = img.srcset.split(',').map(function(s) { return s.trim().split(/\\s+/); });
          var sorted = parts
            .filter(function(p) { return p[0] && p[0].startsWith('http'); })
            .sort(function(a, b) { return parseFloat(b[1] || '0') - parseFloat(a[1] || '0'); });
          if (sorted[0] && sorted[0][0]) return sorted[0][0];
        }
        var dataSrc = img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
        if (dataSrc && dataSrc.startsWith('http')) return dataSrc;
        return img.src;
      }).filter(function(src) {
        return src && src.startsWith('http') &&
          !src.includes('icon') && !src.includes('logo') &&
          !src.includes('s=314x236') && !src.includes('s=256x') &&
          !src.includes('thumbnail') && src.length > 20;
      }).filter(function(src, i, arr) { return arr.indexOf(src) === i; }).slice(0, 20);

      return { text: text, images: images };
    })()`) as Promise<{ text: string; images: string[] }>
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
