# Assessment-first MVP

**Scope:** first independently useful SCAP-NG editing product, not a second Assessment language or an incomplete-coverage shortcut. [Issue #2](https://github.com/vanderpol/scap-ng-editor/issues/2) tracks the build; [issue #1](https://github.com/vanderpol/scap-ng-editor/issues/1) tracks the broader product and interface choices. The first milestone does not commit us to either VS Code or a standalone desktop framework.

## Start from an Assessment

The first UI opens, browses, creates and edits an **automated, manual or applicability Assessment**, including shared Assessments, without needing a Benchmark or synthetic Rule. Give authors two coordinated views over the **same source**: guided editor (capability → source/Object → expectations/States → Test cardinality → evaluate → preview) and text YAML/JSON. Support recursive graphs through a structured tree inspector, not a full-screen drag-and-drop canvas.

The editor should **generate** the initial skeleton/Assessment whenever input can safely identify the model:

1. **Imported OVAL**: use an authoritative source-preserving OVAL → NG conversion, with provenance and explicit modernization limitations.
2. **Reviewed native recipe**: generate a known pattern after the author supplies its selector, expected values and cardinalities; show exactly what was generated and what remains unresolved.
3. **Empty/manual**: produce a versioned skeleton. Optional future AI can propose drafts from check text, but its guesses are never marked validated or published without review.

Completion/syntax checks are not sufficient: show separate YAML/JSON parsing, schema, capability, reference/cycle and semantic-validation status. Collect expected-result fixtures for absence/error/unknown; do not claim scanner execution until a scanner exists.

## Vocabulary-independent design — start before the final 0.4 vote

The 0.4 vocabulary choices are still pending. **They do not block the document/project editor, reference graph, guided layout, schema association, or safe diagnostics engine.** Those services SHALL NOT hard-code `collected_items_require`, `state_fields_require`, `require`, `and`, or `or` as permanent application fields.

Use a **two-layer model**:

1. **Lossless, versioned native source** — the actual YAML/JSON syntax tree remains authoritative, preserving author choices, comments, ordering, unknown attributes, and original spelling. The schema/capability metadata associated with the document is pinned by source version and provenance.
2. **A version-aware editing projection** — named authoring roles, such as *collected-item requirement*, *ordinary State-field requirement*, *record requirement*, *record-member requirement*, *logical State composition*, *predicate*, *Object selector*, and *Variable/dependency expression*. The UI presents meaningful labels such as “Which collected items must match?” and “What must be true about this field?”; a versioned adapter determines whether and how each role is expressible in that snapshot.

**Pure vocabulary rename:** a future approved name replaces the old serialization key in the *appropriate version adapter* and completion/hover catalog, without requiring a new UI or changing the editing core. As an example, Test-level `require` in the current 0.4 base draft and `collected_items_require` in the Joval revision 2 candidate are different **versioned spellings for the same intended Test population requirement**. The currently published candidate must not be silently treated as normative.

**Semantic grammar change:** changes to cardinality, Test/State matching aggregation, nested-record inheritance, `if/else` behavior, `for_each` population boundaries, or error/unknown results **are not renames**. An editor SHALL not translate them through a mere alias table or claim lossless migration. Require an explicit versioned semantic adapter with tests or mark the operation unsupported and preserve/edit the original source.

**Fail-closed behavior:** unknown/unsupported constructs remain visible and editable as native source; auto-generation, forms and quick fixes must not invent defaults or discard fields. A change of schema version SHALL show compatibility diagnostics, proposed migrations and a reviewable diff rather than rewriting content on ordinary open/save. Capabilities and enums are loaded from the selected external schema rather than copied into the app.

**Immediate work permitted while waiting on vocabulary:** source-preserving parser/edit APIs, external schema loading, syntax and schema diagnostics, project graph/reference index, navigation, capability-driven autocomplete, generic recursive structure editor, fixture coverage, and presentation skeleton. **Hold** opinionated templates, automatic migrations and vocabulary-specific shortcuts until the matching semantic contracts are accepted/proven.

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
