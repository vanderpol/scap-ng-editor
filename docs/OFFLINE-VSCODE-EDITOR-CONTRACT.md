# Air-gapped SCAP-NG authoring in VS Code

**18 October 2026 · Owner requirement · [#5](https://github.com/vanderpol/scap-ng-editor/issues/5), alongside [#1](https://github.com/vanderpol/scap-ng-editor/issues/1), [#2](https://github.com/vanderpol/scap-ng-editor/issues/2), [#4](https://github.com/vanderpol/scap-ng-editor/issues/4).** This is an **architecture/research contract, not implementation approval**. An offline-capable VS Code extension is a required client even if an AI-first ChatGPT agent or standalone workbench becomes the primary online interface.

## Non-negotiable: offline authoring is fully usable without AI

The offline extension must support local source import, inspection, Assessment drafting from available reviewed patterns, source-preserving edits, completion, reference navigation, **locally packaged schemas**, diagnostic validation, synthetic sample data, reproducible fixtures, diffs, and local save/export. It shall function without logging into ChatGPT, OpenAI API, GitHub, Marketplace, or an activation/telemetry service. It must not depend on downloading JavaScript, CSS, fonts, schema or binaries after installation.

**AI assistance is optional, not a prerequisite**:
- **Offline without a model:** guided forms, snippets/templates, deterministic completion, local schema/capability descriptions, and trusted local fixtures remain functional. This is the mandatory minimum.
- **Offline with a local model (later):** a separate opt-in, policy-controlled local inference process may propose drafts/explanations, subject to the same human approval and scanner-result boundaries; not a release gate or assumed available model.
- **Online with ChatGPT/hosted model:** another client to the common versioned source/review services, subject to explicit user/network permission; disabled in strict-offline mode.

The authoritative result rule remains: a **tested scanner evaluation kernel** computes sample Assessment results for capabilities it explicitly supports. A language model does not compute them. Existing Python reference truth tables are test oracles, not a validated scanner. If no tested evaluation-only kernel is available locally, allow fixture entry with *expected* states but display **NOT SCANNER-VERIFIED / RESULT UNAVAILABLE**, not a fabricated green check.

## One core with several source and destination choices

Don't build different content engines for GitHub and non-GitHub modes. Treat **source**, **authoring action**, and **destination** as separate choices:

| Independent dimension | Online client possibilities | Strict offline VS Code |
| --- | --- | --- |
| Input source | GitHub Rule/Assessment; current official STIG on cyber.mil; upload/paste; vetted examples | Local checkout, imported uploaded STIG/XCCDF/OVAL/YAML/JSON, paste check text, local sample packs |
| Action | Draft Assessment with AI; review/explain; improve existing; manual-to-automated proposal; create samples; revise/reuse shared source; preview diffs | Open/edit, generate from **reviewed local** patterns, schema-driven forms/completions, navigate source, compare revisions, prepare fixtures, evaluate if local tested kernel installed |
| Output | Download native Assessment/patch; human-approved GitHub change; open in online workbench | Save native files/local Git commit (optional), export patch/zip to carry to another system; later sync by explicit human action |

A person can start online by locating an official STIG, move a signed offline source pack and draft to an air-gapped machine, edit/test there, then transfer a reviewed patch out. **No network-dependent action should be silently invoked** because of an input path or output preference.

## Offline distribution and trust boundary

- **Installation:** package and distribute a reproducible **.vsix** plus an integrity manifest (hash/signature verification policy), provision VS Code itself separately. VS Code supports **Extensions: Install from VSIX** and `code --install-extension <path-to.vsix>` ([official documentation](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace)). Declare supported extension/host runtimes and Windows/Linux/macOS architectures.
- **Pinned data packs:** deliver versioned SCAP-NG schemas, capability definitions, authoring reference, vetted patterns, synthetic fixtures and metadata as external **read-only importable packs**; avoid maintaining a second fork of the authoritative `scap-ng` schema inside the editor repository. Offline means the pack must be physically present, with clear version/hash and supported schema adapters. Warn if a file requires a newer pack.
- **Evaluation executable:** later distribute a tested, compatible scanner **evaluation-only** library/executable through approved offline packages; avoid an implicit PyPI, npm or OS package manager download. Decide whether to bundle a supported local Python runtime, package a standalone native evaluator, or require a separately provisioned compatible runtime. A local runner never needs native collectors merely to evaluate supplied Items.
- **No external assets/services:** no extension-side auto-updates, remote CDN/scripts/fonts, marketplace calls, network telemetry or model-service requests in strict offline mode. Restrict webview asset loading and CSP ([official VS Code API](https://code.visualstudio.com/api/extension-guides/webview)); make remote functions explicit opt-in, not merely hidden UI controls.
- **Workspace safety:** support VS Code Workspace Trust restrictions ([official guide](https://code.visualstudio.com/api/extension-guides/workspace-trust)). An untrusted uploaded STIG may be viewed/edited; don't execute shell/config snippets, tasks, imported code or scanner commands automatically. Disabled or limited trusted-only actions must be identified.
- **Provenance/privacy:** local source fingerprints, human/AI contribution attribution when available, exact modified-file list, exported patch hashes, independently reviewed expected test outcomes, and clear notices before writing anything to a connected repo or transporting sensitive real evidence. **No hidden cloud copy or upload.**

## Example complete first-use path (no Internet)

1. Install VS Code and verified SCAP-NG VSIX from removable media.
2. Import a compatible signed/version-pinned local SCAP-NG schema + capability + reviewed-pattern pack, and a STIG/Assessment file from disk.
3. Choose a Rule and **locally** build/edit its proposed Assessment using the same source-preserving project model as the online agent. A non-AI offline workflow is always offered.
4. See syntax/schema/ref diagnostics and exact source-preserving diff. Fix field cardinality and other authoring mistakes without altering unrelated files.
5. Enter sample collected Items/record values and flags, save expected outcome fixtures, then **run locally only if** the tested scanner evaluation kernel supports that Assessment. Show six-state trace and engine provenance; otherwise display an explicit unavailable/unsupported state.
6. Review changes and save YAML/JSON, local commit, or exported patch/zip for manual transfer. No GitHub connection or model service required.

## Acceptance cases — demonstrate no hidden connectivity

| Test | Pass criterion |
| --- | --- |
| Network interfaces disabled/DNS unreachable | VSIX installation, start, open/edit/save, local diagnostics, fixtures, export all continue without network errors or hanging prompts |
| No AI model, API key or GitHub token | All core editing/validation functions still work; AI actions disabled with honest explanation |
| No separately installed Python | Either packaged evaluator runtime works locally, or scanner-result command is clearly unavailable while authoring still works |
| Missing/mismatched/corrupted data pack | Precise version/integrity error, no inferred schema defaults, no silent downloading |
| Untrusted workspace and hostile STIG text | Browsing is safe; no shell/script execution, remote fetch, prompt injection or unauthorized file writes |
| Unsupported Test/State/Set/record semantics | Explicit unsupported or not-scanner-verified response, never a fabricated Assessment truth |
| Local Git only / no remote | Source-preserving changes, diff, commit and patch export work; no push attempted |
| Policy forbids telemetry | Extension emits no usage/network traffic from its own logic; test under egress-denied fixture network |

**Boundary:** An air-gapped extension supports authors without a deployed AI backend. It is not guaranteed to support *AI generation* offline until an approved local model exists; this is intentional, not a degradation of the core editor.

## Implementation status

No offline VSIX or local scanner evaluator has been built or tested here. The existing [shared development plan](SHARED-DEVELOPMENT-PLAN.md) and semantic gate [SCAP-NG #229](https://github.com/vanderpol/scap-ng/issues/229) still control authorization. This research is tracked in [#5](https://github.com/vanderpol/scap-ng-editor/issues/5). Keep the schema implementation independent of interface and online/offline connectivity choices.
