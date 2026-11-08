# Connected-operation immediate-output precision checkpoint

Status: **rejected for adoption**. The bounded candidate is retained only as an
isolated proof and implementation checkpoint. It was not copied into the shared
worktree, committed, or pushed.

Base: `7cc7d90e68dc5a55b4765bbd7f0469b55cdd928f`

## Candidate behavior

- Popover input declarations distinguish immediate `Opened` from `Closed`.
- A parent can compose an exact silent close policy with a later Step.
- An emitting open policy still fails `combineSteps` statically.
- Deferred traversal visits `(placement, immediate tag)` and an all-cases visit
  subsumes exact tags, so a same-placement `Opened -> close -> Closed` path is
  analyzed while a same-tag cycle terminates.
- Missing, erased, `any`, `unknown`, `never`, broad-string, non-tagged, and
  partially tagged evidence remains conservative.
- Fold selection requires normalized per-case evidence; raw folds fall back to
  all cases. Forwarding remains aggregate and conservative.
- Selected and unselected policy branches still undergo global registered-graph
  validation.
- A deliberately type-erased implementation that promises `Closed` but emits
  `Opened` reaches the actual `Opened` policy, then the existing runtime
  `Update.combineSteps` assertion prevents loss of the parent OutMessage.
- Completion rejects an ordinary typed provider whose exact `RequestedClose`
  declaration promises `Closed` but whose implementation emits `Opened`.
- No new runtime Schema-validation phase was added. Intentionally erased or
  forged providers remain outside static completion guarantees; runtime output
  loss protection remains intact.

## Final checks

- Core source no-emit: passed.
- UI Popover declaration source fixture: passed.
- Focused runtime: passed, 2 files / 9 tests.
- `git diff --check`: passed.
- Final tag-only candidate emitted/source-free gate: not run after the ceiling
  rejection. The preceding ResultContract-only encoding passed the full
  isolated UI emitted/source-free gate, including its evidence-erasure
  mutation, but is not the retained final encoding.

## Unchanged TypeScript 7.1 compiler ceilings

| fixture | instantiations | maximum | types | maximum | result |
| --- | ---: | ---: | ---: | ---: | --- |
| deep-composition-8 | 668,962 | 671,225 | 54,028 | 54,305 | pass |
| wide-composition-100 | 1,399,757 | 1,407,702 | 81,490 | 81,772 | pass |
| command-requirements-200 | 344,558 | 346,362 | 64,167 | 64,468 | pass |
| wide-subscriptions-100 | 548,136 | 548,577 | 23,588 | 24,507 | pass |
| workspace-composition-4 | 1,637,511 | 1,609,171 | 117,907 | 117,873 | **fail** |
| workspace-composition-8 | 2,840,443 | 2,787,171 | 160,940 | 160,966 | **fail** |
| machine-search | 69,498 | 70,054 | 13,132 | 13,402 | pass |
| attribute-bundles-200 | 114,226 | 114,226 | 29,369 | 29,370 | pass |
| layered-composition-6 | 2,713,079 | 2,707,124 | 336,491 | 336,291 | **fail** |

No budget or ceiling changes are proposed.

## Final source hashes

```text
62cfe9fdfdc1571e4cb395390aadd7f7d2e778562b74c272d9be6afeaf2f41e4  packages/foldkit/src/block/binding.ts
dd79bdd41d59bdc229e527ce9a1ebc826484a419a1cf6c0c2f8c600da7f8f64d  packages/foldkit/src/block/deferredPolicy.ts
8000526aacf514e03b469659a8eb45df8143b31771177187c1e7fbf6d76bf795  packages/foldkit/src/block/operationEmission.ts
0318243d6ea8ebbec5e9b02fad456899944ed31af96ecb20cfe303056ddde577  packages/foldkit/src/block/parentOwnedBinding.test.ts
1232014204a6905d36d95599fd24738d57c9ce6450b5b107b777f0aecb534c0d  packages/foldkit/src/experimental/constructed/contract.ts
efaa2fb43f0cc7071acd60e9064e9cd006c7a854a8efe5ad2d1fe9c64d1ea9e8  packages/foldkit/src/experimental/contracted/inMessageUpdateComposition.test.ts
bba00957dd3d67867eeeda45a8f87a3db400a9ff6dc046cddca5c87947846f41  packages/ui/declaration-tests/popover-close-without-restoring-focus.accepted.ts
52a2cb09e2cc17d1c2d0c2a8131e83e3f4dfc6414cafe186dfecb2453f517f23  packages/ui/declaration-tests/popover-close-without-restoring-focus.rejected.ts
448a77a9d5ec8498676b71a1d70185d36ccb468998b1a1b7c3978bd16f148c97  packages/ui/scripts/check-emitted-declarations.ts
759dcc6db59810627da02e38d19c25eca78059338bab46dce9bc41be05d31107  packages/ui/src/popover/bindingClose.story.test.ts
7e8de3ccb00b46a968e2db9d4c6296d21d9f9854fa76604d729bf42f27bef1b2  packages/ui/src/popover/block.ts
```

## Retained location

The complete uncommitted candidate remains in this directory. `git diff` from
the base above is the exact candidate patch. Temporary isolated build output is
ignored and is not part of the candidate source.
