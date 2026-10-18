# Version-bound SCAP-NG authoring agent

**18 October 2026 · Board-demo research [#6](https://github.com/vanderpol/scap-ng-editor/issues/6), agent research [#4](https://github.com/vanderpol/scap-ng-editor/issues/4).** This is a design contract, **not** an implemented agent, approved 0.4 syntax, compiler migration, scanner-verification claim or authorization for new code.

## Owner requirement: update the SCAP-NG language without redesigning the agent

The author selects **the SCAP-NG language/content snapshot** when starting or opening a session. The agent retrieves a **coherent versioned authoring profile**, checks its integrity and generates proposals against *that particular grammar*. Changing names, field placement, capability enum values and examples should primarily update the profile, not require rewriting prompts or hard-coded code branches.

**Don't embed a frozen `states` vs `expect`, `collected_items_require` vs `require`, `concat` vs `combination`, or `join` vs `merge` decision into the agent's built-in instructions.** The model follows the snapshot's actual schema and human authoring guide. The current 0.4-A scoped field/State grammar is a *research overlay* separate from the base 0.4 draft; neither is automatically authoritative over the other. A potential 0.4-B grammar is another candidate and must not be mixed in.

## What the profile pins

| Component | Source and role | Required behavior |
| --- | --- | --- |
| **Identity** | Repository, immutable tag/commit SHA, declared schema version and status (`draft`, `research-overlay`, `approved`) | Display plainly in conversation, generated headers and human-review packet; `main` is only a browsing source, never a reproducible run pin |
| **Grammar** | Assessment/Rule/Benchmark JSON schemas and all relative `$ref` files | Resolve as one coherent pinned graph; reject foreign-version spelling instead of guessing a conversion |
| **Capability contract** | Capability mapping catalog, selectors, result/Item field types and multiplicities | Only offer supported capability/field shapes; don't invent collectors or optional defaults |
| **Human guidance** | Terminology, authoring conventions, approved examples, relevant decisions and limitations | Explain and generate according to *this version*, not the model's memory of other versions |
| **Candidate overlay** | Explicit separately identified research schema overlay and its accepted transformation rules, when selected | Show `EXPERIMENTAL` prominently; a research grammar must not be labeled the canonical base version |
| **Validation** | Version-appropriate deterministic schema/reference checker, with independently pinned tool build | AI suggests; checker reports syntax/schema; green schema does **not** establish OVAL parity or scanner execution |
| **Evaluation** | Compatible, tested scanner evaluation kernel and its supported version/capability matrix | Author-entered sample Items can be evaluated **only** where that kernel is available/conformant; otherwise `NOT SCANNER-VERIFIED` |
| **Source content** | STIG/XCCDF/OVAL and already reviewed native examples, each with its *own* source ref/commit/hash | Keep version and evidence separate from schema pin; don't confuse a benchmark release with the authoring grammar revision |
| **Output** | Exact selected format/version, provenance and optional diff/upgrade report | Preserve source input revision; no auto-migration or Git writes without user approval |

The profile can be assembled by a loader rather than maintained as a hand-edited second grammar. The source repository must expose enough version-local schema, capability catalog, glossary, examples and limitations to build it.

## Illustrative board-demo profile

This is **not an executable config file**: a real loader would still verify all schema/release files and their contents before calling the profile usable. The tag and SHA below were fetched directly from GitHub on 18 October 2026.

```yaml
# research-only agent binding, no deployed loader implied
profile_id: board-preview-2026-10-22
language:
  repository: vanderpol/scap-ng
  ref: v0.4.0-joval-meeting-preview-20261015-r3
  commit: 1475ddf435ad04e0b25f7e35697b2ae3e7801bcd
  declared_version: "0.4.0"
  status: pre-alpha-research
  schema_root: schema/v0.4.0
  grammar_variant: scoped-state-fields-r3-research-overlay
  overlay: research-only  # MUST resolve and verify actual overlay, not merely assume it
examples:
  repository: vanderpol/scap-ng-editor-sample-data
  commit: 99cbceae8d594c44cb509df95975ac1676a2b44a
  manifest: manifests/pinned-real-stig-fixtures.json
validation:
  rule: deterministic-selected-version-only
  implementation: not_yet_integrated
scanner:
  evaluation_core: not_yet_qualified
  authoritative_sample_result: unavailable
output:
  draft_only: true
  automatic_git_writes: false
```

**Crucial separation:** The r3 sample data and source preview are demonstrably pinned. The research scoped grammar in r3 is not interchangeable with `schema/v0.4.0/assessment.schema.json` by itself; [existing external-schema loader contract](SCHEMA-INPUT-CONTRACT.md) already requires the overlay to be independently labeled and prohibits mixing a baseline and research overlay. The profile itself must record a verifiable **overlay content hash/identifier** before automated validation is possible. A source tag and example manifest alone do **not** make a generated draft schema-valid.

For Board demo repeatability, show the resolved profile details before opening an Assessment. If external repositories are unavailable, use a previously verified local package with the same hashes; **do not silently switch to current `main`**.

## Model-independent authoring protocol

1. **Choose or detect version:** explicit user selection first; when opening an Assessment, read `assessment.specification.version` but do not presume that version uniquely identifies a research dialect. If ambiguous, display the two plausible profiles and require a selection.
2. **Load and verify** the requested snapshot. Check all schema/capability references, version/overlay identity and approved example provenance; refuse incomplete/mixed profiles rather than repair them with model guesses.
3. **Build the agent's working context** from the selected glossary and 2–4 small-to-complex, source-backed examples. The model is a *formatter/drafter* against that contract, not the authority deciding source meaning.
4. **Generate a proposed Assessment** and plain-English rationale, cite original STIG/OVAL evidence, record exact profile ID and all unresolved checks. Existing native files are not overwritten.
5. **Deterministic parse/schema/reference diagnostics** if implemented for that profile. If not, say `VALIDATION NOT AVAILABLE FOR SELECTED PROFILE`; AI must not call its own YAML plausible/valid.
6. **Optional sample data:** author/agent proposes synthetic Items and *expected* states. Only a tested compatible scanner evaluation kernel may supply real Assessment outcome for those supplied Items; until then show `NOT SCANNER-VERIFIED`.
7. **Human reviews** source mapping, exact file diff, schema diagnosis, source/version provenance and evidence status. Downloads/patches are available without GitHub; an approved GitHub commit is an additional explicit action.

## Automatic adaptation versus migration — sharp boundary

| Change between language revisions | Profile-only adaptation likely? | Necessary gate |
| --- | --- | --- |
| Field rename with identical, explicit meaning | **Yes** for *new generation*; preserve older documents | Updated schema/guide, example checks and parse/reference validation |
| Moving a field to a different nesting level | **Often** for new generation, if schema makes it unambiguous | Updated source-backed examples, parser support and diagnostics |
| New optional comparator or capability | **Usually** for model drafting when capability contract describes it | Validator and tested scanner must independently support it before claiming execution |
| `require` moved/scoped and inherited across fields | **Not just a rename** if scope or precedence changes | Explicit semantic tests, inheritance boundaries, record member isolation and human decision |
| `concat` semantics vs `join`/`merge` | Only if source meaning is provably identical for scalar/multi-value inputs | Verify Cartesian product versus one joined string, status/typing/evidence handling |
| Changed default cardinality or `if/else` unknown handling | **No**, not automatic semantics | Versioned decision, migration plan and independent six-state scanner parity evidence |
| Switching completely from 0.4-A to a future 0.4-B | Possibly new profile, **not an implicit lossless upgrade** | Equivalent coverage and explicit source-preserving transformation review |

**Never auto-upgrade already reviewed source files simply because the session selected a newer profile.** Provide versioned *migration proposals* with exact before/after semantics, validator results, source links and explicit human signoff. The agent may automatically format **new drafts** to a selected compatible grammar, not fabricate proof that migrated content is equivalent.

## Board demonstration — use the profile to test whether YAML readability still matters

Start with two pinned actual Rule/Assessment pairs in the sample-data repository:

- [RHEL9 `SV-257851` original Rule](https://github.com/vanderpol/scap-ng-editor-sample-data/blob/99cbceae8d594c44cb509df95975ac1676a2b44a/focused-fixtures/source-backed/authoring/rhel_9/rules/SV-257851.rule.yaml) and [linked Assessment](https://github.com/vanderpol/scap-ng-editor-sample-data/blob/99cbceae8d594c44cb509df95975ac1676a2b44a/focused-fixtures/source-backed/authoring/shared/assessments/linux/other/home-mounted-nosuid-option.assessment.yaml).
- [Windows11 `SV-253495` original Rule](https://github.com/vanderpol/scap-ng-editor-sample-data/blob/99cbceae8d594c44cb509df95975ac1676a2b44a/focused-fixtures/source-backed/authoring/ms_windows_11/rules/SV-253495.rule.yaml) and [linked seven-Test Assessment](https://github.com/vanderpol/scap-ng-editor-sample-data/blob/99cbceae8d594c44cb509df95975ac1676a2b44a/focused-fixtures/source-backed/authoring/ms_windows_11/assessments/automated/SV-253495.automated.yaml).

Ask a reviewer to identify from the **raw Assessment alone** which data is selected, which Item/field populations must exist, and why the Windows `Everyone` OR alternative is independent. Then allow the **agent to explain against pinned source references** and ask the same questions. Record wrong assumptions and how often they need to inspect the actual YAML to approve an edit. This evaluates whether AI truly lowers the language-readability burden rather than merely making a plausible explanation.

## Status and next bounded engineering gate

This contract extends [SCHEMA-INPUT-CONTRACT.md](SCHEMA-INPUT-CONTRACT.md) and [AI-FIRST-AUTHORING-AGENT.md](AI-FIRST-AUTHORING-AGENT.md). **No profile loader, on-demand schema adaptation engine, public agent, offline VSIX or tested full scanner evaluator is currently implemented.** A reusable, repo-held conversational prompt and preverified source packs could support a manual October 22 proof-of-concept. A real dynamically version-aware agent requires a profile resolver with deterministic schema/capability checks and explicit supported overlay/version matrix; that is not safe to pretend has been delivered merely by writing this document.
