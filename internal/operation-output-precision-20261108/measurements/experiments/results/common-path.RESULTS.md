# Common-path visitation representation checkpoint

Status: **rejected for adoption**. This was the final bounded representation
experiment on top of the already rejected immediate-output precision candidate.
It was not copied into the shared worktree, committed, or pushed.

Base repository commit: `7cc7d90e68dc5a55b4765bbd7f0469b55cdd928f`

Rejected predecessor snapshot:
`/private/tmp/foldkit-operation-output-precision-20261108`

## Exact experimental delta

Only `packages/foldkit/src/block/deferredPolicy.ts` differs from the rejected
predecessor:

- conservative/all-case visits use the original plain placement string;
- finite immediate tags use `readonly [placement, immediateCase]`;
- `IsVisited` first checks whether an aggregate placement was visited;
- an earlier exact tuple does not suppress a later aggregate visit;
- only finite-tag visits perform tuple extraction.

Old file SHA-256:
`dd79bdd41d59bdc229e527ce9a1ebc826484a419a1cf6c0c2f8c600da7f8f64d`

Experimental file SHA-256:
`9172bbe406546399507c139ef47e1d10938736595dfcd896a1655f8f98f54181`

The predecessor report was copied byte-for-byte to
`REJECTED-BASE-RESULTS.md`; both copies have SHA-256
`ddb2dc2be8ab920e1c61a5e80711d80967b2c289e22ba3b31715e9217c13e3d4`.

## Verification

- Core source no-emit: passed.
- UI Popover declaration source fixture: passed.
- Focused runtime: passed, 3 files / 10 tests. This included the twelve-place
  policy graph plus same-tag/different-tag and lying-provider controls.
- Full isolated UI emitted/source-free gate: passed on TypeScript 7.1.0-beta,
  including wrong exact-output rejection and the private evidence-erasure
  mutation.
- Selected and unselected missing-sibling policy branches remained rejected at
  Composition registration.
- `git diff --check`: passed.

## Unchanged TypeScript 7.1 compiler ceilings

| fixture | instantiations | maximum | types | maximum | result |
| --- | ---: | ---: | ---: | ---: | --- |
| deep-composition-8 | 668,962 | 671,225 | 54,028 | 54,305 | pass |
| wide-composition-100 | 1,399,757 | 1,407,702 | 81,490 | 81,772 | pass |
| command-requirements-200 | 344,558 | 346,362 | 64,167 | 64,468 | pass |
| wide-subscriptions-100 | 548,136 | 548,577 | 23,588 | 24,507 | pass |
| workspace-composition-4 | 1,637,468 | 1,609,171 | 117,882 | 117,873 | **fail** |
| workspace-composition-8 | 2,840,380 | 2,787,171 | 160,907 | 160,966 | **fail** |
| machine-search | 69,498 | 70,054 | 13,132 | 13,402 | pass |
| attribute-bundles-200 | 114,226 | 114,226 | 29,369 | 29,370 | pass |
| layered-composition-6 | 2,713,036 | 2,707,124 | 336,466 | 336,291 | **fail** |

The representation recovered only 43–63 instantiations in the failing
workloads relative to the rejected predecessor and did not change the adoption
decision. No budget or ceiling changes are proposed, and no further encoding
experiments are recommended in this batch.

## Final source hashes

```text
62cfe9fdfdc1571e4cb395390aadd7f7d2e778562b74c272d9be6afeaf2f41e4  packages/foldkit/src/block/binding.ts
9172bbe406546399507c139ef47e1d10938736595dfcd896a1655f8f98f54181  packages/foldkit/src/block/deferredPolicy.ts
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

The complete uncommitted candidate remains in this directory. `git diff` from
the base commit is the exact full candidate patch.
