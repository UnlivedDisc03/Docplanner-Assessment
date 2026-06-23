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

  protected async extractPageContent(page: Page): Promise<{ text: string; fullDescription: string; images: string[] }> {
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

      // Extract full description — try JSON-LD first, then known page containers
      function extractFromJsonLd(blocks) {
        var best = '';
        blocks.forEach(function(block) {
          var items = Array.isArray(block['@graph']) ? block['@graph'] : [block];
          items.forEach(function(item) {
            if (typeof item.description === 'string' && item.description.length > best.length)
              best = item.description;
          });
        });
        return best;
      }

      var fullDescription = extractFromJsonLd(jsonLdBlocks);

      if (fullDescription.length < 100) {
        var descSelectors = [
          '[data-cy="adPageAdDescription"]',
          '[data-testid="content-container"]',
          '[itemprop="description"]',
          '.offer-description__content',
          '[class*="Description_description"]',
          '[class*="offer-description"]',
          '[class*="description-content"]',
          'article',
        ];
        for (var s = 0; s < descSelectors.length; s++) {
          var el = document.querySelector(descSelectors[s]);
          if (el) {
            var txt = (el.innerText || '').trim();
            if (txt.length > fullDescription.length) fullDescription = txt;
            if (fullDescription.length > 200) break;
          }
        }
      }

      // Strip HTML from fullDescription
      fullDescription = fullDescription
        .replace(/<\\/p>/gi, '\\n\\n').replace(/<br\\s*\\/?>/gi, '\\n')
        .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/\\n{3,}/g, '\\n\\n').trim();

      // Compact context for OpenAI (structured data only, no description to save tokens)
      var jsonLdCompact = jsonLdBlocks.length > 0
        ? JSON.stringify(jsonLdBlocks.map(function(b) {
            var items = Array.isArray(b['@graph']) ? b['@graph'] : [b];
            return items.map(function(item) {
              var copy = Object.assign({}, item);
              delete copy.description; // already stored separately
              return copy;
            });
          }))
        : '';

      var ogTitle = getMeta('og:title') || document.title;
      var ogDesc = getMeta('og:description') || getMeta('description');
      var ogPrice = getMeta('product:price:amount') || getMeta('og:price:amount');
      var ogCurrency = getMeta('product:price:currency') || getMeta('og:price:currency');
      var bodyText = (document.body.innerText || '').slice(0, 3000);

      var parts = [];
      if (jsonLdCompact) parts.push(jsonLdCompact);
      if (ogTitle) parts.push('Title: ' + ogTitle);
      if (ogDesc) parts.push('Description: ' + ogDesc);
      if (ogPrice) parts.push('Price: ' + ogPrice + ' ' + ogCurrency);
      if (!jsonLdCompact) parts.push(bodyText);
      var text = parts.join('\\n').slice(0, 6000);

      var agentPattern = /agent|agency|avatar|profile|biuro|deweloper|developer|contact|broker|realtor|company|logo|icon|brand/i;

      var images = Array.from(document.querySelectorAll('img')).filter(function(img) {
        var el = img;
        for (var d = 0; d < 6; d++) {
          if (!el.parentElement) break;
          el = el.parentElement;
          var cls = (el.className || '') + ' ' + (el.getAttribute('data-testid') || '') + ' ' + (el.id || '');
          if (agentPattern.test(cls)) return false;
        }
        return true;
      }).map(function(img) {
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
          !src.includes('avatar') && !src.includes('agent') &&
          !src.includes('s=314x236') && !src.includes('s=256x') &&
          !src.includes('thumbs120') &&
          !src.includes('thumbnail') && src.length > 20;
      }).filter(function(src, i, arr) { return arr.indexOf(src) === i; }).slice(0, 20);

      return { text: text, fullDescription: fullDescription, images: images };
    })()`) as Promise<{ text: string; fullDescription: string; images: string[] }>
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
