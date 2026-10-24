const { createReadStream, existsSync, statSync } = require('node:fs');
const { createServer } = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve('dist/male-move/browser');
const output = path.resolve('artifacts/ui-screenshots');
const port = 4300;
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

if (!existsSync(path.join(root, 'index.html'))) throw new Error(`Angular build output not found: ${root}`);
require('node:fs').mkdirSync(output, { recursive: true });

const server = createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${port}`).pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  const candidate = pathname === '/' ? path.join(root, 'index.html') : path.resolve(root, `.${pathname}`);
  if (!candidate.startsWith(`${root}${path.sep}`) && candidate !== path.join(root, 'index.html')) {
    response.writeHead(403).end();
    return;
  }
  const file = existsSync(candidate) && statSync(candidate).isFile() ? candidate : path.join(root, 'index.html');
  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': mimeTypes[path.extname(file)] ?? 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.method === 'HEAD') response.end();
  else createReadStream(file).pipe(response);
});

async function capture() {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const pageErrors = [];
  let currentScreen = 'startup';
  page.on('pageerror', error => pageErrors.push({ screen: currentScreen, stack: error.stack ?? error.message }));
  const sections = [
    ['Overview', '01-overview-desktop.png'],
    ['Population', '02-population-desktop.png'],
    ['Mobility map', '03-mobility-map-desktop.png'],
    ['Permits', '04-permits-desktop.png'],
    ['Route scenarios', '05-route-scenarios-desktop.png'],
    ['Data & methodology', '06-data-methodology-desktop.png'],
  ];

  try {
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' });
    await page.locator('mm-root').waitFor({ state: 'visible' });
    await page.waitForTimeout(1000);
    for (const [section, filename] of sections) {
      currentScreen = `${section} desktop`;
      if (section !== 'Overview') {
        await page.locator('ui-side-nav').getByText(section, { exact: true }).click();
        await page.locator('header h1').getByText(section, { exact: true }).waitFor({ state: 'visible' });
      }
      await page.screenshot({ path: path.join(output, filename), fullPage: true });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' });
    await page.locator('mm-root').waitFor({ state: 'visible' });
    await page.waitForTimeout(500);
    for (const [section, filename] of sections) {
      currentScreen = `${section} mobile`;
      if (section !== 'Overview') {
        const navigationItem = page.locator('ui-side-nav').getByText(section, { exact: true });
        if (!await navigationItem.isVisible()) {
          // The shared layout collapses the sidebar behind its menu control on phone widths.
          await page.locator('button:visible').first().click();
          await navigationItem.waitFor({ state: 'visible' });
        }
        await navigationItem.click();
        await page.locator('header h1').getByText(section, { exact: true }).waitFor({ state: 'visible' });
      }
      const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (mobileOverflow) pageErrors.push({ screen: currentScreen, stack: 'Horizontal page overflow at 390px width.' });
      await page.screenshot({ path: path.join(output, filename.replace('-desktop', '-mobile')), fullPage: true });
    }
    if (pageErrors.length) throw new Error(`UI issues: ${JSON.stringify(pageErrors)}`);
    console.log(`Captured ${sections.length * 2} UI screenshots in ${output}`);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

capture().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
