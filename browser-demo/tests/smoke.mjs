import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const jsErrors = [];
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('pageerror', err => jsErrors.push(err.message));
  await page.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('.rule').length >= 2, { timeout: 35000 });
  let rules = await page.locator('.rid').allTextContents();
  assert(rules.some(s => s.includes('SV-253495')), 'Windows Rule must load');
  assert(rules.some(s => s.includes('SV-257851')), 'Linux Rule must load');

  await page.locator('[data-id="SV-253495"]').click();
  await page.locator('[data-view="graphical"]').click();
  assert(await page.getByText('OR — any branch').isVisible(), 'Windows three-way OR must be visible');
  const all = page.locator('select[data-field]');
  assert((await all.count()) > 0, 'Graphical editing must offer actual editable selectors');

  const select = all.first();
  const options = await select.locator('option').allTextContents();
  assert(options.length > 1, 'Must have alternative requirement choices');
  await select.selectOption({ index: 1 });
  await page.locator('[data-view="source"]').click();
  const updated = await page.locator('#rawyaml').inputValue();
  assert(updated.includes('assessment:'), 'source must remain available after graphical edit');
  assert(updated.includes('SV-253495.automated'), 'source must preserve original Assessment identity');

  await page.locator('[data-view="guided"]').click();
  assert(await page.getByText('1 · Understand this requirement').isVisible(), 'guided editor should be available');
  await page.locator('[data-view="samples"]').click();
  assert(await page.getByText('NOT SCANNER-VERIFIED', { exact: false }).isVisible(), 'no fabricated scanner result');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  mobile.on('pageerror', err => jsErrors.push(err.message));
  await mobile.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded' });
  await mobile.waitForFunction(() => document.querySelectorAll('.rule').length >= 2, { timeout: 35000 });
  await mobile.locator('[data-id="SV-257851"]').click();
  await mobile.locator('[data-view="graphical"]').click();
  assert(await mobile.getByText('Assessment logic', { exact: false }).isVisible(), 'phone graphical read-only view is reachable');
  assert.deepEqual(jsErrors, [], 'No browser JavaScript exceptions');
  console.log('PASS: pinned RHEL and Windows browser demo, guided/graphical/source/sample, edited draft and phone viewport');
} finally {
  await browser.close();
}
