# SCAP-NG Editor

A small, open-source editor for authoring and reviewing SCAP-NG content.

## Shared development handoff

**[Current development plan for both Codex and ChatGPT](docs/SHARED-DEVELOPMENT-PLAN.md)** — one up-to-date place for milestones, next implementation task, evidence, blockers, and open decisions. Both tools should use the root [`AGENTS.md`](AGENTS.md) instructions and update this plan through normal GitHub commits rather than exchanging long prompts. **Every new commit must cite the relevant GitHub issue** (for example, `Refs #2`); the repository checks issue-ID syntax on pushes to `main`.

## October 16 Joval → Codex handoff

The [first Codex engineering slice is specified in issue #3](https://github.com/vanderpol/scap-ng-editor/issues/3): **source-preserving Assessment document edits + pinned schema diagnostics**. Its owner-set implementation gate is **still closed** while [SCAP-NG 0.4 semantic review #229](https://github.com/vanderpol/scap-ng/issues/229) is open. Neither the issue nor the handoff starts an agent. Real pinned test files are [tracked separately in sample-data #1](https://github.com/vanderpol/scap-ng-editor-sample-data/issues/1); synthetic parsing fixtures are available but are not equivalent to a real-source test corpus.

The Joval technical meeting uses this [one-page October 16 agenda](https://github.com/vanderpol/scap-ng/blob/main/research/assessment-simplification/compact-authoring-04/JOVAL-MEETING-2026-10-16.md). No 0.4 research candidate was promoted to a normative schema merely by passing source validation.

## Current architecture proposal

[VS Code-first assistive editing vs standalone graphical workbench](docs/EDITOR-IMPLEMENTATION-RECOMMENDATION.md) — an exploratory tradeoff analysis, **not yet an approved stack**. The three authoring modes and complete native source/graph handling requirements remain intact.

## First milestone: Assessment authoring

We are starting from an **[Assessment-only editor](docs/ASSESSMENT-FIRST-MVP.md)** (tracked in [issue #2](https://github.com/vanderpol/scap-ng-editor/issues/2)) before building the entire Benchmark and Rule workbench. It should generate draft native Assessments from vetted patterns or converted OVAL, provide guided editing, completion and versioned validation, and safely preserve complex source. The [broader application plan](docs/EDITOR-IMPLEMENTATION-RECOMMENDATION.md) remains, sharing the same editing core. This is a design priority; the frontend stack is still undecided.

## SCAP-NG 0.4 schema linkage

[External draft-schema integration contract](docs/SCHEMA-INPUT-CONTRACT.md): exact SCAP-NG schema paths, candidate overlay, reproducible version-pinning rules, and validation boundaries. **Documented, not implemented; Codex editor coding is held pending SCAP-NG conformance gate #229.**

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
