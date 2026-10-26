# Preview publication, October 26

The Blocks + Effect Layers preview is published from
`f3be22cfeefed437164ad614d08b16d9000e0703`, with tree
`17ef995528c447cd13604ffcd390a63d73ec6953`. Registry, immutable Website,
live-playground and installed-consumer gates pass. This record supersedes the
preparation holds in earlier reports without changing their historical evidence.

## Published snapshot

- [Verified publication workflow](https://github.com/foldkit/foldkit/actions/runs/40412510112):
  successful canary job `121886499145` and Website job `121897848949`.
- [Immutable Website](https://foldkit-website-preview-ky42cyp8l-devin-jamesons-projects.vercel.app/)
  and its [authoritative manifest](https://foldkit-website-preview-ky42cyp8l-devin-jamesons-projects.vercel.app/preview-release.json).
- Manifest artifact `12695501966`, named
  `foldkit-preview-release-f3be22cfeefed437164ad614d08b16d9000e0703`.
- Manifest SHA-256:
  `b582a999b4be1a086045d5d85b090ffbf2b0aaa3a7349519ba23e88f1c205fd8`.

| Package                  | Published version             |
| ------------------------ | ----------------------------- |
| `@foldkit/devtools`      | `0.169.0-canary.f3be22cfeefe` |
| `@foldkit/devtools-mcp`  | `0.25.0-canary.f3be22cfeefe`  |
| `@foldkit/markdown`      | `0.14.4-canary.f3be22cfeefe`  |
| `@foldkit/node`          | `0.1.0-canary.f3be22cfeefe`   |
| `@foldkit/oxlint-plugin` | `0.15.3-canary.f3be22cfeefe`  |
| `@foldkit/ui`            | `0.169.0-canary.f3be22cfeefe` |
| `@foldkit/vite-plugin`   | `0.28.0-canary.f3be22cfeefe`  |
| `create-foldkit-app`     | `0.40.0-canary.f3be22cfeefe`  |
| `foldkit`                | `0.169.0-canary.f3be22cfeefe` |

The [stable migration guide](https://foldkit-website-preview-ky42cyp8l-devin-jamesons-projects.vercel.app/preview-migration)
and [previous-preview upgrade guide](https://foldkit-website-preview-ky42cyp8l-devin-jamesons-projects.vercel.app/preview-upgrade)
use this same deployment and manifest. New projects use
`npx create-foldkit-app@0.40.0-canary.f3be22cfeefe`. Existing projects update only
their installed Foldkit packages, preserving dependency placement.

The previous Ready snapshot remains available at
[`1f6776fa7ece`](https://github.com/foldkit/foldkit/commit/1f6776fa7ececa766188df5201eefec6ba781b5d),
with its [immutable documentation](https://foldkit-website-preview-jlwvct0dx-devin-jamesons-projects.vercel.app/)
and [manifest](https://foldkit-website-preview-jlwvct0dx-devin-jamesons-projects.vercel.app/preview-release.json).

## Verification

The [implementation approval](preview-approval-20261026.md) retains its frozen
source, emitted-declaration, runtime and unchanged compiler-budget proofs.
[Final merge-queue CI](https://github.com/foldkit/foldkit/actions/runs/40409553777)
and its [Examples E2E planner](https://github.com/foldkit/foldkit/actions/runs/40409553810)
pass. The planner skips example shards for the private Website-only repair;
that is not a claim that all browser suites ran again at the final merge.

Fresh acceptance uses the final published cohort, not local tarballs or an older
canary's passes. All nine package artifacts match their registry hashes and
source attestations. The inventory verifies 247 signatures and 55 attestations.
The separately installed canonical CLI verifies 27 signatures, 12 attestations
and 7,715 installed-file comparisons. Direct and internal installed-package
checks perform another 7,514 and 21,067 file comparisons. All 50 reviewed harness
inputs remain unchanged through its final fail-closed guard.

The installed Coverchart fixture and generated SPA, SSG and SSR projects pass
source, lint, tests, production builds and browser checks. Focused testing,
Message delivery and initialization contracts pass. The actual SSR server uses
compatible Effect, platform-node and platform-node-shared `4.0.0` instances.
No local metadata fallback, third-party override or global package-age relaxation
is used. Only the six existing Coverchart age exclusions are replaced with their
exact target versions. The actual Coverchart checkout remained unchanged through
this isolated acceptance's final preservation gate.

The deployed manifest is byte-identical to the workflow artifact. Both rendered
guides identify the exact source and all nine versions; raw Markdown guides
resolve their target through the same-origin manifest. The tsrs anchor and tested
version, Command interruption anchor, HTML build markers and previous manifest
are verified. The workflow's unmodified live SSR and SSG playground tests pass
2/2. An independent review confirms these retained HTTP and workflow results.
Moving canary-alias promotion is skipped by this integration workflow; the
handoff uses the verified immutable URL.

Evidence identities:

| Evidence                       | SHA-256                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| Fresh registry/consumer review | `b14fe00b27f70bad310146191ad417340b7b956a2a9fb5322e142ad21be643e8` |
| Independent deployment review  | `a879e1377fba101e05b71443961185f87b15e6a49fa0711a1af834b4819d75ef` |
| Public HTTP verification       | `8716f37ff723f708028d115e78acaacb32a216fe231ebdd68b1d878d1b267926` |

Full retained files live under
`/private/tmp/foldkit-published-preview-replacement-acceptance-20261026` and
`/private/tmp/foldkit-deployment-f3be22cfeefe`; workflow results are public above.

## Actual Coverchart upgrade

Actual Coverchart is upgraded from
`c51e856b2e75ca44106e37ead24f9c4e8046aef0` to independently reviewed commit
`677b804e9aa0d0d1f636067079ae404ead84115a`.

Its six existing Foldkit packages use the exact published versions in their
original dependency/devDependency positions. The six exact age exemptions and
lockfile change only those package identities and integrities. Effect and other
tools are unchanged. Six source files adopt current handler/Step and
DragAndDrop contracts, and the whole managed `FOLDKIT.md` matches the published
CLI template. All 78 untouched tracked files, `AGENTS.md` and the preexisting
untracked `.claude` settings are preserved.

Actual-repository source, lint, 40 tests and production build pass. Five browser
flows cover legacy library loading, duplicate IDs, keyboard reorder, deletion
and persistence after reload on owned port 54101. The server is cleaned up;
existing chunk-size and favicon warnings remain, with no unexpected browser
events. All 1,412 installed files from the six packages match registry artifacts.
The retained invocation identifies the actual application root independently of
the package used only to resolve Playwright.

Verification summary SHA-256:
`7b9a5f8863139af02c253b7baf05788f22dc40eccc03ceb4863b31cd8b1c1ee4`.
Independent exact-commit review SHA-256:
`707b33680df5085abc2359b8125b1aa0ee1af48672b447c7686e2d3b0efcbcd4`.
Full evidence is under
`/private/tmp/foldkit-coverchart-upgrade-f3be22cfeefe-20261026`.

The ordinary, non-force push advances actual Coverchart `origin/main` to this
exact commit; remote readback passes. Push verification SHA-256:
`b16b92c4fbf77b9a7e6aad5c2e32db5aa60f6119a38b4fed4157bf3dbf06692f`.
The tracked worktree is clean; the original untracked settings remain.

## Superseded deployment and Website repair

The earlier `82ac2ec6c9b525fbefdd3c2132a81cb96e3b0ebd` cohort passed registry
acceptance but failed its deployed SSR playground. It was never promoted Ready.
An upstream WASM runtime update was incompatible with the emnapi prerelease
expected by the pinned Rolldown WASI binding.

[PR #1802](https://github.com/foldkit/foldkit/pull/1802) adds the browser
playground's explicit WASI binding and compatible runtime pin, plus a hydration
wait within the existing smoke-test timeout. The repair is restricted to four
private Website/test/changeset paths; public library inputs are unchanged.
Required-dependency prototypes and mutation controls pass, followed by the final
unmodified deployment checks above. Independent exact-commit review passes.
A scoped check of the seven-package WASI cohort finds no known npm advisories at
its recorded time; it is not a new full repository or Daybreak audit.

The original inclusive-nine synthetic fixture's CLI-only nested Effect mismatch
remains a failed control. Canonical CLI execution instead uses a separately
verified exact `npx` installation, with an independent `pnpm dlx` discriminator.
Generated application shapes pass independently. The ordinary npm SSR
discriminator for 82ac is retained as evidence for that superseded cohort only.

## Retained limits and followups

The [runtime investigation](preview-runtime-investigation-20261026.md) keeps its
`fa96bf7d90` source pin: 12.7% improvement over the unchanged preview in the
optimized screen, still 22.0% above main. Naive preview results are similar, with
the candidate 20.4% above main in that batch. Earlier builds record roughly
32 KB additional gzip versus main. No new timing is claimed for f3. These are
bounded workload totals, not per-interaction latency or a scaling guarantee.
Native TypeScript cold-root requests can still take several seconds; tsrs is an
optional tested recommendation, not a performance guarantee.

[Daybreak's full-delta review](preview-daybreak-20261026.md) and its
[hardening addendum](preview-daybreak-hardening-20261026.md) pass and close the
duplicate-Mount finding. The inherited dependency audit retains 1 Critical,
8 High, 11 Moderate and 4 Low findings with their documented reachability and
maintenance dispositions. This is not a clean dependency or sanitizer audit.

The scoped feedback search through `2026-10-26T22:41:09Z` finds no new external
preview blocker. Broader foldkit-plus ownership, lifecycle and integration
proposals remain open design work. The [disposition ledger](preview-feedback-closeout.md)
does not count every proposed API as implemented.

One successful queue host-parity check has a 301.76-second unlogged initial
port-check/normal-SSR interval. Logs do not identify the individual request.
Later build/probe phases complete normally; this is not a demonstrated framework
regression or a post-PASS cleanup delay. Explicit request/readiness deadlines
and phase diagnostics remain a nonblocking operational followup.

## Release handoff

PR #1655's Ready section is generated from this exact manifest and immutable
deployment, preserving its three starting paths, two copyable agent prompts,
previous snapshot and user-authored feature overview. It separates required
migrations, behavior fixes and optional conveniences. The external description
update and readback follow this evidence commit, avoiding a circular claim about
an action not yet performed in this record.

Preview integration is `codex/layers-and-submodels`. Foldkit `main` remains
`b702a5efbb74bebc056b798b414ddb923a82fbd5`; this publication does not merge
PR #1655 into main. The development-branch evidence commit changes no package
inputs and does not trigger another preview publication.
