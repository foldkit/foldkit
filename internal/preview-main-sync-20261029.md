# Preview main sync | October 29, 2026

## Candidate

The isolated `codex/preview-main-sync-20261029` branch merges main at
`b702a5efbb74bebc056b798b414ddb923a82fbd5` into stabilization source
`6bf5b7e7429cc8a7854bf11248eeb6d209945766`. It does not publish packages or
change PR #1655's Ready snapshot.

Main at this commit uses Effect 4.0.0. This merge does not establish Effect 4.1
compatibility. Adopt the incoming 4.1 update and verify its actual package
constraints before preparing the next release approval.

The contributor closed [#1851](https://github.com/foldkit/foldkit/pull/1851), a
`node:crypto` workaround, in favor of the Effect 4.1 migration discussed in
[#1733](https://github.com/foldkit/foldkit/issues/1733#issuecomment-6500513592).
The proposed replacement uses `SecureRandom` with `NodeCrypto.layerSecureRandom`
for relay id and token generation. The removed root `Crypto` import and the
unstable API peer constraints need verification as part of that upgrade. This
main commit includes neither implementation.

## Conflict assessment

The merge has 74 conflicted paths. The preview already contains the incoming
behavior, adapted to its current Block APIs:

- Deferred input drains, IME key handling, descendant teardown, moved DOM
  nodes and Lazy diagnostics.
- Current-Model trigger clicks, repeated-open guards, Popover focus handling,
  empty portal cleanup and DragAndDrop test helpers.
- Relay discovery and stale Runtime ids, SSR/SSG serving, controlled newsletter
  state, Route policies and Charting pagination.

The resolutions preserve these implementations and their existing tests.
Obsolete Submodel modules stay deleted. Main's new Submodel teardown test is
covered by the preview's migrated Block teardown test. Route Step type checks
use the preview's existing isolated source and emitted fixtures.

The only application or package file changed against the stabilization source
is the Website's example-build test. It reuses the captured stable package
versions when checking canary playground dependencies. Skill content and the
plugin version are unchanged.

## Verification

All nine public package builds, all 53 workspace package typechecks, core and
UI source/emitted-declaration checks, and all seven unchanged compiler budgets
pass. Focused suites pass 305 core tests and 502 UI tests. MCP passes 98 tests
with four skipped, and the Vite plugin passes 383 with three skipped. The MCP
and Vite tests need permission to bind their temporary loopback servers.
The Website, Charting, Kanban, Routing and Route-transitions focused suites
pass another 91 tests. Charting's suite covers its presentation and update
behavior; it does not directly execute HTTP pagination.

The verification record and detailed logs are under
`/private/tmp/foldkit-preview-feedback-20261029-1421`. Individual conflict
assessments also live at `/private/tmp/foldkit-ui-merge-stages-20261029` and
`/private/tmp/foldkit-core-main-sync-resolutions.json`.

Publication requires the user's approval. PR #1850 contains the preceding
diagnostic and upgrade-guidance fixes; those fixes do not change the currently
published preview.
