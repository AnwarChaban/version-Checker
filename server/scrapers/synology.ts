import * as cheerio from 'cheerio';

export async function fetchSynologyVersion(): Promise<{ version: string; url: string }> {
  const url = 'https://www.synology.com/en-global/releaseNote/DSMmanager';
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    // Look for version pattern in the page content
    const text = $('body').text();
    const match = text.match(/Version:\s*([\d.]+(?:-\d+)?)/i)
      || text.match(/DSM\s+([\d.]+(?:-\d+)?)/i)
      || text.match(/(7\.\d+(?:\.\d+)*(?:-\d+)?)/);

    if (match) {
      return { version: match[1], url };
    }

    // Fallback: try the archive page
    const archiveUrl = 'https://archive.synology.com/download/Os/DSM';
    const archiveRes = await fetch(archiveUrl);
    const archiveHtml = await archiveRes.text();
    const $a = cheerio.load(archiveHtml);
    const versions: string[] = [];
    $a('a').each((_, el) => {
      const href = $a(el).attr('href') || '';
      const m = href.match(/\/DSM\/([\d.]+)/);
      if (m) versions.push(m[1]);
    });

    if (versions.length > 0) {
      versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      return { version: versions[0], url: archiveUrl };
    }

    throw new Error('Could not parse Synology DSM version');
  } catch (error) {
    console.error('[Scraper] Synology DSM fetch failed:', error);
    throw error;
  }
}
