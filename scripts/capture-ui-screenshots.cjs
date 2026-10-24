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
  async function chooseDate(label, iso) {
    await page.getByLabel(label).click();
    const day = page.locator(`[role="dialog"] button[data-iso="${iso}"]`);
    await day.waitFor({ state: 'visible' });
    await day.click();
  }
  async function auditRouteForm() {
    currentScreen = 'Route scenario form workflow on phone';
    let requestCount = 0;
    let routePayload = null;
    await page.route('**/api/v1/routes', async route => {
      requestCount++;
      routePayload = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {
        alternatives: [{ rank: 1, geometry: [{ latitude: 4.1755, longitude: 73.5093 }, { latitude: 4.173, longitude: 73.512 }], distanceMeters: 420, estimatedDurationSeconds: 180, estimatedArrival: '2026-10-25T07:03:00Z', affectedPermitIds: [] }],
        trafficLabel: 'Default uncalibrated profile', trafficProfileVersion: 'default-uncalibrated', networkVersion: 'ui-audit-network', calculatedAt: '2026-10-25T07:00:00Z', assumptions: [],
      } }) });
    });
    await page.getByRole('button', { name: 'Calculate route' }).click();
    await page.locator('ui-form-renderer [role="alert"]').waitFor({ state: 'visible' });
    if (requestCount !== 0) pageErrors.push({ screen: currentScreen, stack: 'An empty route form sent an API request.' });
    await page.getByRole('spinbutton', { name: 'Origin latitude' }).fill('100');
    await page.getByRole('spinbutton', { name: 'Origin longitude' }).fill('73.5093');
    await page.getByRole('spinbutton', { name: 'Destination latitude' }).fill('4.173');
    await page.getByRole('spinbutton', { name: 'Destination longitude' }).fill('73.512');
    await chooseDate('Departure date', '2026-10-25');
    await page.getByLabel('Departure time (Maldives time)').fill('12:00');
    await page.getByRole('button', { name: 'Calculate route' }).click();
    await page.getByText('Origin latitude must be 90 or less.').first().waitFor({ state: 'visible' });
    if (requestCount !== 0) pageErrors.push({ screen: currentScreen, stack: 'An out-of-range route coordinate sent an API request.' });
    await page.getByRole('spinbutton', { name: 'Origin latitude' }).fill('4.1755');
    await page.getByRole('button', { name: 'Calculate route' }).click();
    await page.getByText('Scenario estimate', { exact: true }).waitFor({ state: 'visible' });
    if (requestCount !== 1 || routePayload?.departureTime !== '2026-10-25T07:00:00.000Z') {
      pageErrors.push({ screen: currentScreen, stack: `Route request count/timezone mismatch: ${requestCount}, ${routePayload?.departureTime}` });
    }
    await page.screenshot({ path: path.join(output, '07-route-scenario-result-mobile.png'), fullPage: true });
    await page.unroute('**/api/v1/routes');
  }

  async function auditPermitForm() {
    currentScreen = 'Permit form validation on phone';
    let apiRequests = 0;
    const calls = { upload: 0, update: 0, submit: 0, list: 0 };
    let updatePayload = null;
    page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests++; });
    await page.route('**/api/v1/permits**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === 'POST' && url.pathname.endsWith('/upload')) {
        calls.upload++;
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: '00000000-0000-4000-8000-000000000001', revision: 1 } }) });
      } else if (request.method() === 'PUT') {
        calls.update++;
        updatePayload = JSON.parse(request.postData() ?? '{}');
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { revision: 2 } }) });
      } else if (request.method() === 'POST' && url.pathname.endsWith('/submit')) {
        calls.submit++;
        if (calls.submit === 1) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false }) });
        else await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: '00000000-0000-4000-8000-000000000001' } }) });
      } else if (request.method() === 'GET' && url.pathname === '/api/v1/permits') {
        calls.list++;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [{ id: '00000000-0000-4000-8000-000000000001', permitNumber: 'UI-AUDIT-1', locationDescription: 'Malé, test location', impactType: 0, approvalState: 2, startsAt: '2026-10-25T03:00:00Z', endsAt: '2026-10-26T13:00:00Z', revision: 3 }], total: 1 } }) });
      } else await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false }) });
    });
    await page.getByLabel('Permit number').fill('UI-AUDIT-1');
    await page.getByLabel('Work location').fill('Malé, test location');
    await page.getByLabel('Work description').fill('Temporary maintenance');
    await page.getByLabel('Restriction type').selectOption('0');
    await chooseDate('Start date', '2026-10-25');
    await page.getByLabel('Start time (Maldives time)').fill('08:00');
    await chooseDate('End date', '2026-10-26');
    await page.getByLabel('End time (Maldives time)').fill('18:00');
    const permitFile = page.locator('ui-form-renderer input[type="file"]').first();
    const accept = await permitFile.getAttribute('accept');
    if (!accept?.includes('.pdf') || !accept.includes('.jpg') || !accept.includes('.png')) {
      pageErrors.push({ screen: currentScreen, stack: `Unexpected file accept filter: ${accept}` });
    }
    await permitFile.setInputFiles({ name: 'permit.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nUI audit') });
    await chooseDate('End date', '2026-10-24');
    await page.getByRole('button', { name: 'Upload and submit for review' }).click();
    await page.getByText('End date must be on or after the start date.').first().waitFor({ state: 'visible' });
    await chooseDate('End date', '2026-10-25');
    await page.getByLabel('End time (Maldives time)').fill('07:00');
    await page.getByRole('button', { name: 'Upload and submit for review' }).click();
    await page.getByText('When the permit starts and ends on one day, end time must be later than start time.').first().waitFor({ state: 'visible' });
    await chooseDate('End date', '2026-10-26');
    await page.getByLabel('End time (Maldives time)').fill('18:00');
    await permitFile.setInputFiles({ name: 'not-a-permit.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('test') });
    await page.getByRole('button', { name: 'Upload and submit for review' }).click();
    await page.getByText('Upload a PDF, JPEG or PNG permit document.').first().waitFor({ state: 'visible' });
    await permitFile.setInputFiles({ name: 'oversized.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(25 * 1024 * 1024 + 1) });
    await page.getByRole('button', { name: 'Upload and submit for review' }).click();
    await page.getByText('The permit document must be 25 MiB or smaller.').first().waitFor({ state: 'visible' });
    if (apiRequests !== 0) pageErrors.push({ screen: currentScreen, stack: `Invalid permit form made ${apiRequests} API request(s).` });
    await permitFile.setInputFiles({ name: 'permit.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nUI audit') });
    await page.getByRole('button', { name: 'Upload and submit for review' }).click();
    await page.getByText('Permit submission failed. Confirm sign-in, permit officer access, valid dates and scanner availability. If the document was already uploaded, submit again to resume with the existing pending record.').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Upload and submit for review' }).click();
    await page.getByText('Permit uploaded and submitted. It cannot affect routing until approved and mapped to a road segment.').waitFor({ state: 'visible' });
    await page.getByText('Submitted', { exact: true }).waitFor({ state: 'visible' });
    if (apiRequests !== 5 || calls.upload !== 1 || calls.update !== 1 || calls.submit !== 2 || calls.list !== 1
      || updatePayload?.startsAt !== '2026-10-25T03:00:00.000Z' || updatePayload?.endsAt !== '2026-10-26T13:00:00.000Z') {
      pageErrors.push({ screen: currentScreen, stack: `Permit retry/timezone workflow mismatch: ${JSON.stringify({ calls, startsAt: updatePayload?.startsAt, endsAt: updatePayload?.endsAt })}` });
    }
    await page.unroute('**/api/v1/permits**');
    await page.unroute('**/api/**');
  }

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
        await navigationItem.waitFor({ state: 'hidden' });
      }
      const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (mobileOverflow) pageErrors.push({ screen: currentScreen, stack: 'Horizontal page overflow at 390px width.' });
      await page.screenshot({ path: path.join(output, filename.replace('-desktop', '-mobile')), fullPage: true });
      if (section === 'Overview') {
        await page.getByRole('button', { name: 'Plan a route' }).click();
        await page.locator('header h1').getByText('Route scenarios', { exact: true }).waitFor({ state: 'visible' });
      }
      if (section === 'Population') {
        currentScreen = 'Population refresh error on phone';
        await page.route('**/api/v1/population/series', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
        await page.getByRole('button', { name: 'Refresh data' }).click();
        await page.getByText('Population data could not be loaded. Confirm sign-in and API availability.').waitFor({ state: 'visible' });
        await page.unroute('**/api/v1/population/series');
      }
      if (section === 'Mobility map') {
        currentScreen = 'Mobility map refresh error on phone';
        await page.route('**/api/v1/map/roads**', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
        await page.route('**/api/v1/map/roadworks**', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
        await page.getByRole('button', { name: 'Refresh layers' }).click();
        await page.getByText('Map layers are unavailable. Confirm sign-in, approved source data and API availability.').waitFor({ state: 'visible' });
        await page.unroute('**/api/v1/map/roads**');
        await page.unroute('**/api/v1/map/roadworks**');
      }
      if (section === 'Route scenarios') await auditRouteForm();
      if (section === 'Permits') await auditPermitForm();
      if (section === 'Data & methodology') {
        currentScreen = 'Data sources refresh error on phone';
        await page.route('**/api/v1/dataSources', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
        await page.getByRole('button', { name: 'Refresh sources' }).click();
        await page.getByText('Source metadata could not be loaded. Confirm sign-in and API availability.').waitFor({ state: 'visible' });
        await page.unroute('**/api/v1/dataSources');
      }
    }

    await page.setViewportSize({ width: 320, height: 780 });
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' });
    await page.locator('mm-root').waitFor({ state: 'visible' });
    await page.waitForTimeout(300);
    for (const [section] of sections) {
      currentScreen = `${section} phone 320px`;
      if (section !== 'Overview') {
        const navigationItem = page.locator('ui-side-nav').getByText(section, { exact: true });
        if (!await navigationItem.isVisible()) {
          await page.locator('button:visible').first().click();
          await navigationItem.waitFor({ state: 'visible' });
        }
        await navigationItem.click();
        await page.locator('header h1').getByText(section, { exact: true }).waitFor({ state: 'visible' });
        await navigationItem.waitFor({ state: 'hidden' });
      }
      const narrowOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (narrowOverflow) pageErrors.push({ screen: currentScreen, stack: 'Horizontal page overflow at 320px width.' });
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
