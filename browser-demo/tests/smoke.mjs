import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const jsErrors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', err => jsErrors.push(err.message));
  await page.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('.rule').length >= 6, { timeout: 45000 });
  const rules = await page.locator('.rid').allTextContents();
  for (const id of ['SV-257851','SV-253254','SV-253495','SV-257889','SV-259345','SV-214228']) {
    assert(rules.some(s => s.includes(id)), id+' source-backed fixture must load');
    await page.locator('[data-id="'+id+'"]').click();
    assert(await page.locator('.logic-leaf').count() > 0, id+' should show linked Test logic');
    assert(await page.locator('#test-inspector').isVisible(), id+' must have a focused inspector');
  }

  await page.locator('[data-id="SV-253495"]').click();
  assert((await page.locator('.logic-group').count()) >= 3, 'Windows OR tree must preserve nested AND branches');
  const guestRefs = page.locator('button.logic-leaf[data-select-test="deny-log-on-through-remote-desktop-services-guests-test"]');
  assert.equal(await guestRefs.count(), 2, 'Guests Test must visibly repeat as one referenced definition');
  await guestRefs.first().click();
  assert((await page.locator('#test-inspector').innerText()).includes('Reused check: 2 references'), 'shared Test references should be explained');
  assert((await page.locator('#test-inspector').innerText()).includes('What this check means'), 'plain-English integrated check should be the primary view');
  assert((await page.locator('#test-inspector').innerText()).includes('Look at'), 'data collection should appear in the same check as expected conditions');
  assert((await page.locator('#test-inspector').innerText()).includes('windows-userright-object'), 'shared Object should be reachable in Test details');

  assert((await page.locator('#test-inspector .combined-check').innerText()).includes('Require'), 'matching conditions must be displayed in the same card as collection');
  assert((await page.locator('#test-inspector .combined-check').innerText()).includes('How many results are required?'), 'result-count wording must be human-readable');
  assert((await page.locator('#test-inspector .combined-check').innerText()).includes('Must be found:'), 'result existence must be visible');
  assert((await page.locator('#test-inspector .combined-check').innerText()).includes('Must match:'), 'matching count must be visible independently');
  await page.locator('#test-inspector .inspector-section').first().locator('summary').click();
  assert((await page.locator('#test-inspector').innerText()).includes('States:'), 'full nested State structure must remain accessible');
  await page.locator('#test-inspector .inspector-section').last().locator('summary').click();
  const selects = page.locator('#test-inspector .inspector-section').last().locator('select[data-field]');
  assert((await selects.count()) > 0, 'Focused Test editing should offer requirement choices');
  const choices = await selects.first().locator('option').allTextContents();
  assert(choices.length > 1, 'Requirement selector should contain other choices');
  assert(choices.some(x => x.includes('must match (at_least_one_exists_and_')), 'dropdown options must explain requirements and retain the native spelling');
  await selects.first().selectOption({ index: 1 });
  await page.locator('[data-view="source"]').click();
  const source = await page.locator('#rawyaml').inputValue();
  assert(source.includes('SV-253495.automated'), 'Source identity must persist after a value edit');

  await page.locator('[data-view="guided"]').click();
  assert(await page.getByText('1 · Understand this requirement').isVisible(), 'guided view must still work');
  await page.locator('[data-view="samples"]').click();
  assert(await page.getByText('NOT CONNECTED', { exact: false }).isVisible(), 'sample panel must not imply a scanner');
  assert(await page.locator('.sample-mock button').isDisabled(), 'sample evaluation must remain disabled');

  await page.locator('[data-id="SV-257851"]').click();
  assert((await page.locator('#test-inspector .combined-check').innerText()).includes('mounted filesystem entries'), 'simple collection should use a human term');
  assert((await page.locator('#test-inspector .combined-check').innerText()).includes('nosuid'), 'matching value and data source should be visible together');
  assert.equal(await page.locator('#test-inspector .inline-predicate input[data-field]').count(), 1, 'simple field value should have a direct edit control');
  const nosuidEdit=page.locator('#test-inspector .inline-predicate input[data-field]');
  await nosuidEdit.fill('noexec');
  await nosuidEdit.press('Tab');
  await page.locator('[data-view="source"]').click();
  const editedLinux=await page.locator('#rawyaml').inputValue();
  assert(editedLinux.includes('equals: noexec'), 'semantic editor must update the exact original field path');
  assert(editedLinux.includes('mount_point:'), 'source collection selector must remain present after a value change');

  await page.locator('[data-id="SV-257889"]').click();
  assert(await page.getByText('Combine collected data (set)', { exact: false }).count() >= 1, 'Linux set/foreach structure should be visible');
  await page.locator('[data-id="SV-214228"]').click();
  assert((await page.locator('#test-inspector').innerText()).includes('How required values are calculated (Variables:'), 'Apache variable dependencies should be linked');
  assert((await page.locator('#test-inspector .shellcommand-panel').innerText()).includes('no fixed command string'), 'Variable-generated Apache command must not be presented as a literal');
  assert((await page.locator('#test-inspector .shellcommand-panel').innerText()).includes('command from the Variable'), 'Apache command source must be identified');
  assert.equal(await page.locator('#test-inspector .shellcommand-panel textarea[data-field]').count(), 0, 'Variable-generated command must not be edited as if it were literal');
  await page.locator('[data-id="SV-259345"]').click();
  assert((await page.locator('.logic-group').count()) >= 2, 'DNS has nested alternatives');
  const dnsCommand=page.locator('#test-inspector .shellcommand-panel textarea[data-field]');
  assert.equal(await dnsCommand.count(), 1, 'Literal PowerShell command must be immediately visible in Test inspector');
  assert((await dnsCommand.inputValue()).includes('Get-DnsServerZone'), 'Display exact authored DNS PowerShell command');
  await dnsCommand.fill('Get-DnsServerZone | Select-Object ZoneName');
  await dnsCommand.press('Tab');
  await page.locator('[data-view="source"]').click();
  const dnsYaml=await page.locator('#rawyaml').inputValue();
  assert(dnsYaml.includes('Get-DnsServerZone | Select-Object ZoneName'), 'Editing literal command must update corresponding YAML command field');
  assert(dnsYaml.includes('SV-259345.automated'), 'Editing command must not alter the Assessment identity');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  mobile.on('pageerror', err => jsErrors.push(err.message));
  await mobile.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded' });
  await mobile.waitForFunction(() => document.querySelectorAll('.rule').length >= 6, { timeout: 45000 });
  await mobile.locator('[data-id="SV-257851"]').click();
  assert(await mobile.getByText('Assessment logic', { exact: false }).isVisible(), 'phone graphical view is reachable');
  assert.deepEqual(jsErrors, [], 'No browser JavaScript exceptions');

  console.log('PASS: six pinned complexity fixtures, Windows nested OR/shared Test, inspector editing, Linux Sets, Apache dependencies, sample mock, source and mobile');
} finally {
  await browser.close();
}
