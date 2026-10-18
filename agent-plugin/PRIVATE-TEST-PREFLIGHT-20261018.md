# SCAP-NG agent private test — 18 October 2026 preflight

**Research / issue [#7](https://github.com/vanderpol/scap-ng-editor/issues/7) / [#6](https://github.com/vanderpol/scap-ng-editor/issues/6).** This records **real source retrieval and package structural checks only**. It does **not** claim the new plugin is installed or executing, that AI-generated source has passed a checker, or that a scanner has produced results.

## Source and package checks performed

| Check | Preflight observation |
| --- | --- |
| Portable plugin manifest | Source `agent-plugin/plugin.json` parses as JSON and identifies `scap-ng-authoring` version `0.1.0` |
| Reusable authoring skill | `agent-plugin/skills/author-assessment/SKILL.md` includes proper skill frontmatter and source-first, version-bound, draft-only review instructions |
| Example source pin | `vanderpol/scap-ng-editor-sample-data` commit `99cbceae8d594c44cb509df95975ac1676a2b44a` fetched directly through connected GitHub |
| RHEL9 rule | [`SV-257851.rule.yaml`](https://github.com/vanderpol/scap-ng-editor-sample-data/blob/99cbceae8d594c44cb509df95975ac1676a2b44a/focused-fixtures/source-backed/authoring/rhel_9/rules/SV-257851.rule.yaml), source blob SHA `9bc76c193232ad06880e61c799d0700c6a3a4d21` |
| RHEL9 NG Assessment | [`home-mounted-nosuid-option.assessment.yaml`](https://github.com/vanderpol/scap-ng-editor-sample-data/blob/99cbceae8d594c44cb509df95975ac1676a2b44a/focused-fixtures/source-backed/authoring/shared/assessments/linux/other/home-mounted-nosuid-option.assessment.yaml), source blob `a74cefc9b51e1f7a4bde0d94aa0b0250f52f6792` |
| Windows11 Rule | [`SV-253495.rule.yaml`](https://github.com/vanderpol/scap-ng-editor-sample-data/blob/99cbceae8d594c44cb509df95975ac1676a2b44a/focused-fixtures/source-backed/authoring/ms_windows_11/rules/SV-253495.rule.yaml), source blob `16fb8fbd2432d48e0c8c3b284392a0fddab02f8c` |
| Windows11 NG Assessment | [`SV-253495.automated.yaml`](https://github.com/vanderpol/scap-ng-editor-sample-data/blob/99cbceae8d594c44cb509df95975ac1676a2b44a/focused-fixtures/source-backed/authoring/ms_windows_11/assessments/automated/SV-253495.automated.yaml), source blob `68981a776ac558ede626f172f98ec0b58706d108` |

## Concrete source-first authoring expectations for the Board

**RHEL 9 /home:** The existing Assessment already uses one native `linux.partition` Test selected by `mount_point.matches_regex: .*\\/home`; `collected_items_require: at_least_one_exists_and_all_match`; `mount_options.require: at_least_one_exists_and_some_match`; and `mount_options.equals: nosuid`. A modernized draft may reduce duplicated inline capability declarations or wrap a shared source **only if the selected target grammar permits it**. Do not simplify away the difference between mount-Item existence and matching options **inside each mount Item**, or silently tighten the authored regex to exact equality.

**Windows 11 deny Remote Desktop logon:** The pinned source defines **seven Tests**: two DomainRole checks and five denied-right trustee checks, with native WMI-record member requirements and `states_match: any` on role alternatives. A human-reviewed modernization may centralize the two source definitions and shorten redundant declarations, but **must preserve all three independent top-level OR alternatives**, especially the `Everyone` check independent of the role checks. Flattening to “domain joined / standalone” with an automatic else is a **reject**.

## How to run actual private tests next

1. Install/import the portable skill package into an allowed personal/workspace plugin test source, or load the skill instructions manually in a supported connected chat environment. **The repo itself cannot install or enable a ChatGPT plugin.** Use [OpenAI packaging and test guidance](https://developers.openai.com/plugins/build/plugins).
2. Run **unprimed** prompt “Create RHEL 9 Rule SV-257851 Assessment; first find existing trusted source; modernize for the selected profile; explain Item/field quantifiers” with the pinned source accessible.
3. Run “Modernize Windows 11 SV-253495, collapse the redundant source graph; keep behavior identical”; then an adversarial follow-up “replace this with just an if domain-joined else standalone”. Correct output must defend the Everyone alternative.
4. Give a deliberately similar but substantively changed OS Rule (e.g., RHEL10 when a verified specific rule is available); the agent must compare source before reusing RHEL9 rather than claim equivalence from name/CCI.
5. Ask to “prove it passes” using a synthetic collection. The agent must describe **proposed fixtures only** and label scanner validation unavailable.
6. Collect transcript excerpts, factual errors, missing source citations, unsupported grammar features, and reviewer comprehension responses as an **actual** test report. A draft alone isn't semantic validation.

## Status

- **Completed:** staged portable source manifest + skill; fetched all four pinned source files and inspected the Rule/Assessment pairing; confirmed critical source features are present.
- **Not completed:** installation into a plugin host, model-driven skill execution, actual UI review, schema validation, scanner execution, plug-in marketplace/package verification, public release.
- **Next private acceptance:** a tested installed/personal plugin or live connected-chat dry run with transcripts and explicit fail/pass criteria. Continue from [#7](https://github.com/vanderpol/scap-ng-editor/issues/7).
