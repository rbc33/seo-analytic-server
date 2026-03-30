import axios, { AxiosError } from 'axios'
import * as cheerio from 'cheerio'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { SEOCategory, SEOCheck, SEOResult } from './types'

puppeteer.use(StealthPlugin())

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

function getGrade(score: number): string {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

function analyzeMetaTags($: cheerio.CheerioAPI): SEOCategory {
  const checks: SEOCheck[] = []

  // Title (7 pts)
  const title = $('title').first().text().trim()
  const titleLen = title.length
  const titlePassed = titleLen >= 10 && titleLen <= 70
  checks.push({
    name: 'Title tag',
    passed: titlePassed,
    score: titlePassed ? 7 : title ? 3 : 0,
    maxScore: 7,
    details: title
      ? `"${title.slice(0, 60)}${title.length > 60 ? '…' : ''}" (${titleLen} chars)`
      : 'Missing title tag',
    howToFix: titlePassed ? undefined : !title
      ? 'Add a <title> tag inside <head>. Example: <title>My Page — Brand Name</title>'
      : titleLen < 10
        ? `Title is too short (${titleLen} chars). Aim for 30–70 characters that clearly describe the page.`
        : `Title is too long (${titleLen} chars). Trim it to under 70 characters to avoid truncation in search results.`,
  })

  // Description (7 pts)
  const desc =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[name="Description"]').attr('content')?.trim() ||
    ''
  const descLen = desc.length
  const descPassed = descLen >= 50 && descLen <= 160
  checks.push({
    name: 'Meta description',
    passed: descPassed,
    score: descPassed ? 7 : desc ? 3 : 0,
    maxScore: 7,
    details: desc
      ? `"${desc.slice(0, 80)}${desc.length > 80 ? '…' : ''}" (${descLen} chars)`
      : 'Missing meta description',
    howToFix: descPassed ? undefined : !desc
      ? 'Add <meta name="description" content="…"> inside <head> with a 50–160 character summary of the page.'
      : descLen < 50
        ? `Description is too short (${descLen} chars). Write at least 50 characters to give Google enough context to display a useful snippet.`
        : `Description is too long (${descLen} chars). Keep it under 160 characters — anything longer gets cut off in search results.`,
  })

  // Viewport (4 pts)
  const viewport = $('meta[name="viewport"]').attr('content') || ''
  const viewportPassed = viewport.includes('width=device-width')
  checks.push({
    name: 'Viewport meta tag',
    passed: viewportPassed,
    score: viewportPassed ? 4 : 0,
    maxScore: 4,
    details: viewportPassed ? viewport : 'Missing or incorrect viewport tag',
    howToFix: viewportPassed ? undefined : 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> inside <head>. Without this, Google may rank your page lower in mobile search.',
  })

  // OG tags (4 pts)
  const ogTitle = $('meta[property="og:title"]').attr('content') || ''
  const ogDesc = $('meta[property="og:description"]').attr('content') || ''
  const ogImage = $('meta[property="og:image"]').attr('content') || ''
  const ogCount = [ogTitle, ogDesc, ogImage].filter(Boolean).length
  const ogPassed = ogCount >= 2
  checks.push({
    name: 'Open Graph tags',
    passed: ogPassed,
    score: ogPassed ? 4 : ogCount > 0 ? 2 : 0,
    maxScore: 4,
    details:
      ogCount > 0
        ? `Found ${ogCount}/3 OG tags (title, description, image)`
        : 'No Open Graph tags found',
    howToFix: ogPassed ? undefined : 'Add Open Graph meta tags so your page looks good when shared on social media. Minimum recommended:\n<meta property="og:title" content="Page Title">\n<meta property="og:description" content="Page description">\n<meta property="og:image" content="https://example.com/image.png">',
  })

  // Canonical (3 pts)
  const canonical =
    $('link[rel="canonical"]').attr('href') ||
    $('link[rel="Canonical"]').attr('href') ||
    ''
  const canonicalPassed = canonical.length > 0
  checks.push({
    name: 'Canonical URL',
    passed: canonicalPassed,
    score: canonicalPassed ? 3 : 0,
    maxScore: 3,
    details: canonicalPassed ? canonical : 'No canonical URL specified',
    howToFix: canonicalPassed ? undefined : 'Add <link rel="canonical" href="https://example.com/this-page"> inside <head>. This prevents duplicate content penalties when the same page is accessible via multiple URLs.',
  })

  const score = checks.reduce((s, c) => s + c.score, 0)
  return { name: 'Meta Tags', score, maxScore: 25, checks }
}

function analyzeHeadings($: cheerio.CheerioAPI): SEOCategory {
  const checks: SEOCheck[] = []

  const h1s = $('h1')
  const h1Count = h1s.length
  const h2Count = $('h2').length

  // H1 exists (5 pts)
  checks.push({
    name: 'H1 tag present',
    passed: h1Count > 0,
    score: h1Count > 0 ? 5 : 0,
    maxScore: 5,
    details:
      h1Count > 0
        ? `H1: "${h1s.first().text().trim().slice(0, 60)}"`
        : 'No H1 tag found',
    howToFix: h1Count > 0 ? undefined : 'Add a single <h1> tag with the primary topic of the page. The H1 is the most important on-page signal for what the page is about.',
  })

  // Single H1 (5 pts)
  const singleH1 = h1Count === 1
  checks.push({
    name: 'Single H1 tag',
    passed: singleH1,
    score: singleH1 ? 5 : h1Count === 0 ? 0 : 2,
    maxScore: 5,
    details:
      h1Count === 0
        ? 'No H1 found'
        : h1Count === 1
          ? 'Exactly one H1 tag'
          : `Multiple H1 tags found (${h1Count})`,
    howToFix: singleH1 ? undefined : h1Count === 0
      ? 'Add exactly one <h1> tag per page.'
      : `Remove ${h1Count - 1} extra <h1> tag(s). Each page should have exactly one H1 — having multiple confuses search engines about the page's main topic.`,
  })

  // H2 present (3 pts)
  checks.push({
    name: 'H2 tags present',
    passed: h2Count > 0,
    score: h2Count > 0 ? 3 : 0,
    maxScore: 3,
    details: h2Count > 0 ? `${h2Count} H2 tag(s) found` : 'No H2 tags found',
    howToFix: h2Count > 0 ? undefined : 'Add <h2> tags to divide your content into sections. H2s help search engines understand content structure and improve readability.',
  })

  // Heading hierarchy (2 pts) — no H3 without H2, no H2 without H1
  const h3Count = $('h3').length
  const hierarchyOk =
    (h2Count > 0 || h3Count === 0) && (h1Count > 0 || h2Count === 0)
  checks.push({
    name: 'Heading hierarchy',
    passed: hierarchyOk,
    score: hierarchyOk ? 2 : 0,
    maxScore: 2,
    details: hierarchyOk
      ? 'Heading levels follow proper order'
      : 'Heading levels skip ranks',
    howToFix: hierarchyOk ? undefined : 'Fix heading order: H1 → H2 → H3. Never skip levels (e.g. going from H1 directly to H3). Proper hierarchy helps both crawlers and screen readers navigate the page.',
  })

  const score = checks.reduce((s, c) => s + c.score, 0)
  return { name: 'Headings', score, maxScore: 15, checks }
}

function analyzeContent($: cheerio.CheerioAPI): SEOCategory {
  const checks: SEOCheck[] = []

  // Clone and remove non-content elements for word count
  const $clone = cheerio.load($.html())
  $clone('script, style, nav, footer, header, aside').remove()
  const bodyText = $clone('body').text().replace(/\s+/g, ' ').trim()
  const wordCount = bodyText
    .split(' ')
    .filter((w) => w.length > 0).length
  const htmlLength = $clone('body').html()?.length ?? 0
  const textRatio = htmlLength > 0 ? (bodyText.length / htmlLength) * 100 : 0
  const paragraphCount = $('p').length

  // >300 words (5 pts)
  checks.push({
    name: 'Minimum content (300+ words)',
    passed: wordCount >= 300,
    score: wordCount >= 300 ? 5 : wordCount >= 100 ? 2 : 0,
    maxScore: 5,
    details: `${wordCount} words detected`,
    howToFix: wordCount >= 300 ? undefined : `Page only has ${wordCount} words. Add more body copy — at least 300 words gives search engines enough content to understand the topic and rank the page.`,
  })

  // >1000 words (5 pts)
  checks.push({
    name: 'Rich content (1000+ words)',
    passed: wordCount >= 1000,
    score: wordCount >= 1000 ? 5 : wordCount >= 500 ? 2 : 0,
    maxScore: 5,
    details: `${wordCount} words (1000+ recommended for in-depth content)`,
    howToFix: wordCount >= 1000 ? undefined : `Page has ${wordCount} words. In-depth content (1000+ words) consistently outranks thin pages for competitive keywords. Add more explanations, examples, or supporting sections.`,
  })

  // Text/HTML ratio (5 pts)
  checks.push({
    name: 'Text/HTML ratio >15%',
    passed: textRatio >= 15,
    score: textRatio >= 15 ? 5 : textRatio >= 8 ? 2 : 0,
    maxScore: 5,
    details: `${textRatio.toFixed(1)}% text-to-HTML ratio`,
    howToFix: textRatio >= 15 ? undefined : `Only ${textRatio.toFixed(1)}% of the page is readable text. This usually means the page is bloated with HTML markup, inline styles, or scripts relative to its content. Move styles to CSS files, remove unused markup, and add more visible copy.`,
  })

  // Paragraphs (5 pts)
  checks.push({
    name: 'Paragraph tags present',
    passed: paragraphCount >= 3,
    score: paragraphCount >= 3 ? 5 : paragraphCount > 0 ? 2 : 0,
    maxScore: 5,
    details: `${paragraphCount} <p> tag(s) found`,
    howToFix: paragraphCount >= 3 ? undefined : `Only ${paragraphCount} <p> tag(s) found. Wrap your body copy in <p> tags. Proper paragraph structure is a signal of well-formatted content and improves readability for both users and crawlers.`,
  })

  const score = checks.reduce((s, c) => s + c.score, 0)
  return { name: 'Content', score, maxScore: 20, checks }
}

function analyzeImages($: cheerio.CheerioAPI): SEOCategory {
  const checks: SEOCheck[] = []
  const images = $('img')
  const imgCount = images.length
  const withAlt = images.filter((_, el) => {
    const alt = $(el).attr('alt')
    return alt !== undefined && alt !== null
  }).length

  // Has images (5 pts)
  checks.push({
    name: 'Images present',
    passed: imgCount > 0,
    score: imgCount > 0 ? 5 : 0,
    maxScore: 5,
    details: imgCount > 0 ? `${imgCount} image(s) found` : 'No images found',
    howToFix: imgCount > 0 ? undefined : 'Add at least one relevant image to the page. Visual content improves engagement metrics (time on page, bounce rate) which indirectly boost rankings.',
  })

  // Alt text (10 pts, partial)
  let altScore = 0
  let altDetails = ''
  if (imgCount === 0) {
    altScore = 0
    altDetails = 'No images to evaluate'
  } else {
    const altRatio = withAlt / imgCount
    altScore = Math.round(altRatio * 10)
    altDetails =
      withAlt === imgCount
        ? `All ${imgCount} images have alt text`
        : `${withAlt}/${imgCount} images have alt text`
  }
  const altPassed = imgCount > 0 && withAlt === imgCount
  checks.push({
    name: 'Images have alt text',
    passed: altPassed,
    score: altScore,
    maxScore: 10,
    details: altDetails,
    howToFix: altPassed ? undefined : imgCount === 0
      ? 'Add images first, then give each one a descriptive alt attribute.'
      : `${imgCount - withAlt} image(s) are missing alt text. Add alt="description of image" to every <img>. Alt text is read by screen readers and used by Google Image Search to understand the image.`,
  })

  const score = checks.reduce((s, c) => s + c.score, 0)
  return { name: 'Images', score, maxScore: 15, checks }
}

function analyzeLinks($: cheerio.CheerioAPI, url: string): SEOCategory {
  const checks: SEOCheck[] = []
  let origin = ''
  try {
    origin = new URL(url).origin
  } catch {
    origin = ''
  }

  const allLinks = $('a[href]')
  const genericAnchors = ['click here', 'here', 'read more', 'learn more', 'more', 'link']
  let internalCount = 0
  let externalCount = 0
  let genericCount = 0

  allLinks.each((_, el) => {
    const href = $(el).attr('href') || ''
    const text = $(el).text().trim().toLowerCase()
    if (genericAnchors.includes(text)) genericCount++
    if (href.startsWith('http') || href.startsWith('//')) {
      if (origin && href.includes(origin.replace(/^https?:\/\//, ''))) {
        internalCount++
      } else {
        externalCount++
      }
    } else if (href.startsWith('/') || href.startsWith('#') || (!href.startsWith('mailto:') && !href.startsWith('tel:'))) {
      internalCount++
    }
  })

  // Internal links (5 pts)
  checks.push({
    name: 'Internal links',
    passed: internalCount >= 3,
    score: internalCount >= 3 ? 5 : internalCount > 0 ? 2 : 0,
    maxScore: 5,
    details: `${internalCount} internal link(s)`,
    howToFix: internalCount >= 3 ? undefined : `Only ${internalCount} internal link(s) found. Add links to at least 3 other pages on your site. Internal links spread PageRank, help crawlers discover content, and keep users engaged.`,
  })

  // External links (3 pts)
  checks.push({
    name: 'External links',
    passed: externalCount >= 1,
    score: externalCount >= 1 ? 3 : 0,
    maxScore: 3,
    details: `${externalCount} external link(s)`,
    howToFix: externalCount >= 1 ? undefined : 'Add at least one link to a reputable external source. Outbound links to authoritative sites (Wikipedia, official docs, studies) signal trustworthiness to search engines.',
  })

  // No generic anchors (2 pts)
  const noGeneric = genericCount === 0
  checks.push({
    name: 'No generic anchor text',
    passed: noGeneric,
    score: noGeneric ? 2 : 0,
    maxScore: 2,
    details: noGeneric
      ? 'No generic anchor text found'
      : `${genericCount} generic anchor text(s) found`,
    howToFix: noGeneric ? undefined : `Replace generic anchor text like "click here" or "read more" with descriptive phrases that tell users and search engines what the linked page is about. Example: instead of "click here", use "view our pricing plans".`,
  })

  const score = checks.reduce((s, c) => s + c.score, 0)
  return { name: 'Links', score, maxScore: 10, checks }
}

function analyzeTechnical(
  $: cheerio.CheerioAPI,
  url: string,
  extras: { robotsOk: boolean; sitemapOk: boolean },
): SEOCategory {
  const checks: SEOCheck[] = []

  // HTTPS (5 pts) — localhost/127.0.0.1 are secure contexts by definition
  const isSecure =
    url.startsWith('https://') ||
    url.includes('localhost') ||
    url.includes('127.0.0.1')
  checks.push({
    name: 'HTTPS',
    passed: isSecure,
    score: isSecure ? 5 : 0,
    maxScore: 5,
    details: url.startsWith('https://')
      ? 'Site uses HTTPS'
      : isSecure
        ? 'Localhost (treated as secure context)'
        : 'Site does not use HTTPS',
  })

  // lang attribute (3 pts)
  const lang = $('html').attr('lang') || ''
  const hasLang = lang.length > 0
  checks.push({
    name: 'Language attribute',
    passed: hasLang,
    score: hasLang ? 3 : 0,
    maxScore: 3,
    details: hasLang ? `lang="${lang}"` : 'No lang attribute on <html>',
    howToFix: hasLang ? undefined : 'Add a lang attribute to your <html> tag. Example: <html lang="en">. This helps search engines serve the correct regional results and enables screen readers to use the right pronunciation.',
  })

  // JSON-LD (4 pts)
  const jsonLd = $('script[type="application/ld+json"]')
  const hasJsonLd = jsonLd.length > 0
  checks.push({
    name: 'Structured data (JSON-LD)',
    passed: hasJsonLd,
    score: hasJsonLd ? 4 : 0,
    maxScore: 4,
    details: hasJsonLd
      ? `${jsonLd.length} JSON-LD block(s) found`
      : 'No JSON-LD structured data found',
    howToFix: hasJsonLd ? undefined : 'Add a JSON-LD block to enable rich results in Google Search. For most pages, start with WebPage or Article schema:\n<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"Page Title","description":"Page description"}</script>',
  })

  // Not blocking indexing (3 pts)
  const robotsMeta =
    $('meta[name="robots"]').attr('content')?.toLowerCase() || ''
  const blockingIndexing = robotsMeta.includes('noindex')
  checks.push({
    name: 'Not blocking search indexing',
    passed: !blockingIndexing,
    score: !blockingIndexing ? 3 : 0,
    maxScore: 3,
    details: blockingIndexing
      ? 'Page is blocking search indexing (noindex)'
      : robotsMeta
        ? `robots meta: "${robotsMeta}"`
        : 'No indexing restrictions found',
    howToFix: !blockingIndexing ? undefined : 'Remove "noindex" from your robots meta tag or X-Robots-Tag header. If this is intentional (staging/preview), make sure the live version does not carry this tag.',
  })

  // robots.txt (3 pts)
  checks.push({
    name: 'robots.txt accessible',
    passed: extras.robotsOk,
    score: extras.robotsOk ? 3 : 0,
    maxScore: 3,
    details: extras.robotsOk
      ? 'robots.txt found and accessible'
      : 'robots.txt not found or not accessible',
    howToFix: extras.robotsOk ? undefined : 'Create a robots.txt file at the root of your domain (e.g. https://example.com/robots.txt). At minimum it can contain:\nUser-agent: *\nAllow: /\nThis tells search engines they are free to crawl your site and prevents "missing robots.txt" warnings in Google Search Console.',
  })

  // XML Sitemap (3 pts)
  checks.push({
    name: 'XML Sitemap',
    passed: extras.sitemapOk,
    score: extras.sitemapOk ? 3 : 0,
    maxScore: 3,
    details: extras.sitemapOk
      ? 'XML sitemap found (sitemap.xml or declared in robots.txt)'
      : 'No XML sitemap found',
    howToFix: extras.sitemapOk ? undefined : 'Create a sitemap.xml listing all important pages and place it at https://example.com/sitemap.xml. Then declare it in robots.txt:\nSitemap: https://example.com/sitemap.xml\nSubmit the sitemap URL in Google Search Console to accelerate indexing.',
  })

  // DOM size (2 pts)
  const domSize = $('*').length
  const domOk = domSize < 1500
  checks.push({
    name: 'DOM size',
    passed: domOk,
    score: domOk ? 2 : domSize < 3000 ? 1 : 0,
    maxScore: 2,
    details: `${domSize} DOM elements (recommended: under 1500)`,
    howToFix: domOk ? undefined : `Page has ${domSize} DOM elements. Large DOMs slow down rendering and crawling. Simplify HTML structure, remove unnecessary wrapper divs, and consider lazy-loading off-screen content.`,
  })

  const score = checks.reduce((s, c) => s + c.score, 0)
  return { name: 'Technical SEO', score, maxScore: 23, checks }
}

function analyzeSocial($: cheerio.CheerioAPI): SEOCategory {
  const checks: SEOCheck[] = []

  const platforms = [
    { name: 'YouTube link', domains: ['youtube.com'], fix: 'Add a link to your YouTube channel (e.g. https://youtube.com/@yourchannel) to give visitors access to your video content and strengthen your brand presence.' },
    { name: 'X (Twitter) link', domains: ['twitter.com', 'x.com'], fix: 'Add a link to your X/Twitter profile to let visitors follow your updates. Example: <a href="https://x.com/yourhandle">Follow us on X</a>.' },
    { name: 'LinkedIn link', domains: ['linkedin.com'], fix: 'Add a link to your LinkedIn company page or profile to build professional credibility and reach a business audience.' },
    { name: 'Instagram link', domains: ['instagram.com'], fix: 'Add a link to your Instagram profile to showcase visual content and grow your brand audience on social media.' },
    { name: 'Facebook link', domains: ['facebook.com'], fix: 'Add a link to your Facebook page to help visitors connect with you and extend your social media reach.' },
  ]

  const hrefs: string[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    hrefs.push(href.toLowerCase())
  })

  for (const platform of platforms) {
    const found = hrefs.some((href) => platform.domains.some((d) => href.includes(d)))
    checks.push({
      name: platform.name,
      passed: found,
      score: found ? 1 : 0,
      maxScore: 1,
      details: found ? `${platform.name} found` : `No ${platform.name} found`,
      howToFix: found ? undefined : platform.fix,
    })
  }

  const score = checks.reduce((s, c) => s + c.score, 0)
  return { name: 'Social Signals', score, maxScore: 5, checks }
}

async function fetchRobotsTxt(origin: string): Promise<{ found: boolean; content: string }> {
  try {
    const response = await axios.get(`${origin}/robots.txt`, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 5000,
      responseType: 'text',
      validateStatus: (s) => s === 200,
    })
    return { found: true, content: response.data as string }
  } catch {
    return { found: false, content: '' }
  }
}

async function checkSitemapExists(origin: string, robotsContent: string): Promise<boolean> {
  // Check if robots.txt declares a Sitemap directive
  if (/^Sitemap:/im.test(robotsContent)) return true
  // Otherwise try fetching sitemap.xml directly
  try {
    await axios.get(`${origin}/sitemap.xml`, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 5000,
      validateStatus: (s) => s === 200,
    })
    return true
  } catch {
    return false
  }
}

async function fetchPageRank(domain: string, apiKey: string): Promise<{ pageRank: number; rank: string } | null> {
  try {
    const response = await axios.get(`https://openpagerank.com/api/v1.0/getPageRank?domains[0]=${encodeURIComponent(domain)}`, {
      headers: { 'API-OPR': apiKey },
      timeout: 8000,
    })
    const entry = response.data?.response?.[0]
    console.log('PageRank response:', JSON.stringify(response.data))
    if (!entry || entry.status_code !== 200) return null
    return {
      pageRank: entry.page_rank_integer ?? 0,
      rank: entry.rank ?? '',
    }
  } catch (err) {
    console.error('PageRank fetch error:', (err as Error).message)
    return null
  }
}

function analyzeBacklinks(_domain: string, data: { pageRank: number; rank: string } | null, apiKeyConfigured: boolean): SEOCategory {
  const checks: SEOCheck[] = []

  if (!apiKeyConfigured) {
    checks.push({
      name: 'Domain PageRank',
      passed: false,
      score: 0,
      maxScore: 5,
      details: 'PAGE_RANK_API not configured on server',
      howToFix: 'Set the PAGE_RANK_API environment variable on the server to enable backlink analysis. Get a free key at https://www.domcop.com/openpagerank/',
    })
    return { name: 'Backlinks', score: 0, maxScore: 5, checks }
  }

  if (!data) {
    checks.push({
      name: 'Domain PageRank',
      passed: false,
      score: 0,
      maxScore: 5,
      details: 'Could not retrieve PageRank data for this domain',
    })
    return { name: 'Backlinks', score: 0, maxScore: 5, checks }
  }

  const pr = data.pageRank
  const prScore = pr >= 9 ? 5 : pr >= 7 ? 4 : pr >= 5 ? 3 : pr >= 3 ? 2 : pr >= 1 ? 1 : 0
  const rankLabel = data.rank ? ` — global rank #${Number(data.rank).toLocaleString()}` : ''
  checks.push({
    name: 'Domain PageRank',
    passed: pr >= 1,
    score: prScore,
    maxScore: 5,
    details: `PageRank ${pr}/10${rankLabel}`,
    howToFix: pr >= 1 ? undefined : `Domain has no measured PageRank yet. Earn backlinks by publishing shareable content, getting listed in relevant directories, and submitting your site to Google Search Console. Quality matters more than quantity — one link from an authoritative site outweighs dozens from low-quality ones.`,
  })

  const score = checks.reduce((s, c) => s + c.score, 0)
  return { name: 'Backlinks', score, maxScore: 5, checks }
}

async function fetchWithAxios(url: string): Promise<string> {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1',
    },
    timeout: 10000,
    maxRedirects: 5,
    responseType: 'text',
    decompress: true,
  })
  return response.data as string
}

async function fetchWithPuppeteer(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    await page.setUserAgent(USER_AGENT)
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 })
    return await page.content()
  } finally {
    await browser.close()
  }
}

function isSPA(html: string): boolean {
  const $ = cheerio.load(html)
  // If body text is under 200 chars and there's a module script, it's an unrendered SPA
  const bodyText = $('body').text().trim()
  const hasModuleScript = $('script[type="module"]').length > 0
  return hasModuleScript && bodyText.length < 200
}

export async function analyzeURL(url: string): Promise<SEOResult> {
  let html: string
  let origin = ''
  try {
    origin = new URL(url).origin
  } catch {
    // if URL is malformed, skip robot/sitemap checks
  }

  const oprApiKey = process.env.PAGE_RANK_API ?? ''
  const domain = origin ? new URL(origin).hostname : ''

  const [htmlResult, robotsResult, pageRankData] = await Promise.all([
    (async () => {
      try {
        const fetched = await fetchWithAxios(url)
        if (isSPA(fetched)) {
          console.log('Detected unrendered SPA, switching to Puppeteer…')
          return await fetchWithPuppeteer(url)
        }
        return fetched
      } catch (err) {
        const status = (err as AxiosError)?.response?.status
        if (status && status >= 400) {
          console.log(`axios got ${status}, retrying with Puppeteer…`)
          return await fetchWithPuppeteer(url)
        }
        throw err
      }
    })(),
    origin ? fetchRobotsTxt(origin) : Promise.resolve({ found: false, content: '' }),
    oprApiKey && domain ? fetchPageRank(domain, oprApiKey) : Promise.resolve(null),
  ])

  html = htmlResult
  const sitemapOk = origin ? await checkSitemapExists(origin, robotsResult.content) : false

  const $ = cheerio.load(html)

  const categories = [
    analyzeMetaTags($),
    analyzeHeadings($),
    analyzeContent($),
    analyzeImages($),
    analyzeLinks($, url),
    analyzeTechnical($, url, { robotsOk: robotsResult.found, sitemapOk }),
    analyzeSocial($),
    analyzeBacklinks(domain, pageRankData, oprApiKey.length > 0),
  ]

  const rawScore = categories.reduce((s, c) => s + c.score, 0)
  const maxTotal = categories.reduce((s, c) => s + c.maxScore, 0)
  const totalScore = Math.round((rawScore / maxTotal) * 100)

  return {
    url,
    totalScore,
    grade: getGrade(totalScore),
    categories,
    analyzedAt: new Date().toISOString(),
  }
}
