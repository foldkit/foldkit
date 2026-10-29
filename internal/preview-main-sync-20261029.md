# Preview main sync | October 29, 2026

## Latest main follow-up

The candidate also merges main at
`a471adb24d750ab9e8d8312edad53ff6f26d961b`, after the Mount and mixed-update
diagnostic repairs. This adds the Playground startup fix from
[#1856](https://github.com/foldkit/foldkit/pull/1856) and main's generated
Version Packages commit [#1854](https://github.com/foldkit/foldkit/pull/1854).
The earlier integration evidence below retains its original source pins.

All nine public package versions and changelogs match this main commit. Other
manifest fields, including the preview compiler pins and security overrides,
are unchanged. Main consumed the published Effect changeset; the preview's
unreleased changesets and published Ready snapshot are preserved.

The Playground now uses Rolldown 1.2.16 and its matching WASI dependency graph.
Its generated development dependencies follow main's transformation. The
previous preview-only binding and runtime pins are removed, and the generated
manifest test checks the new Rolldown pin. The preview's exact release-manifest
support and test-file exclusion are preserved.

Six affected suites pass 48 tests covering generated manifests, Playground
coordination, types and preview entry points. Website typechecking and its
production client build pass, retaining the existing TypeDoc link warnings.
The nine-package metadata comparison, Changesets status and formatting pass;
the lockfile is unchanged. The dependency installation was refreshed from that
lockfile in the isolated checkout. Earlier source/runtime/compiler evidence
continues to identify its own verified commits; this merge changes no core or
UI implementation and is not a fresh rendering benchmark or WebContainer
browser trial.

This synchronization does not publish a preview. PR #1850 remains the draft
integration vehicle, and publication requires the user's approval.

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
