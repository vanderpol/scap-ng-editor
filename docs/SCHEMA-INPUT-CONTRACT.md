# External 0.4 schema integration contract (Assessment-only editor)

**Status: design contract; there is not yet an editor schema loader.** The language remains pre-alpha and the revised 0.4 Joval grammar is **research**, not a ratified normative schema. See [SCAP-NG semantic gate #229](https://github.com/vanderpol/scap-ng/issues/229) and [package integrity #230](https://github.com/vanderpol/scap-ng/issues/230).

## Authority and exact source

Consume schemas as **versioned external inputs** from [`vanderpol/scap-ng`](https://github.com/vanderpol/scap-ng), not from a copied schema tree in this editor repository:

- [0.4 draft schema directory](https://github.com/vanderpol/scap-ng/tree/main/schema/v0.4.0) and [status/limitations](https://github.com/vanderpol/scap-ng/blob/main/schema/v0.4.0/README.md).
- [Assessment document schema](https://github.com/vanderpol/scap-ng/blob/main/schema/v0.4.0/assessment.schema.json) — document root/metadata/Tests and linking structure.
- [Assessment language schema](https://github.com/vanderpol/scap-ng/blob/main/schema/v0.4.0/assessment-language.schema.json) — comparison/State/record/requirements/evaluation grammar.
- [Shared capability primitives](https://github.com/vanderpol/scap-ng/blob/main/schema/v0.4.0/capability-common.schema.json) plus the [version-local capability mapping catalog](https://github.com/vanderpol/scap-ng/tree/main/schema/v0.4.0/capability-mappings).
- **Separately** the [research-only Joval scope overlay](https://github.com/vanderpol/scap-ng/blob/main/tools/research_04_scoped_schema.py), or the archived `SCOPED-LANGUAGE-RESEARCH-SCHEMA.json` attached within the [r2 six-STIG YAML/JSON authoring preview](https://github.com/vanderpol/scap-ng/releases/tag/v0.4.0-joval-meeting-preview-20261015-r3).

The r3 six-STIG packet also now contains all source-backed shared manual Assessments; its **2,958 Rule choice references resolve**, after the [package-integrity gate #230](https://github.com/vanderpol/scap-ng/issues/230). This proves reference closure, **not** independent JSON compilation or scanning. The *base* draft uses Test `require`; the revision 2 **research preview** uses Test `collected_items_require`, supports `state_fields_require` at Test/group level and uses `and/or` spelling in State groups. These are **not interchangeable under one schema snapshot**; never treat the research overlay as promoted syntax. The r3 **Rule Assessment-choice links are logical IDs and all resolve**, even in JSON; some other contextual source document metadata remains 0.3.0. The [independent JSON-only schema and static-reference gate](https://github.com/vanderpol/scap-ng/actions/runs/38830995691) passed for 4,001 documents, including 872 unique automated Assessments / 1,375 unique native Tests. **This does not prove native JSON-to-bundle compilation**; that is a separate open [SCAP-NG #232](https://github.com/vanderpol/scap-ng/issues/232) gate. Do not interpret candidate scoped fields as ratified just because JSON statically validates.

## Loader contract for a future implementation

1. Associate a document/workspace with **repository identity, pinned commit SHA or immutable tag, schema version, candidate-overlay identifier, and hash(es)** for the loaded schema set. A mutable `main` link is navigation only, not a reproducible validation pin.
2. Resolve `$id`/`$ref` and version-local capability mappings entirely within the **selected, coherent snapshot**. Verify compatibility; fail closed on missing, mixed or cross-version references.
3. Expose a **version-neutral authoring projection** for UI field roles, but preserve the actual YAML/JSON source syntax tree as authoritative. Show clear diagnostics when a document's spelling belongs to another snapshot. Do not reformat or migrate on opening.
4. Validation statuses must distinguish YAML/JSON parsing, base-schema acceptance, research-overlay acceptance, capability-specific schema checking, cross-document references, semantic/reference evaluator tests, converter/source reconstruction, and actual scanner execution. A pass in one category is **not** a pass in the others.
5. When upgrading a schema pin, show expected changes and an explicit diff. Do not silently rewrite `require` to `collected_items_require`, infer missing `value_match` or Test cardinality, flatten nested records, or alter `if/else`/`for_each` meaning.
6. The implementation must work with an **offline, immutable schema cache** for disconnected/DoD authoring, after an explicit trusted acquisition step. The schema snapshot is read-only; no copied maintained version is committed to this repo.

**Queued first safe engineering slice:** [editor issue #3](https://github.com/vanderpol/scap-ng-editor/issues/3); pinned test material is tracked in [sample-data issue #1](https://github.com/vanderpol/scap-ng-editor-sample-data/issues/1). Both are preparation, not permission to start speculative 0.4 semantic editing.

## Gate before Codex implementation

The owner requested deeper **0.4 conformance and source/packaging testing before assigning Codex any editor code**. [#229](https://github.com/vanderpol/scap-ng/issues/229) governs the semantic gate; [#230](https://github.com/vanderpol/scap-ng/issues/230) covers dangling Rule choices found in the six-STIG packet. Schema loader design is documented now, but **no implementation or claim of integration** follows from these links.

**Future first validation:** load both the base 0.4 snapshot and its separately identified research candidate; report the differing Test/group requirement spellings; reject cross-snapshot mixing and unresolved refs; validate real Linux/Windows documents without modifying their source.
