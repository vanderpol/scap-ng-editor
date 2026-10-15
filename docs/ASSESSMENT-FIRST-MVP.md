# Assessment-first MVP

**Scope:** first independently useful SCAP-NG editing product, not a second Assessment language or an incomplete-coverage shortcut. [Issue #2](https://github.com/vanderpol/scap-ng-editor/issues/2) tracks the build; [issue #1](https://github.com/vanderpol/scap-ng-editor/issues/1) tracks the broader product and interface choices. The first milestone does not commit us to either VS Code or a standalone desktop framework.

## Start from an Assessment

The first UI opens, browses, creates and edits an **automated, manual or applicability Assessment**, including shared Assessments, without needing a Benchmark or synthetic Rule. Give authors two coordinated views over the **same source**: guided editor (capability → source/Object → expectations/States → Test cardinality → evaluate → preview) and text YAML/JSON. Support recursive graphs through a structured tree inspector, not a full-screen drag-and-drop canvas.

The editor should **generate** the initial skeleton/Assessment whenever input can safely identify the model:

1. **Imported OVAL**: use an authoritative source-preserving OVAL → NG conversion, with provenance and explicit modernization limitations.
2. **Reviewed native recipe**: generate a known pattern after the author supplies its selector, expected values and cardinalities; show exactly what was generated and what remains unresolved.
3. **Empty/manual**: produce a versioned skeleton. Optional future AI can propose drafts from check text, but its guesses are never marked validated or published without review.

Completion/syntax checks are not sufficient: show separate YAML/JSON parsing, schema, capability, reference/cycle and semantic-validation status. Collect expected-result fixtures for absence/error/unknown; do not claim scanner execution until a scanner exists.

## First usable demonstration

- Load a real easy Linux Assessment (RHEL 9 SV-257851), a Windows State-alternative check (Windows 11 SV-253254), a user-right plus nested-record case (Windows 11 SV-253495), and a difficult source-backed collection/Variable case (RHEL 9 SV-257889).
- Edit and save without dropping unknown fields, YAML comments or unrelated files. Show exact source diff; invalid content stays editable.
- Navigate all references and name-compatible native fields; complete legal enumerations based on an **external pinned schema version**, not hard-coded 0.4 research vocabulary.
- Generate and validate one real Assessment skeleton from a vetted pattern. Prompt for unknowns rather than choosing hidden defaults.
- Demonstrate a broken-reference case and a field-versus-Test cardinality error with location-specific diagnostics; demonstrate source-preserving no-op reopen/save.
- Mark unsupported structured editing capabilities in the coverage inventory; **no full-coverage claim** until deep Variables, Sets, Filters, nested records and all in-scope native structures can be authored and edited as well as preserved.

## Explicitly deferred from this first product

Benchmark metadata and Profiles; Rule browsing/creation/remediation editors; Rule-to-Assessment generation UI; full STIG import/export; publication and signed scanner bundles; arbitrary AI compliance conclusions. Those belong in the later **Benchmark → Rule → Assessment** application, which will embed/reuse this Assessment editor and its validation/generation engine.

**One engine, two possible experiences.** First prove correctness, safe editing and author ergonomics. The VS Code integration can be a first experimental client, while a focused offline standalone window may be better for users who do not want a programming IDE. Do not pick the permanent shell before a working proof.
