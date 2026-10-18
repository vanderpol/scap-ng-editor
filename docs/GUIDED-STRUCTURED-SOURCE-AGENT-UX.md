# SCAP-NG guided authoring: wizard first, graphical toggle next

**18 October 2026 · UX research / issues [#8](https://github.com/vanderpol/scap-ng-editor/issues/8), [#1](https://github.com/vanderpol/scap-ng-editor/issues/1), [#6](https://github.com/vanderpol/scap-ng-editor/issues/6).** These are **separate product milestones**. A conversational wizard is available as **private plugin-instruction v0.4.0**; no general-purpose clickable graphical editor or tested scanner-backed Run action exists. Agent version `0.4.0` is **not** the SCAP-NG specification version or evidence of 0.4 grammar readiness.

## Milestone 1 — guided conversation, immediately testable

The already privately owned ChatGPT plugin `SCAP-NG Assessment Author` (v0.4.0) now instructs:

- Fetch at most exact Rule + linked Assessment + needed pinned profile initially; show a usable source-linked draft rather than long research.
- Default to **Guided** when generating or reviewing by request. Show the **actual existing** choice for existing source, or clearly labeled **AI proposed default** for new drafts. Never silently change a requirement when a default is accepted.
- Ask **one small question** per turn, with an **Accept default** path and the ability to **Accept all defaults**. No five-step questionnaire before the user can see anything.
- Review in conceptual stages: (1) Purpose/source, (2) collected Item selection & existence/match, (3) State fields and record members, (4) Test/evaluate alternatives + incomplete/error, (5) sample fixture proposals + review/export.
- Support **Structured** mode as a compact textual graph with only meaningful nodes, and **Source** mode with the actual YAML/JSON. Allow the user to say `show source`, `guided`, `structured`, `change [step]`, and `use defaults`. **This is conversational switching, not a clickable GUI/AST editor.**
- Continue to label schema checks **unvalidated** unless deterministic tool run, and Assessment six-state results **NOT SCANNER-VERIFIED** until a tested scanner evaluation kernel is called. An AI can't self-test semantic outcome.
- The agent's private plugin instructions may not prevent the ChatGPT product from opening Work. Actual host behavior, user quota consumption, and first-view latency still need fresh user-observed testing.

### First-use sample (real pinned RHEL 9 source, illustrative display)

```text
Rule: SV-257851 · RHEL 9 · selected language: r3 pre-alpha research
Existing Assessment: ng.shared.home-is-mounted-with-the-nosuid-option

Collection: linux.partition
  Selected source Items: mounts whose mount_point matches /home
  Minimum matching source Items: at least one
  Required match across collected Items: all
  Field mount_options: at least one observed option equals nosuid
  Combination: one Test

[Current original values; no proposed change yet]
Review: Accept current / Change selection / Change requirement /
        Add synthetic sample / Show YAML / Explain all

Scanner result: unavailable (no tested compatible evaluator called)
```

**Caution:** original YAML includes a source selector regular expression (and other exact details) that must remain visible and not be silently reduced to `mount_point equals /home` by the explanation.

### What to measure

Time to first meaningful Assessment, no broad re-fetch loops, whether reviewer correctly predicts Item vs field requirements, ability to change one property and get an **actual revised draft and diff**, ease of entering an independent expected-result fixture, and use of Work. **Do not claim performance improved merely because the skill was updated.**

## Milestone 2 — real graphical / source toggle (not implemented)

A **proper interactive** view needs an MCP App (for a ChatGPT conversational agent) or our offline VS Code extension. It must provide:

1. A **persistent versioned document model** retaining source tokens/comments/identities and round-trip-safe exact serialisation; invalid source must remain editable without destruction.
2. **Graphical cards** for Capability/selected Object, Item existence & matching, State fields/records, Test/evaluate graph. Avoid one visual box per meaningless YAML wrapper.
3. **Guided ↔ Graphical ↔ Source** modes, with split-view option, all bound to one model. An edit in one view updates the others and marks a precise diff. Invalid or unrepresentable syntax must not disappear when switching modes.
4. **Sample observations panel** with typed Items and collection status, per-capability fixtures and independently justified expected results. Only the tested scanner evaluation kernel produces authoritative actual six-state outcomes.
5. Explicit review approval and export without GitHub; optional authenticated review/commit with selected-source provenance.
6. An **offline VS Code extension** using the same document/evaluation semantics, with **no required AI or network access**, and model-provider-neutral optional assistance.

This should be investigated as a lightweight editor application rather than attempting to produce a graphical AST purely through longer skills instructions. Current editor architecture/semantic decision gates remain open; neither this doc nor the private skill release authorizes or proves a finished MCP App or VS Code extension.

## Demo go/no-go

The **guided chat demonstration** is realistic to test against pinned simple/complex examples for the October 22 Board discussion, provided the actual host routing and interactive prompts are verified in use. The **graphical toggle is a separate later implementation**, not something to promise in the same demonstration until functional source synchronization exists. The Board exercise should compare comprehension from YAML alone versus guided/structured explanations, recording mistakes rather than claiming a preferred language solely from superficial readability.
