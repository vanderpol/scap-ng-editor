# Retrieval-guided modernization: reuse trusted checks, redesign for SCAP-NG

**18 October 2026 · Authoring-agent research · [#4](https://github.com/vanderpol/scap-ng-editor/issues/4), [October 22 Board demo #6](https://github.com/vanderpol/scap-ng-editor/issues/6).** This describes the intended workflow, not an implemented retrieval engine, equivalence proof, approved language revision, or scanner.

## Owner direction

**Look for equivalent trusted assessment logic before generating new content; modernize that logic using the selected SCAP-NG language's features.** The goal is *preserved requirement and evaluation behavior with a smaller, clearer authoring representation*, not the smallest possible literal XML→YAML mapping.

Like the existing SCAP-NG upgrade effort, the agent should exploit clearer Item/field requirements, typed collected data, reusable sources, comprehensible iteration and conditional structure **where those features are actually supported by its pinned language profile**. Do not perpetuate unnecessary OVAL Variable chains merely to make conversion visibly familiar. Also do not delete an oddball case because it complicates the prose: call it out for specific human review and source-backed semantic testing.

## Search before creation

1. **Current project and workspace:** Find an already reviewed Assessment and shared Object/collection for the same check. Prefer reuse over duplication when identity, scope and evidence are demonstrably equivalent.
2. **Comparable operating-system versions:** Search related STIGs and Assessment/OVAL examples—e.g., a new RHEL 10 Rule may have a close RHEL 9 counterpart. **A matching name, STIG/SRG/CCI identifier or similar remediation text is a discovery hint, NOT a semantics-equivalence certificate.** Check applicability, operating-system paths, default behavior, provider capabilities and the original check text.
3. **Trusted public material** when network use is permitted: authoritative DISA STIG content (for STIG manuals, use **cyber.mil**), original SCAP 1.4/OVAL sources, and reviewed public NG content. Distinguish authoritative normative source from third-party suggestions or older inherited material.
4. **Uploaded/local alternate benchmark:** If online discovery is unavailable, a benchmark is private, or the user wants a particular historical version, ask for—or use when already provided—uploaded STIG/XML/OVAL, Assessment YAML/JSON, checked-out local repositories, or offline source packs.
5. **No suitable prior art:** Draft from the authoritative requirement and document that no reviewed implementation was found in the sources actually searched. **Never fabricate a public match.**

For each candidate, retain **repository/document identity, immutable source revision or source checksum, Rule/check ID, applicability, source type and confidence/unknowns**. Search rank is not a trust rating or proof of behavioral equivalence.

## Modernization decisions, not mechanical conversion

| Decision | Appropriate outcome | What must remain explicit |
| --- | --- | --- |
| Identical requirement + compatible native sources | **Reuse** the reviewed Assessment or shared collection | Version and source provenance, capability selectors and original Item/value scopes |
| Same security objective but a changed OS or collected-field representation | **Adapt** a source-derived Assessment | Which paths, values, comparators, native capabilities or applicability assumptions differ |
| Source has repeated Variable chains/duplication | **Redesign** with verified NG features | No hidden per-Item vs per-value loop; preserve `concat` expansion vs `merge`/join, incomplete/error statuses and evidence |
| Source OR/AND conditions look like verbose domain-role logic | **Simplify its presentation** only when source-six-state behavior is retained | Every independent alternative (e.g., Windows `Everyone`), record correlation and unknown/error handling |
| Rare OVAL pattern has no equivalent NG construct | **Flag as unresolved** or propose a clearly labeled fallback | Do not quietly replace with “pass,” force manual, or invent a scanner capability |
| Public source disagrees with the target Rule/version | **Do not reuse** uncritically | Show conflict and request human review of authoritative intended behavior |

The agent may show **one source-faithful reference** and **one recommended modernized candidate** for comparison, but both target the *same single selected SCAP-NG language profile*; they are not a proposal to retain two production authoring dialects.

## Author-facing output: provenance-preserving modernization packet

For a new Assessment (for example, RHEL 10 adapting a RHEL 9 precedent), display a compact review packet with:

1. **Requirement identity:** selected STIG/Rule, OS applicability, source revision, check procedure and target NG schema profile.
2. **Prior art found:** hyperlinks or local source references to relevant RHEL 9/other benchmark Rules and original OVAL/native NG implementations, including search limitations.
3. **What carries forward:** selector logic, predicates, expected Item/field existence, matching quantifiers, logical AND/OR alternatives, collection flag/status meanings.
4. **What changed:** portability updates for the new OS and clearer NG feature use (shared acquisition, named stages, `for_each`, source composition, scoped field requirements where approved).
5. **What needs proof:** source-specific oddballs, missing/incomplete Item behavior, nested records, `exactly_one`, value combination/join, and any changes in result or evidence semantics.
6. **Complete proposed Assessment and exact diff**, with version/overlay status, no automatic repository writes or silent source-file upgrades.
7. **Sample data proposals:** author-provided or synthetic positive/negative/absent/incomplete scenarios and *independently approved expected results*; verified outcomes **only** from the tested SCAP-NG scanner evaluation core. If unavailable, label **NOT SCANNER-VERIFIED**.

AI is permitted to make creative restructuring proposals and explain their design. It is **not** the authority on schema correctness, OVAL equivalence or true/false/unknown/error assessment outcomes.

## A concrete mini-walkthrough

**Prompt:** “Create the RHEL 10 home mount protection Assessment. Check for relevant RHEL 9 source material first, but use the newest permitted SCAP-NG authoring features.”

**Proposed agent sequence:**
- Load **explicit target language/version profile**, and pinned RHEL 10 check source.
- Retrieve the existing RHEL 9 home mount `nosuid` Rule and Assessment as a precedent, compare original selectors and Item requirements, and identify RHEL 10 applicability differences. **Do not assert the requirements are identical without inspecting them.**
- Generate the complete candidate Assessment, considering reuse of any reviewed Linux mount collection, with **at least one selected mount Item** versus **at least one matching `nosuid` option per Item** clearly distinguished.
- Show where simplification reduced authoring burden and whether a regex selector could select more than an exact `/home` path.
- Suggest complete/zero/duplicate/incomplete Item fixtures; have the human review expected results. Only the *tested scanner evaluator* can report actual result states.
- Output a draft and reviewable diff; save locally, export, or propose a GitHub change only after the human selects that destination and approves the exact changes.

## A useful Board-demo test

For Thursday, run two cases: (a) RHEL 9 source precedent for a prospective newer equivalent Rule, with a clear warning when equivalence hasn't been independently verified; and (b) Windows 11 `SV-253495` source where the agent must not lose the independent `Everyone` OR branch while trying to reduce duplication. Have reviewers choose whether the agent's modernization and explanations allow them to catch errors **more reliably than a blind YAML review**. A successful demo is source retrieval plus an honest, useful *draft and rationale*—not a declaration of verified semantics.

## Boundaries

Current GitHub-connected chat can perform assisted retrieval/drafting where connections permit. This contract does **not** establish a working public/private deployed plugin, automatic cross-benchmark search index, authoritative NG validator, full scanner evaluator, or certified source-equivalence check. Future implementation must share the same source-index/document tools with the cloud agent and model-neutral/offline VS Code extension.
