# Model-neutral AI integration for the SCAP-NG editor

**18 October 2026 · Owner requirement · [#5](https://github.com/vanderpol/scap-ng-editor/issues/5) / [#4](https://github.com/vanderpol/scap-ng-editor/issues/4). Research / architectural requirement, not coding authorization.**

## Non-negotiable: SCAP-NG must not require OpenAI, Copilot, or any other AI provider

The VS Code extension must remain usable without AI, GitHub access, Internet connectivity, or a licensed chat subscription. If an author wants AI assistance, they choose the provider/model/endpoint or an optional public/self-hosted SCAP-NG agent. The extension **must not bundle a mandatory ChatGPT login**, silently send content to OpenAI, or require another particular service.

Supported provider **categories**:
- **No AI:** full local document/editor functionality, pinned schemas/diagnostics and author-created sample fixtures. Mandatory in air-gapped environments.
- **User-selected integrated VS Code model:** use the [VS Code Language Model API](https://code.visualstudio.com/api/extension-guides/ai/language-model) or registered provider/model where authorized; let user explicitly select among available model choices. Do not depend on GitHub Copilot subscription as a hard prerequisite. Model availability/consent/policy may limit particular features.
- **External cloud model:** user-supplied API key and explicit provider endpoint for Anthropic/Claude, Google/Gemini, OpenAI/GPT, xAI/Grok, or any API-compatible gateway. Never infer that support for a brand or model means identical tool/streaming/context behavior.
- **Offline/on-prem model:** user-installed provider such as Ollama, llama.cpp server or a sanctioned on-prem endpoint, with zero external egress. Offline AI remains optional and should never be a condition for editing, validation or fixture capture.
- **SCAP-NG hosted or self-hosted agent:** optional managed authoring assistant that speaks a published protocol and uses the same constrained SCAP-NG tools. A **public** service is a potential future deployment, **not one that currently exists or is promised**. Support a locally hosted instance when air-gapped organizations choose that approach.

The chosen model **only proposes content**. Versioned deterministic schema parsers check syntax and structure; **the tested SCAP-NG evaluation core** supplies all authoritative sample-data or host assessment results; human approval controls publication. Do not allow a provider/model switch to change the engine's result, source meaning, sample fixture expectations or native file serialization.

## Distinguish *model provider* from *SCAP-NG authoring tools*

```text
VS Code Editor / AI chat front end / hosted agent
         |
   OPTIONAL model adapter
   none | VS Code-selected | cloud API | local server | SCAP-NG service
         |
   vendor-neutral SCAP-NG tool interface
   read pinned Rule/source; find patterns; propose source patch
   deterministic schema/reference diagnostics; preview exact diff
   save synthetic fixtures; run tested scanner evaluation-only core
         |
     explicit human review + local save/export or approved Git change
```

A **provider adapter** handles transport and model-specific capabilities, prompt/message limits, tool-call representations and streaming. A **domain-service/tool adapter** handles the SCAP-NG contract, typed versions, permissions, explicit error reporting, deterministic results and source provenance. This prevents AI provider APIs from contaminating the language schema or editor data model.

Recommend a common, independently hosted or locally packaged [Model Context Protocol (MCP)](https://code.visualstudio.com/api/extension-guides/ai/mcp) tool interface for model-neutral agent use, **where its security and transport model fit**; also permit native in-process extension commands for offline use with no MCP-server installation. MCP itself does not provide correctness, authentication or SCAP-NG evaluation. Do not treat an arbitrary MCP tool response as authoritative scan results.

## Current VS Code platform feasibility, verified in Oct 2026

The current [VS Code language-model configuration guide](https://code.visualstudio.com/docs/agent-customization/language-models) supports built-in providers, provider extensions and custom endpoints using Chat Completions, Responses or Anthropic Messages-compatible API shapes. [Language Model Chat Provider API](https://code.visualstudio.com/api/extension-guides/ai/language-model-chat-provider) allows extensions to contribute providers and model selections; the [Language Model API](https://code.visualstudio.com/api/extension-guides/ai/language-model) enables direct AI integration from an extension.

**Design conclusion:** Prefer *consuming* a user-selected VS Code model where possible rather than implementing five separate SaaS SDKs immediately. Use a documented provider adapter for local AI and compatible external endpoints only when necessary for a reproducible SCAP-NG-specific workflow. Some APIs/provider features are model-specific, user-consent gated, paid or disabled by enterprise policy; feature-discover instead of guessing. VS Code [BYOK](https://code.visualstudio.com/docs/agents/concepts/language-models) supports local models without GitHub account or Internet; inline completions and embeddings may have separate limitations. **Never claim the editor requires Copilot because VS Code chat exists.**

## Secure configuration rules

- User-visible AI mode (off/local/VS Code-selected/direct cloud/SCAP-NG agent), provider/model name, configured endpoint, network/privacy indicator and optional token budget.
- Local model/endpoint may be selected from configured trusted instances. Validate endpoint protocol and explicit user trust, enforce timeouts/cancellation, prevent arbitrary model-generated network targets or SSRF-style host access.
- Credentials stored in VS Code's secret-storage mechanisms or approved OS-backed store, **not** plaintext workspace settings/YAML, Git history, prompt logs or exported fixtures.
- Never send uploaded STIGs, unpublished Assessments, system configuration samples, sensitive evidence or full repository source to a cloud service **without opt-in and an explicit review of what is sent**. Allow a strict offline/air-gap policy that disables cloud tools and outbound egress.
- Scope every AI tool to read-only by default; separate confirmation for local writes, Git commits, and remote pushes. Only source-preserving patch application tools can update files, with exact file list, preview and schema diagnostics.
- AI model outputs are untrusted suggestions, and externally obtained Rule/check text is untrusted prompt input. Domain tool permissions must not depend on model instructions.
- If chosen provider lacks tool calling, structured output or suitable context window, **gracefully degrade** to draft suggestions and manual review, not bypass deterministic validation.
- No hidden “best model” or OpenAI default. The author explicitly selects. No-AI/offline mode remains fully usable.

## Public SCAP-NG agent design (optional future)

A provider-neutral, open-contract SCAP-NG agent could offer a convenient default to connected users. If later deployed, expose:
- explicit provider choice where user brings their own model/key, or a transparently hosted and quota-limited provider with clear ownership/cost/privacy;
- a stable versioned protocol and documented client/tool contract;
- scanner-backed Assessment results only on supported test slices;
- source/assessment revision pinning, provenance, expected fixture assertions, draft-only status and authenticated review/commit permission separation;
- *self-hosted/offline deployment* for organizations with approved local models, with no assumption the public service is reachable;
- disabled-by-default uploads and secure isolation across users and repositories.

Do **not** position an undeployed public SCAP-NG agent as the required authentication or evaluation authority. Native SCAP-NG files and tested scanner behavior remain interoperable and open even if this hosted service is unavailable.

## Acceptance matrix

| Scenario | Required product behavior |
| --- | --- |
| No network, no model, no API key, no GitHub | Full native source editing, offline validation/diagnostics with pinned pack, synthetic sample fixture authoring and file/patch export work |
| Offline local model installed | Author explicitly selects local-only provider; no network traffic or external source uploads |
| Claude vs Gemini vs Grok vs GPT through supported provider APIs | Can propose/revise the **same** draft with identical SCAP-NG tool contracts; provider-specific unsupported features are visible |
| Enterprise policy disables BYOK/model provider | Editing and deterministic validation remain fully functional, AI calls fail gracefully |
| User chooses hosted SCAP-NG agent | Clear data transfer, authentication/cost/privacy and separate approval for writes; no unsupported verified results |
| Unsupported capability or simulator-only Python outcome | “NOT SCANNER-VERIFIED”; AI must not supply an independent true/false verdict |
| Prompt asks AI to commit or bypass approval | Exact diff and explicit author approval required; no automatic GitHub write |
| Switching models after draft creation | Keep same source/fixture revisions and scanner versions; show changed **draft proposal**, never change accepted results or source invisibly |

This extends [air-gapped VS Code contract](OFFLINE-VSCODE-EDITOR-CONTRACT.md), [AI-first architecture](AI-FIRST-AUTHORING-AGENT.md) and [shared development plan](SHARED-DEVELOPMENT-PLAN.md). No editor, compiler or scanner implementation is authorized by the research doc.
