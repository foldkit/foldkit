# Rendering coverage guard v4 review

## Decision

Do not amend only the first application-row failure. The complete v3 guard has
69 passing and 21 failing assertions. The failures form three closed classes:

1. The optimized current application inventory contains six authenticated,
   current-only zero-count naive-view rows. All 36 reached rows match main.
2. The retained reference used the legacy smallest-containing AST name, while
   v3 globally uses the later line-aware fallback. The same raw main functions
   therefore gain the nested `buildVNodeData` row and lose the old outer
   `renderSync` label under the line-aware view.
3. Three final-current HTML functions moved by exactly 630 lines while their
   complete initializer and body bytes remained unchanged.

A clean v4 chain should rerun assets, preflight and coverage. It should build
its independent reference before the new coverage capture and must not relabel
v3 captures as v4 output.

## Independent reference

Reanalyse the four immutable official old raw coverage captures and maps with a
dual decoder that emits `legacyName` and `lineAwareName` for every function.
Require its legacy projection to reproduce the published
`source-matched-analysis-final` inventory exactly. Freeze the line-aware
projection as the corrected independent owner reference. Bind the official
manifest, raw capture/map hashes, decoder, parser package/runtime and parser
smoke receipt.

This reconstructed reference is the authority for main and for unchanged
current sources. Current renderer positions remain checked against the cadence
reference, which already uses line-aware classification.

## Final-current HTML relocation

The authenticated old preview source map and frozen `4ed89f75` Git source have
these exact matches:

| Owner | Old declaration | Current declaration | Full initializer SHA-256 | Body SHA-256 |
| --- | ---: | ---: | --- | --- |
| `buildVNodeData` | 2925:6 | 3555:6 | `e3584c5e2f2365f3c687308f9d3c0e1b10c33c6037e2fda964c8d3177de7ca7a` | `3410d787bb45c38e24e4ee9178db9688d2b88e6e45ee56afa4778df21505487c` |
| `copyChildrenDroppingEmpty` | 3010:6 | 3640:6 | `4b6c4b7cb14814c3cf92f934c834a897aae49b7d46500cc3279c4acd0a1106dd` | `4af7d81646d0f26c738898e599d495596de58cd20a2ecd4cdbc80836a64660be` |
| `buildElement` | 3358:6 | 3988:6 | `ba9eea5153f9c3f5ac0cbf5576d4330f540281f67bd1253f9159ab0e5f04e11a` | `20c309e3a8beba8f09d0adc7775bff3f0f4bda1f4b01d64c98dad1f91f20169c` |

The final hidden map's `sourcesContent` SHA-256 is
`e6e05295d8736d75dce894fad99a509954c44b61ac51dbb2a4ea0ca5d480d1de`,
identical to frozen Git. After proving those facts, transform every old-current
line-aware row owned by those three functions by +630 lines, retaining exact
source, name, column and count. This predicts the final positions without using
the new sample as its own reference.

The expected `buildVNodeData` inventories include all rows, not only the outer
hot row: optimized counts `3906, 403, 0`; naive counts `132125, 25749, 0`.
Replace the old whole-function singleton assertion with exact full-inventory
equality plus a unique outer-hot-count assertion.

## Application exception

Retain exact per-owner positioned checks. Require reached logical application
rows to be equal. Separately require the exact positioned zero-row difference:

- optimized current-only: `todoItemClass` 222:23,
  `nonEditingTodoView` 238:28, `editingTodoView` 267:2,
  `todoItemView` 299:3, `filterItemView` 328:3, and `view` 341:21;
- optimized main-only: empty;
- naive current-only and main-only: empty.

Do not filter owner-reference checks, lazy rows, VNode/DOM boundaries,
dispatchers or renderer boundaries.

## Required offline controls

- Changed legacy or line-aware naming algorithm.
- Legacy projection no longer reproduces the published inventory.
- Authenticated old raw capture/map or manifest changed.
- Final map `sourcesContent` differs from frozen Git.
- Any initializer/body hash or the +630 relocation changes.
- A relocated row moves or changes column.
- Outer or nested positive row added, removed or count-changed.
- Expected zero row becomes positive, is removed or moved.
- Unexpected zero row on either owner, including a nonempty naive delta.
- V4 script/config/freeze/reference receipt changes after freeze.

The reference receipt must be created and frozen before v4 coverage. Ordinary
timing remains blocked until every full guard assertion and mutation control
passes.
