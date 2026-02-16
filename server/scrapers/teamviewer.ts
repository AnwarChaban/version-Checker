import * as cheerio from 'cheerio';

export async function fetchTeamViewerVersion(): Promise<{ version: string; url: string }> {
  const url = 'https://community.teamviewer.com/English/categories/change-logs-en';
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    // Look for version patterns like "[Windows] v15.74.6" in the changelog list
    const links = $('ul.linkList a, .Title a, a').toArray();
    for (const el of links) {
      const text = $(el).text();
      const match = text.match(/\[Windows\]\s*v?([\d.]+)/i)
        || text.match(/v(15\.[\d.]+)/i);
      if (match) {
        const href = $(el).attr('href') || url;
        const fullUrl = href.startsWith('http') ? href : `https://community.teamviewer.com${href}`;
        return { version: match[1], url: fullUrl };
      }
    }

    // Fallback: search entire page text for version pattern
    const bodyText = $('body').text();
    const fallbackMatch = bodyText.match(/\[Windows\]\s*v?([\d.]+)/i)
      || bodyText.match(/Version\s*-?\s*(15\.[\d.]+)/i);
    if (fallbackMatch) {
      return { version: fallbackMatch[1], url };
    }

    throw new Error('Could not parse TeamViewer version');
  } catch (error) {
    console.error('[Scraper] TeamViewer fetch failed:', error);
    throw error;
  }
}
