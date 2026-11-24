// Live HTTP/TLS SEO verification against a deployed preview, production site,
// or local production Express server.
//
// Env vars:
//   LIVE_SEO_URL                    Base origin to verify (e.g. https://nexorasalon.online or http://127.0.0.1:4174)
//   VERCEL_AUTOMATION_BYPASS_SECRET Optional Vercel protection bypass header for preview deployments
//   CHECK_WWW_REDIRECT_URL          Optional www origin (e.g. https://www.nexorasalon.online) to verify 308 -> apex
//   CHECK_HTTP_REDIRECT             Set to "1" to verify http:// -> https:// 308 permanent redirects (apex & www)
//   REQUIRE_PUBLISHED_SITES         Set to "1" to assert live Supabase-backed /sitemap.xml includes >=1 ?site=<slug>
//   SEO_REPORT_PATH                 Optional JSON path to write structured verification evidence (written on pass/fail)
//   SEO_WAIT_RETRY_ATTEMPTS         Optional retry count for post-deploy CDN propagation (default 1)
//   SEO_WAIT_RETRY_DELAY_MS         Delay between propagation retries in ms (default 5000)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rawBase = (process.env.LIVE_SEO_URL || '').trim().replace(/\/+$/, '');
if (!rawBase) {
  throw new Error('Set LIVE_SEO_URL to the target deployment origin (e.g. https://nexorasalon.online).');
}
const baseUrl = new URL(rawBase);
const isVercelPreviewHost = baseUrl.hostname.toLowerCase().endsWith('.vercel.app');
const bypassSecret = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim();
const wwwOrigin = (process.env.CHECK_WWW_REDIRECT_URL || '').trim().replace(/\/+$/, '');
const checkHttpRedirect = process.env.CHECK_HTTP_REDIRECT === '1';
const requirePublishedSites = process.env.REQUIRE_PUBLISHED_SITES === '1';
const reportPath = (process.env.SEO_REPORT_PATH || '').trim();
const maxRunAttempts = Math.max(1, Number.parseInt(process.env.SEO_WAIT_RETRY_ATTEMPTS || '1', 10) || 1);
const retryDelayMs = Math.max(500, Number.parseInt(process.env.SEO_WAIT_RETRY_DELAY_MS || '5000', 10) || 5000);

const defaultHeaders = {};
if (bypassSecret) {
  defaultHeaders['x-vercel-protection-bypass'] = bypassSecret;
  defaultHeaders['x-vercel-set-bypass-cookie'] = 'true';
}

async function fetchWithRetry(url, init = {}, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: { ...defaultHeaders, ...(init.headers || {}) },
        signal: AbortSignal.timeout(15000),
      });
      if (response.status >= 500 && i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      }
    }
  }
  throw lastError;
}

const get = async (routePath, init = {}) => {
  const response = await fetchWithRetry(`${rawBase}${routePath}`, init);
  return {
    status: response.status,
    headers: response.headers,
    robots: response.headers.get('x-robots-tag'),
    contentType: response.headers.get('content-type') || '',
    body: await response.text(),
  };
};

async function verifyPermanentRedirectChain(startUrl, expectedFinalUrl, maxHops = 2) {
  let current = startUrl;
  const hops = [];
  for (let hop = 0; hop < maxHops; hop += 1) {
    const res = await fetchWithRetry(current, { redirect: 'manual' });
    const location = res.headers.get('location');
    hops.push({ url: current, status: res.status, location });
    assert.equal(res.status, 308, `${current} must return HTTP 308 (got ${res.status})`);
    assert.ok(location, `${current} must include Location header`);
    const resolved = new URL(location, current).href;
    if (resolved === expectedFinalUrl) {
      return hops;
    }
    current = resolved;
  }
  assert.fail(`${startUrl} did not reach ${expectedFinalUrl} within ${maxHops} permanent 308 hops (hops: ${JSON.stringify(hops)})`);
}

function writeReport(report) {
  if (!reportPath) return;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function runVerification() {
  const report = {
    overallStatus: 'FAIL',
    target: rawBase,
    isVercelPreviewHost,
    timestamp: new Date().toISOString(),
    redirects: [],
    publicHeaders: [],
    partnerRewards: [],
    authHeaders: [],
    privateHeaders: [],
    robotsTxt: null,
    llmsTxt: null,
    sitemapXml: null,
    error: null,
  };

  try {
    const redirectPaths = ['/', '/partner-rewards', '/pricing', '/?site=artbyuma'];

    // 1a. Optional live https://www -> https://apex 308 redirect verification.
    if (wwwOrigin) {
      for (const routePath of redirectPaths) {
        const expected = `https://nexorasalon.online${routePath}`;
        const hops = await verifyPermanentRedirectChain(`${wwwOrigin}${routePath}`, expected, 1);
        report.redirects.push({ from: `${wwwOrigin}${routePath}`, expected, hops });
      }
    }

    // 1b. Optional live http:// -> https:// 308 redirect verification (apex & www).
    if (checkHttpRedirect && baseUrl.protocol === 'https:') {
      const httpApexOrigin = `http://${baseUrl.host}`;
      for (const routePath of redirectPaths) {
        const expected = `https://nexorasalon.online${routePath}`;
        const hops = await verifyPermanentRedirectChain(`${httpApexOrigin}${routePath}`, expected, 1);
        report.redirects.push({ from: `${httpApexOrigin}${routePath}`, expected, hops });
      }
      if (wwwOrigin) {
        const httpWwwOrigin = `http://${new URL(wwwOrigin).host}`;
        for (const routePath of redirectPaths) {
          const expected = `https://nexorasalon.online${routePath}`;
          const hops = await verifyPermanentRedirectChain(`${httpWwwOrigin}${routePath}`, expected, 2);
          report.redirects.push({ from: `${httpWwwOrigin}${routePath}`, expected, hops });
        }
      }
    }

    // 2. Public routes (indexable on production/local; Vercel preview hosts inject platform default `noindex`).
    const assertPublicRobots = (routePath, tag) => {
      if (isVercelPreviewHost) {
        assert.ok(
          tag === null || tag === 'noindex',
          `${routePath} on preview host should have no custom nofollow override (got ${JSON.stringify(tag)})`,
        );
        return;
      }
      assert.equal(tag, null, `${routePath} must not send X-Robots-Tag on canonical host (got ${JSON.stringify(tag)})`);
    };

    for (const publicPath of ['/', '/salon-os', '/pricing', '/privacy', '/partner-rewards', '/?site=artbyuma']) {
      const res = await get(publicPath);
      report.publicHeaders.push({ path: publicPath, status: res.status, xRobotsTag: res.robots });
      assert.equal(res.status, 200, `${publicPath} returns HTTP 200`);
      assertPublicRobots(publicPath, res.robots);
    }

    // /partner-rewards prerendered HTML check (must not fall back to homepage SPA shell).
    for (const routePath of ['/partner-rewards', '/partner-rewards/']) {
      const res = await get(routePath);
      const hasPartnerRewardsTitle = res.body.includes('Partner Rewards &amp; Recognition');
      const hasCanonical = res.body.includes('<link rel="canonical" href="https://nexorasalon.online/partner-rewards"');
      const hasHomepageShell = res.body.includes('public-home-title');
      report.partnerRewards.push({
        path: routePath,
        status: res.status,
        xRobotsTag: res.robots,
        hasPartnerRewardsTitle,
        hasCanonical,
        hasHomepageShell,
      });
      assert.equal(res.status, 200, `${routePath} returns HTTP 200`);
      assertPublicRobots(routePath, res.robots);
      assert.ok(hasPartnerRewardsTitle, `${routePath} serves prerendered Partner Rewards content`);
      assert.ok(hasCanonical, `${routePath} declares canonical https://nexorasalon.online/partner-rewards`);
      assert.ok(!hasHomepageShell, `${routePath} must not serve the generic homepage shell`);
    }

    // 3. Auth routes -> X-Robots-Tag: noindex, follow.
    for (const authPath of ['/login', '/sign-in', '/sign-up']) {
      const res = await get(authPath);
      report.authHeaders.push({ path: authPath, status: res.status, xRobotsTag: res.robots });
      assert.equal(res.status, 200, `${authPath} returns HTTP 200`);
      assert.equal(res.robots, 'noindex, follow', `${authPath} must return X-Robots-Tag: noindex, follow`);
    }

    // 4. Private paths and query-string app/session routes -> X-Robots-Tag: noindex, nofollow.
    for (const privatePath of [
      '/api/email-service-status',
      '/admin/demo-leads',
      '/owner',
      '/staff/login',
      '/login?create=1',
      '/?app=1',
      '/?owner=1',
      '/?invite=1',
      '/?site=artbyuma&app=1',
      '/?site=artbyuma&customer=1',
      '/?site=artbyuma&owner=1',
      '/?site=artbyuma&panel=demo',
      '/?site=artbyuma&create=1',
      '/?site=artbyuma&module=1',
      '/?site=artbyuma&invite=1',
      '/?site=artbyuma&recovery=1',
    ]) {
      const res = await get(privatePath);
      report.privateHeaders.push({ path: privatePath, status: res.status, xRobotsTag: res.robots });
      assert.equal(res.status, 200, `${privatePath} returns HTTP 200`);
      assert.equal(res.robots, 'noindex, nofollow', `${privatePath} must return X-Robots-Tag: noindex, nofollow`);
    }

    // 5. /robots.txt hygiene.
    const robots = await get('/robots.txt');
    const robotsLines = robots.body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    const disallowRules = robotsLines
      .filter((line) => line.startsWith('Disallow:'))
      .map((line) => line.slice('Disallow:'.length).trim());
    report.robotsTxt = {
      status: robots.status,
      xRobotsTag: robots.robots,
      lines: robotsLines,
      disallowRules,
    };
    assert.equal(robots.status, 200, '/robots.txt returns HTTP 200');
    assertPublicRobots('/robots.txt', robots.robots);
    assert.ok(robotsLines.includes('Allow: /'), '/robots.txt allows public crawling');
    assert.deepEqual(disallowRules, ['/api/'], '/robots.txt disallows only /api/ so crawlers can discover noindex HTML/app routes');
    assert.ok(robotsLines.includes('Sitemap: https://nexorasalon.online/sitemap.xml'), '/robots.txt points to canonical apex sitemap');

    // 6. /llms.txt hygiene.
    const llms = await get('/llms.txt');
    const vercelAppMatches = llms.body.match(/\.vercel\.app/gi) || [];
    const privateLinkMatches =
      llms.body.match(/https?:\/\/[^\s)]*\/(?:login|sign-in|sign-up|admin|owner|staff|api)(?:[/?#)\s]|$)/gi) || [];
    const appQueryMatches = llms.body.match(/[?&]app=/gi) || [];
    const apexUrlMatches = llms.body.match(/https:\/\/nexorasalon\.online[^\s)]*/g) || [];
    report.llmsTxt = {
      status: llms.status,
      xRobotsTag: llms.robots,
      apexUrlCount: apexUrlMatches.length,
      vercelAppCount: vercelAppMatches.length,
      privateLinkCount: privateLinkMatches.length,
      appQueryCount: appQueryMatches.length,
    };
    assert.equal(llms.status, 200, '/llms.txt returns HTTP 200');
    assertPublicRobots('/llms.txt', llms.robots);
    assert.ok(llms.body.includes('https://nexorasalon.online/'), '/llms.txt uses canonical apex origin');
    assert.equal(vercelAppMatches.length, 0, '/llms.txt contains zero *.vercel.app URLs');
    assert.equal(privateLinkMatches.length, 0, '/llms.txt links no private/auth/admin/staff/api URLs');
    assert.equal(appQueryMatches.length, 0, '/llms.txt contains no ?app= session links');

    // 7. Dynamic /sitemap.xml hygiene.
    const sitemap = await get('/sitemap.xml');
    const locs = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    const siteUrls = locs.filter((loc) => loc.includes('/?site='));
    report.sitemapXml = {
      status: sitemap.status,
      xRobotsTag: sitemap.robots,
      contentType: sitemap.contentType,
      totalUrls: locs.length,
      publishedSiteUrls: siteUrls,
      hasApexHomepage: locs.includes('https://nexorasalon.online/'),
      hasPartnerRewards: locs.includes('https://nexorasalon.online/partner-rewards'),
      wwwCount: locs.filter((loc) => loc.includes('www.nexorasalon.online')).length,
      vercelAppCount: locs.filter((loc) => loc.includes('.vercel.app')).length,
      qaSlugCount: siteUrls.filter((loc) => loc.includes('site=studioflow-qa-')).length,
    };
    assert.equal(sitemap.status, 200, '/sitemap.xml returns HTTP 200');
    assertPublicRobots('/sitemap.xml', sitemap.robots);
    assert.ok(sitemap.contentType.includes('xml'), `/sitemap.xml serves XML (got ${sitemap.contentType})`);
    assert.ok(locs.includes('https://nexorasalon.online/'), '/sitemap.xml includes apex homepage');
    assert.ok(locs.includes('https://nexorasalon.online/partner-rewards'), '/sitemap.xml includes /partner-rewards');
    assert.equal(new Set(locs).size, locs.length, '/sitemap.xml contains no duplicate <loc> entries');
    for (const loc of locs) {
      const parsed = new URL(loc);
      assert.equal(parsed.origin, 'https://nexorasalon.online', `every sitemap URL uses canonical non-www HTTPS origin: ${loc}`);
      assert.ok(!parsed.pathname.startsWith('/api/'), `sitemap excludes /api/: ${loc}`);
      assert.ok(!/^\/(?:login|sign-in|sign-up|admin|owner|staff)(?:\/|$)/i.test(parsed.pathname), `sitemap excludes private/auth path: ${loc}`);
      for (const key of ['app', 'customer', 'owner', 'panel', 'create', 'module', 'invite', 'recovery']) {
        assert.equal(parsed.searchParams.has(key), false, `sitemap excludes session param ${key}: ${loc}`);
      }
      const siteSlug = parsed.searchParams.get('site');
      if (siteSlug) {
        assert.ok(!siteSlug.startsWith('studioflow-qa-'), `sitemap excludes QA salon slug: ${loc}`);
      }
    }
    if (requirePublishedSites) {
      assert.ok(siteUrls.length > 0, '/sitemap.xml must include published Supabase ?site=<slug> storefront URLs');
    }

    report.overallStatus = 'PASS';
    writeReport(report);
    console.log(
      `PASS: live SEO HTTP verification on ${rawBase} — ${locs.length} sitemap URLs (${siteUrls.length} published ?site= storefronts), /robots.txt, /llms.txt, /partner-rewards prerender, X-Robots-Tag precedence${report.redirects.length > 0 ? `, and ${report.redirects.length} 308 redirect checks` : ''}.`,
    );
    return;
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    writeReport(report);
    throw error;
  }
}

let lastFailure;
for (let attempt = 1; attempt <= maxRunAttempts; attempt += 1) {
  try {
    await runVerification();
    lastFailure = null;
    break;
  } catch (error) {
    lastFailure = error;
    if (attempt < maxRunAttempts) {
      console.warn(`Live SEO verification attempt ${attempt}/${maxRunAttempts} failed (${error?.message || error}); retrying in ${retryDelayMs}ms...`);
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
}
if (lastFailure) {
  throw lastFailure;
}
