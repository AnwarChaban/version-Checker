import * as cheerio from 'cheerio';

const RELEASE_NOTES_URLS = [
  'https://docs.sophos.com/releasenotes/output/en-us/nsg/sf_220_rn.html',
  'https://docs.sophos.com/releasenotes/output/en-us/nsg/sf_210_rn.html',
  'https://docs.sophos.com/releasenotes/output/en-us/nsg/sf_200_rn.html',
];

export async function fetchSophosVersion(): Promise<{ version: string; url: string }> {
  // Try release notes pages from newest to oldest
  for (const url of RELEASE_NOTES_URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const html = await res.text();
      const $ = cheerio.load(html);
      const text = $('body').text();

      // Match "Version 22.0 GA" or "Version 21.0 MR2" patterns
      const match = text.match(/Version\s+([\d.]+)\s*(GA|MR\s*\d+)/i);
      if (match) {
        const base = match[1];
        const suffix = match[2].trim();
        const version = suffix.toUpperCase() === 'GA' ? base : `${base} ${suffix}`;
        return { version, url };
      }
    } catch {
      continue;
    }
  }

  throw new Error('Could not parse Sophos version from any release notes page');
}
