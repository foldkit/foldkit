# Verified preview publication — October 29, 2026

## Published snapshot

The Blocks + Effect Layers preview is published from
`90746b32d2ca8bc0476de7a051ace396ca590ae0`, source tree
`3fca10b1dae3f98ce15e8098bc454f9008c0ec7f`. It replaces the verified
`f3be22cfeefed437164ad614d08b16d9000e0703` snapshot.

- [Immutable Website](https://foldkit-website-preview-pu7rp0p5a-devin-jamesons-projects.vercel.app/)
- [Authoritative manifest of all nine packages](https://foldkit-website-preview-pu7rp0p5a-devin-jamesons-projects.vercel.app/preview-release.json)
- [Previous-preview upgrade guide](https://foldkit-website-preview-pu7rp0p5a-devin-jamesons-projects.vercel.app/preview-upgrade)
- [Stable application migration](https://foldkit-website-preview-pu7rp0p5a-devin-jamesons-projects.vercel.app/preview-migration)
- [Workspace example](https://foldkit-website-preview-pu7rp0p5a-devin-jamesons-projects.vercel.app/example-apps/workspace)

The [release PR](https://github.com/foldkit/foldkit/pull/1847) passed its own
required checks and merge-queue checks. Its squash commit is the exact
independently reviewed queue commit. Publication used the
[automated Release workflow](https://github.com/foldkit/foldkit/actions/runs/40810270874),
attempt 2. The [receipt](preview-publication-20261029.json) records versions,
artifact identity and evidence hashes.

## Publication recovery

Attempt 1 uploaded four packages before npm rejected Markdown provenance
creation with a transparency-log HTTP 409. No complete manifest or Website
was produced by that attempt. Public registry state and the retry path were
independently reviewed before rerunning the failed jobs at the same commit.

The retry rebuilt and repacked the cohort, required exact SHA-512 equality
before skipping existing versions, retained provenance for missing uploads,
and verified the complete dependency snapshot before preserving the manifest.
No versions, package bytes, provenance requirements or publication mechanism
were changed to recover.

## Public verification

Fresh registry acceptance passed for all nine packages. It verified source
bindings, artifact bytes, npm signatures, a separate canonical CLI signature
audit, and exact unique CLI discovery through both npx and pnpm-dlx. Across
the installed consumers, 7,617 direct and 21,346 internal file comparisons
passed. Coverchart and generated SPA, SSG and SSR consumers passed their
typechecks, lint, tests, builds and browser flows.

The deployed manifest matches the authoritative workflow artifact byte for
byte, with SHA-256
`fe758db71b3b5bfc51a6660a60c15f653dde2f3d54d5402f79e30b66c48e6e15`.
The immutable deployment passed 34 guide HTML/Markdown pairs, three generated
API references, the legacy Layers redirect, exact source markers and Workspace
availability. The workflow also passed Monaco isolation and two deployed
SSR/SSG browser tests.

The verifier's prepared init URL and literal SSR title expectation were
corrected against the published source; HTML headings allow ordinary ampersand
escaping. These were verifier corrections. The deployed product did not change.
The ready summary is a canonical local reconstruction from the exact source,
manifest and observed deployment URL; GitHub does not expose its summary body
through the supported job APIs.

## Actual Coverchart upgrade

[Coverchart commit `220ccf0`](https://github.com/foldkit/coverchart/commit/220ccf075b5737a6f13b46ff1b24f460583c3ec3)
is pushed and verified on its remote main branch. Six existing Foldkit pins,
their exact age exclusions, three Menu/Toast factory calls and the complete
managed guidance were upgraded. Third-party versions, dependency placement,
project instructions and concurrent files were preserved.

The actual checkout passed frozen installation, focused formatting,
typechecking, lint, 40 tests, production build and five fresh browser flows.
Its 1,433 installed public files matched the registry inventory, and its
packages resolve one Effect 4.0.0 runtime. The exact commit passed independent
review before an ordinary push.

## Ready entry points and retained limits

[PR #1655](https://github.com/foldkit/foldkit/pull/1655) now identifies this
verified snapshot. Readback matches the independently reviewed description:
three starting points, two migration prompts, matching pins, previous immutable
snapshots and preserved user prose. The PR remains open against main.

The broader Daybreak review and follow-up addendum retain their exact scopes;
the final gate corrections changed import order, dependency inventory and test
storage setup. This publication is not a new full dependency audit or a claim
that dependency findings, every TypeScript limit, or all editor latency are
resolved. The mixed-result inferred-any report remains unconfirmed.
See the [final review scope](preview-followup-final-20261029.md) and
[dependency disposition](preview-dependency-disposition-20261028.md).

The user explicitly deferred #1662 and #1663 until after Blocks + Effect Layers
merges to main. This publication does not merge that work to main or publish
an X announcement. Earlier preparation reports retain their historical pins
and holds.
