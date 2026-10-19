# SCAP-NG browser demo (pre-alpha)

**October 18, 2026 · [Complexity audit and hierarchy-first iteration](../docs/EDITOR-COMPLEXITY-AUDIT-2026-10-18.md) · [Board-demo #6](https://github.com/vanderpol/scap-ng-editor/issues/6), [fast editor #8](https://github.com/vanderpol/scap-ng-editor/issues/8).** This is a browser-only, **desktop-first** demonstration: no ChatGPT Work, AI generation, server login, host scanner, or Python installation needed for the deployed site.

## How to use

- Load the hosted page using Chrome on a Chromebook, desktop browser, or mobile browser (phone layout is simplified).
- Six real source-backed Rule/Assessment pairs are fetched from the *immutable* pinned `vanderpol/scap-ng-editor-sample-data` repository. They are **pre-alpha r3 research examples** (not the current official DISA publication and not a normative 0.4 schema). This initial browser demo is **not** the full verified DISA XCCDF/SCAP source cache.
- **All** now lists loaded STIGs first, with expandable Rules and automation labels. There are currently **four STIG headings and six pinned Rules**, *not* the complete DISA STIG catalog. Search also matches STIG names. The full official source-cache/index remains unpopulated and is separately tracked in [sample-data #2](https://github.com/vanderpol/scap-ng-editor-sample-data/issues/2).
- Shared automated Assessment IDs are resolved using exact imported `assessment.id` and displayed as linked automation, rather than mislabeled non-automated. If an Assessment or a referenced Assessment-result dependency is absent, the editor reports the missing reference (and cycles) rather than treating the Rule as manual-only. Native `evaluate: { assessment: ... }` references are expanded **read-only** for review, without changing the saved source. Legacy OVAL `extend_definition` must be dereferenced through the trusted source converter/import pipeline, with negation/applicability and provenance preserved; this browser demo does not import OVAL XML directly.
- Filter or search the six loaded Rules. **Graphical opens by default:** follow the nested AND/OR Test tree and select any Test. The main **"What this check means"** view places editable values next to their meaning: **Look at → Check (field / comparison / value) → Field values: how many must match? → Results: how many must be found and match?**. A simple Apache `stdout_line` comparison can be edited directly; multi-State/record checks remain expandable. For `independent.shellcommand`, **Interpreter** is an editable dropdown beside the command, using the eight choices from the pinned upstream `0.4.0` shellcommand capability mapping (`sh`, `bash`, `csh`, `ksh`, `zsh`, `cmd`, `powershell`, `pwsh`). Changing it updates only `collect.shell`, after confirmation; the command text is **not** rewritten. Literal command strings are visible in a multi-line draft editor; Variable-generated commands show their source Variable and an expandable construction tree, **not an invented final command**. Edit simple field values inline, or expand a single detail area to inspect the underlying Object, States, nested record requirements, reused references, Sets/foreach and Variables. The UI is **not required to mirror YAML structure**, but every supported edit must map back to the exact native path. Switch **Guided**, **Source**, **Split**, **Sample data** as needed.
- **Export YAML** downloads the current draft. **Restore original** discards changes to the current Assessment. **Import YAML** supports further Rule/Assessment files from your device; corresponding Assessment IDs must match Rule references for auto-linking.
- Draft edits are stored in **the local browser storage for that origin**, not on GitHub or an AI service. The app performs no GitHub writes. The user remains responsible for exporting a reviewed copy.
- The **Sample data tab is now a deliberately disabled mock** showing where typed Items, source status and a future interpreter trace will go. Input/evaluate controls do not run until the editor is integrated with a tested SCAP-NG scanner evaluation kernel.

## Verified limitations

- The logic tree and nested Test inspector are navigable, but **Add/Remove/Unlink are still disabled plans**; changing graph structure safely requires the source-preserving AST plus reference/semantic validation. Source mode remains the expert route.
- The interpreter options are loaded from a **read-only pinned capability mapping** in `vanderpol/scap-ng` (configured in `site-config.js`), not invented or maintained as a duplicate enum. If the mapping is unreachable, the source version differs, the current value is unrecognized, or the interpreter comes from a Variable, the dropdown is read-only and Source editing remains available. This one control is not full schema validation.
- Common single-condition Tests have directly editable comparison/value and both field-level and collected-result matching dropdowns; changing the comparator asks for confirmation. The demo does **not** yet validate resulting Assessment semantics against a qualified scanner or preserve original YAML comments on structured edits.
- **Graphical edits currently reserialize YAML** with `js-yaml` and may change formatting or comments. Unedited source text is preserved. Mapping an inline control to the correct YAML path **does not yet establish lossless saving**. Always inspect exported drafts/diffs before applying to a maintained repository. The required source-preserving document core and version-pinned schema/reference validation are not implemented in this demo.
- Browser-side `js-yaml` only performs YAML parsing. **There is no version-aware deterministic JSON Schema/reference validator** in this build, and no scanner-backed Test/Assessment evaluation. No generated AI Assessment has been validated by this demo.
- The demo now loads six source-backed complexity fixtures, from Linux nosuid and Windows registry alternatives to nested record/user-right logic, RHEL foreach/Set/filters, Windows DNS Variable chains and Apache dependencies. **Complex dataflow is still hard to understand**, especially Apache; see the [six-case usability audit](../docs/EDITOR-COMPLEXITY-AUDIT-2026-10-18.md).
- The catalog indexes **only loaded Rules**. “Not automated in loaded content” does not mean impossible to automate. Automation candidate marking is a reviewer's proposal only.
- Initial examples load from `raw.githubusercontent.com`. If a restricted/proxied network blocks that host, use the **Import YAML** control and files exported from `vanderpol/scap-ng-editor-sample-data`; it will report a cache-load warning rather than silently fetching unauthoritative content.
- Editing/reviews are best on a Chromebook or desktop. Phones work for browsing and minor changes but are not the primary UI.
- Do not put secrets, real host evidence or private files into a publicly shared browser session; any manually imported data stays local in this version.

## GitHub Pages setup — first deployment

This repo's [deploy workflow](../.github/workflows/browser-demo-pages.yml) publishes the `browser-demo/` folder as static website files. **It cannot deploy successfully until a repository administrator enables Pages.**

1. Visit `https://github.com/vanderpol/scap-ng-editor/settings/pages`.
2. Under **Build and deployment**, select **Source: GitHub Actions**. The repository is public; no custom domain is necessary for the initial demo.
3. Open `https://github.com/vanderpol/scap-ng-editor/actions/workflows/browser-demo-pages.yml`, choose **Run workflow** on `main` if a successful deploy did not start automatically.
4. Inspect the workflow run's **Deployment URL**. The normal default would be `https://vanderpol.github.io/scap-ng-editor/` but **do not advertise it as live until the Pages deployment and an actual browser test pass**.

If Pages settings cannot be enabled under the connected GitHub token, the repository owner must change them in GitHub's UI. Keep source artifacts and deployment reviews in GitHub.com for whitelisted networks.

## Move to the OVAL Community web site later

This is deliberately static and portable:
- All in-app assets use **relative URLs** (`./app.js`, `./style.css`, `./site-config.js`), not a hard-coded `vanderpol.github.io` domain.
- External example source is isolated in **`site-config.js`**, where a future OVAL Community-maintained source/index repository or same-domain preprocessed data path can replace the current `vanderpol/scap-ng-editor-sample-data` pin.
- The site can be rebuilt/published from an OVAL Community GitHub repo, hosted under an approved custom domain, or embedded as a linked tool in the community page once the maintainers approve hosting and any licensing/security requirements.
- **Deployment portability does not imply organizational approval** or that the community domain/website has been configured. No external data authority migrates automatically by copying web files.

The future production version should add a true source-preserving AST, per-Rule indexed official XCCDF/SCAP cache, local version-aware structural validation, tested scanner core, optional provider-neutral AI, and offline VS Code edition.
