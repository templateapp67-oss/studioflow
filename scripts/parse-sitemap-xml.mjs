import { SaxesParser } from 'saxes';

const NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';

// Parse, rather than regex-match, the deployed XML. Do not include source text
// in errors because the report is published as a GitHub check.
export function parseSitemapLocations(xml) {
  const parser = new SaxesParser({ xmlns: true });
  const stack = [];
  const locations = [];
  let rootSeen = false;
  let currentUrl = null;
  let locText = null;
  parser.on('doctype', () => { throw new Error('DOCTYPE is not permitted'); });
  parser.on('opentag', (tag) => {
    const depth = stack.length;
    if (depth === 0) {
      if (rootSeen || tag.local !== 'urlset' || tag.uri !== NS) throw new Error('Expected sitemap urlset');
      rootSeen = true;
    } else if (depth === 1 && (tag.local !== 'url' || tag.uri !== NS)) {
      throw new Error('Expected sitemap url');
    } else if (locText !== null) {
      throw new Error('Nested loc element');
    }
    if (depth === 1) currentUrl = { locations: 0 };
    if (depth === 2 && tag.local === 'loc' && tag.uri === NS) {
      currentUrl.locations += 1;
      locText = '';
    }
    stack.push(tag);
  });
  const appendText = (text) => { if (locText !== null) locText += text; };
  parser.on('text', appendText);
  parser.on('cdata', appendText);
  parser.on('closetag', () => {
    const tag = stack.pop();
    if (stack.length === 2 && tag.local === 'loc' && tag.uri === NS) {
      if (!locText.trim()) throw new Error('Empty sitemap loc');
      locations.push(locText.trim());
      locText = null;
    }
    if (stack.length === 1) {
      if (currentUrl.locations !== 1) throw new Error('Each sitemap url must have one loc');
      currentUrl = null;
    }
  });
  try {
    parser.write(xml).close();
    if (!rootSeen) throw new Error('Missing sitemap root');
  } catch {
    throw new Error('/sitemap.xml is not a valid XML sitemap with one loc per URL');
  }
  return locations;
}
