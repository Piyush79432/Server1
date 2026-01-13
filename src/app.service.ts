import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PlaywrightCrawler, Configuration } from 'crawlee';

// --- Interfaces ---
export interface ProductData {
  title: string;
  author?: string;
  price: string;
  image: string;
  promo?: string;
}

export interface BestsellerSection {
  title: string;
  slug: string;
  products: ProductData[];
}

export interface ProductDetails {
  summary: string;
  condition: string;
  specifications: Record<string, string>;
  recommendations: ProductData[]; // "Customers also like"
  reviews: any[];
}

@Injectable()
export class AppService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);
  

  // 🔒 EXISTING SLUGS — KEEP AS IS
private readonly EXISTING_SLUG_MAPPING: Record<string, string> = {
  // ===== CORE =====
  "all-books": "collections/all-books",
  "new-arrivals": "collections/new-arrivals",
  "bestsellers": "collections/bestsellers",
  "featured-books": "collections/featured-books",

  // ===== NON-FICTION =====
  "non-fiction": "collections/non-fiction-books",
  "biography": "collections/biography-and-memoir-books",
  "history": "collections/history-books",
  "self-help": "collections/self-help-books",
  "business-economics": "collections/business-and-economics-books",
  "health-fitness": "collections/health-and-fitness-books",
  "science": "collections/science-books",
  "technology": "collections/technology-books",
  "philosophy": "collections/philosophy-books",
  "psychology": "collections/psychology-books",

  // ===== ACADEMIC =====
  "engineering": "collections/engineering-books",
  "medical": "collections/medical-books",
  "law": "collections/law-books",
  "commerce": "collections/commerce-books",
  "arts": "collections/arts-books",
  "competitive-exams": "collections/competitive-exams-books",

  // ===== MEDIA =====
  "music": "collections/music",
  "movies": "collections/movies",
  "stationery": "collections/stationery",

  // ===== RARE (EXISTING) =====
  "rare-books": "collections/rare-books"
};

  // --- CONFIG: Slug to URL Keyword Mapping ---
 // ✅ FINAL SLUG MAPPING (EXISTING + NEW)
private readonly SLUG_MAPPING: Record<string, string> = {
  // 🔒 KEEP EXISTING
  ...this.EXISTING_SLUG_MAPPING,

  // ================================
  // 🔹 FICTION (NEW)
  // ================================
  "fiction-books": "collections/fiction-books",
  "crime-mystery": "collections/crime-and-mystery-books",
  "fantasy": "collections/fantasy-fiction-books",
  "science-fiction": "collections/science-fiction-books",
  "thriller-suspense": "collections/thriller-and-suspense-books",
  "romance": "collections/romance-books",
  "classic-fiction": "collections/classic-fiction-books",
  "historical-fiction": "collections/historical-fiction-books",
  "horror-ghost": "collections/horror-books",
  "graphic-novels": "collections/graphic-novels-and-comic-books",

  // ================================
  // 🔹 CHILDREN
  // ================================
  "childrens-books": "collections/childrens-books",
  "childrens-fiction": "collections/childrens-fiction-books",
  "childrens-non-fiction": "collections/childrens-non-fiction-books",
  "activity-early-learning": "collections/childrens-picture-and-activity-books",
  "baby-toddler": "pages/baby-and-toddler-books",
  "ages-5-8": "pages/childrens-books-ages-5-8",
  "ages-9-12": "pages/childrens-books-ages-9-12",
  "teenage-young-adult": "pages/teenage-and-young-adult-books",

  // ================================
  // 🔹 RARE & COLLECTIBLE
  // ================================
  "rare-fiction-books": "collections/rare-fiction-books",
  "rare-sci-fi": "collections/rare-sci-fi-books",
  "rare-fantasy": "collections/rare-fantasy-books",
  "rare-horror": "collections/rare-horror-books",
  "rare-romance": "collections/rare-romance-books",
  "rare-biography": "collections/rare-biography-true-story-books",
  "rare-art": "collections/rare-art-fashion-photography-books",
  "rare-medicine": "collections/rare-medicine-books",
  "rare-ephemera": "collections/rare-ephemera"
};

  async onModuleInit() {
    await this.$connect();
  }

  // --- Helper: Map Titles to Correct Category Slugs ---
  private getCategorySlug(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('non-fiction')) return 'non-fiction-books';
    if (t.includes('fiction')) return 'fiction-books';
    if (t.includes('children')) return 'childrens-books';
    if (t.includes('rare')) return 'rare-books';
    return t.replace(/[^a-z0-9]+/g, '-');
  }

  // --- HELPER: Handle Cookies (Strict Wait Mode) ---
  private async handleCookieConsent(page: any, log: any) {
    try {
      const bannerSelector = '.ot-sdk-container, #onetrust-banner-sdk';
      const rejectBtnSelector = '#onetrust-reject-all-handler';
      const acceptBtnSelector = '#onetrust-accept-btn-handler';

      const banner = await page.$(bannerSelector);
      if (banner) {
        log.info('Cookie Banner Detected. Attempting to reject/accept...');
        if (await page.isVisible(rejectBtnSelector).catch(() => false)) {
          await page.click(rejectBtnSelector).catch(() => null);
          log.info('Clicked Reject All.');
        } else if (await page.isVisible(acceptBtnSelector).catch(() => false)) {
          await page.click(acceptBtnSelector).catch(() => null);
          log.info('Clicked Accept All (Reject not found).');
        }

        try {
          await page.waitForSelector(bannerSelector, { state: 'hidden', timeout: 8000 });
          log.info('Cookie Banner closed.');
        } catch {
          log.warning('Cookie Banner did not disappear quickly; continuing anyway.');
        }
      }
    } catch (e: any) {
      log.warning(`Cookie handling skipped: ${e?.message || e}`);
    }
  }
 async getProductsByIds(ids: string[] | number[]) {
  try {
    if (!ids || ids.length === 0) return [];

    // Convert String IDs to Numbers and filter invalid
    const numericIds = ids.map(id => Number(id)).filter(id => !isNaN(id));

    if (numericIds.length === 0) return [];

    const historyProducts = await this.product.findMany({
      where: {
        id: { in: numericIds },
      },
      select: {
        id: true,        // ✅ CRITICAL: Include id for frontend tracking
        title: true,
        author: true,    // ✅ Include author for display
        price: true,
        image: true,
        promo: true,
      },
    });

    // ✅ Return products in the same order as requested IDs
    const orderedProducts = numericIds
      .map(id => historyProducts.find(p => p.id === id))
      .filter(Boolean); // Remove undefined entries

    this.logger.log(`✅ History: Returned ${orderedProducts.length} products`);
    return orderedProducts;
  } catch (error) {
    this.logger.error(`❌ Failed to fetch history: ${error.message}`);
    return [];
  }
}


  // ==========================================================
  // 1. NAVIGATION LOGIC
  // ==========================================================

  async getNavigation() {
    const cachedTree = await this.category.findMany({
      where: { parentId: null },
      include: { children: true },
      orderBy: { id: 'asc' }
    });

    if (cachedTree.length > 0) {
      this.logger.log('--- Serving Navigation Tree from Database ---');
      return cachedTree;
    }

    this.logger.log('--- Database Empty. Syncing Menu via Attributes... ---');
    return await this.syncCategories();
  }

  async syncCategories() {
    const config = new Configuration({ persistStorage: false });

    const crawler = new PlaywrightCrawler({
      requestHandler: async ({ page, log }) => {
        log.info('--- Visiting Homepage for Menu Sync ---');
        await page.goto('https://www.worldofbooks.com/en-gb', { waitUntil: 'networkidle' });
        await this.handleCookieConsent(page, log);

        const rawLinks = await page.evaluate(() => {
          const baseUrl = 'https://www.worldofbooks.com';
          const extracted: any[] = [];
          
          const anchors = document.querySelectorAll('a[data-menu_category]');

          anchors.forEach((a) => {
            const parentName = a.getAttribute('data-menu_category')?.trim();
            const childName = a.getAttribute('data-menu_subcategory')?.trim();
            let href = a.getAttribute('href');

            // --- STRICT URL VALIDATION ---
            if (parentName && href) {
              if (!href.startsWith('http')) {
                 href = baseUrl + (href.startsWith('/') ? href : '/' + href);
              }
              
              if (href === baseUrl || href === baseUrl + '/') return;
              if (href.includes('javascript:')) return;

              if (parentName === 'Fiction Books') href = 'https://www.worldofbooks.com/en-gb/collections/fiction-books';
              else if (parentName === 'Non-Fiction Books') href = 'https://www.worldofbooks.com/en-gb/collections/non-fiction-books';
              else if (parentName === "Children's Books") href = 'https://www.worldofbooks.com/en-gb/collections/childrens-books';
              else if (parentName === "Rare Books") href = 'https://www.worldofbooks.com/en-gb/collections/rare-books';

              extracted.push({ parentName, childName: childName || null, url: href });
            }
          });
          return extracted;
        });

        const categoryMap = new Map<string, { url: string, children: any[] }>();

        rawLinks.forEach(item => {
          if (!categoryMap.has(item.parentName)) {
            categoryMap.set(item.parentName, { url: item.url, children: [] });
          }
          if (!item.childName) {
            const entry = categoryMap.get(item.parentName);
            if(entry) entry.url = item.url;
          }
        });

        rawLinks.forEach(item => {
          if (item.childName) {
            const parent = categoryMap.get(item.parentName);
            if (parent && !parent.children.some(c => c.url === item.url)) {
              parent.children.push({ title: item.childName, url: item.url });
            }
          }
        });

        // --- SEEDING CORE CATEGORIES (Fallback) ---
        const coreCategories = [
          { title: 'Fantasy', url: 'https://www.worldofbooks.com/en-gb/collections/fantasy-fiction-books' },
          { title: 'Crime & Mystery', url: 'https://www.worldofbooks.com/en-gb/collections/crime-and-mystery-books' },
          { title: 'Modern Fiction', url: 'https://www.worldofbooks.com/en-gb/collections/modern-fiction-books' },
          { title: 'Romance', url: 'https://www.worldofbooks.com/en-gb/collections/romance-books' },
          { title: 'Thriller & Suspense', url: 'https://www.worldofbooks.com/en-gb/collections/thriller-and-suspense-books' },
          { title: 'Biography & True Stories', url: 'https://www.worldofbooks.com/en-gb/collections/biography-and-true-story-books' },
          { title: 'Health & Personal Development', url: 'https://www.worldofbooks.com/en-gb/collections/health-and-personal-development-books' },
          { title: "Children's Fiction", url: 'https://www.worldofbooks.com/en-gb/collections/childrens-fiction-books' },
          { title: "Rare Fiction", url: 'https://www.worldofbooks.com/en-gb/collections/rare-fiction-books' }
        ];

        coreCategories.forEach(core => {
          if (!categoryMap.has(core.title)) {
             categoryMap.set(core.title, { url: core.url, children: [] });
          }
        });

        this.logger.log(`--- Extracted ${categoryMap.size} Parent Categories ---`);

        // Save to DB
        for (const [parentTitle, data] of categoryMap) {
          const parentRecord = await this.category.upsert({
            where: { url: data.url },
            update: { title: parentTitle },
            create: { title: parentTitle, url: data.url, lastPage: 0 }
          });

          for (const child of data.children) {
            await this.category.upsert({
              where: { url: child.url },
              update: { title: child.title, parentId: parentRecord.id },
              create: { 
                title: child.title, 
                url: child.url, 
                parentId: parentRecord.id, 
                lastPage: 0 
              }
            });
          }
        }
      },
    }, config);

    await crawler.run(['https://www.worldofbooks.com/en-gb']);

    return await this.category.findMany({ 
      where: { parentId: null },
      include: { children: true },
      orderBy: { id: 'asc' }
    });
  }

  // ==========================================================
  // 2. BESTSELLERS LOGIC
  // ==========================================================

  async getBestsellers() {
    const cachedCollections = await this.collection.findMany({
      include: { products: true }
    });

    if (cachedCollections.length > 0) {
      return cachedCollections.map(c => ({
        ...c,
        slug: this.getCategorySlug(c.title)
      }));
    }

    const sections = await this.scrapeBestsellers();

    for (const section of sections) {
      await this.collection.create({
        data: {
          title: section.title,
          products: {
            create: section.products.map(p => ({
              title: p.title,
              author: p.author || 'Unknown Author',
              price: p.price,
              image: p.image,
              promo: p.promo
            }))
          }
        }
      });
    }
    return sections;
  }
  

  private async scrapeBestsellers(): Promise<BestsellerSection[]> {
    const sections: BestsellerSection[] = [];
    const config = new Configuration({ persistStorage: false });

    const crawler = new PlaywrightCrawler({
      requestHandler: async ({ page, log }) => {
        await page.goto('https://www.worldofbooks.com/', { waitUntil: 'networkidle' }).catch(() => null);
        await this.handleCookieConsent(page, log);

        const scrapedSections = await page.evaluate(() => {
          const data: { title: string, slug: string, products: any[] }[] = [];
          const containers = document.querySelectorAll('.algolia-related-products-container, .related-products, .collection-bestsellers');

          containers.forEach(container => {
            const headerEl = container.querySelector('h2, .algolia-header h2');
            const sectionTitle = headerEl ? (headerEl as HTMLElement).innerText.trim() : 'Bestsellers';
            const products: any[] = [];

            container.querySelectorAll('.card, .product-item, .grid-item, .card__inner').forEach(card => {
              const titleEl = card.querySelector('h3, .card__heading a, a, .title, .item-title');
              const priceEl = card.querySelector('.price, .price-item, .item-price') || null;
              const imgEl = card.querySelector('img') as HTMLImageElement | null;

              const title = titleEl ? titleEl.textContent?.trim() || '' : '';
              let price = priceEl ? (priceEl as HTMLElement).innerText.trim() : '';

              if (!price) {
                const text = card.textContent || '';
                const found = text.match(/£\s*\d+[.,]?\d{0,2}/) || text.match(/\$\s*\d+[.,]?\d{0,2}/);
                if (found) price = found[0];
              }

              if (title && price) {
                products.push({
                  title,
                  author: (card.querySelector('.author')?.textContent || '').trim() || 'Unknown',
                  price,
                  image: imgEl ? imgEl.src : '',
                  promo: card.querySelector('.pill')?.textContent?.trim() || undefined
                });
              }
            });

            if (products.length) data.push({ title: sectionTitle, slug: '', products });
          });

          return data;
        });

        sections.push(...scrapedSections.map(s => ({ ...s, slug: '' })));
      }
    }, config);

    await crawler.run(['https://www.worldofbooks.com/']);
    return sections.map(s => ({ ...s, slug: this.getCategorySlug(s.title) }));
  }

  // ==========================================================
  // 3. PRODUCT CRAWLER
  // ==========================================================

  async getProductsByCategory(slug: string, loadMore: boolean = false) {
    const searchString = this.SLUG_MAPPING[slug] || slug;
    this.logger.log(`Request Slug: "${slug}" -> Searching DB for: "${searchString}"`);

    // --- STRICT QUERY LOGIC ---
    let whereClause: any = { url: { contains: searchString } };

    if (searchString === 'collections/fiction-books') {
      whereClause = {
        AND: [
          { url: { contains: 'fiction-books' } },
          { url: { not: { contains: 'non-fiction' } } }
        ]
      };
    }

    let category = await this.category.findFirst({
      where: whereClause,
      include: { _count: { select: { products: true } } }
    });

    if (!category) {
      await this.syncCategories();
      category = await this.category.findFirst({
        where: whereClause,
        include: { _count: { select: { products: true } } }
      });
      if (!category) return [];
    }

    if (!loadMore && category._count.products > 0) {
      this.logger.log(`--- Serving ${category.title} from DB ---`);
      return await this.product.findMany({ where: { categoryId: category.id } });
    }

    const currentCount = category._count.products;
    this.logger.log(`--- Crawling ${category.title} | Current Offset: ${currentCount} ---`);

    const ITEMS_PER_PAGE = 40; 
    let targetUrl = '';
    
    // Determine Target URL
    if (currentCount === 0) {
        targetUrl = category.url;
    } else {
        const nextPage = Math.floor(currentCount / ITEMS_PER_PAGE) + 1;
        const separator = category.url.includes('?') ? '&' : '?';
        targetUrl = `${category.url}${separator}shopify_products%5Bpage%5D=${nextPage}`;
    }

    this.logger.log(`--- Fetching ONE Page only: ${targetUrl} ---`);

    const scrapedProducts = await this.scrapeCategoryPages([targetUrl]);

    this.logger.log(`--- Scraper Found: ${scrapedProducts.length} NEW books ---`);

    if (scrapedProducts.length > 0) {
      await this.$transaction([
        this.product.createMany({
          data: scrapedProducts.map(p => ({
            title: p.title,
            author: p.author || 'Unknown',
            price: p.price,
            image: p.image,
            categoryId: category.id
          })),
          skipDuplicates: true
        }),
        this.category.update({
          where: { id: category.id },
          data: { lastPage: currentCount + scrapedProducts.length }
        })
      ]);
    }

    return await this.product.findMany({ where: { categoryId: category.id } });
  }

  private async scrapeCategoryPages(urls: string[]): Promise<ProductData[]> {
    const products: ProductData[] = [];
    const config = new Configuration({ persistStorage: false });

    const crawler = new PlaywrightCrawler({
      launchContext: { launchOptions: { headless: true } },
      maxRequestsPerCrawl: urls.length + 2,
      requestHandler: async ({ page, request, log }) => {
        log.info(`Visiting Page: ${request.url}`);
        
        await page.goto(request.url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null);
        await this.handleCookieConsent(page, log);

        const itemSelector = '.card, .grid-item, .product-item, div[data-product-id], .product, .product-card';
        try { await page.waitForSelector(itemSelector, { timeout: 10000 }); } catch (e) { log.warning('Grid wait timeout (might be empty page).'); }

        const scrapedItems = await page.evaluate(() => {
          const results: any[] = [];
          const cards = Array.from(document.querySelectorAll('.card, .grid-item, .product-item, div[data-product-id], .product, .product-card'));
          
          const findPriceInText = (text: string) => {
            if (!text) return null;
            const m = text.match(/[£$]\s*[0-9]+[.,]?[0-9]*/);
            return m ? m[0].trim() : null;
          };

          cards.forEach((el) => {
            try {
              const rect = (el as HTMLElement).getBoundingClientRect?.();
              if (rect && (rect.width === 0 || rect.height === 0)) return;

              const titleEl = el.querySelector('h3, .card__heading a, .title, .item-title, a[title]');
              const title = titleEl ? (titleEl.textContent || '').trim() : '';

              let price = el.querySelector('.price, .price-item, .item-price')?.textContent?.trim() || '';
              if (!price) price = findPriceInText(el.textContent || '') || '';

              const author = el.querySelector('.author, .item-author')?.textContent?.trim() || 'Unknown';
              
              let image = el.querySelector('img')?.getAttribute('src') || '';
              if (!image) {
                 const bg = (el as HTMLElement).style.backgroundImage || '';
                 const m = bg.match(/url\(["']?(.*?)["']?\)/);
                 if(m) image = m[1];
              }

              if (title && price) {
                results.push({ title, price, author, image });
              }
            } catch (ex) {}
          });
          return results;
        });

        const uniqueFinal: ProductData[] = [];
        const seenFinal = new Set<string>();
        for (const item of scrapedItems) {
          const key = `${(item.title || '').toLowerCase()}|${(item.price || '').replace(/\s+/g, '')}`;
          if (!seenFinal.has(key)) {
            seenFinal.add(key);
            uniqueFinal.push({
               title: item.title, 
               price: item.price, 
               author: item.author, 
               image: item.image 
            });
          }
        }

        log.info(`Page Scraped: Found ${uniqueFinal.length} items.`);
        products.push(...uniqueFinal);
      }
    }, config);

    await crawler.run(urls);
    return products;
  }

  // ==========================================================
  // 4. SEARCH & SCRAPE DETAILS (IMPROVED)
  // ==========================================================

  async searchAndScrapeProduct(productName: string) {
    this.logger.log(`Triggered Search & Scrape for: ${productName}`);
    
    // Check if we already have details (summary is a good indicator)
    const existingProduct = await this.product.findFirst({
      where: { title: { contains: productName } }
    });

    if (existingProduct && (existingProduct as any).summary) {
        this.logger.log('--- Product details found in DB. Returning cached. ---');
        return existingProduct;
    }

    const details = await this.performSearchAndDeepScrape(productName);

    if (details) {
      await this.product.upsert({
        where: { id: existingProduct ? existingProduct.id : -1 },
        update: {
          summary: details.summary,
          specifications: details.specifications as any,
          recommendations: details.recommendations as any // Saves "Customers also like"
        },
        create: {
          title: productName,
          price: "0.00",
          image: "",
          categoryId: 1, // Fallback category
          summary: details.summary,
          specifications: details.specifications as any,
          recommendations: details.recommendations as any
        }
      });
      return details;
    }
    return null;
  }
  // Inside AppService class
// -----------------------------
// 1) performSearchAndDeepScrape
// -----------------------------
// Paste inside AppService class
private async performSearchAndDeepScrape(query: string): Promise<ProductDetails | null> {
  let resultData: ProductDetails | null = null;
  const config = new Configuration({ persistStorage: false });

  const crawler = new PlaywrightCrawler({
    launchContext: { launchOptions: { headless: true } },

    requestHandler: async ({ page, log }) => {
      try {
        const searchUrl = `https://www.worldofbooks.com/en-gb/search?q=${encodeURIComponent(query)}`;
        log.info(`Searching product via URL: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' }).catch(() => null);
        await this.handleCookieConsent(page, log);
        await page.waitForLoadState('networkidle').catch(() => null);

        // Wait for product anchors to appear (best-effort)
        await page.waitForSelector('h3.card__heading a, .card a, .product-item a', { timeout: 8000 }).catch(() => null);

        // Find matching anchor href by title (case-insensitive contains)
        const matchedHref = await page.evaluate((term) => {
          const q = term.toLowerCase().trim();
          const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(
            'h3.card__heading a, .card a, .product-item a, .grid-item a'
          ));
          for (const a of anchors) {
            const txt = (a.textContent || '').trim().toLowerCase();
            if (!txt) continue;
            // exact or partial match - prefer best match if any
            if (txt === q || txt.includes(q) || q.includes(txt)) {
              const href = a.getAttribute('href');
              if (href) return href;
            }
          }
          return null;
        }, query);

        if (!matchedHref) {
          log.warning(`No matching product card found for "${query}"`);
          return;
        }

        const productUrl = matchedHref.startsWith('http') ? matchedHref : `https://www.worldofbooks.com${matchedHref}`;
        log.info(`Matched Product URL: ${productUrl}`);

        // Navigate to product page
        await page.goto(productUrl, { waitUntil: 'domcontentloaded' }).catch(() => null);
        await this.handleCookieConsent(page, log);
        await page.waitForLoadState('networkidle').catch(() => null);

        // Use the deep scraper helper to extract details
        const details = await this.deepSearchScraper(page);
        if (details) {
          resultData = details;
        } else {
          log.warning('deepSearchScraper returned null');
        }
      } catch (err: any) {
        log.error(`performSearchAndDeepScrape error: ${err?.message || err}`);
      }
    }
  }, config);

  await crawler.run(['https://www.worldofbooks.com/en-gb']).catch(e => {
    this.logger.warn(`Crawler run failed: ${e?.message || e}`);
  });

  return resultData;
}

  // Paste this method INSIDE your AppService class (not at top-level)
p// -----------------------------
// 2) deepSearchScraper
// -----------------------------
// Paste inside AppService class
private async deepSearchScraper(page: any): Promise<ProductDetails | null> {
  try {
    // give page a moment to render dynamic content
    await page.waitForLoadState('domcontentloaded').catch(() => null);
    await page.waitForTimeout(200);

    // Try to ensure accordions are present but don't fail if absent
    await page.waitForSelector('.outer-accordion', { timeout: 4000 }).catch(() => null);

    // Run extraction inside the page context to read DOM
    const extracted = await page.evaluate(() => {
      // Helper to normalize whitespace
      const norm = (s: string | null | undefined) => s ? s.replace(/\r/g, '').replace(/\t/g, ' ').replace(/\s+/g, ' ').trim() : '';

      const result: {
        summary: string;
        reviews: string[];
        specifications: Record<string, string>;
        condition: string;
        recommendations: { title: string; price: string; image: string }[];
      } = {
        summary: '',
        reviews: [],
        specifications: {},
        condition: '',
        recommendations: []
      };

      // --------- 1) ACCORDIONS: summary & reviews -----------
      const accordions = Array.from(document.querySelectorAll<HTMLElement>('.outer-accordion'));
      for (const acc of accordions) {
        const head = acc.querySelector<HTMLElement>('.accordion-head');
        const heading = norm(head?.textContent).toLowerCase();
        const panel = acc.querySelector<HTMLElement>('.panel');

        if (!panel || !heading) continue;

        const panelText = norm(panel.innerText);

        if (!panelText) continue;

        if (heading.includes('summary')) {
          // choose longer if multiple summary accordions exist
          if (!result.summary || panelText.length > result.summary.length) result.summary = panelText;
        } else if (heading.includes('review')) {
          // split by line breaks and reasonable separators
          const parts = panel.innerText.split('\n').map(p => norm(p)).filter(p => p && p.length > 20);
          if (parts.length) {
            result.reviews.push(...parts);
          } else {
            if (panelText.length > 30) result.reviews.push(panelText);
          }
        }
      }

      // --------- 2) FALLBACK SUMMARY SELECTORS -----------
      if (!result.summary) {
        const fallback = document.querySelector<HTMLElement>('.summary-side-panel, .product__description, #description, .product-description__text, .description');
        if (fallback) result.summary = norm(fallback.innerText);
      }

      // --------- 3) CONDITION ----------
      const condEl = document.querySelector<HTMLElement>('[data-condition], .condition');
      result.condition = norm(condEl?.innerText) || '';

      // --------- 4) SPECIFICATIONS: rows + dl + heuristics ----------
      // From table rows or custom product-details items
      const rows = Array.from(document.querySelectorAll<HTMLElement>('.additional-info-table tr, .additional-info-table .product-details__item, .product-details__item, .product-info__item'));
      rows.forEach(row => {
        const key = norm((row.querySelector('th, .label, dt') as HTMLElement | null)?.textContent || (row.querySelector('.spec-label') as HTMLElement | null)?.textContent);
        const val = norm((row.querySelector('td, .value, dd') as HTMLElement | null)?.textContent || (row.querySelector('.spec-value') as HTMLElement | null)?.textContent);
        if (key && val) result.specifications[key.replace(':', '')] = val;
      });

      // Also try key/value pairs as dl
      const dls = Array.from(document.querySelectorAll<HTMLElement>('dl'));
      dls.forEach(dl => {
        const dts = Array.from(dl.querySelectorAll('dt'));
        dts.forEach(dt => {
          const dd = dt.nextElementSibling;
          const k = norm(dt.textContent);
          const v = norm(dd?.textContent);
          if (k && v) result.specifications[k.replace(':', '')] = v;
        });
      });

      // Heuristic regex on page text for common fields
      const body = norm(document.body.innerText || '');
      // SKU
      const skuMatch = body.match(/SKU\s*[:#]?\s*([A-Z0-9\-]+)/i);
      if (skuMatch && skuMatch[1]) result.specifications['SKU'] = skuMatch[1].trim();

      // ISBN-13 and ISBN-10
      const isbn13Match = body.match(/ISBN(?:-13)??[:\s]*([0-9\-]{13,17})/i);
      if (isbn13Match && isbn13Match[1]) result.specifications['ISBN 13'] = isbn13Match[1].replace(/\D/g, '');

      const isbn10Match = body.match(/ISBN(?:-10)??[:\s]*([0-9Xx\-]{10,13})/i);
      if (isbn10Match && isbn10Match[1]) {
        const val = isbn10Match[1].replace(/\D/g, '');
        if (val.length === 10) result.specifications['ISBN 10'] = val;
      }

      // Title / Author basic extraction
      const titleSel = document.querySelector<HTMLElement>('h1.product__title, h1.product-title, .product-title, .product__heading, .product__title h1');
      if (titleSel) result.specifications['Title'] = norm(titleSel.textContent);

      const authorSel = document.querySelector<HTMLElement>('.author, .product-author, .byline, .item-author, .product__author');
      if (authorSel) result.specifications['Author'] = norm(authorSel.textContent);

      // Binding, Publisher, Year published, Pages, Cover note, Note
      const yearMatch = body.match(/(?:Published|Year published|Published:)\s*[:\s]*([0-9]{4})/i);
      if (yearMatch && yearMatch[1]) result.specifications['Year published'] = yearMatch[1];

      const pagesMatch = body.match(/([0-9]{1,4})\s+pages?/i);
      if (pagesMatch && pagesMatch[1]) result.specifications['Number of pages'] = pagesMatch[1];

      const bindingMatch = body.match(/(Paperback|Hardback|Hardcover|Leather|Mass Market Paperback|Trade Paperback)/i);
      if (bindingMatch && bindingMatch[1]) result.specifications['Binding Type'] = bindingMatch[1];

      // Cover note and Note heuristics (rare)
      const coverNoteMatch = body.match(/Cover note[:\s]*([^\n]+)/i);
      if (coverNoteMatch && coverNoteMatch[1]) result.specifications['Cover note'] = norm(coverNoteMatch[1]);

      const noteMatch = body.match(/Note[:\s]*([^\n]+)/i);
      if (noteMatch && noteMatch[1]) result.specifications['Note'] = norm(noteMatch[1]);

      // --------- 5) RECOMMENDATIONS (Algolia container) ----------
      const recs = Array.from(document.querySelectorAll<HTMLElement>('.algolia-related-products-container.algolia-recommendation .card, .algolia-related-products-container .card'));
      recs.forEach(card => {
        const title = norm((card.querySelector('h3, .card__heading, .title') as HTMLElement | null)?.textContent || '');
        const price = norm((card.querySelector('.price, .price-item') as HTMLElement | null)?.textContent || '');
        const imgEl = card.querySelector('img') as HTMLImageElement | null;
        const img = imgEl?.src || '';
        if (title && price) result.recommendations.push({ title, price, image: img });
      });

      return result;
    });

    // Normalize keys for the fields the user requested (guarantee presence even if empty)
    const specs = extracted.specifications || {};

    // Ensure requested keys exist (use empty string if not found)
    const requestedKeys = [
      'SKU', 'ISBN 13', 'ISBN 10', 'Title', 'Author', 'Condition',
      'Binding Type', 'Publisher', 'Year published', 'Number of pages', 'Cover note', 'Note'
    ];
    for (const k of requestedKeys) {
      if (!(k in specs)) specs[k] = '';
    }

    // Use condition extracted earlier, fallback to specs['Condition'] if available
    const condition = extracted.condition || (specs['Condition'] || '');

    const productDetails: ProductDetails = {
      summary: extracted.summary || '',
      condition: condition || 'Pre-owned',
      specifications: specs,
      recommendations: extracted.recommendations || [],
      reviews: (extracted.reviews || []).map((t: string) => ({ text: t }))
    };

    return productDetails;
  } catch (err: any) {
    this.logger.warn(`deepSearchScraper failed: ${err?.message || err}`);
    return null;
  }
}


}