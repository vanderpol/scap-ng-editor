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
  // Blank, goal-first authoring must NOT prepopulate RHEL banner Test data.
  // Compose two independent Tests with capability-specific fields and two
  // same-file State conditions, then roundtrip through native 0.4-A YAML.
  await page.locator('#new-assessment').click();
  assert(await page.locator('#blank-create').isVisible(),'new default must be blank goal-first');
  assert.equal(await page.locator('label[for="blank-goal"]').innerText(),
    'What security requirement should be checked?',
    'blank Guided prompt should come from the version-pinned SCAP-NG authoring vocabulary');
  const availablePlatforms=await page.locator('#blank-platform option:not([disabled])').evaluateAll(es=>es.map(e=>e.value));
  assert.deepEqual(availablePlatforms,['linux','windows'],
    'platform must be the first available choice; macOS/Solaris are visibly unsupported in this Guided pilot');
  await page.locator('#blank-platform').selectOption('linux');
  assert.equal(await page.locator('#blank-goal').inputValue(),'',
    'the security goal must not prepopulate a RHEL example');
  assert.equal(await page.locator('#blank-id').inputValue(),'');
  await page.locator('#blank-goal').fill('The audit log must be owned by root and not writable by others');
  assert((await page.locator('#blank-id').inputValue()).startsWith('custom.the-audit-log'),
    'a meaningful editable Assessment ID should derive from the goal');
  await page.locator('#blank-create button[type="submit"]').click();
  assert((await page.locator('#content').innerText()).includes('Incomplete draft: no Tests yet'),
    'blank Assessment must not invent a pass/fail test or fake not_applicable');
  const genericCaps=await page.locator('#generic-capability option').allTextContents();
  assert.equal(genericCaps.length,3,'Linux Guided only exposes the three pinned Linux-compatible forms');
  assert(genericCaps.some(x=>x.includes('unix.symlink')));
  assert(genericCaps.some(x=>x.includes('unix.file')));
  assert(!genericCaps.some(x=>x.includes('windows.registry')),
    'Windows Registry must not appear under the Linux target platform');
  assert.equal(await page.locator('#generic-platform').inputValue(),'linux');
  assert(genericCaps.some(x=>x.includes('Read Windows Registry settings')),
    'registry capability description must come from shared SCAP-NG vocabulary');
  assert((await page.locator('label[for="generic-capability"]').innerText()).includes('Which capability'),
    'capability prompt should use shared source terminology');
  await page.locator('#generic-check-title').fill('Audit log owned by root');
  assert.equal(await page.locator('#generic-check-id').inputValue(),'audit-log-owned-by-root-test');
  await page.locator('#generic-capability').selectOption('unix.file');
  await page.locator('#generic-path').fill('/var/log/audit/audit.log');
  await page.locator('#generic-field').selectOption('owner_uid');
  await page.locator('#generic-value').fill('0');
  await page.locator('#generic-add-test button[type="submit"]').click();
  assert.equal(await page.locator('.generic-check').count(),1);
  const addState=page.locator('.generic-add-state').first();
  await addState.locator('[data-generic-field-for]').selectOption('other_write');
  assert.equal(await addState.locator('[data-generic-value-host] select').inputValue(),'false',
    'file Boolean fields should use true/false dropdowns from pinned type vocabulary');
  await addState.locator('button[type="submit"]').click();
  assert.equal(await page.locator('.generic-state-row').count(),2,
    'multiple States must be editable against the same unix.file Item');
  await page.locator('#generic-check-title').fill('Required security notice appears in issue');
  await page.locator('#generic-capability').selectOption('independent.textfilecontent54');
  await page.locator('#generic-path').fill('/etc/issue');
  await page.locator('#generic-line').fill('Authorized use only (test).');
  await page.locator('#generic-add-test button[type="submit"]').click();
  assert.equal(await page.locator('.generic-check').count(),2,
    'checks using two different capabilities can coexist');
  const rename=page.locator('[data-generic-rename]').last();
  await rename.fill('issue-required-security-notice-test');
  await rename.press('Tab');
  assert.equal(await page.locator('#generic-logic').inputValue(),'all');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#generic-logic').selectOption('any');
  await page.locator('[data-view="source"]').click();
  const genericYaml=await page.locator('#rawyaml').inputValue();
  const generic=await page.evaluate(raw=>window.jsyaml.load(raw),genericYaml);
  const ga=generic.assessment,gt=ga.tests;
  assert.equal(ga.assessment_title,'The audit log must be owned by root and not writable by others');
  assert.equal(Object.keys(gt).length,2);
  assert.deepEqual(ga.evaluate.any.map(x=>x.test),Object.keys(gt),
    'AND/OR and Test rename must preserve exact check references');
  const owner=gt['audit-log-owned-by-root-test'];
  assert.equal(owner.capability,'unix.file');
  assert.equal(owner.object.select.full_path.equals,'/var/log/audit/audit.log');
  assert.equal(owner.states_match,'all');
  assert.deepEqual(owner.states.map(x=>Object.values(x)[0].equals),[0,false]);
  assert.equal(gt['issue-required-security-notice-test'].capability,'independent.textfilecontent54');
  assert.equal(gt['issue-required-security-notice-test'].states[0].text.equals,'Authorized use only (test).');
  assert(gt['issue-required-security-notice-test'].object.select.pattern.matches_regex.includes('\\('),
    'literal punctuation must be escaped in the object selector regex');
  await page.locator('[data-view="guided"]').click();
  assert.equal(await page.locator('.generic-check').count(),2,
    'new draft must roundtrip back from YAML to Guided');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-generic-remove-test="issue-required-security-notice-test"]').click();
  await page.locator('[data-view="source"]').click();
  const afterRemoval=await page.evaluate(raw=>window.jsyaml.load(raw),await page.locator('#rawyaml').inputValue());
  assert.deepEqual(Object.keys(afterRemoval.assessment.tests),['audit-log-owned-by-root-test']);
  assert.equal(afterRemoval.assessment.evaluate.test,'audit-log-owned-by-root-test',
    'removing one Test must collapse the expression without dangling references');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => document.querySelectorAll('.stig-toggle').length >= 4, {timeout:45000});
  await page.locator('[data-standalone="'+ga.id+'"]').click();
  assert(await page.locator('#generic-add-test').isVisible(),
    'reload must restore blank-authoring mode rather than falling back to the old RHEL preset');
  assert.equal(await page.locator('.generic-check').count(),1,
    'localStorage reload must preserve the author-created check and its safe expression');

  // Linux authoring stays Linux-only, including after localStorage reload.
  assert.equal(await page.locator('#generic-platform').inputValue(),'linux');
  assert(await page.locator('#generic-platform').isDisabled(),
    'platform cannot be switched while any authored Test would be affected');
  assert.equal(await page.locator('#generic-capability option[value="windows.registry"]').count(),0);
  await page.locator('#generic-check-title').fill('The editor link resolves to an approved binary');
  await page.locator('#generic-capability').selectOption('unix.symlink');
  await page.locator('#generic-path').fill('/etc/alternatives/editor');
  await page.locator('#generic-field').selectOption('canonical_path');
  await page.locator('#generic-value').fill('/usr/bin/vim.basic');
  await page.locator('#generic-add-test button[type="submit"]').click();
  assert.equal(await page.locator('.generic-check').count(),2);
  await page.locator('#generic-check-title').fill('Second security notice exists');
  await page.locator('#generic-capability').selectOption('independent.textfilecontent54');
  await page.locator('#generic-path').fill('/etc/issue.net');
  await page.locator('#generic-line').fill('Use of this system is monitored.');
  await page.locator('#generic-add-test button[type="submit"]').click();
  assert.equal(await page.locator('.generic-check').count(),3);

  // A nested branch must serialize real all/any, not flatten State requirements.
  assert.equal(await page.locator('[data-generic-pair]').count(),1);
  await page.locator('[data-generic-pair]').selectOption('1');
  await page.locator('[data-generic-nest]').click();
  await page.locator('[data-view="source"]').click();
  const nested=await page.evaluate(raw=>window.jsyaml.load(raw),await page.locator('#rawyaml').inputValue());
  assert.equal(nested.assessment.evaluate.all.length,2);
  assert.equal(nested.assessment.evaluate.all[0].test,'audit-log-owned-by-root-test');
  assert.deepEqual(nested.assessment.evaluate.all[1].any.map(x=>x.test),[
    'the-editor-link-resolves-to-an-approved-binary-test','second-security-notice-exists-test'
  ],'Linux authoring preserves A AND (B OR C) without Windows capability');
  await page.locator('[data-view="guided"]').click();
  const branch=page.locator('[data-generic-group-op]');
  assert.equal(await branch.count(),1);
  page.once('dialog',dialog=>dialog.accept());
  await branch.selectOption('all');
  await page.locator('[data-view="source"]').click();
  const reordered=await page.evaluate(raw=>window.jsyaml.load(raw),await page.locator('#rawyaml').inputValue());
  assert.equal(reordered.assessment.evaluate.all[1].all.length,2);
  await page.locator('[data-view="guided"]').click();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-generic-group-op]').selectOption('any');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-generic-remove-test="second-security-notice-exists-test"]').click();
  await page.locator('[data-view="source"]').click();
  const pruned=await page.evaluate(raw=>window.jsyaml.load(raw),await page.locator('#rawyaml').inputValue());
  assert.deepEqual(pruned.assessment.evaluate.all.map(x=>x.test),[
    'audit-log-owned-by-root-test','the-editor-link-resolves-to-an-approved-binary-test'
  ],'nested removal must retain the Linux-only Test references');

  // Windows is a fresh platform-scoped Assessment, not an accidental cross-OS Test.
  await page.locator('#new-assessment').click();
  assert(await page.locator('#blank-platform').isVisible());
  await page.locator('#blank-platform').selectOption('windows');
  await page.locator('#blank-goal').fill('Windows Registry security mode must be a string');
  await page.locator('#blank-create button[type="submit"]').click();
  assert.equal(await page.locator('#generic-platform').inputValue(),'windows');
  assert.deepEqual(await page.locator('#generic-capability option').evaluateAll(es=>es.map(e=>e.value)),
    ['windows.registry'],'Windows Guided must not offer unix.file, unix.symlink or Linux textfilecontent54');
  await page.locator('#generic-check-title').fill('Registry setting uses string type');
  await page.locator('#generic-capability').selectOption('windows.registry');
  assert(await page.locator('#generic-registry-group').isVisible());
  assert.equal(await page.locator('#generic-path-label').innerText(),'Windows Registry key');
  await page.locator('#generic-hive').selectOption('local_machine');
  await page.locator('#generic-path').fill('SOFTWARE\ExampleVendor\Security');
  await page.locator('#generic-registry-name').fill('SecurityMode');
  await page.locator('#generic-field').selectOption('type');
  const registryMap=await page.evaluate(async()=>{
    const c=window.SCAPNG_GUIDED_MAPPINGS;
    const response=await fetch('https://raw.githubusercontent.com/'+c.repository+'/'+c.revision+
      '/schema/v0.4.0/capability-mappings/supported/windows.registry.json');
    return response.json();
  });
  assert.deepEqual(await page.locator('#generic-value option').evaluateAll(es=>es.map(e=>e.value)),
    registryMap.native.state_value_enums.type,'registry storage types must exactly match the pinned mapping');
  assert((await page.locator('#generic-field option:checked').innerText()).includes('Registry storage type'));
  assert((await page.locator('#generic-registry-type-help').innerText()).includes(
    registryMap.native.field_datatypes.value.join(', ')));
  await page.locator('#generic-value').selectOption('string');
  await page.locator('#generic-add-test button[type="submit"]').click();
  assert(await page.locator('#generic-platform').isDisabled(),
    'Windows platform cannot change after creating a Registry Test');
  const regForm=page.locator('[data-generic-add-state="registry-setting-uses-string-type-test"]');
  await regForm.locator('[data-generic-field-for]').selectOption('hive');
  await regForm.locator('[data-generic-value-host] select').selectOption('local_machine');
  await regForm.locator('button[type="submit"]').click();
  await page.locator('[data-view="source"]').click();
  const winYaml=await page.evaluate(raw=>window.jsyaml.load(raw),await page.locator('#rawyaml').inputValue());
  assert.deepEqual(Object.values(winYaml.assessment.tests).map(x=>x.capability),['windows.registry']);
  const reg=winYaml.assessment.tests['registry-setting-uses-string-type-test'];
  assert.equal(reg.object.select.hive.equals,'local_machine');
  assert.equal(reg.object.select.key.equals,'SOFTWARE\ExampleVendor\Security');
  assert.equal(reg.object.select.name.equals,'SecurityMode');
  assert.equal(reg.states[0].type.equals,'string');
  assert.equal(reg.states[1].hive.equals,'local_machine');
  assert.equal(reg.states_match,'all');
  await page.locator('[data-view="guided"]').click();
  await page.locator('[data-generic-reg-name]').fill('SecurityModeUpdated');
  await page.locator('[data-generic-reg-name]').press('Tab');
  await page.locator('[data-view="source"]').click();
  const winChanged=await page.evaluate(raw=>window.jsyaml.load(raw),await page.locator('#rawyaml').inputValue());
  assert.equal(winChanged.assessment.tests['registry-setting-uses-string-type-test'].object.select.name.equals,
    'SecurityModeUpdated');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => document.querySelectorAll('.stig-toggle').length >= 4,{timeout:45000});
  await page.locator('[data-standalone="'+winYaml.assessment.id+'"]').click();
  assert.equal(await page.locator('#generic-platform').inputValue(),'windows',
    'platform survives reload and still filters available capabilities');
  assert.equal(await page.locator('#generic-capability option[value="unix.file"]').count(),0);

  // Original RHEL walkthrough remains optional and separate from blank flow.
  await page.locator('#new-assessment').click();
  await page.locator('#try-example').click();
  assert(await page.locator('#standalone-create').isVisible(),'RHEL example remains explicitly opt-in');
  assert(await page.locator('#standalone-create').isVisible(),'standalone creation must not require a STIG');
  assert.deepEqual(await page.locator('#create-capability option:not([disabled])').allTextContents(),
    ['Read and match text in a file — independent.textfilecontent54'],
    'the first Guided preset must only enable a supported capability');
  assert.equal(await page.locator('#create-source-title').inputValue(),
    'Read RHEL login banner in /etc/issue',
    'source description must be capability-specific and editable');
  await page.locator('#create-file').fill('/etc/issue.net');
  assert.equal(await page.locator('#create-source-title').inputValue(),
    'Read RHEL login banner in /etc/issue.net',
    'changing the target refreshes an untouched capability-derived source name');
  await page.locator('#create-file').fill('/etc/issue');
  await page.locator('#create-line').fill('Authorized users only. (Example+)');
  await page.locator('#standalone-create button[type="submit"]').click();
  assert((await page.locator('#crumb').innerText()).includes('MY ASSESSMENTS'),'new Assessment must be independent');
  await page.locator('[data-step="1"]').click();
  assert.equal(await page.locator('input[aria-label="File to inspect"]').inputValue(),'/etc/issue');
  await page.locator('[data-step="2"]').click();
  await page.locator('#banner-line').fill('Required banner text. (Revised+)');
  await page.locator('#banner-line').press('Tab');
  await page.locator('[data-view="source"]').click();
  const standaloneYaml=await page.locator('#rawyaml').inputValue();
  const standalone=await page.evaluate(yaml=>window.jsyaml.load(yaml),standaloneYaml);
  const standaloneTest=standalone.assessment.tests['rhel-login-banner-required-line-test'];
  assert.equal(standaloneTest.capability,'independent.textfilecontent54');
  assert.equal(standaloneTest.object.select.full_path.equals,'/etc/issue');
  assert.equal(standaloneTest.object.object_title,'Read RHEL login banner in /etc/issue',
    'inline Object keeps its meaningful source title without inventing a shared Object ID');
  assert.equal(standaloneTest.states[0].text.equals,'Required banner text. (Revised+)');
  assert(standaloneTest.object.select.pattern.matches_regex.startsWith('^Required banner text'));
  assert.equal(standaloneTest.require,'at_least_one_exists_and_all_match');
  assert.equal(standaloneTest.object.collect.multiline,true);
  assert.equal(await page.locator('[data-standalone="custom.rhel-login-banner-required-line"]').count(),1);
  // Guided complexity gate: three Tests, two capabilities, and three independent
  // unix.file State predicates on one collected file. No STIG is associated.
  await page.locator('#new-assessment').click();
  await page.locator('#try-example').click();
  await page.locator('#create-id').fill('custom.rhel-banner-and-file-protection');
  await page.locator('#create-title').fill('RHEL banner must contain two notices and prevent non-root edits');
  await page.locator('#create-line').fill('Authorized users only.');
  await page.locator('#create-scope').selectOption('protected');
  await page.locator('#create-extra-line').fill('Activity may be monitored.');
  await page.locator('#standalone-create button[type="submit"]').click();
  assert((await page.locator('#crumb').innerText()).includes('MY ASSESSMENTS'),
    'complex standalone draft must not need a STIG Rule');
  assert((await page.locator('#content').innerText()).includes('Checks derived from your goal'),
    'complex draft should explain its components');
  const idsBefore=await page.locator('[data-rename-test]').evaluateAll(es=>es.map(e=>e.value));
  assert.equal(idsBefore.length,3,'complex draft must display three editable Test names');
  await page.locator('[data-rename-test]').first().fill('rhel-banner-authorized-notice-test');
  await page.locator('[data-rename-test]').first().press('Tab');
  await page.locator('[data-step="1"]').click();
  assert((await page.locator('#content').innerText()).includes('unix.file'),
    'file protection prompts must come from the selected unix.file capability');
  await page.locator('#multi-path').fill('/etc/issue.net');
  await page.locator('#multi-path').press('Tab');
  await page.locator('[data-step="2"]').click();
  assert.equal(await page.locator('[data-multi-line]').count(),2,
    'two independent text checks must have separate, editable required lines');
  await page.locator('[data-multi-line]').last().fill('All connections may be monitored.');
  await page.locator('[data-multi-line]').last().press('Tab');
  assert.equal(await page.locator('select[aria-label="Group may write"]').inputValue(),'false');
  assert.equal(await page.locator('select[aria-label="Others may write"]').inputValue(),'false');
  assert.equal(await page.locator('select[aria-label="How should conditions on the same file combine?"]').inputValue(),'all');
  await page.locator('[data-step="3"]').click();
  assert.equal(await page.locator('#multi-logic').inputValue(),'all');
  await page.locator('[data-view="source"]').click();
  const multiYaml=await page.locator('#rawyaml').inputValue();
  const complex=await page.evaluate(x=>window.jsyaml.load(x),multiYaml);
  const multi=complex.assessment,all=multi.evaluate.all;
  assert.equal(Object.keys(multi.tests).length,3);
  assert.deepEqual(Object.values(multi.tests).map(x=>x.capability),
    ['independent.textfilecontent54','independent.textfilecontent54','unix.file']);
  assert.equal(all.length,3);
  assert.deepEqual(all.map(x=>x.test),Object.keys(multi.tests),
    'renaming the first Test must also update its evaluate reference atomically');
  assert.equal(multi.tests['rhel-login-banner-second-required-line-test'].states[0].text.equals,
    'All connections may be monitored.');
  const permit=multi.tests['rhel-login-banner-file-protection-test'];
  assert.equal(permit.object.select.full_path.equals,'/etc/issue.net');
  assert.equal(permit.states_match,'all','three fields must match the same collected Item');
  assert.deepEqual(permit.states.map(x=>Object.keys(x)[0]),['owner_uid','group_write','other_write']);
  assert.deepEqual(permit.states.map(x=>Object.values(x)[0].equals),[0,false,false]);
  assert.deepEqual(Object.values(multi.tests).map(t=>t.object.select.full_path.equals),
    ['/etc/issue.net','/etc/issue.net','/etc/issue.net']);
  assert.equal(permit.require,'at_least_one_exists_and_all_match');
  await page.locator('[data-view="guided"]').click();
  await page.locator('[data-step="0"]').click();
  assert((await page.locator('#content').innerText()).includes('Checks derived from your goal'),
    'complex draft must render back in Guided after round-trip');
  await page.locator('[data-step="4"]').click();
  assert((await page.locator('#content').innerText()).includes('2 capabilities, 3 Tests, 5 expected State predicates'),
    'review should distinguish states, Tests and capability count');
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

  assert((await page.locator('#test-inspector .combined-check').innerText()).includes('What must be true'), 'matching condition must be editable alongside collection');
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
  assert(await page.locator('p.warning').filter({ hasText: 'NOT CONNECTED' }).first().isVisible(), 'sample panel must not imply a scanner');
  assert(await page.locator('.sample-mock button').isDisabled(), 'sample evaluation must remain disabled');

  await openRule('SV-257851');
  assert((await page.locator('#test-inspector .combined-check').innerText()).includes('mounted filesystem entries'), 'simple collection should use a human term');
  assert.equal(await page.locator('#test-inspector .predicate-value').inputValue(),'nosuid','matching value should be in the editable input');
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
  assert((await page.locator('#test-inspector .shellcommand-panel').innerText()).includes('comes from the Variable'), 'Apache command source must be identified');
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
  assert.equal(await page.locator('#test-inspector .record-fields input[data-rename-key]').first().inputValue(),'tpmpresent',
    'nested record fields must be visible and editable without expanding the source tree');
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
  await page.locator('.manual-assessment').waitFor({state:'visible',timeout:15000});
  assert(await page.locator('.manual-assessment').isVisible(),'manual-only Rule should show its authored procedure');
  assert((await page.locator('#manual-procedure').inputValue()).includes('dnf history'),
    'manual procedure should be directly readable and editable, not an empty automation panel');

  // Desktop and Chromebook layouts should use available horizontal space.
  // Graphical mode keeps logic navigation and the focused Test inspector
  // side-by-side; at narrower widths they intentionally stack.
  await openRule('SV-253495');
  for (const size of [{width:1366,height:768},{width:1920,height:1080}]) {
    await page.setViewportSize(size);
    const tree=await page.locator('.graph-layout .logic-pane').boundingBox();
    const detail=await page.locator('.graph-layout #test-inspector').boundingBox();
    assert(tree&&detail, 'Graphical tree and detail panels must both be present on desktop');
    assert(Math.abs(tree.y-detail.y)<10 && detail.x>=tree.x+tree.width-1,
      size.width+'px desktop: logic tree must sit beside the editable Test inspector');
    const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2);
    assert(noOverflow,size.width+'px desktop layout must not overflow horizontally');
  }
  await page.setViewportSize({width:1024,height:768});
  const compactTree=await page.locator('.graph-layout .logic-pane').boundingBox();
  const compactDetail=await page.locator('.graph-layout #test-inspector').boundingBox();
  assert(compactTree&&compactDetail && compactDetail.y>compactTree.y+compactTree.height-2,
    'compact browser layout stacks graph navigation before the focused Test inspector');
  await page.setViewportSize({width:1440,height:900});

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
