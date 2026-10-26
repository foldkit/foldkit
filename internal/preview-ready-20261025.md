# Next preview preparation

## Status

Implementation checkpoint: `1b89a2325553dee7bcbea1a42b1156146c4ac030` on
`codex/workspace-example`. The final documentation commit follows that checkpoint.
Publication requires the user's approval. Published Ready remains
`1f6776fa7ececa766188df5201eefec6ba781b5d`; integration and main are unchanged.

The scoped feedback audit is complete. There are no newly untracked Workspace
requests, and the latest read-only check found no new relevant replies after
October 25, 18:00 UTC. The final disposition distinguishes implemented fixes,
clarified contracts and retained limitations. It does not claim that every open
repository issue belongs to this release.

## Public API changes from the published preview

| Change                               | Required migration or optional use                                                                                                                                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Record-only `Composition.makeUpdate` | Replace aggregate callbacks with exhaustive Model-first handler records. Keep `.withContext`, compatible Steps and extracted `handle<MessageTag>` handlers. Empty/routed-only Compositions use `{}`.                                      |
| Focused Step producers               | Commands and OutMessage helpers now require callbacks. All three focused helpers support Model-aware producers and `.fromMessage` for payload-only handlers. Direct cohesive mixed results remain appropriate.                            |
| `managedResources.layer`             | Fully attached owned registries expose the aggregate, including `Layer.empty` for empty registries. Reserve the entry key `layer`; mixed/host-owned registries use explicit providers.                                                    |
| Keyed Command cancellation           | `toKey` receives only own selected fields on both invocation and interruption. Broad annotations must handle uncertain fields as optional; narrow mixed policies before construction. Literal tuple policies retain exact Interrupt args. |
| Schema-derived child storage         | Optional `makeMapBinding` and `makeVariantBinding` remove repeated accessors for supported map and whole-variant storage. Custom relationships keep explicit accessors.                                                                   |
| Dynamic keyed-array initialization   | Optional `initAndAppend` from `foldkit/bindingInit` reuses an existing `init.toItem` policy and registered child initialization. Six eligible consumers are migrated.                                                                     |
| Public testing helpers               | Optional `Command.argsOf`, `toParentMessage`, `Story.messageWith`, registered `Story.Subscription.from(...).emit` and `Scene.Command.keepPending` cover captured args, child facts and concurrent delivery. Resolution remains explicit.  |

The checked preparation/assembly boundary, ordinary Definition factory names and
`Program.make` were already in the published preview. They are unchanged here.
The [upgrade guide](../packages/website/src/page/previewUpgrade.md) selects the
correct starting snapshot from package manifests and lockfiles.

The initialization example now reads:

```ts
return initAndAppend(ProjectSettingsBinding, model, {
  key: project.id,
  args: [project],
})
```

The helper is a leaf export rather than a new member on every Binding. It
supports existing initialized keyed arrays, rejects duplicates and preserves
wrappers, child Commands, registration and lifecycle behavior. Other storage,
replacement and mixed parent transitions keep explicit `Binding.init`.
[Design, adoption and limits](dynamic-child-append.md).

## Correctness and consumer work

- Accept nested ordinary Date and Effect DateTime/TimeZone ViewInputs while
  rejecting nested application callbacks.
- Preserve exact per-Message output channels, connected OutMessages, registered
  operations and assembly checks. Repair reciprocal/converging Binding policy
  expansion and the native checker-order Program-root failure.
- Preserve generic handler construction validation. A factory with an unresolved
  generic Service key uses caller-owned `toLayer` wiring; the emitted concrete
  caller proves exact requirements and missing-provider rejection.
- Repair actual keyed cancellation mismatch. Selected-field inference and the
  same runtime projection prevent a started invocation from becoming untargetable.
- Complete Workspace feedback: readable ordinary assembly/update organization,
  retained entity state, normal route/query handling, optimistic board behavior,
  notifications, consistent Foldkit UI controls, Tailwind/clsx and Story/Scene
  organization. Remove the unnecessary return-URL parser chain.
- Audit adoption across examples, Website, Typing Game, UI, scaffolds, active
  snippets and agent guidance. [Intentional exceptions](preview-api-adoption.md)
  remain concrete; a compilation pass alone is not the adoption claim.

## Fresh verification

| Gate                        | Result                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Repository source           | 53/53 projects; stable source/artifact hashes                                                                            |
| Core source checker matrix  | Two rounds at 1, 4, 5, 6 and 8 checkers, all pass                                                                        |
| Public declarations         | Core/UI source, emitted acceptance/rejection and strict relocation pass                                                  |
| Runtime                     | Core 3,753 plus one intentional skip, coverage passes; UI 1,301; Website 1,490; Workspace 153; Job Application 69        |
| Workspace root declarations | Actual ordinary root emits 115 declarations, 13,222,561 bytes; strict relocated consumer passes                          |
| Compiler ceilings           | All six pass; original five budgets unchanged                                                                            |
| Website production          | API generator has zero errors; Vite build passes. Retained TypeDoc/link and chunk-size warnings are recorded             |
| Installed consumers         | All nine packages built and packed; Coverchart source/lint/40 tests/build; SPA/SSG/SSR source/lint/tests/builds all pass |
| Installed new contracts     | Ten focused tests across prior testing/variant, event delivery and dynamic initialization contracts pass                 |
| Browser behavior            | Five Coverchart flows, all three scaffold modes and Workspace 32/32 pass                                                 |
| Independent review          | Exact implementation commits and static security/behavior delta clear, with limitations below                            |

Builds and measurements use package-local official TypeScript 7.1.0-beta. The
CLI build uses its package-local TypeScript 7 compiler. A TypeScript 6 shim
control is excluded from evidence. Mutation checks demonstrate failure of the
new safety/runtime regressions with their protections removed.

The packed base source digest is
`1bde00b222548354260a2d78ea0586f3c1930cf92aa32a7db1c73f6a437df5a9`.
Workspace's first browser attempt found the missing source alias for
`foldkit/bindingInit`. Final Workspace 32/32 uses that base snapshot **plus the
recorded exact `examples/vite.aliases.ts` correction** from `1b89a2325553`.
All 2,446 package/scaffold input files checked against the packed freeze remain
identical. The CLI copies example source/manifests rather than that Vite alias.
Packed acceptance transfers through this input identity, not an invented exact
commit-addressed canary.

Rehearsal-only corrections are recorded: missing offline dependencies fetched
with the same local Foldkit artifacts, one injected test's Layer composition,
external Chrome 155.0.8059.85, confirmed favicon-only 404 diagnostics and direct
Playwright invocation. Unexpected browser errors remain failures. The actual
Coverchart repository and user Workspace servers remain preserved. This is
local tarball acceptance, not npm registry or immutable deployment acceptance.

## Performance and remaining limits

Three alternating paired runs of each native workload find no material overall
regression against the pre-initialization checkpoint. Workspace Block completion
is 49 ms, Binding hover/completion 280/276 ms and error appearance/clearing
202/178 ms. Bounded peak RSS is 444 MiB. Website Binding completion is 236 ms;
ordinary completion adds about 6 ms; cold completed-root Message access remains
about 2.8 seconds. [Ranges, baseline, method and limits](preview-framework-performance.md#final-initialization-and-testing-candidate).

The final four-round runtime screen passes all correctness checks. Against the
published preview, naive rendering is 560.3→564.0 ms (+0.7%) and optimized
rendering 266.1→256.4 ms (−3.6%), with overlapping ranges. JavaScript adds about
1.6 KB gzip. This is a bounded instrumented DOM/update workload, not a universal
performance guarantee.

- Native cold-root latency and long-session memory remain limitations. Optional
  tsrs is recommended for trying improved editor responsiveness; official
  TypeScript remains the typechecking/CI contract.
- Whole-root declarations are large. This proof does not establish unlimited
  graph scaling or remove every purposeful extracted-input annotation.
- [#1776 overload diagnostics](command-diagnostic-assessment.md) remain opaque in
  some invalid cases. Reordered signatures exceeded fixed compiler ceilings;
  invalid wiring remains rejected at compile time with active troubleshooting.
- Explicitly erased Mount/TypeScript contracts retain their documented limits.
  Normal inference and precise source/emitted rejection controls remain.
- Existing dependency findings remain 1 Critical, 8 High, 11 Moderate and 4 Low
  with the reviewed reachability limits. There is no new Daybreak run or clean
  dependency-audit claim.

## After approval

Integrate only into `codex/layers-and-submodels`, verify the published package
set and immutable deployment, and generate the PR's three starting paths from
that manifest: stable migration, previous-preview upgrade and new project.
Preserve previous Ready instructions until the new snapshot passes those gates.
Then upgrade actual Coverchart against the exact published snapshot. No main
merge, integration push or publication is authorized by this preparation.

## Evidence

The complete logs, hashes and read-only feedback inventory live under
`/private/tmp/foldkit-release-ready-20261025/`: `verification/`,
`rehearsal-summary.json`, `final-package-input-equivalence.json`, `native/` and
`feedback/disposition.md`. The runtime comparison includes all four balanced rounds and correctness logs. [Release handoff](next-preview-release-handoff.md).
