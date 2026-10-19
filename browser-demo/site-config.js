/* Hosting/source configuration. Move site to OVAL Community by adjusting this file, not the editor code. */
window.SCAPNG_DEMO_SOURCE = Object.freeze({
  repository: "vanderpol/scap-ng-editor-sample-data",
  revision: "99cbceae8d594c44cb509df95975ac1676a2b44a",
  sourcePath: "focused-fixtures/source-backed/authoring/"
});

/* Read-only capability vocabulary, pinned separately from pre-alpha fixture data. */
window.SCAPNG_DEMO_SHELL_MAPPING = Object.freeze({
  repository: "vanderpol/scap-ng",
  revision: "74b9551f516972ad7ab979c8e39897933e6a9a93",
  path: "schema/v0.4.0/capability-mappings/supported/independent.shellcommand.json",
  specificationVersion: "0.4.0"
});

/* Complete Rule indexes: pinned preview authoring release, fetched lazily by the browser. */
window.SCAPNG_COMPLETE_CATALOG = Object.freeze({
  repository: "vanderpol/scap-ng-editor-sample-data",
  revision: "1378a794a6f793093849e06959b5b2044bcff2c0",
  manifestPath: "complete-stigs/manifest.json"
});

/* Guided authoring is fail-closed: capability State field lists are read from
   these matching, immutable upstream 0.4-A mappings, not invented by the UI. */
window.SCAPNG_GUIDED_MAPPINGS = Object.freeze({
  repository: "vanderpol/scap-ng",
  revision: "74b9551f516972ad7ab979c8e39897933e6a9a93",
  specificationVersion: "0.4.0",
  capabilities: Object.freeze([
    "independent.textfilecontent54",
    "unix.file"
  ])
});
