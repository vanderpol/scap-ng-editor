# Python reference results + pasted sample configuration text

**18 October 2026 · Research [#4](https://github.com/vanderpol/scap-ng-editor/issues/4), [sample-data #241](https://github.com/vanderpol/scap-ng/issues/241).** Owner suggests reusing the existing Python OVAL result/reference code inside an AI-first editor to test arbitrary user-supplied **sample configuration text**. This document distinguishes what is **already demonstrated** from what would require new, source-validated adapters. **Not an implementation authorization, compiler assignment, scanner, or normative 0.4 semantic change.**

## Owner decision — Python reference is NOT the authoritative Assessment-result backend

**Updated 18 October 2026.** The AI may generate content and sample data, but SHALL NOT supply any claim of Assessment validity or an Assessment outcome. A **tested SCAP-NG scanner** must produce authoritative result states for both sample and real evidence. Deterministic schema validation remains a distinct diagnostic task.

The existing Python truth-table helpers, `parse_mountinfo_text`, restricted nosuid Test bridge and WMI source fixtures can be **reused as reference/oracle development aids and text-to-evidence adapters** while building that scanner. They are **not yet a tested general scanner**. Any result values cited below are **bounded research outcomes**, not an editor-backed verified Assessment result. A sample-data authoring pane can accept pasted text and save expectations now, but should display **NOT SCANNER-VERIFIED** until supported scanner execution is actually available and identified by engine/version/evidence hash.

**This decision supersedes the earlier “Python sandbox evaluator service as the initial result backend” recommendation below.** The desired service should ultimately route authoritative requests to the tested scanner; it may use Python parser/reference work internally as test development scaffolding, but must not make provisional reference predictions look like scanner results.

## Evaluation-only scanner mode for the editor (owner refinement, 18 October)

The owner identified a more efficient separation: the editor supplies typed sample values/Items, while **the real scanner's tested evaluation core** evaluates them, with *no native OS collectors required by the editor*. This follows the design precedent of OVAL 5.12.3 `independent:variable_test`, which compares supplied variable values against State criteria; it does not mean every Assessment can be rewritten as a variable test.

See the [versioned, source-backed evaluation-core contract](https://github.com/vanderpol/scap-ng/blob/main/research/assessment-simplification/english-first-04/SCANNER-EVALUATION-CORE-FOR-EDITOR.md) and [SCAP-NG #241](https://github.com/vanderpol/scap-ng/issues/241). The **same tested scanner evaluator** must be callable from real scanner and synthetic fixture paths, preserving scope/Item flags, comparisons, records, field existence, Variable, Set/Filter/foreach and six-state Test/Assessment logic. Human-provided samples bypass actual collection *only*. The existing Python reference models are testing inputs/oracles, **not** yet this qualified shared scanner kernel. Result UI shall explicitly say “scanner-verified on supplied evidence” only after that evaluator meets the conformance gate for the specific capability; never claim a live host was checked. The AI remains authoring-only, and this is **research, not an implementation assignment**.

## Product recommendation

**Yes: adopt a pluggable local Python *sandbox evaluator service* as the initial reference-testing backend for the AI agent and VS Code/graphical workbench, behind a versioned API.** It is small enough to validate while the authoring grammar evolves, yet teaches the UI the difference between *sample text*, *collected Items*, *state/field matching* and *Assessment truth*.

Both chat and source editor call **the same Python toolchain**, not two independent interpretations. A model may create, explain or mutate test samples, but it **must not** declare its own invented result as the deterministic engine's verdict.

## The three sample input modes

| Mode | What an auditor supplies | What can be verified | Important qualification |
| --- | --- | --- | --- |
| **A: typed collected evidence** | List of explicit source Items/record values plus collection status, e.g. shell command `stdout_line` Items, WMI DomainRole record members, mount options | Existing bounded Python Test/State/record truth-table helpers and supplied-leaf Boolean expression plan, **for supported/approved slices only** | Fastest generalisable MVP. No source parser or privileged collection is needed; report **UNSUPPORTED** for unimplemented capabilities |
| **B: raw text in a known capability adapter** | A pasted `/proc/self/mountinfo` sample with line numbers/namespace, or future Apache configuration with virtual file paths and include files | A typed parser converts text into Items, retains status/provenance and passes them through Mode A. Existing bounded Linux mountinfo pilot already demonstrates the full parse→Test→Assessment chain | Each adapter needs independent tests proving it produces the **same Items** the actual source collector is supposed to produce. Other formats are not magically supported |
| **C: virtual host/configuration snapshot** | Several synthetic files, file paths, include graph, permissions, environment and **explicit simulated command results** (stdout/stderr/exit status) | Tests that depend on configured source discovery, shell-output lines, Windows records, commands or foreach expansion can be exercised **without executing those commands**, once an exact provider simulator exists | A configuration file alone does not reproduce process state, WMI, shell command execution, active Apache modules, effective config ordering or OVAL System Characteristics. The simulator must disclose which portions are asserted vs independently derived |

Default UX: **A and the already-supported slice of B**; add text adapters one at a time. **C is a later, tightly scoped virtual-provider model, not a general-purpose pseudo-scanner.**

### Exact code we can reuse now (not overstating capability)

| Repository source | Current, evidenced function | Still missing |
| --- | --- | --- |
| [`tools/research_provider_linux_mounts.py`](https://github.com/vanderpol/scap-ng/blob/main/tools/research_provider_linux_mounts.py) | `parse_mountinfo_text(text,namespace)` turns pasted lines into typed mount Items, preserves IDs, source/VFS options and parser diagnostics; malformed records mark status `incomplete` | General Apache/Nginx/SSH/registry/etc parsers, OVAL `linux.partition` parity |
| [`tools/prototype_a_linux_mount_scan.py`](https://github.com/vanderpol/scap-ng/blob/main/tools/prototype_a_linux_mount_scan.py) | `compile_assessment`/`evaluate` implement exactly the pinned `/home` `nosuid` research check and no other semantics | Arbitrary Test/State/Variable/Set/Filter evaluation |
| [`tools/v04_a_linux_mount_expression_bridge.py`](https://github.com/vanderpol/scap-ng/blob/main/tools/v04_a_linux_mount_expression_bridge.py) | `bridge` feeds the bounded real/pasted mount-observation Test result into generic Assessment `evaluate` aggregation | Multi-Test evaluation when no Test provider supports the particular test |
| [`tools/oval_result_truth_tables.py`](https://github.com/vanderpol/scap-ng/blob/main/tools/oval_result_truth_tables.py) | OVAL 5.12.3 reference result/check/existence tables and specific record/variable boundary helpers | **Not an end-to-end evaluator**; needs authoritative typed observations and source-validated Test/State mappings |
| [`tools/v04_a_truth_plan.py`](https://github.com/vanderpol/scap-ng/blob/main/tools/v04_a_truth_plan.py) | Compiles authored `evaluate` tree, consumes **already evaluated Test outcomes**, returns six-state Assessment truth and source-trace positions | Does not infer Test outcomes from arbitrary pasted config |
| [`tools/v04_a_wmi_domainrole_source_fixture.py`](https://github.com/vanderpol/scap-ng/blob/main/tools/v04_a_wmi_domainrole_source_fixture.py) | Strict, source-exact synthetic WMI `DomainRole` record cases, including missing member and incomplete collection flags | Does not issue WMI queries or run full seven-Test Windows Assessment |

All of these are **research components** with pinned boundaries, not a released/approved general runtime. The existing [source-backed synthetic sample bench](https://github.com/vanderpol/scap-ng/blob/main/research/assessment-simplification/english-first-04/EDITOR-SAMPLE-DATA-PLAYGROUND.md) and [example expected-result cases](https://github.com/vanderpol/scap-ng/blob/main/research/assessment-simplification/english-first-04/EDITOR-SAMPLE-DATA-EXAMPLES.json) are the starting fixture/UX contracts, **not executable schemas**.

## First actual demo: paste Linux mountinfo

**Synthetic text** (already used as a bounded Test input in source tests):

```text
201 101 8:17 / /home rw,nosuid,relatime shared:8 - ext4 /dev/sdb1 rw,data=ordered
```

Versioned mount parser creates one Item:

```yaml
provider: linux.mounts
status: complete
items:
  - id: mnt:[fixture]:201
    fields:
      mount_point: /home
      mount_options: [rw, nosuid, relatime]
```

The pinned `/home nosuid` research Assessment returns `true` for this complete sample, returns `false` when the selected mount lacks `nosuid`, and returns `unknown` when an otherwise matching sample is *incomplete*. The service should show the chain: *raw line 1 → parsed Item ID → selected `/home` mount → presence/matching predicate → Test outcome → Assessment `evaluate` → reported status*. These are known supported boundaries with existing regression tests, not an API already deployed.

**Important:** A successfully parsed text string cannot prove that the *entire* system collection is complete. `complete` here means the *synthetic fixture's declared scope* is complete. An author must be able to set the collection flag independently; parser diagnostics may degrade completeness to `incomplete`, never silently erase a malformed line.

## Second demo to research: paste Apache configuration **without pretending to run Apache**

```apache
# synthetic /etc/httpd/conf/httpd.conf
KeepAlive On
MaxKeepAliveRequests 100
IncludeOptional conf.d/*.conf
```

The actual source-backed [Apache SV-214228 Assessment](https://github.com/vanderpol/scap-ng/blob/main/research/assessment-simplification/english-first-04/FULL-05-apache.md) does **not** simply parse these three lines. It gathers process/root path, main file and Include/IncludeOptional paths, and separately **actually loaded** files, then runs authored shell commands with status flags and checks shell `stdout_line` Items. Consequently:

1. **Immediate honest mode:** AI can propose sample command stdout/stderr/exit-status **as author-entered synthetic observations**, and the source-appropriate Test predicates can be evaluated **only where implemented**. For unsupported Test collectors/expressions show `UNSUPPORTED` rather than “passed”.
2. **Future adapter:** Parse a **virtual file tree with paths**, comments, include targets, documented traversal/ordering and effective directives into typed source data with exact line provenance; compare its observations with independently captured examples of the original authored shell commands.
3. **Separate ‘static config lint’ mode:** A text preview could highlight `KeepAlive On` and `MaxKeepAliveRequests 100` as *heuristic configuration observations*, but **must not be labeled a SCAP-NG Assessment result** until complete provider/source/evaluation semantics are proven. Include files, VirtualHosts, loaded modules, config precedence and runtime environment can change effective behavior.

Failure examples to insist upon: two conflicting directives, quoted/commented fake directives, missing include, partial file set, wrong process namespace, command nonzero exit, stderr and empty stdout (as distinct from no command Item). Never make a shell command by substituting user text into the source to “test it”; **do not execute user-supplied commands**.

## Adapter and evaluator contract — implementation-neutral

A narrow, explicitly typed service interface could expose:

```text
parse_sample_text(format, text, declared_scope, parser_version)
    -> source_observations + per-line diagnostics + provenance + effective_status

validate_fixture(assessment_revision, sample_observations)
    -> VALID | INVALID_SAMPLE | UNSUPPORTED + exact reason

run_supported_assessment(assessment_revision, sample_observations, engine_version)
    -> six_state_truth + per-source/Item/field/Test/evaluate trace
       OR UNSUPPORTED [capability/operator/field path]

check_expectation(scenario_revision, expected_result, actual_result)
    -> PASS | FAIL | NOT_RUN | UNSUPPORTED | INVALID_SAMPLE

explain(trace, author_question)
    -> AI-rendered explanation with exact cited trace nodes and uncertainties
```

**The LLM is not the result oracle.** The same assessment's Test outputs must be consistent whether a user typed Items directly or got them through a text adapter, subject to declared source status and exact data projection. Pin `assessment_sha`, `source/schema_version`, `parser_version`, `engine_version`, `sample_sha`, `expected_provenance`, and `observation_scope`. Separate **test assertion PASS** from **Assessment TRUE / Rule PASS** in the UI.

The service must be pure/isolated for the user sample path: **no real remote host connectivity, shell commands, imported arbitrary Python, uncontrolled file reads, or saving sensitive sample data to public Git**. For enterprise users, local/offline execution should be possible; do not upload real configuration contents to an AI model without explicit user control.

## Recommended bounded proof — after owner authorizes implementation

1. Reuse the existing Linux mount parser + pinned Assessment Test + `evaluate` bridge behind a small **read-only, in-process** `run_sample` adapter. Have the agent present input, actual, expected and sourced explanation. Prove zero/one/multiple, compliant/noncompliant and incomplete/error cases with pinned or independent expected results.
2. Add strict **typed evidence input** for the three Windows WMI role Tests. No Windows host WMI execution. The result tracer should distinguish missing **record member** from zero **collected Items**. Later add multi-Test source results when validated.
3. Only then evaluate one **source-faithful, virtual Apache text adapter**. Show *both* configured include paths and actually loaded-file sources or mark the missing one `UNSUPPORTED`. Verify against recorded stdout/status/evidence, not against the AI's guess from directives.
4. Test an unfamiliar auditor's ability to propose one compliant, one violating, and one unknown sample without writing YAML. Use the same underlying engine to compare merged vs separate existence/matching UI presentations.

**Verdict:** This is a strong reuse strategy, but the first engineering slice should be **sample-data evaluation UI plus strict typed adapters**, not another SCAP 1.4 compiler implementation or an unconstrained “paste text → pass” chatbot.
