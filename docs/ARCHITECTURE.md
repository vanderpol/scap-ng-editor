# SCAP-NG Editor Architecture

## Product goal

The editor is intended to consume and edit all SCAP-NG authoring content, including the most complex real-world content. The design SHALL be exercised against the large corpus in `vanderpol/scap-ng-editor-sample-data`, not only simplified examples.

## Three first-class authoring modes

### 1. STIG manual

Benchmark/manual prose authoring without requiring automated Assessments.

The editor should support Benchmark metadata, groups, Rules, requirement/check prose, references, severity/weight and related policy metadata, profiles/tailoring structures where applicable, and manual content.

Automated Assessment content must not be required merely because the editor supports it.

### 2. Full SCAP-NG

Complete Benchmark -> Rule -> Assessment authoring.

This mode exposes the entire content graph, including Assessment choices, automated/manual Assessments, Tests, Objects, States, Variables, evaluation logic, applicability, shared Assessments, and cross-file dependencies.

### 3. Assessments only

Assessment authoring and review independently of a Benchmark.

This mode supports reusable/shared Assessment libraries, focused Assessment development, conversion/migration work, and Test/Object/State/Variable authoring without requiring a synthetic Benchmark wrapper.

## Shared engine

The three modes should be views over one common project/document engine rather than separate applications.

Shared services should include:

- project/folder navigation;
- open/create/edit/save;
- JSON/YAML parsing and serialization;
- schema-driven validation;
- structured diagnostics;
- cross-file reference resolution;
- identifier navigation;
- search;
- unknown-field preservation;
- version-aware schema selection;
- safe round trips.

## Schema-driven behavior

Prefer behavior derived from the active SCAP-NG schema over vocabulary duplicated in application code.

Rich semantic UI may be layered on top where it materially improves authoring, but the core editor must remain able to display and edit schema-valid structures it has not previously seen.

## Round-trip invariant

Unknown or future fields SHALL survive open-edit-save unless the user explicitly changes/removes them or a requested format conversion cannot preserve them and the editor warns first.

Invalid content SHALL remain editable and saveable. Validation diagnoses content; it does not destructively normalize it.

## Real-corpus design pressure

The three large generated exports in `scap-ng-editor-sample-data` should drive decisions about:

- source directory layout;
- filenames and navigation;
- discoverability of shared Assessments;
- cross-file reference UX;
- form-oriented versus structured-text editing;
- filtering/grouping for large Benchmarks;
- Assessment-library browsing;
- validation and search performance.

When the corpus exposes a problem, classify it explicitly as either an editor usability problem or a SCAP-NG source-layout/authoring-model problem before changing either side.
