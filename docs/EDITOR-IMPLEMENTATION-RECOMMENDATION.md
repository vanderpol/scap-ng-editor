# SCAP-NG editor — VS Code-first versus graphical application

**October 15, 2026. Status: research recommendation for [issue #1](https://github.com/vanderpol/scap-ng-editor/issues/1), not approved implementation.**

## User-directed refinement — benchmark-centric authoring workbench (October 15, 2026)

The product should lead with **Benchmark → Rules → Assessment generation**, not with source-file editing. This is a stronger use case than the earlier VS Code-first assistive-editor hypothesis. The **preferred end-user experience** is now a **standalone/offline-ready, benchmark-centric graphical workbench with an expert YAML/JSON editor**, supported by one independent document/semantic engine. A VS Code extension remains a useful second client or an inexpensive early proof of the language engine, but should not determine the author's navigation and workflow. This is a design recommendation, **not a stack authorization or permission to begin implementation**.

### Primary author workflow

1. **Open, import, or create a Benchmark.** Edit metadata, Groups, Profiles, identifiers, references, version, applicability and authoring provenance in clear forms. Support large existing Benchmarks without expanding the whole corpus into one screen.
2. **List, search, clone, or create Rules.** Edit policy prose, severity, check text, remediation, references, IDs, applicability, Assessment choices and default choice. Show state per Rule: no Assessment, manual available, automated draft, validated structurally, reviewed, ready for publication. Do not mistake schema-valid for scanner tested.
3. **Build an Assessment draft from the Rule.** If existing SCAP 1.4 OVAL/XCCDF is present, use the existing source-preserving conversion pipeline and retain source IDs and coverage; if no OVAL exists, select known capability patterns from the check procedure and suggest selectors, comparisons, conditions, inputs and manual alternative. Preserve exact requirement identity. Reuse an identical already-reviewed Assessment rather than cloning it by default.
4. **Resolve ambiguous semantics interactively.** Ask the author for observable property/capability, selector scope, expected values, existence and match cardinality, missing/error handling, and organizational-input provenance only where evidence cannot establish them. For Windows records, nested Filters, foreach and conditional patterns, offer a structured drill-down preserving independent scopes. Neither a pattern nor an AI assistant may silently choose a default.
5. **Inspect and validate.** Show the generated Object/State/Test/evaluate tree, human-readable explanation and editable native YAML/JSON diff; distinguish parsed/schema/reference checks, source-equivalence proofs, simulated outcomes and actual scanner validation. Let authors add precise expected-result fixtures (including failure/absence/unknown). Compiler/output packaging is only enabled when versioned tooling exists.
6. **Review/publish in Git.** Save only native SCAP-NG files, update linked IDs safely, show the exact touched files and revision history, and keep release approval separate from editor generation.

### Generated-content trust levels

- **Imported and losslessly converted:** original XML/Rule source tied to proven source-reconstruction rules; provenance and exceptions recorded. Source equivalence still does not prove scanner execution.
- **Deterministically generated from a vetted recipe:** a structured pattern with explicit author-supplied selectors and expectations. Show all generated nodes and confirm validity; pattern-specific semantics must be tested.
- **Suggested from prose or optionally an LLM:** hypotheses/drafts only; attach source passages and unresolved questions, mark unverified values, never auto-publish or mark compliant. AI must be optional for offline/controlled deployments and must not bypass the authoritative validator.
- **Manually authored:** identical validation, provenance and review treatment; easy starting templates for unsupported automation.

### Recommended graphical balance

The **primary GUI** is a Benchmark navigator + searchable Rule grid + guided Rule/Assessment editor + diagnostics/source preview. Use forms, trees, select menus, test/evidence panels and small focused dependency diagrams. **Avoid a full-graph drag-and-drop canvas as the principal editor.** A complete recursive structured inspector must support every in-scope native form; text-only fallback is preservation, not proof of full structured coverage.

### Architectural consequence

Keep the existing three authoring modes (STIG manual, full SCAP-NG, Assessments-only) as different entry points over **one native project model**. The editor remains independent of the specification repository and external sample-data corpus. Build an interoperable core (model, schema/semantic adapter, safe AST edits, dependency resolver, reproducible generation recipes) and present it through a benchmark-centric UI. A standalone desktop shell is now preferable for broad non-programmer author adoption; a VS Code extension can reuse the same services for experts. Choose packaging after a benchmark-to-generated-assessment prototype with both novice and expert authors, not before. No second assessment dialect and no hidden editor database of normative content.

**First meaningful acceptance demonstration:** import a representative real Benchmark, modify metadata, add a Rule with check/fix, generate one verified automated Assessment from existing OVAL, generate one explicitly provisional Assessment from prose with unanswered questions, and preserve complex linked Windows/Unix Assessment graphs through save and reopen. Existing validity/round-trip tests remain a prerequisite, not the demonstration itself.

---

## Earlier entrypoint recommendation (superseded as preferred UX by the benchmark-centric refinement)

**Start with an assistive VS Code extension built on a complete, editor-independent SCAP-NG document/reference/validation engine.** Implement a full *structured* editor over the same model as capability coverage matures. Add targeted graphical panels; **do not start with a canvas-first or forms-only standalone product**. Consider packaging a standalone offline tool later using Eclipse Theia (or a selected shell) if author testing demonstrates a need.

This refines the earlier [October 3 standalone-first research](https://github.com/vanderpol/scap-ng/blob/main/research/assessment-simplification/editor-06/IMPLEMENTATION-OPTIONS.md) in light of the more mature 0.4 single authoring grammar, the existing VS Code/YAML ecosystem, and the present owner question. The earlier work was a hypothesis, not owner approval. **The owner has not selected a stack.**

| Option | Advantages | Main cost/risk | Recommendation |
| --- | --- | --- | --- |
| **VS Code extension + native text** | Existing editor, Git, diff, cross-platform OS support, integrated YAML/JSON completion and diagnostics, straightforward distribution | Users must install/use an IDE; advanced semantic references are not covered by JSON Schema alone | **First usable client** |
| Standalone custom desktop app | Beginner-focused workflows, bundled offline delivery, custom visual navigation | Own editor, project/Git UX, distribution/update/security surface, validation and text-model integration | **Defer until author trials** |
| Fully graphical node canvas | May explain a tiny subset of flow and dependencies | Deep Variables, recursive Set/Filter trees, sharing, nested records, and contextual scopes become unreadable; risk of semantic simplification and file churn | **Use limited graph inspection, not primary authoring** |
| Graphical properties/forms alongside source | Better for finite enums, registry paths, capability selectors, record fields, source facts and Test cardinality | Must not impose templates/defaults or lose unsupported structures | **Add incrementally to the first client** |

## One engine, not two competing editors

- **Source-preserving parser:** keep the exact YAML/JSON native file as source of truth. YAML operations use a concrete syntax tree or source edits that preserve comments, ordering, quoting and untouched regions. A parse-to-JSON-and-reformat on save is not acceptable. Invalid text remains editable and saveable.
- **Versioned model:** acquire validated, pinned native SCAP-NG schemas/capability metadata *externally* from `vanderpol/scap-ng`. No duplicated enum tables or private assessment dialect. Different normative versus pre-alpha research snapshots must be clearly labeled.
- **Structured index:** references, symbols, cross-file IDs, typed Object/Variable/State/Test/evaluate dependencies, shared Assessments, groups, Profiles, Tailoring, applicability, and manual responses. Detect references to missing targets and cycles; diagnostic locations point to the original text.
- **Validation layers:** (1) YAML/JSON syntax, (2) JSON Schema 2020-12, (3) capability/semantic/reference checks via the maintained SCAP-NG tools, and (4) optional conversion/expected-result tests with their own status. Never label schema-green as scanner conformant.
- **Public adapter boundaries:** headless document/semantic services and optional LSP for IDEs; VS Code extension acts as a client. Reuse the engine for any future desktop GUI and a CLI validator. Treat `scap-ng-editor-sample-data` as external versioned tests.
- **No editor-only runtime contract:** recipes, templates, suggestions and diagrams generate ordinary native SCAP-NG content. A scanner never requires the editor or its catalog.

## Phase order

1. **Proof of editing safety:** round-trip real YAML and JSON with unchanged source regions; support explicitly selected schema snapshots, file location diagnostics, normal VS Code YAML/JSON editing, completion/hover, and reference navigation. Start with the six-STIG preview and hard mixed-graph fixtures, not toy-only content.
2. **Assistive product:** inline diagnostics and quick fixes for `collected_items_require` versus `state_fields_require` (only for the matching candidate snapshot), valid native capability field names, property/record enums, required-versus-optional selection and `value_match` cardinality; completion of known references/IDs; project tree for STIG manual, full SCAP-NG and Assessments-only modes. Quick fixes require an exact safe local rewrite and clear preview.
3. **Complete structured inspector:** recursive generic tree/property editor for **every** supported native construct, not a bespoke form for each capability. Expose deeply nested `for_each`, Objects, Variables/functions, Set/Filter evaluation, record field requirements, and Boolean/conditional trees with scope breadcrumbs. Show affected dependencies and native diff before edits. Native text remains available, but an unsupported graph element in forms is **not** called fully supported.
4. **Author trial and packaging decision:** novices and expert authors edit the same real cases, with error detection, lossless save, completion speed and ability to express difficult semantics assessed. Only then decide whether an Electron/Theia offline standalone front end is worth the cost. Prefer reuse of existing extension/LSP/UI widgets where platform API coverage permits.

**Acceptance gates:** zero silent data loss or unexpected cross-file formatting; correct separation of Test Item/State/record requirements; useful completion on real mappings; 100 mapping-family coverage **as measured by the current supported version** before claiming full structured support; deep chained Variable/Filter and Windows-record fixtures; offline local validation; reference correctness; and performance on the full editor sample corpus. The supported capability universe must be reevaluated as schemas change.

## Why not immediately graphical?

Our authoring language's greatest advantage is that simple checks are readable. Drawing a giant dependency graph makes simple content harder, while deep Object→Variable→Set→Filter graphs can exceed the usability of a single canvas. Use **source editor + navigable tree + property/requirement inspector**, optionally a *focused* dependency diagram when the user selects one Object/Test. Preserve full semantics rather than flattening them for a visual layout.

## Practical stack candidates (validate by prototype)

- **First client:** TypeScript VS Code extension; Red Hat YAML Language Support for schema-driven YAML completion/hover/formatting/diagnostics; VS Code's native JSON support. Start with schema association + small reference index; only build an LSP when multiple clients and cross-file semantics justify it.
- **Core:** TypeScript source-preserving AST edits and versioned schema/reference index, with a subprocess/adapter to maintained SCAP-NG Python validators (unless those are replaced by an independently proven shared implementation). Explicitly flag checks skipped while offline or not installed.
- **Graphical component:** VS Code tree/outline and minimal contextual property editor using native controls; webviews/custom editors only where the normal API is inadequate. Later packaging via Theia is an option, not an assertion of perfect VS Code API compatibility.

Useful references: [Red Hat YAML VS Code extension](https://marketplace.visualstudio.com/items?itemName=Redhat.vscode-yaml), [VS Code language features and LSP](https://code.visualstudio.com/api/language-extensions/overview), [VS Code Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors), [Eclipse Theia extension options](https://theia-ide.org/docs/extensions/).

**Decision sought:** Accept a **VS Code-first technical spike**, without choosing a permanent GUI product or waiving the prior [full authoring coverage requirement](https://github.com/vanderpol/scap-ng/blob/main/research/assessment-simplification/editor-06/FULL-COVERAGE.md). No implementation begins under this proposal until the owner authorizes a stack.
