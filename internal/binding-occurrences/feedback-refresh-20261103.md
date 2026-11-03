# Preview feedback refresh

## Snapshot

GitHub discovery ran from **2026-11-03 18:12:46 UTC through 18:16:13 UTC**, following the previous **07:55 UTC** cutoff in [the feedback closure audit](../update-composition/feedback-closure-20261103.md). A final issue, conversation-comment, and inline-review-comment sweep found no additional updates during the refresh.

The initial refresh found one new concrete report to address: [#1879, unsupported SSR build watch mode produces the wrong diagnostic](https://github.com/foldkit/foldkit/issues/1879). The narrow diagnostic repair is now implemented and verified locally below. A contributor also requested review of [#1650, embedded hydration](https://github.com/foldkit/foldkit/pull/1650); that is a general contribution with a maintainer response, not an adopted Blocks/Layers release requirement or an approved deferral.

The pre-integration refresh below also found a new reproduction of the existing build-ID cache defect tracked by #1752. Source inspection confirmed the mechanism remained in the candidate. The subsequent bounded repair is now implemented and verified locally below.

This refresh does not establish that every older proposal is implemented. Existing dispositions remain in the closure audit. No external comments, reviews, issue state changes, merges, releases, or source transfers were performed. Daybreak and publication remain on hold.

## Final pre-integration refresh

A second read-only refresh covered **18:16:13 UTC through 18:40:24 UTC** before freezing this report for integration. It found **1 updated PR and 1 new conversation reply**, both on [#1752](https://github.com/foldkit/foldkit/pull/1752), plus **0 new inline review comments**. The reporter [says the proposed fix resolved their installed-package SSR reload failure and asks what blocks merge](https://github.com/foldkit/foldkit/pull/1752#issuecomment-6612221751), posted at **18:30:01 UTC**.

The repeated review check covered the same **60 PRs, 34 threads, 38 thread comments, and 3 submitted reviews**, with no changed review record and no unconsumed page. Preview PR #1655 remains at 19 discussion comments and no reviews/threads. Discussion #1781 remains unchanged with no replies. Evidence is under `final-1838/` in the same raw evidence directory. A final issue/conversation/inline-comment sweep through 18:40:24 UTC found no additional changes.

After the bounded repairs, discovery was refreshed again through **18:50:36 UTC**. The repository-wide paginated item, conversation-comment, and inline-comment sweeps found **0 further changes** since 18:40:24 UTC. The repeated 60-PR review scan retained the same counts, no changed review records, and no unconsumed pages. Evidence is under `final-after-repairs/`. The report is frozen at this cutoff for integration.

### New reproduction on PR 1752

[#1752](https://github.com/foldkit/foldkit/pull/1752), current head `3fa04d3d871f3667c5aed03ef058414e7bac944b`, proposes serving a revalidated virtual development build-ID module. Its target is the existing [#1677 report](https://github.com/foldkit/foldkit/issues/1677): after a development server restarts, an installed Foldkit build-token module can remain in the browser's immutable dependency cache with the previous server's ID, so hydration refuses freshly served HTML.

At discovery, the candidate still [replaced the placeholder with a literal in serve mode](https://github.com/foldkit/foldkit/blob/4e4de7d150bfab508dd02dd9146bc0d8c14664bf/packages/vite-plugin-foldkit/src/buildToken.ts#L164). No `virtual:foldkit/development-build-id` resolver or loader was present at that discovery. The fresh reply supplies another reported reproduction and confirms the contributor's proposed fix helped that user. This audit inspected the current source and the PR's discussion/changed-file inventory; it did not rerun the installed-package browser-cache reproduction or review the PR as merge-ready.

**Disposition: the confirmed defect was repaired locally in the subsequent bounded work described below.** It predates the Instance work. The contributor PR itself has not been merged or externally updated. No code was edited during GitHub discovery; the later repair followed the lead's explicit task. The separate #1650 review request and all other scope qualifications remain as recorded below.

### PR 1752 bounded repair and source attribution

The repair adapts [artile's PR #1752](https://github.com/foldkit/foldkit/pull/1752), reviewed at head [`3fa04d3d871f3667c5aed03ef058414e7bac944b`](https://github.com/foldkit/foldkit/commit/3fa04d3d871f3667c5aed03ef058414e7bac944b). The full seven-file diff and both discussion comments were read before editing. Its development virtual-module approach was adapted to the candidate's current plugin code; contributor scripts and branch code were not checked out or executed.

In serve mode, the framework build-token transform now imports its identity from `virtual:foldkit/development-build-id`. Vite serves that module with `no-cache` and an ETag. The existing per-application WeakMap still chooses the identity, and all environments of one server read that same value. Production transformation still emits an identity literal. Command behavior, production mismatch/refusal code, and core Block/Instance files are unchanged. A patch changeset links both the contribution and #1677.

The new regression stages the actual built Foldkit distribution and manifest under a fixture's `node_modules`, requests its build-token module through an immutable dependency URL, closes the server, then restarts it on the same origin and strict port. The cached token code remains identical. Its unchanged import URL revalidates to the new server identity and agrees with the newly rendered page. The test covers generated identities, changed `buildId` options, and changed `FOLDKIT_BUILD_ID` values. It asserts same-server 304 and restarted-server 200 behavior. This is an HTTP/module-cache regression, not a claim that a persistent browser profile or DOM hydration run was repeated.

Verification after restoring all mutations:

- `pnpm exec vitest run test/build.test.ts test/buildToken.test.ts test/resolution.test.ts test/ssr.test.ts --fileParallelism false` from the Vite plugin package: **210 tests passed**. This includes the 13 SSR watch cases, installed-package restart cases, current source-map locations, per-server identity isolation, optimized/named server resolution, and ordinary production builds.
- `pnpm exec tsc -p tsconfig.test.json`: **passed**, covering plugin source and tests.
- Targeted Effect lint: **passed** with the repository correctness preset. The Vite plugin's own `pnpm run build` also passed; no core build was run for this repair.
- Three focused mutation controls failed for their intended regressions: restoring serve-mode literal IDs, generating an unshifted source map, and introducing the development virtual module into a production build. The production graph gate also verifies that the real Foldkit build-token module participated. Every source mutation was restored.
- Mutation logs and `mutation-summary.json` are retained under `final-1838/` in the evidence directory.

## Coverage

Raw evidence is retained in `/private/tmp/foldkit-feedback-refresh-20261103T1813Z/`.

- Paginated repository issues/PRs updated since 07:55 UTC: **4 items**, including closed items.
- Paginated repository conversation comments updated since 07:55 UTC: **3 comments**. Repository inline review comments updated in that period: **0**.
- Search cross-check for all repository issues/PRs updated on November 3: **10 results**, with `incomplete_results: false`. The six before the cutoff match the earlier audit.
- Preview PR #1655: all **19 conversation comments**, **0 submitted reviews**, **0 inline review comments**, and **0 review threads**. No new discussion reply was found.
- GraphQL review-thread and submitted-review refresh for **60 PRs**: the previously screened pool plus current #1650 and #1878. It contains **34 threads, 38 thread comments, and 3 submitted reviews**. Every thread, comment, and review page reports `hasNextPage: false`. None of those review records changed after the cutoff. Pending review comments are included.
- Related integration discussion [#1781](https://github.com/foldkit/foldkit/discussions/1781): **0 comments/replies**, unchanged since October 27.
- Full current #1650 conversation, commit metadata, and changed-file inventory were read. Contributor code was not checked out or executed.
- The sandbox's initial authentication error disappeared when `gh auth status` was retried with network access, as required by AGENTS.md.

The API snapshots retain updated item bodies, exact URLs, authors, timestamps, PR heads, branch heads, review pages, and the final zero-result sweeps. The thread refresh is broader than the four changed issue/PR records, so an unchanged primary PR timestamp was not used as a substitute for reading its threads.

## New and updated items

| Item                                                                                                                                                                                                                       | New information                                                                                                                                                                                                                     | Disposition                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#1879](https://github.com/foldkit/foldkit/issues/1879), opened 16:00:46 UTC                                                                                                                                               | `ssr.build` with `vite build --watch` returns from the environment builds before their first output, then fails with a missing server-entry error. The reporter accepts an explicit unsupported-watch diagnostic as one resolution. | Concrete tooling defect affecting the same preview build path. Repaired locally with early resolved-configuration rejection; see verification below. Full SSR build watch support is not added.                                                    |
| [#1650 contributor request](https://github.com/foldkit/foldkit/pull/1650#issuecomment-6609450486), 16:24:13 UTC; [maintainer response](https://github.com/foldkit/foldkit/pull/1650#issuecomment-6609521757), 16:27:17 UTC | The contributor asks for review; the maintainer says they will address it as soon as possible. The single-commit head was rebased at 16:24 UTC to `b28efa04628e40b85c9563229a1c1b27d52ec301` against current main.                  | General embedded-hydration contribution awaiting its own review. No new preview-specific correctness report is in the replies. No merge-readiness judgment is made here, and the maintainer's promise is not marked complete or approved deferred. |
| [#1655](https://github.com/foldkit/foldkit/pull/1655), metadata updated 15:14:19 UTC                                                                                                                                       | The current head is the integrated preview commit. All 19 discussion comments remain the previously audited comments. The Ready installation instructions still identify the last published snapshot `90746b32d2ca`.                | No new feedback item. Keep published installation instructions pinned until the next release is actually approved and published.                                                                                                                   |
| [#1878](https://github.com/foldkit/foldkit/pull/1878), merged 13:39:27 UTC                                                                                                                                                 | The existing integration work landed at `4e4de7d150bfab508dd02dd9146bc0d8c14664bf`. Its bot review summary reports no findings for `82360031aaa3c439384b57b5e1e3f1ce27191a1d`.                                                      | Integrated work, not new contributor feedback. The bot summary does not replace the separate review and release gates for subsequent changes.                                                                                                      |

## Issue 1879 source assessment

The reported order is present in the current preview source:

1. The default `foldkit:build` orchestrator awaits the client and server environment builds in order, in [build.ts at the integrated preview commit](https://github.com/foldkit/foldkit/blob/4e4de7d150bfab508dd02dd9146bc0d8c14664bf/packages/vite-plugin-foldkit/src/build.ts#L771).
2. Vite's watch implementation starts a watcher and returns it without awaiting its first bundle. This was confirmed in the installed Vite source; the report identifies the same behavior in Vite 8.3.5.
3. Foldkit captures `serverEntryFile` in the server environment's `generateBundle`, [after output exists](https://github.com/foldkit/foldkit/blob/4e4de7d150bfab508dd02dd9146bc0d8c14664bf/packages/vite-plugin-foldkit/src/build.ts#L721).
4. The post-order `buildApp` hook calls `finalize` immediately after the orchestrator returns. Its [missing-entry check](https://github.com/foldkit/foldkit/blob/4e4de7d150bfab508dd02dd9146bc0d8c14664bf/packages/vite-plugin-foldkit/src/build.ts#L579) therefore blames an entry that has not finished building.

Both the [plugin README](https://github.com/foldkit/foldkit/blob/4e4de7d150bfab508dd02dd9146bc0d8c14664bf/packages/vite-plugin-foldkit/README.md#L158) and [server-rendering guide](https://github.com/foldkit/foldkit/blob/4e4de7d150bfab508dd02dd9146bc0d8c14664bf/packages/website/src/page/core/serverRendering.md#L438) explicitly say the build integration does not add watch-mode support. The appropriate bounded repair is to reject unsupported configuration before a build starts. Coordinating the first output and every later rebuild would be a separate feature.

### Local repair

`packages/vite-plugin-foldkit/src/build.ts` now rejects a build command when the resolved `client` or `ssr` environment has `build.watch` enabled. Checking resolved participating environments covers inherited top-level watch and environment-only watch. The error states that SSR build watch is unsupported and points to the Vite SSR development server or full rebuilds.

The check is shared by aggregate `foldkit({ ssr: { build: ... } })` and standalone `foldkitBuild` entry points. Ordinary full builds, serve/development configuration, and client-only watch configuration remain accepted. No watcher orchestration is added. A patch changeset for `@foldkit/vite-plugin` links the report.

### Verification

- `pnpm exec vitest run test/build.test.ts` from the Vite plugin package: **88 tests passed**, including **13 new configuration cases**. Existing cases build real SSR and prerender outputs. The new refusal cases resolve real Vite configuration before any watcher starts.
- `pnpm exec tsc -p tsconfig.test.json` from the Vite plugin package: **passed**, covering source and tests.
- Targeted Effect lint passed with the repository correctness preset after its normal `effect-tsgo patch --no-typescript --oxlint` setup. Oxfmt and `git diff --check` passed. The base Oxlint configuration deliberately excludes the Vite plugin package.
- Mutation control: temporarily removing only the watch guard caused the **6 required refusal cases** to fail because configuration resolved successfully. The guard was restored and the full 88-test build suite passed. Evidence: `ssr-watch-mutation.log` in the raw evidence directory.
- The code and changeset are local and uncommitted. The original external reproduction was not executed; the verification targets its accepted early-diagnostic resolution and the existing ordinary build paths.

## Older unresolved scope

Apart from the #1752 reproduction identified above, no new reply changes the closure audit's existing dispositions. In particular, traversal facts [#1511](https://github.com/foldkit/foldkit/issues/1511), external dispatch frames [#1871](https://github.com/foldkit/foldkit/issues/1871), a provided frame scheduler [#1872](https://github.com/foldkit/foldkit/issues/1872), and the narrower diagnostic/reproduction/API questions remain separate tracked work. They are not claimed implemented or newly approved deferred by this refresh.

Only [#1662](https://github.com/foldkit/foldkit/issues/1662) and [#1663](https://github.com/foldkit/foldkit/issues/1663) have the earlier explicit user approval for post-main deferral. The current automatic child Instance work does not silently change those or other release-scope decisions.

## Remote heads

Read-only branch API results:

- Main: `a471adb24d750ab9e8d8312edad53ff6f26d961b`, unchanged from the earlier audit.
- Preview `codex/layers-and-submodels`: `4e4de7d150bfab508dd02dd9146bc0d8c14664bf`.

The local ancestry check confirms main's reported tip is an ancestor of that integrated preview commit. No fetch, branch-ref update, merge, or push was performed by this refresh. Run another feedback refresh after any further implementation and before final release sign-off.
