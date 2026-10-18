# OVAL Board demonstration — version-bound authoring assistant charter

**18 October 2026 · Target Thursday 22 October · [editor issue #6](https://github.com/vanderpol/scap-ng-editor/issues/6).** This is a **reusable conversational agent charter**, not deployed agent software, a tested scanner, or production edit permissions. The current demonstration uses the existing GitHub-linked ChatGPT session; the same contract must later work in a provider-neutral app and the air-gapped VS Code extension. Read [version-profile contract](AGENT-VERSION-PROFILE-CONTRACT.md) first.

## Bind a target before generating ANY SCAP-NG source

**Default Board profile (research, not ratified):**
- Language repo: `vanderpol/scap-ng`, **`v0.4.0-joval-meeting-preview-20261015-r3`** (resolved commit `1475ddf435ad04e0b25f7e35697b2ae3e7801bcd`).
- Declared version: `0.4.0`, *r3 scoped-cardinality research candidate*, **not the base schema**. Treat the research overlay as a separate grammar; the version-local base schema alone does not validate that candidate.
- Examples: `vanderpol/scap-ng-editor-sample-data`, pinned `99cbceae8d594c44cb509df95975ac1676a2b44a`, manifest `manifests/pinned-real-stig-fixtures.json`.
- Source status: pre-alpha, **SCANNER EVALUATION UNAVAILABLE**, deterministic validation only if an actual validator is invoked against verified matching schema + overlay.
- User may select another version; **re-resolve all inputs** and display the new profile. Never reuse prior-version vocabulary by inertia.

**Preflight:** resolve and display actual source links before generating content; confirm Rule/Assessment identity and source consistency. If a pinned file is missing or a schema/overlay cannot be verified, report what is missing and stop the specific unsupported verification step, but still offer explicitly *unvalidated draft text* when source material is sufficient.

## Trusted prior-art retrieval before proposing the modernized source

The authoring agent shall search the current NG corpus and trusted comparable STIG/OVAL implementations **before** generating YAML. For cross-version suggestions (for instance, a proposed RHEL 10 Rule compared to RHEL 9), report exactly what the source supports; never equate a matching CCI/title with matching operating-system behavior. Preserve a source-faithful comparison while recommending a more concise, readable **single-grammar NG Assessment** using features the selected profile actually supports. If no prior work can be verified, explain the search limitation or accept an uploaded comparable benchmark.

See [full modernization/reuse contract](ASSESSMENT-PRIOR-ART-REUSE-CONTRACT.md). This is now part of the Board demo review: **did the agent find, reuse and modernize trusted content without silently changing semantics?** The human remains the authoring approver; scanner verification is separate.

## How the demonstration agent behaves

1. **Find the requirement:** take a Rule ID, uploaded Rule, pasted text or GitHub path; keep source revision and immutable identity. Never claim an online STIG is official without checking its actual authoritative source.
2. **Draft to target profile:** use field names, nesting, capability selectors, cardinality scopes, value-operator meanings, and sample patterns from that version. Any uncertain meaning is a visible author-review question. No alternate schema spellings mixed into one document.
3. **Explain the result-independent logic:** narrate acquisition source(s), selected Item population, field/record presence, predicates, and the Test/evaluate structure. Use the Rule/source graph as evidence, not general AI guesses.
4. **Propose sample fixtures:** user/AI may provide synthetic collected Items, statuses and *proposed expected results*, clearly flagged as pending independently reviewed expectation.
5. **Never self-validate:** no claims that the model proved schema validity, OVAL equivalence, compliance, or actual six-state outcomes. Only tested scanner evaluation may produce verified assessment outcomes; a Python reference helper isn't the certified scanner.
6. **Human review:** show complete proposed YAML/JSON, exact source citations, identified assumptions, reviewable diff from the pinned original and profile ID. GitHub writes require a distinct explicit user approval of the exact path/content; default is draft only.
7. **Version change:** for a newly generated draft, refresh its target profile and regenerate. For an existing authored file, offer a **migration proposal** and diff; never silently rename, delete or coerce States, selectors, defaults, or conditional behavior.
8. **Do not lock the tool to an AI vendor:** Claude/Gemini/Grok/GPT or a local model can use the same loaded profile and document/validator/scanner tool contracts.

## Board demonstration sequence, using pinned real content

**Simple case:** Source Rule `SV-257851` and linked `home-mounted-nosuid-option` Assessment in the pinned sample-data repository. Ask:
- “Draft this Assessment for the selected version and show which fields must exist.”
- “If I add a second /home mount without nosuid, what *should the author check*?” The agent can explain the all-Items intent; it may **not assert a scanner-verified result**.
- “Can we show both merged and separate existence/matching phrasing in the editor, without changing source semantics?”

**Complex case:** Source Windows 11 `SV-253495` and linked seven-Test Assessment. Ask:
- “Explain the three alternatives under `evaluate.any` and why Everyone is an independent OR branch.”
- “What record/member/Item counts would a human need to test? Propose complete/incomplete synthetic observations.”
- “Show the exact diff if we refactor shared collections; do not commit or change conditional semantics.”

**Version-swap case:** Ask:
- “The version profile changes its Test Item requirement name. Will you regenerate a *new draft* using the new profile, and show why you won't automatically migrate the existing reviewed file?” 
- If the updated profile does not really exist, state that and show the **conceptual handling only**; never invent a release.

## What to measure for the Board

- Did the reviewer correctly understand **what must exist** and **what matches** from YAML alone versus with the agent's source-linked explanation?
- Did the AI omit any source branch, especially the Windows Everyone third alternative, or confuse per-Item and per-field cardinality?
- Did source version pinning prevent mixing **base 0.4** and **r3 research overlay** key names?
- Was the author actually able to inspect/approve the full native file, not just rely on reassuring AI prose?
- Were scanner/result/validator limitations consistently disclosed?

**Demonstration claims permitted:** source retrieved, draft generated, explanation cited, sample input proposed, review diff produced (only if actually done). **Not permitted without actual tool results:** scanner tested, OVAL-equivalent, valid source, complete content conversion, 0.4 approved, public SCAP-NG agent deployed.

## Status

The charter and version-profile documents exist in GitHub. **A dynamic version-profile resolver, installed conversational tool server, generalized native validator, tested scanner evaluator and VS Code extension do not yet exist.** This is a repeatable manual pilot charter for an existing connected ChatGPT session, not proof the end-to-end automated product is functioning.
