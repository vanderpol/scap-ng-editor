# Increasing-complexity usability audit — SCAP-NG browser editor

**18 October 2026 · Design/implementation iteration · [Editor issue #10](https://github.com/vanderpol/scap-ng-editor/issues/10)**

## Question

Does the editor explain and help authors maintain real SCAP-NG Assessments **better than opening YAML**, particularly when the checks become difficult? Could that lower the barrier for security auditors and STIG authors who do not write YAML? This is a **design hypothesis**; no external-author adoption or comprehension study has occurred.

**Fixture authority:** six source-backed, pre-alpha r3 Rule/Assessment pairs from the *external* [pinned real STIG fixture manifest](https://github.com/vanderpol/scap-ng-editor-sample-data/blob/main/manifests/pinned-real-stig-fixtures.json). The browser demo pins sample-data commit `99cbceae8d594c44cb509df95975ac1676a2b44a`, separate from the current official SCAP-NG schema. Do not interpret these as scanner-conformant results or normative 0.4 syntax.

## Six-case graduated evaluation

| Step | Actual Rule / feature | Baseline graphical-view failure | Revised view / remaining hard problem | Design judgment |
| --- | --- | --- | --- | --- |
| 1 | **RHEL9 SV-257851** / one Test, /home mount selector, nosuid State | Flat fields add little beyond short YAML; can't see collection → expected field together | One selected Test now shows collection, States and authored Item requirement within context. A concise one-liner should make it quicker to read, but form editing still reserializes source. | **Potential small gain; not demonstrated** |
| 2 | **Windows11 SV-253254** / one Test with two AND States combined by ANY | Author can't distinguish State alternatives from top-level Test logic | State alternatives remain nested inside one Test; a plain-English summary shows EditionID alternatives and exact field criteria are expandable. | **Promising** |
| 3 | **Windows11 SV-253495** / seven Tests, OR of two AND branches plus Everyone; shared Guests Test; WMI record field | Separate Test cards hide the actual tree and duplicate mental work | Expandable OR/AND tree with Test selection; Guests leaf appears in two branches with one definition; shared Object and record can be inspected. | **Strongest likely improvement** |
| 4 | **RHEL9 SV-257889** / two Tests, for_each, union/difference Sets, nested Object filters and different absence requirements | Flat scalar lists conceal data traversal and root/non-system user differences | Explicit Set/foreach labels and reachable shared Object dependencies; still needs **focused dataflow navigation** and a human summary of how the user sets differ. | **Partial; not yet enough** |
| 5 | **Windows DNS SV-259345** / three-way OR with nested AND, signed zones, 48–168 hour comparisons, command Variables | Standalone cards obscure the top-level alternatives and where parameterized commands come from | Root OR is visible; selected Test shows State bounds, variable chain and named Object dependencies. Still confusing how upstream zone enumeration feeds multiple checks. | **Partial; dependency view needs work** |
| 6 | **Apache SV-214228** / four Tests and many regex/concat/merge/shell Variable dependencies | Long form is at least as difficult as YAML and cannot show cause/effect | Tree explains Test AND, concise State summaries, expanded variable dependencies and collection references. **This remains too complex for a typical new auditor** without a dependency diagram and more intentional groups. | **Insufficient for broad adoption today** |

These judgments are based on inspection of **actual fixture structure and editor implementation**, not observed end-user task completion. A successful GitHub Actions browser smoke establishes basic navigation, **not** comprehension or adoption.

## Iterations

1. **Baseline observed:** `browser-demo/app.js` rendered detached Test cards and a separate evaluate expression; nested Objects/States appeared as flattened input stacks. This can be worse than YAML.
2. **Hierarchy-first revision:** make Graphical the default; show the actual AND/OR/NOT evaluation tree and a linked Test inspector; preserve distinct Item-vs-State/record requirements. Show shared Test reuse and missing reference notices; no fabricated pass/fail status.
3. **Escalate complexity:** load *all six* pinned Rule/Assessment pairs; add concise source-derived Test summaries, nested group labels, Set/foreach labels, recursively reachable shared Objects and variable-dependency outlines. Prefer focused disclosure to a giant draggable canvas. Existing raw YAML/source view remains authoritative.
4. **Runtime boundary:** mock where typed sample evidence and a future evaluation trace will appear, but disable entry/run controls until the editor can use the real, tested SCAP-NG interpreter. Do not simulate six-state outcomes with the UI or AI.
5. **Structural edit boundary:** display disabled add/unlink/delete hints until source-preserving AST and schema/reference checks permit safe modifications. Removing a reference is not deleting an in-use Test/Shared Object.

## Why this might increase adoption

The main opportunity is a **semantic editor**, not merely fewer typed characters. A first-time author should quickly see (a) what source data is collected, (b) what constitutes a match, (c) AND/OR paths, (d) what is reused, and (e) where a failing condition would be tested after interpreter integration. Editing should use short human-readable clauses with schema-backed dropdown choices while always permitting precise source inspection.

A graphical interface could otherwise **decrease** confidence if it hides Item existence, field/record existence, missing values, collection errors, State alternatives, or dataflow. Never trade away these distinctions to make a line shorter.

## Remaining work and decisions

- **Highest priority:** a path-to-root + focus mode for deeply nested trees, with click-through dependency edges such as `for_each in -> shared Object -> Set operands -> filters` and `command -> Variable -> upstream shell collection`. The prototype currently lists dependency definitions, but does not yet draw complete dependency paths.
- **Authoring:** implement create/reuse/link/unlink/delete for Tests, Objects, States, record fields, groups, filters and Variables, with previews, use-counts, undo, source-preserving edits and versioned semantic validation. No guessed defaults. Current buttons are explicitly disabled.
- **Schema/UI fit:** track repeated trouble expressing human intent, and send **evidence-based** proposed syntax changes to SCAP-NG research rather than changing the pinned pre-alpha grammar for the demo.
- **Strong gate:** versioned deterministic parser/schema/reference diagnostics are absent; current browser edits still reserialize YAML and can alter comments/formatting. Complex native structures remain best edited in Source until proven otherwise.
- **No AI requirement:** optional later AI Redesign lives in [#11](https://github.com/vanderpol/scap-ng-editor/issues/11); ordinary offline editing must not require an AI.
- **No interpreter claims:** real sample results must come from a tested SCAP-NG scanner evaluation kernel with six-state coverage, not from source parsing or an LLM.

## Proposed real-user acceptance study (not conducted)

Ask security auditors and content authors with varying YAML familiarity to inspect **all six** cases, first in YAML then in the editor (counterbalance order). Ask them to explain the pass-path branches, name shared references, locate a nested field quantifier, trace an input Variable to its Object, and safely unlink one reused Test. Record **time, factual accuracy, correction count, confidence and task completion**, plus objective edit/source diffs. Compare to a YAML-only baseline. Do not claim increased adoption until the editor meaningfully improves **accuracy and editing success** on the difficult cases, not just the easy ones.

**Current verdict:** The redesign is a credible improvement for moderate branching and reviewer navigation; it is **not yet a convincing replacement for YAML when Objects, Sets, Variables and filters form complex dataflow**. Continue iterating on those outliers before promoting full-model usability.
