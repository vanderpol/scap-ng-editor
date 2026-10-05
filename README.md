# SCAP-NG Editor

A small, open-source editor for authoring and reviewing SCAP-NG content.

## Project boundary

This repository contains the editor application and editor-specific tests only.

It SHALL NOT contain a maintained copy of SCAP-NG schemas, specification text, converted benchmarks, sample assessments, or other SCAP-NG content fixtures. Editor test/sample content belongs in the separate `vanderpol/scap-ng-editor-sample-data` repository.

The editor should consume SCAP-NG schemas and content as external, versioned inputs so ownership of this repository can be transferred without also transferring or duplicating the SCAP-NG project itself.

## Safe initial scope

Development before later SCAP-NG revisions are finalized should focus on capabilities that do not hard-code unstable language semantics:

- open, create, edit, and save JSON/YAML documents;
- load an explicitly selected SCAP-NG schema version;
- schema-driven validation and diagnostics;
- preserve unknown fields rather than silently discarding them;
- show validation errors with useful document locations;
- keep schema/content acquisition behind replaceable interfaces;
- support external test fixtures from `scap-ng-editor-sample-data`;
- automated tests for document round-tripping and validation plumbing.

## Deferred until the language is more stable

The editor should avoid hard-coding these until the corresponding SCAP-NG design is stable enough to justify UI semantics:

- bespoke forms for individual assessment capabilities;
- enumerated vocabulary duplicated in application code;
- assumptions about future 0.3.0 structures;
- automatic semantic rewrites or migrations;
- embedded copies of the SCAP-NG schema set;
- large bundled sample-content corpora.

## Design principle

**Schema-driven where practical; content-agnostic by default.**

The editor should be able to gain support for a new SCAP-NG schema snapshot primarily by loading that snapshot, not by requiring a new release for every vocabulary or structural change.
