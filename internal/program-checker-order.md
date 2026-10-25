# Program diagnostic order

## Reproduction

[Issue #1779](https://github.com/foldkit/foldkit/issues/1779) reported that changing the native TypeScript compiler's checker count changes Foldkit's typecheck result. The investigation reproduced that behavior on commit `7cae186087614f17377a5c3266174e233bc78c35`, TypeScript `7.1.0-beta`, Effect `4.0.0`, and Node `24.22.1` on macOS arm64.

Two consecutive runs of each checker count produced the same result:

| Checkers | Original source diagnostics | With the Program guard |
| -------- | --------------------------: | ---------------------: |
| 1        |                           0 |                      0 |
| 4        |                           0 |                      0 |
| 5        |                           0 |                      0 |
| 6        |                           3 |                      0 |
| 8        |                           0 |                      0 |

The three diagnostics were in `src/runtime/mountViewState.test.ts`. Adding a copy of the unrelated `src/test/apps/drafts.ts` fixture changed the failing files: six checkers then produced five diagnostics in `src/mount/define.test.ts`. Restricting Go to one operating-system thread with `GOMAXPROCS=1` retained the same five diagnostics. All five checker counts passed with the Program guard and the added fixture.

The failure reduces to one native checker receiving these two diagnostic requests in order:

1. `src/block/authoring.test.ts`
2. `src/mount/define.test.ts`

Checking the Mount file alone succeeds. The ordered replay fails at its exact Layer and Mount requirement assertions on lines 310, 335, 376, 658, and 826. This reproduces the error without concurrent checking or dependence on the compiler's file partition.

## Cause and change

The authoring test intentionally passes an unfinished `AssemblyDraft<never>` to `Program.makeElement`. The compiler rejects the call, but overload inference also evaluates the return type with the broad `AnyBlock` constraint. Recursive requirement and runtime-service extraction from that fallback reaches TypeScript's instantiation depth limit. Later Mount conditionals evaluated by the same checker then produce incorrect results.

Removing only that invalid Program call clears the subsequent Mount errors. A six-checker trace with the unrelated fixture recorded 107 `instantiateType_DepthLimit` events, originating in `authoring.test.ts` and `fromAssembly.test.ts`. The same trace with the Program guard recorded zero such events and no diagnostics.

Completed Block contracts carry a required `__blockHandlerRequirements` field. The broad `AnyBlock` constraint makes that field optional. `ProgramRequirements` and `ProgramRuntimeServices` now use its required presence to defer recursive extraction for the broad fallback. `ValidateProgramBlock` continues to reject unfinished roots, erased handler evidence, unresolved handlers, and invalid root views and channels.

The guard is non-distributive. A union of valid roots still computes the runtime services guaranteed by every alternative. A resource registered by only one alternative remains a requirement. The change adds no runtime behavior, casts, compiler pin, or relaxed validation.

## Permanent verification

`packages/foldkit/scripts/check-emitted-declarations.ts` requests diagnostics for the two source files in the fixed order above, using a fresh native compiler Program with one checker. The rejected root remains marked with its existing `@ts-expect-error`, so accepting it also fails this gate. Reverting only `src/runtime/program.ts` makes the gate fail with the five Mount errors; restoring the guard clears them.

`declaration-tests/tsconfig.program.source.json` checks the existing Program acceptance, rejection, inferred portability, and union-service consumer fixtures directly against source. The emitted declaration harness checks the same contracts after external emission and relocation, with library checking enabled. The existing union fixtures assert missing ordinary Services, partially registered resources, keyed resources, different placements, and exact runtime-service guarantees.

Removing just the Program `@ts-expect-error` directive in each of `authoring.test.ts` and `fromAssembly.test.ts` produces two `TS2769` diagnostics with the guard. Both invalid roots therefore remain rejected before restoring the directives.

Run the ordered regression and the source and emitted contracts after building the package:

```sh
pnpm --filter foldkit build
pnpm --filter foldkit check:emitted-declarations
pnpm --filter foldkit check:block-type-performance
```

Check each worker count twice from `packages/foldkit`:

```sh
for checkers in 1 4 5 6 8 1 4 5 6 8; do
  ./node_modules/.bin/tsc -p tsconfig.json --noEmit --pretty false --checkers "$checkers"
done
```

The isolated Program change passed all five existing performance ceilings without changing them:

| Fixture                  | Instantiations | Instantiation ceiling |   Types | Type ceiling |
| ------------------------ | -------------: | --------------------: | ------: | -----------: |
| deep-composition-8       |        589,662 |             1,152,618 |  50,963 |       55,843 |
| wide-composition-100     |      1,150,908 |             3,132,298 |  73,059 |      216,662 |
| command-requirements-200 |        329,611 |             2,659,415 |  61,651 |      389,460 |
| workspace-composition-4  |      2,509,168 |             2,639,574 | 205,758 |      206,314 |
| workspace-composition-8  |      4,248,288 |             4,515,010 | 279,567 |      280,523 |

These results cover the isolated Program change. Integration must repeat the matrix and declaration and performance gates because other source changes can alter native checker assignments. The fixed-order regression remains independent of those assignments.
