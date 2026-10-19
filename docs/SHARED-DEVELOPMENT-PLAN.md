# Shared Development Plan — SCAP-NG Assessment Editor

**Updated:** 2026-10-18  
**Status:** A **static pre-alpha browser demonstration** is implemented and published via GitHub Pages (18 Oct); a full source-preserving editor, tested SCAP-NG evaluator, interactive agent backend and offline VS Code extension are **not** implemented/validated. New commits must cite real GitHub issues.  
**Repository:** `vanderpol/scap-ng-editor` (`main`)  
**Primary work item:** [Assessment-first MVP #2](https://github.com/vanderpol/scap-ng-editor/issues/2)  
**Queued Codex first slice:** [Source-preserving document core #3](https://github.com/vanderpol/scap-ng-editor/issues/3) — specification ready, **implementation not started or authorized**.  
**External real-source fixtures:** [Pinned r3 six-case manifest](https://github.com/vanderpol/scap-ng-editor-sample-data/blob/main/manifests/pinned-real-stig-fixtures.json) — six real Rules and linked automated Assessments extracted byte-for-byte with [green source/closure gate](https://github.com/vanderpol/scap-ng-editor-sample-data/actions/runs/38833981101).
**Future product decision:** [Full workbench vs. editor entrypoint #1](https://github.com/vanderpol/scap-ng-editor/issues/1)

> **The shared contract for ChatGPT, Codex, and human contributors.** Read this file and root `AGENTS.md` before beginning development. Commit updates to this file alongside meaningful implementation milestones. The **repository** is the communication medium; chat prompts are not the durable project specification. This file is not an autonomous job queue or a signal that a task is running.

## Hierarchy-first / complexity iteration — 18 October 2026

- **STIG-first library / references (18 Oct):** All loads STIG headings that expand to Rules; current pinned fixture coverage is **four STIGs / six Rules**, not the full publication catalog. Source paths provide grouped identity without modifying Rule YAML. All six are confirmed automated; the two RHEL Rules resolve through exact `ng.shared.*` Assessment IDs. Native imported `evaluate.assessment` dependencies expand read-only into their referenced Tests; missing links and cycles are diagnosed, not labeled manual-only. Legacy OVAL `extend_definition` remains an upstream trusted-conversion step and must preserve negation, applicability and provenance. Focused V8 test verified four collapsed headings, six automated links, two shared Assessments, read-only dependency traversal and missing/cycle diagnostics. Chrome/Pages run remains unverified. Full publisher STIG catalog requires the [preprocessed source-cache #2](https://github.com/vanderpol/scap-ng-editor-sample-data/issues/2), not yet built. [Editor #10](https://github.com/vanderpol/scap-ng-editor/issues/10).
- **Interpreter dropdown (18 Oct):** Plain `collect.shell` values now show a concise dropdown beside the shellcommand using the eight options read from the pinned upstream SCAP-NG 0.4 shellcommand capability mapping, with matching version checks and confirmation. Changes affect only `collect.shell`; command expressions and Variables remain intact. Unsupported/Variable shells and unavailable vocabulary fail read-only. Pinned Apache Bash and DNS PowerShell source-backed focused V8/parsed-YAML checks passed; full Chrome/Pages and preservation of original YAML formatting/comments remain unverified. [#10](https://github.com/vanderpol/scap-ng-editor/issues/10).
- **Inline editing refinement (18 Oct):** Based on owner confusion over Apache `stdout_line` display, simple State requirements now show field, comparison, editable value, and two compact native-backed matching scopes directly in the check card. Comparator changes require confirmation; nested/complex checks remain in detailed editing. Reduced verbose prose to prioritize clarity. Focused V8 source-backed Apache, Linux and Windows checks passed, including separate matching scopes and preservation of unrelated parsed source. Full browser run, scanner conformance and comment-preserving save still unverified. [#10](https://github.com/vanderpol/scap-ng-editor/issues/10).
**Owner direction:** assess progressively harder real source-backed Assessments, improve the editor where it obscures the logic, and use the feedback to evaluate accessibility/adoption potential. [Six-case audit](EDITOR-COMPLEXITY-AUDIT-2026-10-18.md) / [editor issue #10](https://github.com/vanderpol/scap-ng-editor/issues/10).

- **Updated pre-alpha browser-demo:** six instead of two pinned Rule/Assessment pairs; a visible AND/OR/NOT tree is now the default graphical view. Selected Tests now lead with a **unified semantic reading** (Look at → Require → Across collected entries), combining data source and matching expectations rather than forcing authors into separate Object/State panels. The exact nested native structure remains expandable; source-derived inline scalar edits still map to the native path. Item/field scope, reused Tests, shared Objects, Set/foreach and Variable dependencies remain visible. [Owner UX decision and accuracy gate #10](https://github.com/vanderpol/scap-ng-editor/issues/10).
- **Current combined-view evidence:** V8 function-level tests over all six actual pinned source-backed YAML files passed readable collection/requirement/scope generation; parsed YAML round-trip changing one simple State value left its Object selector structurally unchanged. This is **not** byte-for-byte preservation or live-browser usability testing. The present `js-yaml` reserialization can still rewrite formatting/comments; preserving source across graphical edits is an explicit outstanding correctness gate.
- **Shell command discoverability correction (18 Oct):** Selected shellcommand Tests now show the exact authored literal command beside **Look at** (editable draft) or explain that the command is supplied via a Variable, with an expandable source expression. Real pinned Windows DNS PowerShell and Apache Variable-sourced checks passed focused V8 mapping tests. This does **not** resolve dynamic command Variables, run commands, or establish lossless YAML saving; live browser/CI run is not verified. [#10](https://github.com/vanderpol/scap-ng-editor/issues/10).
- **Plain-English scope label correction (18 Oct):** Removed ambiguous “Across collected entries” from the unified panel. Show **How many results are required? → Must be found / Must match** separately, with seven source-value-specific descriptions, clear distinction from the fields within each result, and untouched YAML key/value spelling. V8 smoke checked all seven descriptions and source-backed RHEL nosuid rendering. Chrome/Pages deployments and semantic correctness remain unverified. [#10](https://github.com/vanderpol/scap-ng-editor/issues/10).
- **Editor-only validation evidence:** JavaScript parsed successfully in a V8 syntax check. Function-level smoke verified rendered nested OR, 2 references to one Guests Test, human condition summary, record nesting and shared Object dependency. The `browser-demo/tests/smoke.mjs` script was expanded to all six cases but its full Chrome/GitHub Actions execution is **not verified in this handoff**. Do not represent syntax/debug tests as independent browser, schema or scanner conformance.
- **Sample evaluation intentionally inert:** display placeholders for future typed Items, source status, interpreter execution and six-state trace. Entry/run controls are disabled until the tested SCAP-NG interpreter is integrated. Add/remove/link/unlink controls are only disabled hints until source-preserving structural editing and reference safety exist.
- **Usability verdict:** likely meaningful gain for real moderate Boolean trees, particularly Windows SV-253495; not yet convincing as an easier-than-YAML authoring experience for deeply dependent Apache/DNS/RHEL Sets and Variables. Prioritize context-preserving dependency drilldown and usability tests, not schema changes or more generic form controls.
- **Next objective:** contrast novice-auditor comprehension/time/accuracy for YAML versus graphical view across all six samples, and enhance focus mode/dependency paths before claiming broad adoption benefit. Respect the still-open SCAP-NG 0.4 semantic gate #229 and source-preserving document core #3. Optional future AI Redesign is separately parked in [#11](https://github.com/vanderpol/scap-ng-editor/issues/11), not core delivery.

## Browser demo delivery — 18 October 2026

- **Public browser URL:** https://vanderpol.github.io/scap-ng-editor/ — GitHub Pages deploy [run #39171951937](https://github.com/vanderpol/scap-ng-editor/actions/runs/39171951937) **success** after owner enabled Pages. The static site was deployed from `browser-demo/`; successful deployment is verified from GitHub's own workflow log, though direct remote page rendering could not be independently opened from this runtime.
- **Browser interaction smoke:** [run #39171951894](https://github.com/vanderpol/scap-ng-editor/actions/runs/39171951894) **success**: source-pinned RHEL 9 and Windows 11 Rules/Assessments loaded, Windows OR graph visible, graphical scalar edit reflected in source view, guided and sample modes accessible, phone viewport functional and no browser JS errors.
- Implementation: HTML/CSS/JS client only, MIT-licensed bundled `js-yaml`, official source-pinned **NG research fixtures retrieved from external sample-data repo**, local YAML import/download, prototype Rule search and automation link classification, guided/graphical/source/split/sample panels. No token/AI calls or Python server needed for hosted runtime.
- **Limitations:** only loaded sample Rules indexed (not the planned comprehensive official XCCDF/SCAP cache); browser-side YAML parsing is **not** schema/reference validation; graphical fields currently edit scalar values and reserialize YAML (could change formatting/comments), not round-trip-source-preserving arbitrary structural edits. User-authored sample observations **are not scanner evaluated**. No hosted AI, GitHub writes, live scanner, or offline VS Code deliverable.
- **Hosting portability:** `browser-demo/` assets are relative, with source repo/revision configured in `site-config.js`; later transfer to an approved OVAL Community GitHub repo/domain is an infrastructure/ownership decision, not a rewrite. See [browser-demo README](../browser-demo/README.md).
- GitHub issues: [Board demo #6](https://github.com/vanderpol/scap-ng-editor/issues/6) and [fast UX #8](https://github.com/vanderpol/scap-ng-editor/issues/8). These tests do not release the SCAP-NG #229 semantic gate or establish production scanner equivalence.

**Related sample-text research:** The existing restricted Python mountinfo parser and result reference routines could support pasted configuration examples through a version-pinned test service. General Apache text evaluation and a deployed service remain unimplemented. [Research details](PYTHON-SAMPLE-TEXT-INTEGRATION.md) (issue #4).

## Research checkpoint — AI-first authoring, 18 October 2026

The owner raised an AI-first direction: make a **ChatGPT-style conversational Assessment agent**, with **human proofing and sample-data tests**, a possible principal authoring interface alongside VS Code/standalone. [Research issue #4](https://github.com/vanderpol/scap-ng-editor/issues/4) and [architecture/use-case packet](AI-FIRST-AUTHORING-AGENT.md) document three feasible clients over **one version-pinned source/validation/fixture core**. The agent proposes content and cases; independent deterministic evaluation and authenticated human approval establish separate truth/publishing gates. On personal Plus, new custom GPT creation is currently unavailable, so avoid designing an immediate dependency on that product. **No code implementation, schema promotion, changed stack approval, Codex task or gate reopening is implied.** Existing Assessment-first source preservation and semantic #229 hold remain intact.

## Owner decision — AI authoring, scanner-only validity/result authority (18 October 2026)

AI generates and revises draft Assessments and synthetic sample configuration content for **human review**. Deterministic, version-pinned validation tools may report **syntax/schema/reference diagnostics**. Only a **tested SCAP-NG scanner** supplies verified Assessment true/false/unknown/error/not-evaluated/not-applicable outcomes—whether the input is sample data or real evidence. **The Python result reference implementation is not itself a qualified scanner.** Until scanner coverage exists, label the Assessment **NOT SCANNER-VERIFIED / RESULT UNAVAILABLE**; do not let the AI or a development fixture masquerade as a valid result. This supersedes exploratory earlier descriptions of a Python sandbox delivering editor verdicts. Tracked in [#4](https://github.com/vanderpol/scap-ng-editor/issues/4) and [SCAP-NG #241](https://github.com/vanderpol/scap-ng/issues/241). No new compiler/editor implementation has been authorized.

## Evaluation-only scanner mode for the editor (owner refinement, 18 October)

The owner identified a more efficient separation: the editor supplies typed sample values/Items, while **the real scanner's tested evaluation core** evaluates them, with *no native OS collectors required by the editor*. This follows the design precedent of OVAL 5.12.3 `independent:variable_test`, which compares supplied variable values against State criteria; it does not mean every Assessment can be rewritten as a variable test.

See the [versioned, source-backed evaluation-core contract](https://github.com/vanderpol/scap-ng/blob/main/research/assessment-simplification/english-first-04/SCANNER-EVALUATION-CORE-FOR-EDITOR.md) and [SCAP-NG #241](https://github.com/vanderpol/scap-ng/issues/241). The **same tested scanner evaluator** must be callable from real scanner and synthetic fixture paths, preserving scope/Item flags, comparisons, records, field existence, Variable, Set/Filter/foreach and six-state Test/Assessment logic. Human-provided samples bypass actual collection *only*. The existing Python reference models are testing inputs/oracles, **not** yet this qualified shared scanner kernel. Result UI shall explicitly say “scanner-verified on supplied evidence” only after that evaluator meets the conformance gate for the specific capability; never claim a live host was checked. The AI remains authoring-only, and this is **research, not an implementation assignment**.

**Board-demo materials:** [version-bound conversational agent charter](BOARD-DEMO-VERSION-BOUND-AGENT-CHARTER.md) and [schema/capability/vocabulary profile contract](AGENT-VERSION-PROFILE-CONTRACT.md). These provide a reusable prompt/reading plan for an existing GitHub-connected chat, **not** a deployed dynamic profile resolver. Tracked in [#6](https://github.com/vanderpol/scap-ng-editor/issues/6).

**Agent release staging (18 October):** [Portable private-test plugin scaffold](../agent-plugin/README.md), [source-backend prior-art modernization contract](ASSESSMENT-PRIOR-ART-REUSE-CONTRACT.md), and [private→public acceptance issue #7](https://github.com/vanderpol/scap-ng-editor/issues/7). The plugin is **source-controlled but not installed**, deployed, scanner-backed or publicly published. Its initial skill is read-only/draft-only and version-bound; source retrieval precedes concise native NG generation.

## Version-adaptive Board demonstration (18 October 2026)

The owner requires a conversational Assessment agent that selects a specific immutable SCAP-NG version and loads its schemas, capabilities, examples and vocabulary. Changes in ordinary naming should refresh the drafting profile, not demand a new agent; changed semantics and migration of existing Assessments still need separate review and scanner evidence. See [agent version profile](AGENT-VERSION-PROFILE-CONTRACT.md) and [October 22 demo #6](https://github.com/vanderpol/scap-ng-editor/issues/6). The October 15 r3 scoped grammar is a labeled research overlay, not an accepted base schema. This is a documented demo requirement, not proof of a working dynamic loader.

## Owner requirement — optional, configurable AI provider (18 October 2026)

The VS Code extension must support user-selected AI providers (Claude, Gemini, Grok, OpenAI and compatible services), approved **offline local models**, and **no AI**. A future public/self-hosted SCAP-NG agent is a possible optional endpoint, not a service currently deployed or required. Consume VS Code's model-provider integration where practical and keep SCAP-NG versioned source/scanner tools separate from the model transport. No cloud upload or required GitHub/Copilot authentication. See [model-neutral contract](MODEL-NEUTRAL-AI-INTEGRATION.md), [#4](https://github.com/vanderpol/scap-ng-editor/issues/4), [#5](https://github.com/vanderpol/scap-ng-editor/issues/5). Research only; semantic gate #229 and implementation hold unchanged.

## Owner requirement — fully offline VS Code extension (18 October 2026)

In addition to the optional ChatGPT agent/connected GitHub modes, **the SCAP-NG editor must ship a genuine air-gapped VS Code extension** that authors can install from VSIX and use with locally provisioned schema/capability/content packs and *no* network, model, token or GitHub connection. Basic authoring, local validation diagnostics, sample fixture creation, diff and export must work offline. Only a **tested local scanner evaluation kernel**, when installed and supported, can produce authoritative sample Assessment outcomes; otherwise results remain NOT SCANNER-VERIFIED. Optional local-model assistance may be offered separately but is not required. This is tracked in [#5](https://github.com/vanderpol/scap-ng-editor/issues/5) and specified in [offline extension contract](OFFLINE-VSCODE-EDITOR-CONTRACT.md); it does not alter the closed implementation gate under [SCAP-NG #229](https://github.com/vanderpol/scap-ng/issues/229) or assign Codex work.

## One-sentence product goal

Build an **Assessment-only SCAP-NG editor** that creates, opens, safely edits, and validates complete automated, manual, and applicability Assessments, with guided editing and a synchronized native YAML/JSON view. It must later plug into a Benchmark → Rule → Assessment authoring workbench without a second editing engine.

### Decisions already made

- **Assessment-first** is the initial product scope; Benchmark metadata, Rule authoring, Profiles, and complete STIG management come later.
- Source YAML/JSON is authoritative. Saving must preserve comments/unknown fields and avoid rewriting unrelated files.
- Schemas and capability data are loaded from pinned external `vanderpol/scap-ng` sources; do not keep a second maintained copy here. Real content test fixtures live in `vanderpol/scap-ng-editor-sample-data`.
- The engine must support the **full native authoring model** eventually, including nested Variables, Sets, Filters, `for_each`, conditionals, records, shared Assessments, and cross-file references. Text-only preservation of unsupported constructs is **not** full structured support.
- Favor assisted source editing with schema-aware completions and contextual structured forms. Do not require a giant drag-and-drop flowchart.
- **0.4 vocabulary and semantics are not ratified.** Keep source syntax/version adapters separate from display concepts. A spelling rename is not permission to change cardinality, missing/error/unknown outcomes, or collection semantics.
- **UI shell remains undecided.** A VS Code extension is recommended as the first low-cost implementation candidate; a standalone GUI is an option built on the same engine, not a separate project or duplicate validator. Do not treat the recommendation as an approved permanent stack.

## How collaborators coordinate

1. **At start of a session:** read `AGENTS.md`, this plan, [MVP requirements](ASSESSMENT-FIRST-MVP.md), [architecture](ARCHITECTURE.md), and current GitHub issues. Check `main` and recent commits to avoid duplicating work; fetch current versions before edits.
2. **Take one well-bounded task:** **every new commit** must cite its relevant GitHub issue (for example, `Refs #2`), including docs, CI, tests and infrastructure. Confirm the issue exists and describes the work before the first commit. Work on `main` under the repository's trunk-based preference; no untracked branches or hidden copies of source content.
3. **Implement and test:** small focused changes, safe no-op edit cases, negative fixtures and precise diagnostics. A test passing does not ratify language semantics, prove OVAL runtime equivalence, or establish scanner conformance.
4. **Update the handoff in the same commit:** move the completed item to **Evidence/Completed**, include specific files/commit/tests and known limitations, and select the next actionable step. If blocked on an owner decision, stop at the decision boundary and record the concrete question.
5. **Avoid concurrent handoff collisions:** only one contributor should update this plan at a time. If another contributor changed it, refetch, reconcile and commit without overwriting their work. Source-code work can proceed in parallel on distinct files with explicit ownership through issues.
6. **Never infer that Codex or ChatGPT has started automatically.** An authorized session reads the repository and proceeds when explicitly invoked. If a workflow is not connected, handoff via the issue and this file; do not promise background execution.

## GitHub issue ↔ commit audit trail

All commits MUST contain a relevant `#<issue number>`, for example `Refs #2`, `Fixes #2` or `Closes #2`. Use `Refs` while the issue remains open; close issues only when their acceptance gates are complete. CI checks commit-message formatting for new pushes to `main`; humans/agents must also verify the issue exists and genuinely describes the change. Keep detailed technical decisions and testing evidence on issues, with a link and short checkpoint in this plan. Avoid meaningless issue-per-commit tickets: split issues by coherent workstream, not by every file.

## External 0.4 schema linkage

The exact schema source, research overlay boundary, pinned-version loader contract, and current implementation status are documented in [SCHEMA-INPUT-CONTRACT.md](SCHEMA-INPUT-CONTRACT.md). **No editor code is linked to the draft schema yet.** The source is `vanderpol/scap-ng/schema/v0.4.0/`; the Joval scoped grammar remains an explicitly separate research overlay. The six-STIG Rule choice closure defect was fixed in [release r3](https://github.com/vanderpol/scap-ng/releases/tag/v0.4.0-joval-meeting-preview-20261015-r3) (2,958/2,958 references resolved, [#230](https://github.com/vanderpol/scap-ng/issues/230) complete). The 0.4 semantic gate [#229](https://github.com/vanderpol/scap-ng/issues/229) remains open; [#230](https://github.com/vanderpol/scap-ng/issues/230) is completed. The separate 0.4 independent YAML/JSON compilation gate is [#232](https://github.com/vanderpol/scap-ng/issues/232). **Only the queued implementation issue #3, not this plan, can define the first Codex slice, and it is not authorization to run it.**

## Current dependency: deeper SCAP-NG 0.4 tests before Codex implementation

**Owner decision, 2026-10-15:** **Do not assign Codex editor coding work yet.** Run a more intensive 0.4 specification/conversion/semantic audit first. The primary evidence-and-gates issue is [SCAP-NG #229](https://github.com/vanderpol/scap-ng/issues/229), related to [schema gate #228](https://github.com/vanderpol/scap-ng/issues/228), [vocabulary #227](https://github.com/vanderpol/scap-ng/issues/227), and [current converter regression #226](https://github.com/vanderpol/scap-ng/issues/226).

- **Already proven:** research candidate 0.4 six-STIG schema/source round-trip and mirrored YAML/JSON authoring values, not execution outcomes.
- **Still to prove:** six-state outcomes across all nested scopes, valid negative and exceptional combinations, if/else vs OVAL Boolean non-equivalence boundaries, foreach/filters/dynamic Variables/records, independent JSON reference resolution/build, and current-main converter fidelity.
- **Gate:** don't start vocabulary-specific forms or generated Assessment semantics until their versioned test/reference contract is reviewed and passed. Source-safe parser design, external schema loading, and interface research are semantically independent but should only be coded when separately authorized.
- **Codex first prototype effort planning:** rough allowance of 1–2 weeks of iterative engineering for a basic assisted editor after this gate; not a guarantee or an ongoing background task.

## October 16 readiness checkpoint (planning, not coding)

- **Meeting input:** [Joval one-page agenda and real examples](https://github.com/vanderpol/scap-ng/blob/main/research/assessment-simplification/compact-authoring-04/JOVAL-MEETING-2026-10-16.md), with explicit source-vs-candidate limitations. Outcomes may revise the schema adapter but must not silently rewrite this editor's authoring grammar.
- **Green upstream:** [0.4 independent JSON-only static/schema/reference gate](https://github.com/vanderpol/scap-ng/actions/runs/38830995691) on r3: 4,001 JSON documents, 872 **unique** automated Assessments and 1,375 native Test nodes, 2,958 Rule-choice links closed. [0.3 six-anchor current converter and downstream compilation](https://github.com/vanderpol/scap-ng/actions/runs/38829943744) green.
- **Not green by inference:** source-equivalent 0.4 native YAML/JSON bundle compilation ([#232](https://github.com/vanderpol/scap-ng/issues/232)), independent runtime scanner semantics, or owner-approved normative Test/group/field vocabulary ([#227](https://github.com/vanderpol/scap-ng/issues/227), [#229](https://github.com/vanderpol/scap-ng/issues/229)).
- **Hand off when authorized:** give Codex **editor issue [#3](https://github.com/vanderpol/scap-ng-editor/issues/3)**, this living plan, and `AGENTS.md`. The initial outcome is a source-preserving, version-pinned headless Assessment document core with real external fixtures, **not** an opinionated 0.4 GUI or converter.
- **Fixtures source gate: PASS** — [r3 sample manifest](https://github.com/vanderpol/scap-ng-editor-sample-data/blob/main/manifests/pinned-real-stig-fixtures.json), [run 38833981101](https://github.com/vanderpol/scap-ng-editor-sample-data/actions/runs/38833981101): six archived real Rules and six linked automated Assessment documents (including shared source), exact copied bytes, verified release SHA-256, seven negative/positive extractor tests. **These are upstream fixture-generation tests, not editor round-trip, 0.4 compiler or scanner tests.**

## Current milestone: safe editor foundations

**Goal:** a version-agnostic foundation that can load, edit, save and diagnose real native Assessments without losing data. The emphasis is proving correct round trips and establishing integration points before building graphical behavior.

| Step | Status | Deliverable and acceptance gate |
| --- | --- | --- |
| 0. Shared project handoff | **Done — documentation only** | This plan, link from `AGENTS.md`/README, issues #1/#2, and new-commit issue-ID check |
| 1. Confirm UI host and library boundaries | **Decision pending; 0.4 testing first** | Owner approves whether to start as VS Code extension; no finalized UI shell assumed |
| 2. Source-safe YAML/JSON document services | **Not started** | Preserve untouched source, comments/unknown keys where supported; no-op open/save is byte-for-byte; explicit, localized edits only |
| 3. External versioned schemas and diagnostics | **Not started** | Pin selected `scap-ng` schema; classify syntax vs schema vs semantic/reference diagnostics with source location; invalid documents stay editable |
| 4. Project reference and dependency index | **Not started** | Navigate identities/references, report missing targets/cycles; handle reusable/shared Assessments and nested graphs |
| 5. Assisted editor and generation UI | **Not started** | Property tree and expert YAML/JSON operate on one source; valid completions; one vetted pattern generates an editable draft, no guessed semantic defaults |
| 6. Integration and corpus validation | **Not started** | Easy and hard real-source fixtures pass round-trip and negative tests; report scope/coverage, not unsupported scanner results |

### Next safe executable engineering task (independent of UI shell)

**Implement or prototype the source-preserving document abstraction with focused tests.** Define its API contract before selecting the UI wrapper: `open`, `read`, `applySurgicalEdit`, `save`, and `getDiagnostics` (these are illustrative interface responsibilities, not mandated source code identifiers). Prove:
- a no-op open/save leaves existing YAML bytes unchanged;
- edits do not rewrite siblings, rename unrelated IDs, or drop comments/unknown fields;
- invalid YAML stays editable and retains precise parse diagnostics;
- JSON and YAML round-trip *without silently normalizing or changing meaning*;
- the active schema version is attached without hard-coded 0.4 names.

Use **fixtures from the external sample-data repository**, not copied snapshots of the SCAP-NG corpus committed here. Narrow the tests first, then widen to production examples. Do not begin an opinionated capability form before semantics and snapshot mapping are approved.

**First demonstration corpus:** verified r3 source-backed RHEL9 `SV-257851`/`SV-257889`, Windows11 `SV-253254`/`SV-253495`, Apache `SV-214228`, and DNS `SV-259345` now reside in the [external fixture manifest](https://github.com/vanderpol/scap-ng-editor-sample-data/blob/main/manifests/pinned-real-stig-fixtures.json). Add more fixtures for multi-Assessment dependency editing when necessary. Keep the pinned 0.4 Joval candidate clearly labeled non-normative.

## Evidence / completed

- 2026-10-15: Research/design scope and Assessment-first plan documented. All new commits require a relevant GitHub issue ID; added a syntax-only CI gate. No editor application implementation or editor test results claimed. [Issue #2](https://github.com/vanderpol/scap-ng-editor/issues/2).

## Open owner decisions

- **UI host for first runnable client:** proceed with VS Code extension as recommended, or use a small standalone shell? This choice should not change source/model contracts.
- **Vocabulary and semantic promotion:** approved 0.4 schema will govern generation and validators; until then load explicitly pinned snapshots and present candidate-only labels.
- **Authoring generation:** vetted deterministic patterns first; optional AI and prose-to-Assessment inference later, with marked unanswered author questions and no automatic publication.

## Related materials

- [Assessment-first MVP](ASSESSMENT-FIRST-MVP.md)
- [Architecture and three long-term modes](ARCHITECTURE.md)
- [UI implementation tradeoffs](EDITOR-IMPLEMENTATION-RECOMMENDATION.md)
- [External test corpus](https://github.com/vanderpol/scap-ng-editor-sample-data)
- [SCAP-NG 0.4 design / six-STIG preview](https://github.com/vanderpol/scap-ng/releases/tag/v0.4.0-joval-meeting-preview-20261015-r3)

**Durability rule:** keep this concise enough to be read at the start of each coding session; detailed acceptance criteria and work discussion belong in GitHub issues and tests. Never mark an item complete without an implementation link and evidence.
