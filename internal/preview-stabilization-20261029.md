# Preview upgrade feedback | October 29, 2026

## Scope

The [migration report](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6496365991)
upgrades `f3be22cfeefe` to the published `90746b32d2ca` snapshot. This follow-up
starts from `244251e9564da168bc1936d076bfc060908ec458`, which adds only the
publication record to that source. Local fixes do not change the published
packages, immutable documentation or PR #1655's Ready snapshot.

The report confirms the UI factory migration, compatible explicit Effect
pairs and Scene Mount identity. It retracts the earlier inferred-`any` report
as a probe error. Do not describe that claim as a framework bug fixed here.

## Installation

Fresh public npm 11.20.0 fixtures reproduce two failures of implicit peer
selection with Effect 4.0.0:

- A root Foldkit dependency selects platform-browser 4.0.6 and fails with
  `ERESOLVE` because that platform package requires Effect 4.0.6 or newer.
- A child workspace can install successfully with Effect 4.0.0 at the root
  and Effect 4.0.6 nested beneath the application.

Explicit 4.0.0/4.0.0 and 4.0.6/4.0.6 Effect/platform-browser pairs each resolve
one Effect installation. These fixtures inspect installed locations; they do
not execute an application using those copies. A root override selecting the
transitive browser peer at 4.0.0 also passes. The guide preserves direct dependency placement and limits
the override example to a transitive peer.

A valid older lockfile upgrades normally. Updating only one of two declaring
workspaces leaves the second workspace on its requested old cohort, even when
a repeated app-only install says it is up to date. Updating both workspaces
and running `npm ci` succeeds without deleting the lockfile. This does not
reproduce the separate report of an irreparable prerelease lockfile; that
case needs the original manifests, lockfile and npm version.

The two new copyable shell snippets run against four installed fixtures.
`npm ls --all` exposes mixed canary suffixes but can return success for that
graph. `npm query '[name="effect"]'` exposes the separate installed locations.
Neither command's exit status alone establishes a coherent application.

Main's Effect 4.1 update has not landed at this checkpoint. Its merge, revised
peer constraints and an npm workspace one-runtime gate are prerequisites for
the next release. The published 4.0.0/4.0.6 evidence does not establish 4.1
compatibility. No peer ranges were widened in this follow-up.

## Framework diagnostics

- `MissingBuildId.message` explains coordinated builds, matching
  `FOLDKIT_BUILD_ID` values or explicit build ids, and non-hydratable output.
  Its tag, constructor and failure conditions are unchanged.
- A named `Block.assemble(prepare)` call missing its checked header now exposes
  the existing annotation requirement in the compiler diagnostic. The fix
  moves the missing-header check onto the producer parameter; it changes no
  runtime assembly behavior. Invalid, `any`, `never` and unannotated producers
  remain rejected. Anonymous inline producers retain a nested draft/`never`
  diagnostic at their return expression.
- Mixed connected Binding recipes and raw local results remain rejected.
  The supported repair is a Definition-owned local Step, as documented in the
  Update guide. The error can still expose a long `AuthoredUpdateHandler`
  type. This pass does not claim a shorter diagnostic for that case.

## Organization and retained contracts

| Report item                                                         | Assessment                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Required operation context when a selected handler does not read it | Required by the current execution contract. The context factory runs before selecting the handler and may read the context itself. Omitting it would require a deliberate operation-authoring design. The Block guide now explains this.               |
| Root Stories importing child Commands                               | Tests can import the owning source module or a deliberately exported testing surface. Completed Blocks do not discover or export every private Command. Identity-based `Command.argsOf` inspects a known Definition; it is not lookup by name.         |
| Aggregate Command Layer                                             | Keep explicit local `Layer.mergeAll`. Commands have no closed registry equivalent to Subscriptions or ManagedResources. An automatic owner inventory would add import-order and unused-constructor policy.                                             |
| Subscription entry accepts fields rather than a Struct              | Supported contract; use the Struct's `.fields`. No new overload was added.                                                                                                                                                                             |
| Shared `makeResource` identity placement                            | Clarified with `resource.ts` importing the early Definition. Commands and lifecycle registries import that one accessor. The accessor imports neither consumer and does not create a Composition.                                                      |
| Raw GitHub source contains `::Snippet` directives                   | Canonical source format. Matching deployed HTML and `.md` pages expand those examples; the upgrade guide now directs readers there.                                                                                                                    |
| Guidance recommends `typeof Model.Type` annotations                 | Current organization, upgrade and scaffold guidance recommend adjacent same-named aliases. Schema headers correctly use `typeof Model`; alias declarations necessarily use `typeof Model.Type`. A conflicting page needs its exact URL for assessment. |

The resource-layout assessment also found an actual example defect: the
accessor snippet defined `CameraDefinition`, while its consumers imported
`Camera`. The active snippets now import the Definition and Composition from
their own modules and use the shared accessor. The complete copied split-file
consumer passes strict public-declaration typechecking. Restoring the original
snippets produces the missing `Camera` export error. Browser camera Effects
were not executed.

## Verification and evidence

The focused core run passes 104 runtime tests, core source typechecking,
assembly source acceptance/rejection, full core emitted-declaration checks,
source and relocated diagnostic checks, and all seven unchanged compiler
ceilings. Both new diagnostics have failing mutation controls. All 53 workspace
package typechecks, 964 Website documentation tests, the Website client build
and focused lint pass. Eight executions of the actual copyable npm snippets
detect mixed snapshots and duplicate Effect installations. The copied Camera
consumer passes strict public-type checking; restoring its original snippets
reproduces the missing export. The final local receipt records these checks.

Raw installation evidence is under
`/private/tmp/foldkit-npm-preview-install-20261029`; its receipt SHA-256 is
`5c8cad3ae9e3c6119883cd6bf347accf2f7b85ab6a55789e32b9befa27bd0897`.
All 82 recorded evidence digests were independently checked. Additional local
checks are under `/private/tmp/foldkit-preview-feedback-20261029-1421`, and the
diagnostic receipt is `/private/tmp/foldkit-stabilization-diagnostics-verification.json`.

The KeyedQuery accessor naming discussion remains a proposal:
`argsForPendingRequests` would replace `pendingArgs`. This pass makes no Query
API change. The explicit #1662/#1663 deferral until after the main merge is
unchanged. Publication of another preview requires the user's approval.
