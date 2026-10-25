# Next preview review

## Status

Local preparation and verification are complete. Publication is held for your approval. The current published preview is `1f6776fa7ece`; no replacement has been published, pushed or merged into main.

## Public API changes since that preview

| Change                                            | Consumer action                                                                                                                                                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Composition.makeUpdate` is record-only           | Replace aggregate callbacks with exhaustive `(model, message)` handlers. `.withContext(context => handlers)` and direct/curried returned updates remain. Empty/routed-only updates use `{}`.                                                                  |
| All three focused Step helpers use producers      | `makeFieldsStep`, `makeCommandsStep` and `makeOutMessageStep` receive callbacks. Use `.fromMessage` for payload-only producers, Model-aware producers when needed and zero-argument callbacks for fixed output. Commands/OutMessages preserve Model identity. |
| ManagedResource aggregation matches Subscriptions | Fully attached owned registries expose `managedResources.layer`; empty registries provide `Layer.empty`. The key `layer` is reserved. Mixed/host-owned entries use explicit providers.                                                                        |
| Record/HashMap child storage                      | Optional `makeMapBinding` derives storage and occurrence keys from the parent Schema. Ordinary operations preserve membership and ignore absent occurrences.                                                                                                  |
| Captured Command arguments                        | Optional `Story.Command.argsOf` / `Scene.Command.argsOf` project exact args by Definition identity. Occurrence selection remains explicit.                                                                                                                    |

Handle DragAndDrop’s new `StartedKeyboardDrag` and `ChangedKeyboardTarget` OutMessages in exhaustive policies. Keep complete connected results: a handler mixing raw local branches with connected recipes needs Definition-owned local Steps. Ordinary cohesive raw handlers can return results directly. Silent operations now retain their own per-Message channels rather than inheriting unrelated OutMessages.

The checked `prepareBlock` / `Block.assemble` / `FromAssembly*` pattern, completed-only feature exports, `Program.make`, and ordinary factory names were already in the published preview. They have not been renamed again.

## Other improvements

- Nested Date/Effect DateTime/TimeZone ViewInputs are accepted while application callbacks remain rejected.
- Reciprocal/converging policies, connected OutMessage combinations, registration, and assembly diagnostics have focused regressions.
- Public UI declaration headers and a targeted private Workspace boundary repair actual declaration expansion failures without wider requirements.
- The Workspace example now exercises realistic shared data, routed retained drafts, optimistic board moves and rollback, creation, comments, saved views, notifications, continuous activity and accessible Foldkit UI controls.
- Examples, Website, Typing Game, UI, scaffolds, snippets and agent guidance were audited for adoption. Intentional mixed-result, guarded and domain-only exceptions are [documented](preview-api-adoption.md).

## Verification

All 53 source configurations pass. Core/UI external declaration emission, rejection and strict relocation pass, including 28 independent adversarial channel cases. All five compiler ceilings pass twice unchanged. Runtime checks pass: core 3,700 with coverage, UI 1,298, Website 1,480, lint 622 and Vite 331, with documented intentional skips. Workspace’s 32 browser cases pass.

All nine packages were packed locally. Installed Coverchart and generated SPA/SSG/SSR projects pass source, lint, tests, builds and browser checks. The actual Coverchart repository and your running Workspace server are preserved.

## Performance and remaining limits

Official TypeScript Website hover/completion/definition are broadly similar to the published preview. Error appearance/clearing add about 56 ms; cold root Message access is 2.80 seconds versus 2.45. Workspace Block completion is about 0.77 seconds, with a sampled peak near 580 MiB in bounded fresh sessions. The runtime screen has overlapping ranges and median increases of 2.3% naive / 6.7% optimized. Bundles add about 1.6 KB gzip. [Methods, ranges and evidence](preview-framework-performance.md#october-25-final-candidate).

Independent review accepts these disclosed preview tradeoffs. Optional tsrs setup is recommended for trying improved editor responsiveness; official TypeScript remains the checking/CI contract. Native latency, unlimited declaration scaling and long-session memory are not claimed solved. Existing dependency audit findings retain their reviewed reachability limits; this is not a clean audit or new Daybreak review.

The headless test-only child-envelope helper remains an assessed, nonblocking follow-up in #1760; existing Scene and Command/Subscription replay paths remain supported. Other bookmarked ergonomics are listed explicitly in the task board, rather than counted as implemented.

## After approval

Use only the preview integration branch, never main. Verify the published package set and immutable deployment, then generate the PR’s three starting paths: stable migration, previous-preview upgrade and new project. Preserve the prior Ready snapshot until those gates pass. Update actual Coverchart against that exact verified snapshot, then provide announcement links. [Release handoff](next-preview-release-handoff.md).
