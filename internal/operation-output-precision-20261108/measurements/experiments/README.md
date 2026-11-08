# Connected-operation immediate-output precision experiments

Date: 2026-11-08

Status: **unadopted and open**. Both bounded candidates are rejected for
adoption because three of the nine unchanged compiler ceilings fail. The
correctness proofs passed within their recorded scopes, but they do not override
the compiler gate. No ceiling or budget change is proposed.

This is **not a user-approved deferral**. The user authorized the bounded
research work; they did not approve postponing an accepted implementation. The
underlying connected-operation output-precision problem remains open.

## Exact identity

Both patches are complete working-tree diffs from Foldkit commit
`7cc7d90e68dc5a55b4765bbd7f0469b55cdd928f`. They were generated with binary
and full-index information. Reverse apply checks passed against the two frozen
working trees, confirming that each compressed patch reconstructs its retained
candidate source.

The packet contains no repository source tree and no dependency directory.
Reproduction uses an ordinary checkout of the exact base and its normal locked
dependencies.

| candidate | patch | changed files | diff size | stored size |
| --- | --- | ---: | ---: | ---: |
| immediate-output precision | `patches/immediate-output-precision.patch.gz` | 11 | 43,000 bytes | 9,139 bytes |
| common-path visitation | `patches/common-path.patch.gz` | 11 | 43,008 bytes | 9,128 bytes |

The common-path candidate changes only
`packages/foldkit/src/block/deferredPolicy.ts` relative to the first candidate.
It represents all-case visits as plain placements and finite cases as
`[placement, tag]` tuples.

## Outcome

The first candidate passed its recorded core source, UI declaration-source,
focused runtime (2 files / 9 tests), and diff checks. Its retained final tag-only
encoding did **not** receive the emitted/source-free gate after the ceiling
failure; an earlier, different ResultContract-only encoding passed that gate and
is not evidence for this final patch.

The common-path candidate passed its recorded core source, UI
declaration-source, focused runtime (3 files / 10 tests), global-registration
controls, diff check, and the full UI emitted/source-free gate. The emitted gate
used TypeScript `7.1.0-beta` and included wrong-output rejection and the private
evidence-erasure mutation.

Only TypeScript `7.1.0-beta` is explicitly recorded for the emitted and compiler
ceiling evidence. The source-check result did not record a compiler version, so
this packet makes no TypeScript 6 claim.

Raw command logs were not retained in the experiment directories. The two
contemporaneous `RESULTS.md` files are preserved byte-for-byte, and the
normalized receipts explicitly distinguish recorded passes, omitted gates, and
compiler versions. The patch itself contains the source, runtime, declaration,
mutation, and graph-validation proof fixtures.

## Exact compiler costs

Both candidates pass six of nine unchanged TypeScript 7.1 ceilings and fail the
same three:

| candidate | fixture | instantiations / max | excess | types / max | excess |
| --- | --- | ---: | ---: | ---: | ---: |
| immediate-output | workspace-composition-4 | 1,637,511 / 1,609,171 | +28,340 | 117,907 / 117,873 | +34 |
| immediate-output | workspace-composition-8 | 2,840,443 / 2,787,171 | +53,272 | 160,940 / 160,966 | -26 |
| immediate-output | layered-composition-6 | 2,713,079 / 2,707,124 | +5,955 | 336,491 / 336,291 | +200 |
| common-path | workspace-composition-4 | 1,637,468 / 1,609,171 | +28,297 | 117,882 / 117,873 | +9 |
| common-path | workspace-composition-8 | 2,840,380 / 2,787,171 | +53,209 | 160,907 / 160,966 | -59 |
| common-path | layered-composition-6 | 2,713,036 / 2,707,124 | +5,912 | 336,466 / 336,291 | +175 |

The common-path representation recovers only 43, 63, and 43 instantiations in
the three failing workloads. It remains over the unchanged ceilings and does
not change the adoption decision.

`inputs/type-performance-files.sha256` records every file under
`packages/foldkit/type-performance`, the ceiling runner, the Foldkit package
manifest, and the scoped TypeScript package metadata. The two frozen candidates
have byte-identical fixture and ceiling inputs.

## Layout

- `patches/`: deterministic gzip streams containing the two complete diffs.
- `results/`: byte-for-byte copies of the original result reports. The
  common-path directory's copied predecessor report is retained as an explicit
  identity check.
- `receipts/`: normalized check and nine-fixture ceiling records.
- `inputs/`: the original design plan, the retained predecessor emission config,
  and fixture/ceiling hashes.
- `manifest.json`: stored and decompressed patch sizes and SHA-256 hashes, file
  inventory hashes, frozen source identities, and archive provenance.

## Apply a candidate

Starting from a normal Foldkit checkout:

```sh
git worktree add --detach /private/tmp/foldkit-operation-output-review \
  7cc7d90e68dc5a55b4765bbd7f0469b55cdd928f
gzip -dc "$PACKET/patches/common-path.patch.gz" \
  | git -C /private/tmp/foldkit-operation-output-review apply --check -
gzip -dc "$PACKET/patches/common-path.patch.gz" \
  | git -C /private/tmp/foldkit-operation-output-review apply -
```

Set `PACKET` to this directory. Substitute
`immediate-output-precision.patch.gz` to reconstruct the first candidate. Then
install the repository's normal locked dependencies before running any checks.
The archive does not carry build output or dependency symlinks.

Applying a patch reconstructs a rejected experiment; it does not indicate that
the change is approved for production.
