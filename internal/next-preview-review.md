# Next preview review

## Status

The preparation is on development branch `codex/workspace-example`. The latest
implementation checkpoint is `1b89a2325553`; the
[final preparation report](preview-ready-20261025.md) supersedes older verification
counts below. Publication remains held for your approval. Published Ready stays
`1f6776fa7ece`; release integration and main have not been updated.

## Public API changes since that preview

| Change                                            | Consumer action                                                                                                                                                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Composition.makeUpdate` is record-only           | Replace aggregate callbacks with exhaustive `(model, message)` handlers. `.withContext(context => handlers)` and direct/curried returned updates remain. Empty/routed-only updates use `{}`.                                                                  |
| All three focused Step helpers use producers      | `makeFieldsStep`, `makeCommandsStep` and `makeOutMessageStep` receive callbacks. Use `.fromMessage` for payload-only producers, Model-aware producers when needed and zero-argument callbacks for fixed output. Commands/OutMessages preserve Model identity. |
| ManagedResource aggregation matches Subscriptions | Fully attached owned registries expose `managedResources.layer`; empty registries provide `Layer.empty`. The key `layer` is reserved. Mixed/host-owned entries use explicit providers.                                                                        |
| Record/HashMap child storage                      | Optional `makeMapBinding` derives storage and occurrence keys from the parent Schema. Ordinary operations preserve membership and ignore absent occurrences.                                                                                                  |
| Captured Command arguments                        | Optional `Story.Command.argsOf` / `Scene.Command.argsOf` project exact args by Definition identity. Occurrence selection remains explicit.                                                                                                                    |
| Headless child facts                              | Optional `toParentMessage` from `foldkit/test` replaces mapper-only embeds and manually decoded test envelopes. Supply the actual Binding and decoded Message/key.                                                                                            |
| Concurrent Story Messages                         | Ordinary `Story.message` retains pending Commands; resolve them explicitly before Story completion. Scene retains its boundary checks, with the explicit `keepPending` operation described below.                                                             |
| Dynamic keyed-array initialization                | Optional `initAndAppend` from `foldkit/bindingInit` reuses an existing `init.toItem` policy. Other storage and mixed parent transitions keep explicit `Binding.init`.                                                                                         |
| Testing event delivery                            | Optional `Story.messageWith`, `Story.Subscription.from(...).emit` and `Scene.Command.keepPending` model concurrent inputs while keeping resolution explicit.                                                                                                  |
| Keyed Command cancellation                        | `toKey` receives only own selected fields on both paths. Precise tuple policies retain exact cancellation args; broad or mixed policies need accurate optional fields or narrowing.                                                                           |
| Whole tagged child variants                       | Optional `makeVariantBinding` from `foldkit/variantBinding` derives exact whole-member storage from the parent Union. Other storage keeps existing accessors.                                                                                                 |

Handle DragAndDrop’s new `StartedKeyboardDrag` and `ChangedKeyboardTarget` OutMessages in exhaustive policies. Keep complete connected results: a handler mixing raw local branches with connected recipes needs Definition-owned local Steps. Ordinary cohesive raw handlers can return results directly. Silent operations now retain their own per-Message channels rather than inheriting unrelated OutMessages.

The checked `prepareBlock` / `Block.assemble` / `FromAssembly*` pattern, completed-only feature exports, `Program.make`, and ordinary factory names were already in the published preview. They have not been renamed again.

Workspace's extra implementation interface and nested producer annotation are removed. Exporting the existing exact Binding tuple type lets ordinary Website-style root assembly emit and relocate without framework changes. The tuple inventory remains; declarations are larger. Three alternating native pairs improve completed-Block post-edit completion from 840 to 57 ms while other workflow ranges overlap. All five compiler counts are unchanged. [Current cleanup, proof and limits](workspace-clean-assembly-20261025.md).

## Other improvements

- Nested Date/Effect DateTime/TimeZone ViewInputs are accepted while application callbacks remain rejected.
- Reciprocal/converging policies, connected OutMessage combinations, registration, and assembly diagnostics have focused regressions.
- Public UI declaration headers and a targeted private Workspace boundary repair actual declaration expansion failures without wider requirements.
- The Workspace example now exercises realistic shared data, routed retained drafts, optimistic board moves and rollback, creation, comments, saved views, notifications, continuous activity and accessible Foldkit UI controls.
- Examples, Website, Typing Game, UI, scaffolds, snippets and agent guidance were audited for adoption. Intentional mixed-result, guarded and domain-only exceptions are [documented](preview-api-adoption.md).

## Verification

The counts in this section describe the verified `679d2d5e7f` checkpoint. The [subsequent followup report](preview-final-followups-20261025.md) identifies its refreshed gates and the inherited explicit Mount-erasure limitation.

All 53 source configurations pass. Core/UI external declaration emission, rejection and strict relocation pass, including 28 independent adversarial channel cases. All five compiler ceilings pass twice unchanged. Runtime checks pass: core 3,700 with coverage, UI 1,298, Website 1,480, lint 622 and Vite 331, with documented intentional skips. Workspace’s 32 browser cases pass.

All nine packages were packed locally. Installed Coverchart and generated SPA/SSG/SSR projects pass source, lint, tests, builds and browser checks. The actual Coverchart repository and your running Workspace server are preserved.

## Performance and remaining limits

Official TypeScript Website hover/completion/definition are broadly similar to the published preview. Error appearance/clearing add about 56 ms; cold root Message access is 2.80 seconds versus 2.45. Workspace Block completion is about 0.77 seconds, with a sampled peak near 580 MiB in bounded fresh sessions. The runtime screen has overlapping ranges and median increases of 2.3% naive / 6.7% optimized. Bundles add about 1.6 KB gzip. [Methods, ranges and evidence](preview-framework-performance.md#october-25-final-candidate).

Independent review accepts these disclosed preview tradeoffs. Optional tsrs setup is recommended for trying improved editor responsiveness; official TypeScript remains the checking/CI contract. Native latency, unlimited declaration scaling and long-session memory are not claimed solved. Existing dependency audit findings retain their reviewed reachability limits; this is not a clean audit or new Daybreak review.

The subsequent followups add test-only `toParentMessage`, concurrent Story Messages while Commands remain pending and optional whole-variant Bindings. The extracted emitting-Step assessment retains one purposeful operation-derived input annotation. Fresh combined gates pass: 3,720 core tests with coverage, 1,485 Website tests, 13 Auth tests, source and strict relocated declarations, all five unchanged compiler ceilings, nine packed packages, Coverchart's 40 tests and build, all three scaffolds and four installed contract tests. Existing Scene and Command/Subscription replay paths remain supported.

Current Website hover/completion is 239/227 ms and Workspace Block completion is 790 ms. The bounded matched cold-root comparison is 2.95 seconds on exact `679d2d5e7f` versus 2.92 seconds with these followups, with overlapping ranges. It does not demonstrate a material incremental regression or a speedup. The roughly three-second cold root and the documented explicit Mount-argument erasure gap remain limitations. [Final scope, source pin and evidence](preview-final-followups-20261025.md).

## After approval

Workspace now retains per-ID editors and Boards, admits hidden save completions, applies parsed Routes without drag orchestration, repairs deleted saved-view return context, and organizes precise handlers and focused Steps. Shared controls use Tailwind component classes. The earlier default-Binding initialization prototype exceeded compiler ceilings and remains excluded. The new optional `foldkit/bindingInit` leaf passes the fixed budgets and is adopted at six eligible sites. The [transition cleanup report](workspace-transition-cleanup-20261025.md) records its earlier measurements. The subsequent [application simplification](workspace-simplification-20261025.md) removes the speculative drag API and navigation helper chain; current verification is recorded there. Earlier counts above describe their pinned snapshots.

Use only the preview integration branch, never main. Verify the published package set and immutable deployment, then generate the PR’s three starting paths: stable migration, previous-preview upgrade and new project. Preserve the prior Ready snapshot until those gates pass. Update actual Coverchart against that exact verified snapshot, then provide announcement links. [Release handoff](next-preview-release-handoff.md).
