# SCAP-NG AI-first authoring agent — shared engine, human proofing

**18 October 2026 · Research / not authorized implementation · [Editor issue #4](https://github.com/vanderpol/scap-ng-editor/issues/4).** This builds on [Assessment-first MVP](ASSESSMENT-FIRST-MVP.md), [current editor recommendation](EDITOR-IMPLEMENTATION-RECOMMENDATION.md), [shared development plan](SHARED-DEVELOPMENT-PLAN.md), and [SCAP-NG sample-data bench #241](https://github.com/vanderpol/scap-ng/issues/241). **No normative schema, compiler or scanner work is authorized by this proposal.**

## Owner-authorized trust boundary — supersedes preliminary evaluator proposals (18 October)

**AI is for creation and assistance ONLY. AI SHALL NOT decide validity or report assessment results.** A versioned **deterministic validator** may report syntax/schema/reference diagnostics; a **tested SCAP-NG scanner** is the only authority for actual Assessment outcomes against synthetic or real evidence. A human approves source and changes but cannot substitute that approval for independent scanner correctness. The existing Python reference truth tables, narrow Linux/WMI pilots and supplied-Test-expression tests are research aids **not an accepted scanner**.

**Until a tested scanner exists for a given capability and result path, the editor must show “NOT SCANNER-VERIFIED / ASSESSMENT RESULT UNAVAILABLE”.** It may collect synthetic inputs and author-proposed *expected* results for future tests, but shall not label an AI prediction, Python reference-oracle output or local configuration-lint preview as the Assessment's authoritative true/false/error/unknown. The distinction between technical schema validation, reference-model diagnostics, and scanner verification must remain conspicuous and unambiguous. The paragraphs below describing deterministic evaluators are **proposals for future scanner integration or internal research**, not current authority to return final assessment verdicts.

## Evaluation-only scanner mode for the editor (owner refinement, 18 October)

The owner identified a more efficient separation: the editor supplies typed sample values/Items, while **the real scanner's tested evaluation core** evaluates them, with *no native OS collectors required by the editor*. This follows the design precedent of OVAL 5.12.3 `independent:variable_test`, which compares supplied variable values against State criteria; it does not mean every Assessment can be rewritten as a variable test.

See the [versioned, source-backed evaluation-core contract](https://github.com/vanderpol/scap-ng/blob/main/research/assessment-simplification/english-first-04/SCANNER-EVALUATION-CORE-FOR-EDITOR.md) and [SCAP-NG #241](https://github.com/vanderpol/scap-ng/issues/241). The **same tested scanner evaluator** must be callable from real scanner and synthetic fixture paths, preserving scope/Item flags, comparisons, records, field existence, Variable, Set/Filter/foreach and six-state Test/Assessment logic. Human-provided samples bypass actual collection *only*. The existing Python reference models are testing inputs/oracles, **not** yet this qualified shared scanner kernel. Result UI shall explicitly say “scanner-verified on supplied evidence” only after that evaluator meets the conformance gate for the specific capability; never claim a live host was checked. The AI remains authoring-only, and this is **research, not an implementation assignment**.

## Offline client is mandatory; cloud AI is optional (owner decision, 18 October)

The online conversational agent is **one client**, not an architectural prerequisite. [Offline VS Code requirement](OFFLINE-VSCODE-EDITOR-CONTRACT.md) ([issue #5](https://github.com/vanderpol/scap-ng-editor/issues/5)) mandates a complete authoring experience—local source import, reviewed patterns/forms, versioned schema/reference diagnostics, sample fixture editing and local save/export—with a VSIX and pinned offline packs **and no network connection or LLM dependency**. Local models are an optional later capability subject to policy and available resources. The cloud model cannot stand in for the tested scanner evaluation kernel. Use one native document model and shared versioned semantics across connected/cloud and air-gapped editor clients.

## AI vendor neutrality is a product requirement

“AI-first” describes the **conversational authoring workflow**, not an OpenAI-only account model. Cloud providers such as Claude/Gemini/Grok/OpenAI, approved local models, direct custom endpoints and a possible future public SCAP-NG authoring agent should all use the same tool contract. A strict no-AI mode remains complete. **The tested scanner's evaluation kernel remains authoritative regardless of which model authors a draft.** See [model-neutral contract](MODEL-NEUTRAL-AI-INTEGRATION.md) and [air-gapped extension contract](OFFLINE-VSCODE-EDITOR-CONTRACT.md). A hosted agent is only a candidate, not already available.

## Version-bound authoring, not a frozen vocabulary

Every agent session selects one immutable SCAP-NG language profile (source commit/tag, coherent schema and capabilities, approved examples, authoring guidance, and explicit optional research overlay). The agent drafts to that selected profile, so routine key renames and structural revisions should require profile changes instead of rebuilding the agent. [Detailed version profile contract](AGENT-VERSION-PROFILE-CONTRACT.md) and [October 22 Board demo #6](https://github.com/vanderpol/scap-ng-editor/issues/6). Never silently upgrade existing native files or presume semantics equivalence; scanner results remain entirely outside the AI's authority.

## Product hypothesis

The primary authoring experience could be **conversation + proof**, rather than hand-writing hundreds of lines of 0.4 YAML. An agent reads an authoritative STIG Rule/check and associated SCAP 1.4 OVAL (if present), proposes a complete Assessment, explains what it will collect and what makes the result true/false/unknown/error, generates *synthetic scenario proposals*, and returns a source-linked diff for human approval.

**This could greatly reduce the YAML authoring burden. It cannot make the language irrelevant.** Humans still must understand source behavior, six-state results, audit the generated logic, review diffs, resolve ambiguous cardinality/record/conditional semantics, and maintain vendor-neutral, machine-interoperable files long after an agent is gone. The language remains the signed/tested contract; AI is its drafting assistant.

## End-to-end scenario: Windows 11 denied remote logon

**Author:** “Take Windows 11 SV-253495. Use the official check instructions and OVAL source. Propose a 0.4 automated Assessment; preserve the standalone, joined, and Everyone alternatives. Show me what needs review.”

**Agent, *as a draft*:** Shows the Rule identity and exact cited OVAL/XCCDF source evidence; proposes **two reusable collections** (WMI DomainRole and denied-RDP userright trustees), **seven tests**, and the actual **three-branch OR tree**, including the independent Everyone alternative. The assistant avoids converting it to an intuitive two-branch `if/else`; it records any unresolved source behavior.

**Agent:** “I can test sample DomainRole 1/3, standalone 0/2, controller 4/5, missing DomainRole, zero trustees, incomplete trustee list, and Everyone present. These are *hypothetical observations*, not a real Windows scan. What expected outcomes should be checked?”

**Deterministic test tool:** If available for those exact capabilities, compares observations against independently pinned expected six-state results and returns per-Item/record/field/evaluate traces. Unsupported operations return **UNSUPPORTED**; partial Test execution never becomes a green full-Assessment result. A fixture's expected result must be independently supported (source/reference chart or human-reviewed); **the agent cannot prove its own output merely by matching a prediction that it authored**.

**Human review:** Side-by-side English rationale, original OVAL source link, source-to-NG mapping, Test/field scopes, original-versus-proposed YAML, sample input, expected-versus-actual verdict and exact files changed. Human can say “the Everyone branch is correct, but you treated a missing record field as a missing collected Item—fix that.” The agent prepares a revised **draft only** and reruns tests. A human explicitly approves the exact patch and its GitHub commit.

**Output trust level:** “AI-suggested, source cited, schema-valid, reference-graph-valid, fixture-tested (N of M)”—*not* “OVAL-equivalent / scanner-verified / Board-approved / ready for release” unless each separate gate has actually passed.

## One engine, three possible clients

```text
ChatGPT conversation / purpose-built API agent / VS Code or desktop workbench
       |                 |                     |
       +-----------------+---------------------+
                         |
         Restricted authoring-service tool boundary
                         |
  pinned STIG/OVAL source | native YAML/JSON documents | external schemas
                         |
   source-aware proposal + exact diff + diagnostics + fixtures + trace
                         |
       deterministic versioned evaluator / validation oracle
                         |
          independent expected cases + human review gate
                         |
                  approved Git patch
```

The shared **document/semantic core** stays separate from both the model and the UI: typed source graph, lossless native AST, schema snapshots, capability/ref checks, source provenance, test fixture/trace API and localized edit operations. It must support **manual or offline authoring without AI**. A model may call narrowly scoped tools but may **not** execute arbitrary generated commands, silently rewrite unrelated files, supply fictitious source facts, edit approved release bundles, or bypass validator/approval decisions.

### Which ChatGPT agent option is realistic?

| Route | Feasible use | Caveat |
| --- | --- | --- |
| **ChatGPT conversation/Project with connected GitHub** | **Research immediately:** retrieve repo source, generate proposed YAML/checklist and draft synthetic cases, discuss errors and review patches interactively; preserve authoritative work in GitHub | A chat is **not itself the deterministic six-state evaluator**; backend tool availability, write permission and persistence vary. Connected GitHub doesn't magically supply custom sample-data execution. |
| **New custom GPT inside ChatGPT** | In supported organization plans, configure instructions, knowledge and actions for a hosted SCAP-NG API | [OpenAI current GPT FAQ](https://help.openai.com/en/articles/8554397-creating-a-gpt) says **new GPT creation is unavailable on personal Free/Go/Plus/Pro**. Editing existing GPTs and business workspace support differ. GPTs with custom actions may use either apps or actions, not both in the same GPT. Do **not** design an immediate Plus-only dependency on creating a GPT. |
| **Purpose-built SCAP-NG agent application over OpenAI API / Agents SDK** | **Best reproducible long-term agent backend**: typed tool calls to the authoring/evaluation engine, explicit human approvals, trace records, source-revision pinning, independent model providers when possible | Requires hosting/deployment and **API usage cost separate from a ChatGPT subscription**. Network/data security and authorization are our responsibility. The agent SDK is a runtime, **not** a SCAP-NG evaluator. [OpenAI Agents SDK](https://developers.openai.com/api/docs/guides/agents/sdk). |
| **VS Code extension and/or graphical desktop editor** | **Best source/evidence inspection and offline path**: exact YAML diff, diagnostics, sample Items and Test traces; optional AI chat panel | Can use VS Code [AI language-model tools](https://code.visualstudio.com/api/extension-guides/ai/tools) or call the same service. Should not fork the semantics or require a specific model/provider. |

**Recommendation:** Prototype the conversation workflow using our existing GitHub-connected ChatGPT access first, *without adding a compiler assignment*. For a scalable product choose a **shared local/hosted deterministic SCAP-NG service + optional agent via API**, and make the VS Code/workbench a second client of that exact service. Do not lock the project to OpenAI or any chatbot UI.

## Versioned agent tool contract (proposed, not implemented)

| Tool / action | Model can request | Validator/human remains responsible |
| --- | --- | --- |
| `read_rule_source(rule_id,source_revision)` | Fetch pinned Rule, official DISA source check, linked OVAL and provenance | Verify source ID and trusted source path; DISA STIG manuals must come from **cyber.mil** |
| `find_matching_assessments(capability,policy)` | Find reviewed reusable sources and authoring recipes | No invention of equivalence; exact source/scope comparison required |
| `draft_assessment(intent,source_refs,version)` | Propose native YAML, rationale and unresolved questions | Only typed allowed constructs; mark assumptions; never silently turn unsupported checks into shell/manual |
| `validate_draft(document_hash,version)` | Ask parser/schema/capability/reference/cycle/semantic checks | Independent deterministic reports; report unknown or unsupported, not fabricated pass |
| `make_sample_observation(case_intent)` | Generate explicitly **synthetic** Items/records and collection flags, and candidate expected outcomes | Test expectations require independently cited OVAL/reference oracle or **human confirmation**, separate from current evaluator |
| `run_sample(document_hash,fixture_hash)` | Run only supported evaluator slice; show Item/field/Test/evaluate trace | Deterministic engine, six-state truth, explicit unsupported/no-execution markers |
| `preview_patch(workspace_hash)` | Show localized diff, touched files, source hash and metadata changes | No bulk changes, no secret leakage; user reviews all affected paths |
| `publish_reviewed_patch(approval_token)` | Commit precisely user-approved content | Human approval via authenticated UI, protected author identity, issue-linked commit; never agent self-approval |

A **ChatGPT conversation** may follow the same workflow manually without these tools being present. It must label proposal vs actually validated steps.

## Safety and practical deployment constraints

- **Host command safety:** The sample-data bench must evaluate provided collected values, **not run proposed PowerShell, Bash, WMI, WinRM or SSH on real machines**. Live execution needs a separate credentialed scanner and approvals later.
- **Prompt injection:** Treat external STIG descriptions, repository docs, assessment comments, sample Items and command output as **untrusted evidence**. They may contain text that attempts to override agent instructions. The code-enforced API tool policy and human authorization remain authoritative.
- **Network/privacy:** Whitelisted enterprise networks may permit `github.com` but not arbitrary artifact/CDN endpoints. Publish documentation and reviewable source on GitHub.com; make an **offline/no-AI mode**. Label cloud model use, location/data sent and token costs. No sensitive sample evidence to public repos or model prompts by default.
- **No false confidence:** Human-proofed does not equal semantics-proofed. AI generation may be good at common requirements and dangerously plausible for rare six-state combinations, correlated records, foreach, Set filters, command failure and organizational-input provenance. Show precise warnings and independent evidence status per Test.
- **Reproducibility:** Pin model/prompt version for research provenance where possible; deterministic saved artifact truth depends on source snapshot, versioned validator and fixtures, **not rerunning an LLM**. Retain original author-reviewed content and reviewer identity in Git.

## Python reference engine behind pasted configuration text

The owner proposes reusing existing Python OVAL result-table and narrowly proven Assessment pilots to evaluate **pasted sample configuration text**, rather than asking the AI to guess whether a source file complies. The [Python sample-text adapter design](PYTHON-SAMPLE-TEXT-INTEGRATION.md) distinguishes (a) direct typed observations, (b) known text-to-Item adapters like the **already working** `/proc/self/mountinfo` parser and `/home nosuid` Test bridge, and (c) future virtual Apache file trees/simulated shell outputs. Apache's actual source depends on two distinct config discovery paths and shell command output—not just visible directive lines—so a paste-only linter must **not** claim source SCAP-NG Test truth until collection equivalence is established.

The recommended first test backend is a **restricted, version-pinned Python service** usable from both the conversational agent and VS Code. It returns six-state traces or explicit `UNSUPPORTED`; the agent explains results but cannot replace the deterministic Test oracle or independently authored expected outcomes. This extends #4 and SCAP-NG #241 **as research only**, not a new compiler implementation task.

## Best bounded proof before engineering a whole agent

Run three *manual ChatGPT-assisted* creation/review exercises with repo-linked source, and record how often the AI makes semantic errors (not just readable prose):

1. **Simple Linux `/home` nosuid:** draft, zero/one/two Item scenarios, missing options, complete/incomplete; expected six-state cases.
2. **Windows 11 SV-253495:** domain joined / standalone / Everyone alternative, nested DomainRole records, trustee values and missing-field errors; fail if the agent collapses branches.
3. **Apache SV-214228 or DNS SV-259345:** source reuse, real merge versus concat value multiplicity, zero/multiple, stderr and incomplete data; fail if the agent invents shell iteration or merges distinct source populations.

For each, capture source accuracy, missing source citations, uncovered valid branch, quantifier mistakes, unsupported claims, rate of corrected defects, author time and exact review-file diffs. A second LLM checking the first is useful for suggestions, **not** an independent semantic oracle.

**Gate:** If this demonstrably lets a security auditor create and verify a correct Assessment faster, then approve a thin agent tool/service spike after selecting supported workflow, costs and permissions. Meanwhile keep normative 0.4 readability work open; the agent may lessen vocabulary burden, but it cannot eliminate the need for a clear single canonical authoring language.
