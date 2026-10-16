# Shared Development Plan — SCAP-NG Assessment Editor

**Updated:** 2026-10-15  
**Status:** planning and foundation work only; **no editor application has been implemented or validated yet**. New commits must cite real GitHub issues.  
**Repository:** `vanderpol/scap-ng-editor` (`main`)  
**Primary work item:** [Assessment-first MVP #2](https://github.com/vanderpol/scap-ng-editor/issues/2)  
**Queued Codex first slice:** [Source-preserving document core #3](https://github.com/vanderpol/scap-ng-editor/issues/3) — specification ready, **implementation not started or authorized**.  
**External real-source fixtures:** [Pinned r3 six-case manifest](https://github.com/vanderpol/scap-ng-editor-sample-data/blob/main/manifests/pinned-real-stig-fixtures.json) — six real Rules and linked automated Assessments extracted byte-for-byte with [green source/closure gate](https://github.com/vanderpol/scap-ng-editor-sample-data/actions/runs/38833981101).
**Future product decision:** [Full workbench vs. editor entrypoint #1](https://github.com/vanderpol/scap-ng-editor/issues/1)

> **The shared contract for ChatGPT, Codex, and human contributors.** Read this file and root `AGENTS.md` before beginning development. Commit updates to this file alongside meaningful implementation milestones. The **repository** is the communication medium; chat prompts are not the durable project specification. This file is not an autonomous job queue or a signal that a task is running.

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
