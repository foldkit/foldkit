# Next preview approval summary

## Status

Publication remains held for user approval. The latest frozen implementation is
`f5506b7e240a4d8987338f22427a2bd1ecdf9cb5` on `codex/workspace-example`.
It includes Subscription organization, runtime optimization, duplicate-Mount
rejection and grouped customization guidance. Its fresh nine-package local
rehearsal passes with source digest
`b8b162accc756093e0516fbc0d0c12378915370b2eb680514d377fc0086f2abe`.
The earlier broad evidence below retains its `978c07a093` pin. Published Ready
remains `1f6776fa7ececa766188df5201eefec6ba781b5d`; integration and main have
not moved.

The [API review](next-preview-review.md#public-api-changes-since-that-preview)
contains the consumer migration table. This summary supersedes older preparation
checkpoints while preserving their dated evidence.

The subsequent [Subscription organization followup](subscription-registry-organization.md)
consolidates Website's local registry and documents the convention across the repo.
Its targeted checks supplement the frozen framework/package evidence below;
that evidence retains its exact implementation pin.

The [runtime investigation at fa96](preview-runtime-investigation-20261026.md) identifies
Mount validation as the largest added measured phase and verifies a 12.7%
optimized workload reduction. No public API changes are introduced. Remaining
main costs and bundle growth are retained for approval.

### Current followup verification

- Source/emitted contracts, strict relocation, six unchanged compiler ceilings
  and 3,801 core tests pass. Of 289 declarations, 288 are byte-identical to fa96;
  the only change is four `OnMount` TSDoc lines, with no signature changes.
- UI's 1,301 tests and Website's 1,495 tests and production build pass. Three
  duplicate-Mount regressions first fail on the old behavior, then pass.
- All nine public artifacts are rebuilt and packed from the frozen candidate.
  Coverchart source/lint, 40 tests, build and persistence/browser checks pass.
- Generated SPA, SSG and SSR projects pass source, lint, tests, builds and browser
  checks. Installed testing, Binding and initialization contracts pass.
- Workspace's 32 browser tests pass without retries. The actual Coverchart
  checkout and all 88 tracked-file hashes are preserved.
- [Current source, package and security evidence](preview-final-hardening-20261026.md)
  distinguish local acceptance from publication. Daybreak's addendum closes the
  earlier Low duplicate-Mount finding. Earlier rendering measurements retain
  their fa96 source pin; this hardening pass adds no timing claim.

## Changes from the published preview

### Required migrations

- `Composition.makeUpdate` takes exhaustive handler records. The callback overload
  is removed. Keep `.withContext`; empty/routed-only Compositions use `{}`.
- `makeCommandsStep` takes a producer callback; its collection-taking form is
  removed. `makeOutMessageStep` also takes a producer; its value-taking form is
  removed. All three focused helpers support Model-aware callbacks and
  payload-only `.fromMessage`. Producers run when applied; Command-only and
  OutMessage-only transitions preserve incoming Model identity.
- Fully attached ManagedResource registries expose `managedResources.layer`.
  `layer` is newly reserved; mixed/host-owned entries use explicit providers.
  The temporary followup `ManagedResource.handlersLayer` helper is not retained.
- Handle the new keyboard DragAndDrop facts and echo invocation generations in
  custom keyboard-result delivery. Keyed Command cancellation sees only own
  selected fields; broad/mixed policies need precise optional fields or narrowing.
- Preserve connected result channels and OutMessages at composition boundaries.
  Stronger source and declaration checks reject demonstrated channel loss; they
  do not recover contracts already explicitly erased upstream.

No compatibility aliases remain for the removed forms. The checked
`prepareBlock`/`Block.assemble` boundary, Definition `make*` factory names and
`Program.make` already exist in the published preview.

### Conveniences, fixes and organization

- Optional `makeMapBinding` derives Record/HashMap child storage; optional
  `makeVariantBinding` handles whole tagged members. Ordinary operations retain
  membership and native occurrence/lifecycle behavior.
- Optional `foldkit/bindingInit` helpers set, append or insert children for proven
  storage shapes. Keep explicit `Binding.init` for extra parent metadata, sibling
  changes, mixed work and storage the Binding cannot establish.
- Public tests can construct child facts through `toParentMessage`, inspect exact
  Command arguments through `argsOf`, and model concurrent Messages/Subscription
  delivery while resolving pending Commands explicitly.
- Nested Effect DateTime/TimeZone ViewInputs, reciprocal Binding inference and
  connected output contracts receive source and declaration fixes.
- Workspace exercises retained per-entity state, optimistic Board moves,
  notifications, routes/search parameters, Foldkit UI controls, Tailwind styling
  and coherent Story/Scene coverage. Its root uses ordinary checked assembly.
- Feature-local helper imports reduce qualification. Named transition Steps and
  purposeful Step-producing functions end in `Step`; ordinary direct-result
  handlers, public operation keys, folds and applied results keep distinct names.
  [Adoption and intentional exceptions](named-step-convention.md).
- Optional tsrs setup is recommended as a tested editor responsiveness option.
  Official TypeScript remains the repository/CI checking contract.
- Duplicate `OnMount` attributes throw during VNode construction, naming both
  Mounts before either handler starts. The customization guide groups existing
  variation options and shows a checked alternate embedded view.

Consumers, active snippets/guides, scaffolds, skills and TSDoc were audited for
adoption. Working lower-level APIs remain where they carry meaningful additional
policy. [Adoption details](preview-api-adoption.md) and
[initialization choices](child-initialization-family.md) record those exceptions.
Published historical material is preserved.

## Earlier broad verification at 978c07a093

This checkpoint precedes the Subscription and runtime followups verified above.
Its frozen source digest is
`41ec430daf817d7dc592f8123211d405022752a2d434cadb4c6269e03b9223c4`.
All 6,888 tracked files are present. The 6,994-file verification fingerprint is
unchanged before/after framework checks. Nine isolated local package manifests
carry the same digest label; their package versions are not public installation
instructions.

| Gate                | Final result                                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source              | All 53 workspace typecheck scripts pass with official TypeScript 7.1.0-beta                                                                                       |
| Public contracts    | Core/UI source, accepted/rejected emission, strict relocation and compiler diagnostics pass                                                                       |
| Workspace root      | 115 declarations / 13,315,392 bytes; strict relocated consumer passes with `skipLibCheck: false`                                                                  |
| Compiler budgets    | All six unchanged fixtures pass with unchanged counts; Subscription control remains at its ceilings                                                               |
| Runtime             | Core 3,793 + one existing skip with coverage; UI 1,301; Website 1,494; plugin 638; Typing Game 29                                                                 |
| Other packages      | Vite 331 + three skips; DevTools 6; MCP 98 + four skips; Node 32; Markdown 58; CLI 18                                                                             |
| Lint/metadata       | Base, application and Effect lint; peer floors, subpath/prebundle checks, 232 script tests and changeset checks pass; pinned-main skill-version equivalent passes |
| Website             | Production build and API generation pass; 281 Foldkit / 21 UI TypeDoc warnings and the build's chunk-size warning remain recorded                                 |
| Packed consumers    | Nine coherent artifacts; Coverchart type/lint/40 tests/build and five browser flows; generated SPA/SSG/SSR type/lint/test/build plus browser checks               |
| Installed contracts | Hash-matched rehearsal inputs exercise packed testing/event/dynamic-init contracts and nine initialization fixtures, including five lifted-Command cases          |
| Workspace browser   | 32/32, no retries or flaky/unexpected cases                                                                                                                       |

The artifact manifest SHA-256 is
`66dbe766c059a37381df17f322b92b81e342db33859b27aba17bb642653f32ac`.
Exact commands, artifact integrity and logs are under
`/private/tmp/foldkit-next-preview-signoff-final-20261026`; `rehearsal-summary.json`
and `final-execution.json` identify the installed acceptance scope.
The skill-version equivalent replaces only `origin/main` with the verified main
commit because this checkout has no origin remote. Its script, hashes and passing
output are recorded in `verification/metadata/check-skill-version-pinned.json`.

The first Typing Game attempt lacked its ordinary shared-package build; the
prerequisite was built and the affected source/runtime gates rerun successfully.
Scaffold fixture resolution uses frozen-lock overrides for Hono 4.13.11,
ip-address 10.7.2 and `magic-string@^1.4.0` at 1.4.2. These are rehearsal controls,
not package changes, and `minimumReleaseAge` is unchanged. Browser evidence
retains expected favicon 404s and one non-failing Foldkit slow-view diagnostic
at 17.1 ms against its unchanged 16 ms threshold.

Actual Coverchart remains at `c51e856b2e75ca44106e37ead24f9c4e8046aef0`; all 88
tracked file hashes are unchanged, and its preexisting untracked `.claude/`
directory remains present. Its contents were not hash-audited. The user's
running servers are preserved. Local tarball acceptance does not constitute
published-registry or immutable-deployment acceptance.

## Rendering and retained performance limits

[Full method, ranges, paired ratios, bundle costs and all raw samples](preview-lustre-20261026.md)
record the requested fresh Lustre comparison. Each workload adds 100 Todos,
toggles 100 and deletes 100; totals include instrumented callback and DOM/update
work, with boot and waits excluded.

| Paired comparison                                         | Naive medians            | Optimized medians        |
| --------------------------------------------------------- | ------------------------ | ------------------------ |
| Main → prepared, eight rounds                             | 516.5 → 588.6 ms, +14.0% | 191.1 → 268.7 ms, +40.6% |
| Published preview → prepared, separate four-round control | 584.6 → 613.1 ms, +4.9%  | 279.4 → 277.1 ms, −0.8%  |

All 48 samples pass. The main gap is real in this screen and remains a cost for
release review; it does not isolate renderer CPU. The published-preview control
has overlapping ranges and an effectively similar optimized result. It does not
reproduce a large incremental slowdown, prove zero regression, or establish a
speedup. Do not join absolute timings across batches.

Gzip grows by about 31.7–32.4 KB versus main and 1.8 KB versus the published
preview. No API/source change is inferred from these timing results.

A subsequent six-round, 36-sample comparison measures main, unchanged preview
and the runtime followup together. Optimized medians are 190.9, 266.8 and
232.9 ms: 12.7% faster than unchanged preview, still 22.0% slower than main.
Five of six paired optimized rounds improve. Naive medians are 469.6, 562.6
and 565.3 ms, an effectively similar preview result with a remaining 20.4%
main cost. All samples pass. The full report retains ranges, the slower candidate
sample, raw totals, phase/profile limits and the unchanged runbook. These
measurements supersede the unexplained-cost assessment without replacing the
older snapshots above.

Native TypeScript cold-root requests can still take several seconds. Earlier
paired editor results retain their own source pins; this pass refreshes compiler
ceilings and rendering evidence, not long-session editor-memory guarantees.
Synthetic declaration scaling and explicit-erasure limits remain documented.

## Feedback and security

The final October 26 scoped check found a new foldkit-plus report on preview PR
#1655, posted at 12:09:35 UTC. Its concrete envelope-portability and duplicate
Mount claims reproduce on the published preview and pre-fix code.
Documentation clarifies runtime-local envelope admission. The two subsequently
approved improvements now reject duplicate Mounts and group existing Block
customization guidance; broader proposed integration APIs remain open requests.
[Current feedback assessment](preview-feedback-20261026.md).
Performance-help issue #1737 has no newer replies. Unrelated features and fork
migration work are outside this release. Earlier report dispositions retain
their linked evidence.

The refreshed dependency audit has the same advisory contracts as the reviewed
checkpoint: 1 Critical, 8 High, 11 Moderate and 4 Low. Existing reachability limits
and maintenance followups remain. A separate check of Monaco's actual vendored
sanitizer records five additional advisory reports whose required modes/hooks
are absent; those are not folded into the lockfile counts. No dependency,
manifest or lockfile changed in the hardening followup.

[Daybreak passes the complete published-preview-to-e320 delta](preview-daybreak-20261026.md),
including runtime `fa96bf7d90`, with no new release blocker. The subsequent
[exact-f550 addendum](preview-daybreak-hardening-20261026.md) passes and closes
the duplicate-Mount Low finding. All 6,900 tracked paths of that frozen target
are verified. The fresh independent dependency
review establishes no concrete reachable blocker under current paths/settings;
this is not a clean audit. [Review scope, exact evidence and remaining maintenance](next-preview-security-review.md#october-26-final-review).

The [fresh hardening rehearsal](preview-final-hardening-20261026.md) rebuilds all
nine packages from f550 and verifies installed consumers and browser workflows.
Subsequent internal evidence edits retain those package inputs. Local build and
rehearsal evidence do not establish deployed output.

## After approval

1. Integrate into `codex/layers-and-submodels`, never main, and allow its canary
   release workflow to assign the published commit and coherent package map.
2. Verify the published package set and matching immutable documentation
   deployment. Repeat published-package/scaffold acceptance; local tarballs are
   preparation evidence.
3. Bind the stable migration guide, previous-preview upgrade guide, new-project
   scaffold command and both copyable agent prompts to that exact manifest and
   deployment. Preserve installed dependency/devDependency placement.
4. Update actual Coverchart to the verified package set, then check and commit its
   migration. Preserve concurrent user work.
5. Update PR #1655's three starting paths, editor note, latest verified commit,
   release summary and Ready status. Preserve user-authored content and retain a
   link to the prior snapshot. Check banner, guides, prompts and versions agree.

Keep the current published Ready instructions available until the replacement
passes publication and deployment gates. No integration push, merge to main,
publication, deployment promotion or actual Coverchart migration occurred during
this preparation.
