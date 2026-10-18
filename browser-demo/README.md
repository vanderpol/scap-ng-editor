# SCAP-NG browser demo (pre-alpha)

**October 18, 2026 · [Board-demo #6](https://github.com/vanderpol/scap-ng-editor/issues/6), [fast editor #8](https://github.com/vanderpol/scap-ng-editor/issues/8).** This is a browser-only, **desktop-first** demonstration: no ChatGPT Work, AI generation, server login, host scanner, or Python installation needed for the deployed site.

## How to use

- Load the hosted page using Chrome on a Chromebook, desktop browser, or mobile browser (phone layout is simplified).
- Two real source-backed Rule/Assessment pairs are fetched from the *immutable* pinned `vanderpol/scap-ng-editor-sample-data` repository. They are **pre-alpha r3 research examples** (not the current official DISA publication and not a normative 0.4 schema). This initial browser demo is **not** the full verified DISA XCCDF/SCAP source cache.
- Filter or search loaded Rules. Select a Rule; switch **Guided**, **Graphical**, **Source**, **Split**, **Sample data**. Change existing scalar values and enum fields in guided/graphical mode, or edit the full YAML in Source mode and press **Apply YAML** to update the views.
- **Export YAML** downloads the current draft. **Restore original** discards changes to the current Assessment. **Import YAML** supports further Rule/Assessment files from your device; corresponding Assessment IDs must match Rule references for auto-linking.
- Draft edits are stored in **the local browser storage for that origin**, not on GitHub or an AI service. The app performs no GitHub writes. The user remains responsible for exporting a reviewed copy.
- The synthetic sample panel only collects suggested Item/field evidence. **No authoritative assessment outcome is calculated**; a tested scanner evaluation-only kernel still has to be integrated.

## Verified limitations

- Graphical editing changes scalar values and supported finite fields, **not arbitrary Test/State graph restructuring**; use Source mode for structural changes.
- **Graphical edits currently reserialize YAML** with `js-yaml` and may change formatting or comments. Unedited source text is preserved. Always inspect the exported diff before applying it to a maintained source repository. A source-preserving document model remains a core product requirement but is not implemented in this static demo.
- Browser-side `js-yaml` only performs YAML parsing. **There is no version-aware deterministic JSON Schema/reference validator** in this build, and no scanner-backed Test/Assessment evaluation. No generated AI Assessment has been validated by this demo.
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
