# October 28 final preview preparation

## Subsequent approved work

After this checkpoint, the user requested Model-aware general `makeStep`
Message inference and `Scene.unhover`. Their implementation and affected
verification pass. [Follow-up evidence](step-inference-unhover-20261029.md).
The completed broader review and full installed-app rehearsal below apply to
source `564adb49e9`. The exact `d35d3ceb7a` follow-up separately passes the
approved Daybreak addendum and fresh nine-package build/pack checks.
[Final scope and receipts](preview-followup-final-20261029.md).

The user explicitly deferred #1662 and #1663 until after the Blocks + Effect
Layers work merges to main. Publication remains held for separate approval.

## Scope and hold

This follow-up starts at `073b2b5680caf177b2642cbd7e7328e326d2b678`
on `codex/workspace-example`. The published Ready snapshot remains
`f3be22cfeefed437164ad614d08b16d9000e0703`.

Publication, release-branch integration, public deployment, PR snapshot promotion
and the actual Coverchart upgrade require the user's approval. This preparation
makes no external posts and does not close contributor PRs or unconfirmed reports.

## Website development SSR

The Website's Playground type collector used recursive directory enumeration.
A package with a root-level type export caused it to collect nested dependencies,
including cycles in the local dependency tree. The generated JavaScript module
was 342,039,154 bytes in this checkout and Rolldown failed to convert it through
the native parser. This measurement describes that polluted local collection,
not a published package's declaration size or a general compiler regression.

Collection now stays within package-owned files, skips nested `node_modules`,
and does not traverse child symlinks. Root declaration entries keep their actual
contents rather than receiving a self-reexport. Monaco's declaration payload is
loaded during editor acquisition instead of through the server entry's imports.
The resulting client declaration asset is 21,552,056 bytes in the same checkout;
the server entry imports and renders without loading it.

Getting-started guidance distinguishes its exact installation pin from the
published compatibility range. Its guard checks both the prose and copyable
command against the exact development versions.

Three filesystem contract tests cover root exports, private dependencies and
cycles, overlapping exports, default barrels and export-equals declarations.
Isolated mutation controls restore the recursive walk and same-path barrel bug;
both fail the expected assertions. Website source typechecking and focused
application lint pass.

A normal development server, with HMR enabled, serves `/core/server-rendering`
and `/playground/counter` with HTTP 200. The documentation page renders in the
in-app browser and hydrates: its build stamp is removed, its heading is correct,
and no refusal marker or console error appears. Initial slow-view/patch warnings
and the known DevTools rich-snapshot preservation recovery warning are recorded.
The latter leaves live state intact and initializes the overlay fresh after a
reload; this check does not claim rich snapshots can be serialized. Playground
verification covers its shell and declaration asset, not WebContainer installation
or a running editor session.

## Feedback disposition

The refreshed [mixed-result report](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6474438019)
does not supply a complete runnable consumer. Reconstructed plain-result handlers
retain exact typing with and without context in source and relocated declarations.
The reported inferred-`any` defect is unconfirmed, not a verified release blocker.
A full failing module, exact versions and the value inferred as `any` are needed
for further diagnosis. Do not call this fixed or close the report on this evidence.

The distinct connected/local branch restriction is reproduced: one handler cannot
mix a connected Binding recipe with a raw local result. A Definition-owned local
Step preserves the checked channels and is accepted. Paired accepted/rejected
fixtures now cover this in source and relocated declaration consumers, with
not-`any`, exact OutMessage and Command-requirement assertions. Existing active
Update and preview-upgrade guides already explain the supported form. No API
restriction was relaxed and no production framework behavior changed here.

## Changes since the published preview

The published `f3be22cfeefe` already includes checked assembly, record-only
updates, focused Step callbacks, aggregate ManagedResource Layers and Workspace.
Those are not new migrations in this candidate. The active
[upgrade guide](../packages/website/src/page/previewUpgrade.md#upgrade-from-f3be22cfeefe)
is the consumer-facing checklist.

- Move map Bindings to the parent Definition's `makeMapBinding` method.
  Retained Record/HashMap children can use `makeInitIfMissingStep`.
- Use the optional general `makeStep.fromMessage` adapter for Message-only
  producers. Contextual update records accept compatible Steps and Binding
  operations directly. The reported large Root no longer hits TS2589 in its
  pinned reproduction; no universal graph-size or latency guarantee follows.
- Rename generic UI factories to `makeBlock`, including Toast's previous
  `make`. Existing type parameters and Schema arguments are retained.
- Machine authoring binds State/Message/Context contracts to a Definition and
  completes a checked Machine; extracted guards, handlers and transition maps
  use its helpers. Execution and graph inspection stay pure.
- Query/KeyedQuery add freshness, retention, targeted cancellation and accepted
  completion notifications. VirtualList adds history loading, external scroll
  ownership and table/absolute layouts. These are the additional domains-app
  capabilities requested on this branch; the domains migration is separate.
- Scene adds explicit URL-change delivery and Subscription activity assertions.
  Mount reconciliation follows renderer identity; Runtime releases the original
  Mount after removal even if its attribute changed. Subscription entries can
  own Model eligibility through `when`.
- SSR development reloads and disposal are repaired; SSG preview serves generated
  extensionless Routes. Model preservation failure recovers with a diagnostic.
- Effect peers accept the tested `4.0.0 || 4.0.6` pairs. Development/application
  pins stay exact. Active source and guidance use adjacent same-named Schema
  aliases, feature-owned Step helpers and predictable shared Step modules.
- Workspace has simpler retained child, Route and optimistic-update wiring.
  Existing meaningful conflict/rollback behavior is preserved.

The original inferred-`any` claim stays unconfirmed. Missing-handler diagnostic
priority, large-root compiler latency and the documented rendering gap versus
main are measured or acknowledged limits. General integration proposals and
unadopted conveniences are not counted as implemented fixes.

## Frozen candidate and final gates

The independently reviewed source is
`564adb49e908b3baf4c2e1855c8c6d67631b0c95`, frozen from a clean detached
checkout. Its 7,181-entry source digest is
`e8d49b0478ad9db7fd18341db11aa3cd979f2e97d47692d9fa50b9ad1fc49440`.
The pre-existing untracked `packages/foldkit/node_modules_foldkit` symlink is
excluded. Exact tracked-file and artifact guards pass after the rehearsal.

| Gate                            | Result                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Exact-commit independent review | PASS; no blocking findings                                                                                 |
| Website                         | 39 files / 1,514 tests pass; source typecheck and focused lint pass                                        |
| Website output                  | Client and SSR production builds pass with the exact build ID                                              |
| Package cohort                  | All nine public packages build and pack; hashes and installed internal dependency identities verified      |
| Installed Coverchart            | Typecheck, lint, 40 tests, production build and five browser flows pass                                    |
| Generated SPA/SSG/SSR           | All 12 command gates, 14 tests and three browser flows pass                                                |
| Preservation                    | Actual Coverchart HEAD/status and all 88 tracked files unchanged; owned servers stopped and ports released |
| Fresh dependency audit          | Completed with 30 findings; scoped disposition recorded separately, no clean-audit claim                   |
| Fresh Daybreak                  | PASS for the exact frozen source; approved external review and provenance addendum complete                |

The isolated Coverchart migration needs three factory renames: one `Toast.make`
and two `Menu.create` calls become `makeBlock`. Missing Menu factories initially
caused cascading Model/view/Step diagnostics. Correcting those calls removes the
errors without casts or framework changes. Its managed `FOLDKIT.md` is refreshed
in the isolated clone. The actual application is held for the published cohort.

Initial offline cache misses and pnpm metadata/network retries are preserved with
their failed logs. The final successful scaffold runs retain manifest and policy
bytes. SSG's unpublished peer uses an explicit local tarball transport fixture;
this is not a claim that a public installation resolves unpublished versions.
The initial Website suite stalled in a synchronous default-pnpm launcher; its
successful full run uses the recorded installed executable.

The latest production framework/performance evidence remains pinned to the
[feedback integration](preview-feedback-integration-20261028.md). No framework
runtime source changed in this final follow-up. Its editor and Lustre results
retain their measured workloads and source pins; no new runtime speedup is
claimed from the Website repair.

A final GitHub refresh at 22:59 UTC found no newer issue/PR activity since the
earlier 19:54 UTC cutoff, no new #1655 issue comments and no new review comments.
The unconfirmed `any` report retains the disposition above.

The [dependency disposition](preview-dependency-disposition-20261028.md) records
all 30 entries and actual Monaco sanitizer limits. No additional blocker was
demonstrated in current owned entry points; vulnerable dependencies are not
patched by that assessment. Undici's ordinary request transport remains a real
downstream risk for applications selecting that client, with a bounded patch
recommended as maintenance. The [completed Daybreak review](preview-daybreak-20261028.md)
independently retains these qualifications.

The user approved the private source/history transfer after its initial automatic
approval rejection. Daybreak reviewed the exact frozen candidate and returned
PASS. Its provenance addendum corrects an obsolete pre-approval statement in the
original report without changing that verdict. Source hashes match before and
after the review. [Exact review, records and limits](preview-daybreak-20261028.md).

All local preparation gates are complete. Publication remains subject to the
user's separate release approval. Registry acceptance, immutable deployment
checks, the actual Coverchart upgrade and PR Ready promotion follow that approval;
local rehearsal does not satisfy them. The published Ready snapshot is unchanged.

Raw evidence is under
`/private/tmp/foldkit-preview-final-prep-20261028/{parser,any,website,rehearsal}`.
The concise consumer receipt is `rehearsal/verification.json`; the nine artifact
hashes are in `rehearsal/artifacts.json`. Earlier source-specific reports retain
their original checkpoints.
