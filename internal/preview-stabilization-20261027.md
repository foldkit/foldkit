# Blocks + Effect Layers stabilization preparation

This is the earlier ae2 verification checkpoint. The
[final approval summary](preview-stabilization-final-20261027.md) owns the
subsequent #1810 repairs and refreshed verification at `93c49c77b6d2`.
Sections below preserve this checkpoint's source pin, measurements and original
assessment state. Publication remains held for approval.

## Source and release boundary

Verified implementation checkpoint: `ae2eba84283939f5991a1b0c35c32ba351f9efdc`, tree
`a119b9cd51263c033865220eee43bdf1be5c8da0`, on `codex/workspace-example`.
The later evidence commit changes internal reports only. Package and review
results below retain their implementation pin.

Published comparison: `f3be22cfeefed437164ad614d08b16d9000e0703`. Its nine
published packages, immutable Website and Ready snapshot remain current until
another release is approved, published and independently verified.

Pinned main is `b702a5efbb74bebc056b798b414ddb923a82fbd5`, already integrated
through merge `6f911ffe51b34bb6e2a92d9568e71d739fca8662`. This work does not
merge the preview into main.

The next preview is stabilization. The user expects one or two further
previews, depending on feedback, before considering main. Publication and
release-branch integration remain held for approval.

## Changes since the published preview

- **One required public migration:** `Definition.makeMapBinding(ChildBlock,
config)` replaces the standalone `makeMapBinding(ParentDefinition,
ChildBlock, config)`. The old `foldkit/mapBinding` subpath is removed.
  Feature-local detached helpers preserve Definition ownership and inference.
- **Optional mapped-child initialization:** `makeInitIfMissingStep` from
  `foldkit/bindingInit` retains an existing direct Record/HashMap child or
  initializes and inserts it with its Commands. Both paths require registered
  graph evidence. Wrapped/custom storage remains explicit.
- **Optional relative-path parsing:** `Route.parsePathWithFallback` uses the
  ordinary Route/query contracts and preserves original fallback input. Raw
  controls, backslashes and network-path variants are rejected. Shared URL
  decoding preserves complete query and fragment values rather than truncating
  later delimiters.
- **Workspace cleanup:** simpler page/issue URLs and retained ID-keyed child
  state, clearer Steps/selectors/names, narrower repository responses and a
  small application-local optimistic projection. Confirmed data and pending
  moves remain separate. Layout and control repairs remain application work.
- **Adoption and guidance:** examples, active docs, scaffolds, consumer skills,
  lint provenance and the installed-f3be upgrade path reflect the method API.

Record-only updates, focused producer callbacks, checked Block assembly and
ManagedResource registry Layers already shipped in f3be. They are not new
stabilization migrations.

## Feedback status

The [feedback reconciliation](stabilization-feedback-20261027.md) covers every
preview report and related contribution found by the exhaustive October 27
pass: all 12 #1655 comments, all 10 #1737 comments, all 12 followup PRs and their
17 comments, historical integration PRs, 19 relevant issue discussions, linked
discussion #1781 and the separate lazy-composition proposal. The original four
migration reports and #1698 retain item-level dispositions and regression links.

The final recheck at **15:43 UTC** found no later #1655/#1737 reply or repository
item updated since 15:00 UTC. No newly reported unaddressed Blocks/Layers
correctness blocker was established. This does not mean every requested
convenience or proposed integration API was implemented.

The later **16:03 UTC** refresh found #1810, created at 15:48:10 UTC with no
comments. It reports incomplete-record diagnostic priority, asks for paired
mixed/deferred-Step examples, and identifies a reproducible JSON-codec limit
for rich DevTools snapshots. The actual preservation/HMR connection is being
tested separately from that codec observation. Earlier passing gates retain
their ae2 source pin.

Still open and explicit:

- **#1709:** cold-root/full composed-type expansion can take seconds. Long-session
  memory stability is unverified. tsrs remains an optional tested editor
  recommendation, separate from official TypeScript typechecking and CI.
- **#1776:** some invalid Commands still produce misleading final-overload
  diagnostics. Rejection is sound; troubleshooting improved. The bounded
  assessment did not solve TypeScript's diagnostic presentation.
- **#1777:** unresolved generic attached-Service factories use the documented
  caller-owned `toLayer` boundary once the Service is concrete. A one-stage
  generic factory with an unresolved Service key is not supported.
- **#1662 / #1663:** automatic OutMessage propagation and derived/default view
  slots with additional static collision checks remain proposals. Explicit
  policies and stable slot IDs remain the contract; runtime duplicate-boundary
  detection is covered.
- **Broader integration proposals:** portable cross-runtime envelopes, arbitrary
  operation Messages, root/child observers, parent-derived child Subscription
  context, lazy graphs and hot plugin replacement are not adopted APIs. General
  Query/UI/agent proposals remain outside Blocks/Layers stabilization.

These are remaining limitations or unimplemented proposals, not newly approved
deferrals. Record/HashMap Bindings, ManagedResource aggregation, pending-Command
inspection and the adopted diagnostics work are implemented.

The latest dynamic-plugin question is assessed in the ledger. Independent
element-scoped Programs with host-owned embedding/disposal and validated Flags
are the supported boundary. That creates a new Runtime lifetime; it does not
promise arbitrary Model preservation or resource continuity across code
replacement. No public reply was posted by this read-only reconciliation.

Prepared reply to #1655 comment `6431232046`, held for posting:

> Yes, one element-scoped Program per plugin is the existing boundary when the
> host cannot know the plugin's types at compile time. Checked Bindings remain
> static. Define a versioned domain-state contract through Flags and Ports,
> deliberately export resumable state, dispose the old embedding and let the
> replacement validate that state during init. This starts a new Runtime
> lifetime and reacquires resources; it does not provide transparent hot
> replacement or preserve arbitrary internal Models. Lazy graphs and portable
> operation Messages remain separate proposals.
>
> AI-generated by Sol (Codex), posted at the user's request.

## Source, declaration and runtime verification

All 15 final integrated gates pass at the implementation pin: public builds,
recursive workspace typechecks, source/emitted declarations, compiler
diagnostics and performance fixtures, lint, script checks, and Website
production/API build. Runtime suites pass:

| Suite              |                 Passing tests |
| ------------------ | ----------------------------: |
| Foldkit            | 3,837, plus one existing skip |
| Foldkit UI         |                         1,301 |
| Workspace          |                           154 |
| Website            |                         1,497 |
| Lint plugin        |                           665 |
| Repository scripts |                           232 |

The native checker-order gate passes twice at each of 1, 4, 5, 6 and 8 checkers.
No timeout or worker limit was increased. Peer floors, package exports,
prebundling, changesets, circular imports, Knip and formatting pass. Because
this local checkout lacks a usable origin/old ancestry, the changeset and skill
version comparisons use the exact integrated main tree with the original
validators. They are explicitly qualified pinned-main equivalents, not claims
that the default origin-based invocation succeeded.

Knip's first attempt found an incomplete local `formatly@0.7.1` installation.
The missing zero-byte `lib/types.js` was restored from the published tarball
after its SHA-512 matched the source lock. Other installed bytes were unchanged;
no dependency, lockfile or handwritten shim was added.

All six compiler fixtures pass their current reviewed ceilings. The map-method
adoption deliberately changed only Workspace-four-group ceilings from 2,639,574
Instantiations / 206,314 Types to **2,642,699 / 229,173**. The other five ceilings
and all fixture sources remain unchanged. No further increase was made during
stabilization preparation.

### Ordinary Workspace declaration regression

The expanded Workspace root initially failed TS7056. Restoring its previously
published exact `ApplicationBindings` tuple fixes whole-root emission while
leaving ordinary `block.ts` unchanged. All nine Binding values, policy wrappers
and their order are preserved. This is an explicit serialization boundary,
with a repeated type/value inventory, rather than a new assembly API.

Two isolated alternatives, a named Composition interface and named registered
return header, built core but retained both TS7056 errors. Their exact patches
and outcomes are retained in [the declaration controls](stabilization-20261027/declaration-controls.json),
[interface patch](stabilization-20261027/declaration-interface.patch),
[header patch](stabilization-20261027/declaration-header.patch), and
[restored boundary](stabilization-20261027/declaration-restoration.patch).
These reject those encodings, not every possible framework solution.

The final ordinary root emits **152 declarations / 12,272,552 bytes** and passes
strict physically relocated consumption with `skipLibCheck: false`: exact
Model/init tuple, direct and curried update, required Services, invalid
URL/Message rejection and absence of generated constructors. The large
declaration output and previously recorded synthetic scaling limit remain
limitations. [Exact final result](stabilization-20261027/workspace-declarations.json).

### Input-boundary repairs

Daybreak identified two Low findings in the new relative-path surface and its
shared URL dependency. Both are fixed in the candidate. Fifteen added
regressions fail against the pre-fix code; all 107 focused Route/URL tests pass
after repair. Ten public declarations emit and pass strict relocation.
Three disposable emitted-JavaScript mutations fail before restoration passes:
removed raw-control guard, removed normalized-slash guard and restored query
truncation. [Mutation results](stabilization-20261027/input-boundary-mutations.json).

## Fresh installed-package rehearsal

All **nine** packages were freshly built and packed from the frozen candidate.
Source digest: `81aa61f4e66b52f0890c550284b99092a36bd7623764c818663b583fcf334f09`.
The manifest includes all 7,019 tracked paths plus 106 recorded generated seed
files. Later internal report edits are outside that snapshot. Independent
SHA-256 and SHA-512 checks match all nine tarballs.

- Isolated Coverchart passes source checking, lint, **40 tests**, production
  build and five browser flows. Actual Coverchart remains at
  `677b804e9aa0d0d1f636067079ae404ead84115a`, with the same status and all
  **88 tracked file hashes** unchanged.
- SPA, SSG and SSR scaffolds each pass source checking, lint, tests, production
  build and browser acceptance.
- Installed testing, event-delivery, dynamic-init, initialization-family and
  stabilization contracts pass. They include source/rejection and strict
  relocated-declaration use, passive construction, retained Model identity,
  registration requirements, lifted Commands and the removed map subpath.
  Negative controls fail as expected, then restored fixtures pass.
- The complete frozen Workspace browser suite passes **33/33**, with no skips,
  flakes, unexpected results or errors. The old rehearsal expected 32 cases;
  its count was corrected against the frozen suite and full test listing. No
  case was removed or filtered.

[Package identities, gates and browser results](stabilization-20261027/package-rehearsal.json)
retain the exact scope. These are unpublished local tarballs, not verified npm
versions or a matching public deployment.

The rehearsal keeps pnpm's package-age policy enabled. Coverchart installation
temporarily retains its six already approved old-preview exemptions alongside
the six exact local replacements, then removes the old entries and passes
offline frozen-lock installation with only the six targets. A scaffold cache
miss is resolved through a policy-preserving isolated network cache fill,
without an incompatible dependency pin. The prior failed attempts remain
separate evidence. Existing fixture-only Hono/ip-address/magic-string resolution
controls and local SSG peer metadata transport remain qualified; they do not
change the candidate packages or public setup instructions. Scaffold install
logs retain an oxlint missing-time warning, not a relaxed age setting.

An initial Playwright test listing overwrote one execution result file. That
listing was preserved separately and all 33 Workspace cases were genuinely
rerun to produce the final passing execution JSON. No result was reconstructed
from the listing.

## Performance comparison

Both comparisons use fresh exact source snapshots, matched tooling and a quiet
window after builds, checkers and acceptance jobs finished. Native runs use
official TypeScript **7.1.0-beta**, Node **24.22.1** and the same driver on both
sides. These are not tsrs measurements.

Snapshots resolve their own workspace packages with matched cached third-party
tools, rather than separate historical-lockfile installs. Main's previously
captured archive was re-extracted after its exact SHA-256 was verified; all
production bundles were freshly rebuilt. Published and candidate archives are
fresh, and the current native driver is byte-identical on both editor sides.

### Native editor workflows

Three alternating paired fresh-server runs per side pass all semantic checks,
including exact completion and error/clear diagnostics. Source and built
declaration fingerprints remain unchanged. Medians in milliseconds:

| Workflow                                       | Published f3be | Candidate ae2 |
| ---------------------------------------------- | -------------: | ------------: |
| Workspace post-edit hover                      |          344.0 |         292.2 |
| Workspace Binding completion                   |          294.2 |         285.5 |
| Workspace post-edit completed-Block completion |           53.6 |          55.1 |
| Workspace error appearance / clearing          |  219.8 / 213.3 | 209.5 / 188.0 |
| Website changed-URL post-edit hover            |          260.6 |         248.9 |
| Website Binding completion                     |          259.2 |         269.1 |
| Website error appearance / clearing            |  662.7 / 632.1 | 653.7 / 627.5 |

The post-edit results show similar or improved responsiveness, with no material
repeatable regression in these affected workflows. Website Binding completion
ranges overlap. The three-pair sample is small and the changed Workspace app
also changes the workload; the improvements cannot all be attributed to
Framework typing.

First requests and cold work remain distinct. Workspace first Block completion is
**192.4 ms** (169.5–197.1), versus **183.9 ms** (170.7–184.5). Website
completed-Block constructor cold diagnostics remain **3,211.3 ms**
(3,096.2–3,219.7), versus **3,063.8 ms** (2,960.0–4,492.9). The cold
local-constructor check increases from **314.8 ms** (302.6–340.3) to
**372.8 ms** (349.3–375.3), about **58 ms**. This is an explicit small cost, not a
claim that every request improved or that cold-root latency is solved.

Largest sampled server RSS across each side's runs is **416.2 vs 427.4 MiB** for
Workspace and **798.6 vs 908.4 MiB** for Website, candidate versus published. All
runs stay below the unchanged 4 GiB safety cap. Sampling can miss short peaks;
RSS is not retained heap or a long-session memory guarantee. The existing
optional tsrs guidance and real Neovim trial remain separate evidence.

### Lustre rendering workload

Six balanced rotating rounds retain all **36 valid samples**, with no discarded
warmups or forced GC. Fresh bundles use the exact current, published and main
source pins; all samples use Chrome **156.0.8078.48**. Medians and ranges in
milliseconds:

| Workload  |                Main |      Published f3be |       Candidate ae2 |
| --------- | ------------------: | ------------------: | ------------------: |
| Naive     | 397.2 (337.3–473.1) | 417.7 (302.2–537.7) | 406.2 (263.2–573.9) |
| Optimized | 202.8 (127.0–234.5) | 244.6 (207.5–284.1) | 221.4 (183.6–275.3) |

Candidate/published ratios of medians are **0.972 / 0.905**, but median
within-round paired ratios are **0.982 / 0.992**, and the candidate is faster in
only three of six pairs for each variant. Broad overlapping ranges do not
establish a new rendering speedup or material regression versus the published
preview.

Main remains faster in aggregate: candidate/main ratios of medians are
**1.023 / 1.092**, while median within-round ratios are **1.055 / 1.155**.
These are different statistics, not interchangeable speedup claims. The older
20–22% main gap retains its original batch and pin; do not pool those absolute
timings or infer that this stabilization removed that gap.

JavaScript gzip is **128,812 / 130,173 bytes**, naive/optimized, versus
**128,899 / 130,291** published and **97,081 / 97,796** main. The candidate
removes 87/118 bytes versus published; the roughly 32 KB main gap remains.

Totals sum instrumented animation-frame callbacks and synchronous handlers
across add-100/toggle-100/delete-100. Boot and waits are excluded. These are not
isolated DOM-patch time, presentation latency or an arbitrary-app scaling
guarantee. All samples pass final state and event assertions. Fresh source and
bundle hashes, all per-run measurements and paired statistics are retained in
[performance evidence](stabilization-20261027/performance.json).

## Security and independent review

[Independent review](stabilization-20261027/independent-review.txt) passes the
exact implementation candidate, including the restored declaration boundary
and input repairs. It is a static review, distinct from the lead's execution
evidence.

[Daybreak's initial review](stabilization-20261027/daybreak-initial.txt) covers
published f3be through `5835d220595e4f663cf0ffacb43b0263e801bea9`.
[Its final addendum](stabilization-20261027/daybreak-addendum.txt) covers that
checkpoint through exact `ae2eba84283939f5991a1b0c35c32ba351f9efdc`, closes both
Low findings and reports no new actionable finding. Commit/tree, all tracked
paths/blobs/modes, literal symlinks and review diffs remain verified. Later
evidence-only edits do not relabel either review's source pin.

Inherited dependency/sanitizer/DevTools/runtime-local-envelope qualifications
remain. No dependency or lockfile changed. The recorded advisory inventory is
still 1 Critical / 8 High / 11 Moderate / 4 Low, with the prior reachability
dispositions. This is not a fresh network advisory audit or a clean dependency
claim. [Prior dispositions](next-preview-security-review.md).

## Publication procedure after approval

1. Integrate the approved source into the preview release branch using the
   existing release workflow, without merging to main.
2. Verify all nine published package versions, integrity and matching immutable
   Website manifest. Local rehearsal labels are not public install commands.
3. Verify all three consumer starting paths against that manifest, then update
   PR #1655's exact commands/prompts and editor-tooling link. Preserve its
   user-authored content; promote Ready only after publication acceptance.
4. Upgrade, verify, commit and push actual Coverchart against the published set.
   The current preparation only tests its isolated clone.

No release push, registry publication, deployment promotion, GitHub comment or
actual Coverchart modification is authorized by this preparation report.
