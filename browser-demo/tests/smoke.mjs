import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const jsErrors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', err => jsErrors.push(err.message));
  await page.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('.stig-toggle').length >= 4, { timeout: 45000 });
  const groupFor={
    'SV-257851':'rhel_9','SV-257889':'rhel_9',
    'SV-257777':'rhel_9','SV-257778':'rhel_9','SV-257798':'rhel_9','SV-257941':'rhel_9',
    'SV-253254':'ms_windows_11','SV-253495':'ms_windows_11',
    'SV-253255':'ms_windows_11','SV-253308':'ms_windows_11',
    'SV-214228':'apache_server_2-4_unix_server',
    'SV-259345':'ms_windows_server_dns'
  };
  const openRule=async id=>{
    const row=page.locator('[data-id="'+id+'"]');
    if(!(await row.isVisible()))await page.locator('[data-stig="'+groupFor[id]+'"]').click();
    await row.click();
  };
  assert.equal(await page.locator('.stig-toggle').count(),4,'the source-backed catalog should group six Rules into four STIGs');
  for(const stig of ['rhel_9','ms_windows_11','apache_server_2-4_unix_server','ms_windows_server_dns'])
    assert.equal(await page.locator('[data-stig="'+stig+'"]').count(),1,'STIG group '+stig+' should be present');
  await page.locator('[data-filter="all"]').click();
  assert.equal(await page.locator('.stig-toggle').count(),4,'All must show STIG headings, not a flat Rule list');
  assert.equal(await page.locator('.stig-rules').count(),0,'All should not render any Rules before STIG selection');
  assert(await page.getByText('Select a STIG, then a Rule').isVisible(),'initial view must not preselect a Rule');
  await page.locator('[data-stig="rhel_9"]').click();
  assert.equal(await page.locator('.stig-rules').count(),1,'one STIG opens its Rules');
  assert.equal(await page.locator('.stig-rules .rule').count(),445,'RHEL 9 complete pinned STIG must contain 445 Rules');
  assert((await page.locator('[data-id="SV-257851"]').innerText()).includes('Shared Assessment resolved'),
    'shared RHEL automated Assessment must be resolved, not flagged non-automated');
  await page.locator('[data-stig="ms_windows_11"]').click();
  assert.equal(await page.locator('.stig-rules').count(),1,'switching STIGs closes the previous Rule list');
  assert.equal(await page.locator('[data-id="SV-257851"]').count(),0,'previous STIG Rule DOM must be removed');
  assert.equal(await page.locator('[data-id="SV-253495"]').count(),1,'new STIG must show its Rules');
  assert.equal(await page.locator('.stig-rules .rule').count(),257,'Windows 11 complete pinned STIG must contain 257 Rules');
  await page.locator('[data-stig="ms_windows_11"]').click();
  assert.equal(await page.locator('.stig-rules').count(),0,'clicking open STIG again collapses all Rules');
  for (const id of ['SV-257851','SV-253254','SV-253495','SV-257889','SV-259345','SV-214228']) {
    await openRule(id);
    assert.equal(await page.locator('.stig-rules').count(),1,'only one STIG may show Rules');
    assert((await page.locator('.rid').allTextContents()).includes(id),id+' must be visible only under its selected STIG');
    assert(await page.locator('.logic-leaf').count() > 0, id+' should show linked Test logic');
    assert(await page.locator('#test-inspector').isVisible(), id+' must have a focused inspector');
  }

  await openRule('SV-253495');
  assert((await page.locator('.logic-group').count()) >= 3, 'Windows OR tree must preserve nested AND branches');
  const guestRefs = page.locator('button.logic-leaf[data-select-test="deny-log-on-through-remote-desktop-services-guests-test"]');
  assert.equal(await guestRefs.count(), 2, 'Guests Test must visibly repeat as one referenced definition');
  await guestRefs.first().click();
  assert((await page.locator('#test-inspector').innerText()).includes('Reused check: 2 references'), 'shared Test references should be explained');
  assert((await page.locator('#test-inspector').innerText()).includes('What this check means'), 'plain-English integrated check should be the primary view');
  assert((await page.locator('#test-inspector').innerText()).includes('Look at'), 'data collection should appear in the same check as expected conditions');
  assert((await page.locator('#test-inspector').innerText()).includes('windows-userright-object'), 'shared Object should be reachable in Test details');

  assert((await page.locator('#test-inspector .combined-check').innerText()).includes('Check (State)'), 'matching condition must be editable alongside collection');
  assert((await page.locator('#test-inspector .combined-check').innerText()).includes('How many results must be found and match?'), 'result-count control should have a compact clear label');
  assert.equal(await page.locator('#test-inspector .quick-results select[data-field]').count(), 1, 'direct dropdown should change Test result cardinality');
  assert((await page.locator('#test-inspector .combined-check').innerText()).includes('How many field values in each result must match?'), 'field-level matching count should have a compact explicit label');
  await page.locator('#test-inspector .result-explanation summary').click();
  assert((await page.locator('#test-inspector .combined-check').innerText()).includes('Must be found:'), 'expanded help must explain result existence');
  assert((await page.locator('#test-inspector .combined-check').innerText()).includes('Must match:'), 'expanded help must explain match count independently');
  await page.locator('#test-inspector .inspector-section').first().locator(':scope > summary').click();
  assert((await page.locator('#test-inspector').innerText()).includes('States:'), 'full nested State structure must remain accessible');
  await page.locator('#test-inspector .inspector-section').last().locator(':scope > summary').click();
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
  assert(await page.locator('.sample-mock > p.warning').isVisible(), 'sample panel must not imply a scanner');
  assert(await page.locator('.sample-mock button').isDisabled(), 'sample evaluation must remain disabled');

  await openRule('SV-257851');
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

  await openRule('SV-257889');
  assert(await page.getByText('Combine collected data (set)', { exact: false }).count() >= 1, 'Linux set/foreach structure should be visible');
  await openRule('SV-214228');
  const apacheExpected=page.locator('#test-inspector .predicate-value');
  assert.equal(await apacheExpected.count(), 1, 'Apache KeepAlive regex should be editable at the condition itself');
  assert((await apacheExpected.inputValue()).includes('KeepAlive On'), 'original Apache pattern should be visibly displayed');
  assert.equal(await page.locator('#test-inspector #predicate-operation').count(), 1, 'comparison operator should be directly selectable');
  assert.equal(await page.locator('#test-inspector .predicate-quantity select').count(), 1, 'field-level matching quantity should be directly selectable');
  assert.equal(await page.locator('#test-inspector .quick-results select').count(), 1, 'collected result quantity should be directly selectable');
  await apacheExpected.fill('\\s*KeepAlive Off');
  await apacheExpected.press('Tab');
  await page.locator('#test-inspector .predicate-quantity select').selectOption('at_least_one_exists_and_some_match');
  await page.locator('#test-inspector .quick-results select').selectOption('only_one_exists_and_matches');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#test-inspector #predicate-operation').selectOption('equals');
  await page.locator('[data-view="source"]').click();
  const apacheContent=await page.locator('#rawyaml').inputValue();
  const apacheParsed=await page.evaluate(raw=>window.jsyaml.load(raw),apacheContent);
  const apacheTest=apacheParsed.assessment.tests['verify-that-keepalive-directive-defined-configured-on-in-httpd-conf-test'];
  assert.equal(apacheTest.states[0].stdout_line.equals,'\\s*KeepAlive Off','inline comparison changes the expected value and operator');
  assert.equal(apacheTest.states[0].stdout_line.require,'at_least_one_exists_and_some_match','field requirement maps to its State field only');
  assert.equal(apacheTest.collected_items_require,'only_one_exists_and_matches','Test Item requirement maps to the Test only');
  assert(!('matches_regex' in apacheTest.states[0].stdout_line),'switching comparison should remove only the previous operator');
  assert.equal(apacheTest.capability,'independent.shellcommand','editing comparison preserves capability');
  await page.locator('[data-view="graphical"]').click();
  assert((await page.locator('#test-inspector .predicate-value').inputValue()).includes('KeepAlive Off'), 'graphical view must reflect YAML edit');
  assert((await page.locator('#test-inspector').innerText()).includes('How required values are calculated (Variables:'), 'Apache variable dependencies should be linked');
  assert((await page.locator('#test-inspector .shellcommand-panel').innerText()).includes('no fixed command string'), 'Variable-generated Apache command must not be presented as a literal');
  assert((await page.locator('#test-inspector .shellcommand-panel').innerText()).includes('command from the Variable'), 'Apache command source must be identified');
  assert.equal(await page.locator('#test-inspector .shellcommand-panel textarea[data-field]').count(), 0, 'Variable-generated command must not be edited as if it were literal');
  const apacheInterpreter=page.locator('#test-inspector .shellcommand-panel select.interpreter-select');
  assert.equal(await apacheInterpreter.count(), 1, 'Apache shell must be editable in-place');
  assert.equal(await apacheInterpreter.inputValue(), 'bash', 'Apache must display authored bash interpreter');
  assert.deepEqual(await apacheInterpreter.locator('option').allTextContents(),
    ['sh','bash','csh','ksh','zsh','cmd','powershell','pwsh'], 'Options must match pinned SCAP-NG shell mapping');
  page.once('dialog', dialog => dialog.accept());
  await apacheInterpreter.selectOption('sh');
  await page.locator('[data-view="source"]').click();
  const apacheShellSource=await page.locator('#rawyaml').inputValue();
  const apacheShellAssessment=await page.evaluate(raw=>window.jsyaml.load(raw),apacheShellSource);
  const apacheShellTest=apacheShellAssessment.assessment.tests['verify-that-keepalive-directive-defined-configured-on-in-httpd-conf-test'];
  assert.equal(apacheShellTest.object.collect.shell,'sh','shell selection must change collect.shell only');
  assert.equal(apacheShellTest.object.collect.command.variable,'shell-command-check-keepalive-in-httpd-conf-all-include-conf-variable','variable command reference must remain');
  await openRule('SV-259345');
  assert((await page.locator('.logic-group').count()) >= 2, 'DNS has nested alternatives');
  const dnsCommand=page.locator('#test-inspector .shellcommand-panel textarea[data-field]');
  assert.equal(await dnsCommand.count(), 1, 'Literal PowerShell command must be immediately visible in Test inspector');
  assert((await dnsCommand.inputValue()).includes('Get-DnsServerZone'), 'Display exact authored DNS PowerShell command');
  const dnsInterpreter=page.locator('#test-inspector .shellcommand-panel select.interpreter-select');
  assert.equal(await dnsInterpreter.count(),1,'DNS PowerShell interpreter must be editable');
  assert.equal(await dnsInterpreter.inputValue(),'powershell','DNS must show authored powershell interpreter');
  page.once('dialog', dialog=>dialog.accept());
  await dnsInterpreter.selectOption('pwsh');
  assert.equal(await page.locator('#test-inspector .shellcommand-panel select.interpreter-select').inputValue(),'pwsh',
    'updated shell must survive graphical re-render');
  await page.locator('#test-inspector .shellcommand-panel textarea[data-field]').fill('Get-DnsServerZone | Select-Object ZoneName');
  await page.locator('#test-inspector .shellcommand-panel textarea[data-field]').press('Tab');
  await page.locator('[data-view="source"]').click();
  const dnsYaml=await page.locator('#rawyaml').inputValue();
  assert(dnsYaml.includes('Get-DnsServerZone | Select-Object ZoneName'), 'Editing literal command must update corresponding YAML command field');
  const dnsShellAssessment=await page.evaluate(raw=>window.jsyaml.load(raw),dnsYaml);
  const dnsShellTest=dnsShellAssessment.assessment.tests['dns-server-caching-only-there-no-forward-or-reverse-lookup-test'];
  assert.equal(dnsShellTest.object.collect.shell,'pwsh','shell selection must update the exact DNS collect.shell');
  assert.equal(dnsShellTest.object.collect.command,'Get-DnsServerZone | Select-Object ZoneName','changing interpreter must not convert command text');
  assert(dnsYaml.includes('SV-259345.automated'), 'Editing command must not alter the Assessment identity');

  // A native Assessment-result reference should show the actual referenced Tests,
  // while keeping the authored dependent source intact (no silent inlining).
  await openRule('SV-257851');
  await page.locator('[data-view="source"]').click();
  const initialDependencySource=await page.locator('#rawyaml').inputValue();
  const withReference=await page.evaluate(raw=>{
    const parsed=window.jsyaml.load(raw);
    parsed.assessment.evaluate={assessment:'SV-253254.automated'};
    return window.jsyaml.dump(parsed);
  },initialDependencySource);
  await page.locator('#rawyaml').fill(withReference);
  await page.locator('#applyYAML').click();
  await page.locator('[data-view="graphical"]').click();
  assert((await page.locator('.assessment-reference').innerText()).includes('SV-253254.automated'),
    'a linked Assessment should be expanded in the logic tree');
  assert((await page.locator('.assessment-reference').innerText()).includes('Enterprise'),
    'referenced Windows EditionID Test conditions should appear without manual dereferencing');
  assert.equal(await page.locator('.assessment-reference .linked-test').count(),1,
    'resolved linked Test should be read-only, not silently merged into editable Tests');
  await page.locator('[data-view="source"]').click();
  assert((await page.locator('#rawyaml').inputValue()).includes('assessment: SV-253254.automated'),
    'source should retain the Assessment reference, not inline its YAML automatically');
  await page.locator('#rawyaml').fill(initialDependencySource);
  await page.locator('#applyYAML').click();
  await page.locator('[data-view="graphical"]').click();

  // Full-STIG field walk: easy Linux collection, manual-only, objectless,
  // Windows PowerShell record values, and special matching modes.
  await openRule('SV-257777');
  assert(await page.getByText('RHEL 9 must be a vendor-supported release.', { exact:false }).count()>0);
  assert((await page.locator('#test-inspector .combined-check').innerText()).includes('file /etc/redhat-release'),
    'text-file collection should explain the concrete file being read');
  await openRule('SV-253255');
  assert((await page.locator('#test-inspector .combined-check').innerText()).includes('PowerShell Get-Tpm'),
    'native PowerShell cmdlet should be visible instead of a raw capability label');
  assert.equal(await page.locator('#test-inspector .record-edit-row').count(),3,
    'Windows TPM record should offer independent field/value rows');
  assert((await page.locator('#test-inspector .record-fields').innerText()).includes('tpmpresent'),
    'nested record fields must be visible without expanding the source tree');
  await page.locator('#test-inspector .record-edit-row').first().locator('input[data-field]').fill('False');
  await page.locator('#test-inspector .record-edit-row').first().locator('input[data-field]').press('Tab');
  await page.locator('[data-view="source"]').click();
  const recordSource=await page.locator('#rawyaml').inputValue();
  const recordParsed=await page.evaluate(s=>window.jsyaml.load(s),recordSource);
  assert.equal(recordParsed.assessment.tests['windows-have-tpm-ready-use-test'].states[0].value.record.fields.tpmpresent.equals,'False',
    'record value edit must map to its nested State field without changing collection');
  const originalRecordFields=recordParsed.assessment.tests['windows-have-tpm-ready-use-test'].states[0].value.record.fields;
  await page.locator('[data-view="graphical"]').click();
  const recordName=page.locator('#test-inspector .record-edit-row').first().locator('input[data-rename-key]');
  assert.equal(await recordName.inputValue(),'tpmpresent','native record member name should be an editable text field');
  // Reject a duplicate name without touching the source document.
  const sibling=Object.keys(originalRecordFields).find(k=>k!=='tpmpresent');
  assert(sibling,'TPM fixture should contain a second record member');
  await recordName.fill(sibling);
  await recordName.press('Tab');
  assert.equal(await page.locator('#test-inspector .record-edit-row').first().locator('input[data-rename-key]').inputValue(),'tpmpresent',
    'duplicate rename must restore the original field name');
  const renamed=page.locator('#test-inspector .record-edit-row').first().locator('input[data-rename-key]');
  page.once('dialog',dialog=>dialog.accept());
  await renamed.fill('tpm_detected');
  await renamed.press('Tab');
  await page.locator('[data-view="source"]').click();
  const renamedYaml=await page.locator('#rawyaml').inputValue();
  const renamedDoc=await page.evaluate(raw=>window.jsyaml.load(raw),renamedYaml);
  const changedFields=renamedDoc.assessment.tests['windows-have-tpm-ready-use-test'].states[0].value.record.fields;
  assert(!Object.hasOwn(changedFields,'tpmpresent'),'previous record key must not remain after rename');
  assert.equal(changedFields.tpm_detected.equals,'False','field key rename must retain the original value');
  assert.deepEqual(Object.keys(changedFields),Object.keys(originalRecordFields).map(k=>k==='tpmpresent'?'tpm_detected':k),
    'field rename must preserve original record ordering and all sibling names');
  for(const key of Object.keys(originalRecordFields).filter(k=>k!=='tpmpresent'))
    assert.deepEqual(changedFields[key],originalRecordFields[key],'rename must not change a sibling record predicate');
  await page.locator('[data-view="graphical"]').click();
  assert.equal(await page.locator('#test-inspector .record-edit-row').first().locator('input[data-rename-key]').inputValue(),
    'tpm_detected','graphical editor must reread the new key from the exported source');
  await openRule('SV-257798');
  assert((await page.locator('#test-inspector .quick-results').innerText()).includes('Special authored requirement: all_exist_and_all_match'),
    'unreviewed existence modes must not be mislabeled as a different mode');
  assert.equal(await page.locator('#test-inspector .quick-results select').count(),0,
    'special matching mode must not offer an unsafe seven-option dropdown');
  await openRule('SV-253308');
  assert(!(await page.locator('#test-inspector .combined-check').innerText()).includes('Unresolved Object reference'),
    'objectless native collection should not be presented as broken data');
  await openRule('SV-257778');
  assert(await page.locator('.manual-assessment').isVisible(),'manual-only Rule should show its authored procedure');
  assert((await page.locator('#manual-procedure').inputValue()).includes('dnf history'),
    'manual procedure should be directly readable and editable, not an empty automation panel');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  mobile.on('pageerror', err => jsErrors.push(err.message));
  await mobile.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded' });
  await mobile.waitForFunction(() => document.querySelectorAll('.stig-toggle').length >= 4, { timeout: 45000 });
  await mobile.locator('[data-stig="rhel_9"]').click();
  await mobile.locator('[data-id="SV-257851"]').click();
  assert(await mobile.getByText('How compliance is checked', { exact: false }).isVisible(), 'phone graphical view is reachable');
  assert.deepEqual(jsErrors, [], 'No browser JavaScript exceptions');

  console.log('PASS: six pinned complexity fixtures, Windows nested OR/shared Test, inspector editing, Linux Sets, Apache dependencies, sample mock, source and mobile');
} finally {
  await browser.close();
}
