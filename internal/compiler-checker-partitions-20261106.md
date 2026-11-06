# TypeScript checker-partition evidence

## Decision status

The first unchanged parallel type-performance gate reported
`workspace-composition-4` above its Types ceiling. A later coherent declaration
boundary restored that fixture, while the final parallel gate reports only
`machine-search` above its unchanged ceiling. TypeScript 7.1's supported
`--singleThreaded` mode shows that both observed increases are checker-local
allocation duplication caused by different parallel partitions, not comparable
increases in the fixtures' single-checker type work.

On November 6 the user approved the single-checker normalization and tighter
ceilings for all eight fixtures. The canonical harness now uses that mode for
both baseline and fixture measurements. All eight workloads pass, and the CLI
controls still reject an exceeded budget, an incomplete budget and a compiler
version mismatch. Fixture sources and acceptance/rejection contracts are
unchanged. The historical parallel readings below remain separate evidence.

## Historical workspace snapshot

The inputs and measurements through the initial all-fixture table below are a
historical snapshot captured before the final private-delivery declaration
boundary. They remain useful controlled evidence for the original Workspace
cliff, but they are not the final source or declaration state.

### Frozen inputs

The exact private current copy is
`/private/tmp/foldkit-perf-single-exact-20261106`. Its
`dist/test/scene.d.ts.original` was restored before measurement. The retained
manifest is
`/private/tmp/foldkit-perf-single-exact-20261106/source-manifest.txt`.

- Git base: `8131bafc76686790984d664bb87cbc6496ba23ec`
- Core `dist` aggregate SHA-256, excluding retained `*.original` files:
  `bd5890c30186e38464ce36abcf77f31a0718c8e6f732c17bd32088e71904ad38`
- Canonical `type-performance` aggregate SHA-256, excluding private
  `single-*.json` configs:
  `bf283b15e05f8a2102ff341edc9250c8144cf73ed0733cf4233902cb7c7ba660`
- Declaration-test aggregate SHA-256:
  `d110191b85eb636d8f9f990267a7c6b7537cf2172ef2ccfba7fa265aad5598d2`
- Canonical measurement script SHA-256:
  `bfd0baed03229435de3093cc79e56c546ff2aa5ce4da874f1cb4ca7732c8ffc4`
- TypeScript: `Version 7.1.0-beta`
- Resolved compiler launcher:
  `/private/tmp/foldkit-unified-recovery-20261103/node_modules/.pnpm/typescript@7.1.0-beta/node_modules/typescript/bin/tsc`
- Compiler launcher SHA-256:
  `2219f428a7e55aaf1f7ad85b9b0f0cf5078aeb76ccc9a7c6036c92d48f492ffd`

The private all-fixture runner differs from the canonical script only by
prepending `--singleThreaded` to the compiler arguments. Its SHA-256 is
`f6bb6fb2becee9bcea852922250fa66bac7179733a7445c7e1945c545a08f795`.

### Exact comparison

The current copy used `type-performance/single-baseline.json` and
`type-performance/single-workspace.json`. The older controlled comparison used
`/private/tmp/foldkit-perf-attribution.LWLYNs/trio-sub-public`, its private
`single-baseline.json`, and its unchanged `workspace-only.json`.

Parallel commands, run once for each baseline and workspace config:

```sh
node_modules/.bin/tsc -p type-performance/single-baseline.json --extendedDiagnostics --noEmit --pretty false
node_modules/.bin/tsc -p type-performance/single-workspace.json --extendedDiagnostics --noEmit --pretty false
```

The control workspace command substituted `workspace-only.json`. The
single-checker commands added only `--singleThreaded`:

```sh
node_modules/.bin/tsc -p type-performance/single-baseline.json --singleThreaded --extendedDiagnostics --noEmit --pretty false
node_modules/.bin/tsc -p type-performance/single-workspace.json --singleThreaded --extendedDiagnostics --noEmit --pretty false
```

All values below subtract the matching baseline.

| mode           | input   | Instantiations |   Types |                    change from control |
| -------------- | ------- | -------------: | ------: | -------------------------------------: |
| parallel       | control |      2,598,641 | 214,374 |                                      — |
| parallel       | current |      2,735,624 | 242,081 | +136,983 Instantiations; +27,707 Types |
| single checker | control |      1,598,448 | 116,104 |                                      — |
| single checker | current |      1,598,421 | 116,202 |          -27 Instantiations; +98 Types |

Therefore 27,609 of the parallel 27,707-Type difference, and all of its
Instantiation increase, disappear when both inputs use one checker. The
single-checker current source is effectively flat against the control for these
metrics.

### Trace partition

The retained traces are:

- current: `/private/tmp/foldkit-keyed-trace-current-20261105`
- control: `/private/tmp/foldkit-keyed-trace-control-20261105`

In the current trace, separate checkers own the three fixture source files:

- checker 0, `workspace-composition-4.ts`: 112,961 recorded types
- checker 2, `workspace-groups-4.ts`: 102,916 recorded types
- checker 3, `workspace-shared.ts`: 28,094 recorded types

In the control trace, checker 2 still records exactly 112,961 types for
`workspace-composition-4.ts`, while checker 0 owns both
`workspace-groups-4.ts` and `workspace-shared.ts` with 103,410 types total.
The changed parallel allocation therefore duplicates a checker-local body of
library and application types instead of exposing a dominant expanded keyed
alias in the composition file.

Several private declaration-only source probes corroborated that limit:

- a shared named keyed-template metadata interface saved 38 Types;
- removing one keyed phantom, as attribution only and not a valid design,
  saved 442 Types;
- removing complete-Message validation at `makeComposition` saved 0 Types;
- replacing the complete-codec projection saved 48 Types;
- removing the derived policy `channels` evidence saved 1,132 Types but would
  weaken intentional evidence retention and remained far short of the gap;
- alternate completion-proof encodings increased Types by 763–831;
- separating helper evidence back into its former declaration module was an
  exact no-op.

None is an appropriate source change for a 27,707-Type parallel cliff.

### All eight fixtures in diagnostic single-checker mode

The private runner command was:

```sh
/usr/bin/time -p node scripts/check-block-type-performance.ts
```

The run took 4.64 seconds of wall time. Existing parallel ceilings are shown
only because the unchanged script prints them; comparing single-checker counts
to those ceilings is not an equivalent release gate.

| fixture                    | Instantiations |   Types | Symbols |
| -------------------------- | -------------: | ------: | ------: |
| `deep-composition-8`       |        671,191 |  54,291 |  89,040 |
| `wide-composition-100`     |      1,407,668 |  81,758 | 130,457 |
| `command-requirements-200` |        345,563 |  64,454 | 115,783 |
| `wide-subscriptions-100`   |        548,134 |  23,593 |  58,409 |
| `workspace-composition-4`  |      1,598,421 | 116,202 | 161,865 |
| `workspace-composition-8`  |      2,766,921 | 157,635 | 234,852 |
| `machine-search`           |         69,558 |  13,180 |  43,601 |
| `attribute-bundles-200`    |        114,226 |  29,369 | 152,472 |

### Wall-time limits

The focused parallel control and current checks each reported 0.485 seconds of
check time and 0.535/0.533 seconds total. The focused single-checker samples
reported 0.465/0.444 seconds of check time and 0.630/0.599 seconds total;
another exact-current single-checker run varied to 0.535 seconds check and
0.726 seconds total. These are one-shot diagnostics on a shared machine, not a
benchmark. They establish that the allocation cliff has no matching observed
wall-time cliff, but they do not establish a speedup or regression.

## Final declaration boundary and Machine follow-up

The final declaration boundary moves `PrivateDelivery` and
`PrivateEncodedDelivery` into the leaf `block/privateDelivery` module.
`bindChild` can therefore exclude constructed private envelopes from a local
child Message without importing the much larger constructed contract graph.
The constructed contract re-exports the original named interfaces, preserving
their nominal identities and public type surface.

The retained final package copy is
`/private/tmp/foldkit-private-delivery-boundary-20261106`; its unchanged
parallel gate is recorded in
`/private/tmp/foldkit-private-delivery-boundary-20261106.log`.

| fixture                   | Instantiations |   Types | status against unchanged ceiling |
| ------------------------- | -------------: | ------: | -------------------------------- |
| `workspace-composition-4` |      2,606,470 | 214,884 | pass                             |
| `workspace-composition-8` |      4,411,162 | 289,921 | pass                             |
| `machine-search`          |         99,051 |  22,486 | fail                             |

The leaf removes an unnecessary dependency on the complete constructed graph,
and both unchanged Workspace workloads pass. These counts do not establish a
matching wall-time improvement. The remaining Machine failure is independently
attributable to parallel checker partitioning:

- current and previously accepted packages both produce the exact same
  single-checker Machine total: 72,582 Instantiations and 15,092 Types;
- after subtracting their matching baselines, final current is 69,558
  Instantiations and 13,180 Types, while the accepted control is 70,054 and
  13,402;
- the current parallel trace assigns `machine.accepted.ts` to checker 3 and
  `machine.contracts.ts` plus `machine.quote-request.ts` to checker 2, after
  which checker 3 repeats dependency expression work from both files;
- the accepted trace assigns `machine.quote-request.ts` and
  `machine.accepted.ts` together to checker 3, avoiding that duplicated body;
  and
- removing the root Story export only as attribution makes the parallel result
  exactly equal the current single-checker delta, 69,558 Instantiations and
  13,180 Types. Swapping in the former Story declarations, importing Machine
  through its direct subpath, and removing the new InMessage helper barrel
  export each leave the failed 99,051/22,486 result unchanged.

The retained Machine traces are:

- current: `/private/tmp/foldkit-machine-trace-current-20261106`
- accepted control: `/private/tmp/foldkit-machine-trace-old-20261106`

Changing public exports to perturb checker scheduling is therefore not a
coherent source optimization.

## Normalization prototype before approval

The prototype prepared before approval is retained at
`/private/tmp/foldkit-single-threaded-harness-proposal-20261106`. Its patch adds
only `--singleThreaded` to the canonical runner and replaces all eight ceilings
together. Fixtures are unchanged. Each proposed ceiling is the greater of the
final current single-checker measurement and the previously accepted control
measurement for that metric, so both known valid inputs remain admitted without
retaining unrelated parallel ceilings.

| fixture                    | proposed Instantiations | proposed Types |
| -------------------------- | ----------------------: | -------------: |
| `deep-composition-8`       |                 671,225 |         54,305 |
| `wide-composition-100`     |               1,407,702 |         81,772 |
| `command-requirements-200` |                 346,362 |         64,468 |
| `wide-subscriptions-100`   |                 548,577 |         24,507 |
| `workspace-composition-4`  |               1,604,687 |        116,418 |
| `workspace-composition-8`  |               2,778,703 |        157,971 |
| `machine-search`           |                  70,054 |         13,402 |
| `attribute-bundles-200`    |                 114,226 |         29,370 |

These prototype ceilings were adopted together after approval. No additional
tolerance was added, and the repository's fixture sources were not changed.

An applicable unified diff is
`/private/tmp/foldkit-single-threaded-harness-proposal-20261106/single-threaded-normalization-applicable.patch`
(SHA-256 `9dd248a7d2facf2a5bb2cfff898ee58b04160ab4926f2354876d83974d5f4d88`).
`git apply --check` passed against the committed candidate before adoption.
The canonical runner also prints its compiler version and checker mode.

## Adopted measurement rule

Do not change public types, validation, fixtures, or budgets to chase this
parallel partition. Do not simply add `--singleThreaded` while retaining the
old numerical ceilings; that would silently loosen the effective gate.

The approved harness change follows these rules:

1. make the type-performance runner pass TypeScript 7's supported
   `--singleThreaded` option;
2. keep all eight fixture sources unchanged;
3. establish tighter single-checker ceilings for every fixture together;
4. document the compiler version and checker mode as part of the metric; and
5. retain parallel wall-time profiling as separate evidence when performance,
   rather than deterministic type allocation, is under review.

The former parallel ceiling is not reported as passing. It was replaced by a
separately calibrated, explicitly labelled single-checker gate. The current
receipt is `/private/tmp/foldkit-approved-single-checker-counts-20261106.log`;
the CLI control receipt is
`/private/tmp/foldkit-approved-single-checker-tests-20261106.log`.
