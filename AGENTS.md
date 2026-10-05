# SCAP-NG Editor development invariants

## Repository boundary

- Keep this repository intentionally small and transferable.
- Do not copy SCAP-NG benchmark, policy, assessment, result, schema, specification, or converted-content corpora into this repository.
- Any SCAP-NG content used as editor sample/test input SHALL live in `vanderpol/scap-ng-editor-sample-data`.
- Do not create a second maintained copy of SCAP-NG schemas here. Load schemas as external versioned inputs.

## Schema and content handling

- Prefer schema-driven behavior over duplicated vocabulary in application code.
- Do not silently invent defaults for fields that the active SCAP-NG schema does not define.
- Preserve unknown/unrecognized fields during open-edit-save round trips unless the user explicitly removes them.
- Validation errors should identify the affected document location and active schema version.
- A document that is invalid SHALL remain editable and saveable; the editor is an authoring tool, not a destructive normalizer.

## Forward compatibility

- Do not hard-code 0.2.0 semantics as permanent editor semantics.
- Treat future SCAP-NG versions as external schema snapshots.
- Keep schema resolution, document parsing/serialization, validation, and UI presentation separated so any one layer can change without rewriting the others.

## Early-development constraint

Until the project owner approves a technology stack and richer semantic UI, safe work is limited to architecture, repository structure, interfaces, validation plumbing, round-trip behavior, diagnostics, and tests that do not depend on unstable SCAP-NG language decisions.


## Surgical edit invariant

- Normal editor operations SHALL modify only the file or files directly implicated by the user's edit.
- Opening, validating, navigating, searching, or saving one document SHALL NOT rewrite unrelated files.
- The editor SHALL preserve stable serialization where practical and SHALL NOT perform opportunistic corpus-wide formatting or normalization.
- Cross-file updates are allowed only when required to preserve an explicit reference/invariant affected by the user's action, and the editor should make the affected file set visible before or as part of the operation.
- Corpus-wide search/replace and broad refactoring are not core editor responsibilities. External text tools may be used for those workflows.
- Any global migration capability added in the future SHALL be an explicit, separately invoked operation with a previewable change set, never an implicit side effect of ordinary editing.
