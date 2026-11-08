# HTML definition consolidation

## Decision

Adopt the shared HTML definitions for their deterministic bundle reduction.
The change preserves public authoring and does not establish a rendering
speedup. The broader rendering and editor costs remain open before main.

The implementation co-locates each Attribute constructor recipe and handler,
and generates element builders from one exhaustive table. Ordinary Attributes
use final plain objects. Raw `Prop` and `OnCustomEvent` retain Effect's copying
constructors. This includes the constructor mechanism from #1575 and the table
approach from #1585; their savings are not independent.

## Contracts and verification

The independent audit matches all 315 handler bodies, 313 public Attribute
constructors and 213 elements against the published implementation. It checks
payload identity, own-key order, descriptors, prototypes, function names and
arity, raw constructor behavior and current Mount capture. A private exact
void-element type also rejects incorrect classifications in the element table.

The hardened proof starts from current commit
`3f0a41b9279c5296020871303c8bcec2358cb368`. Its candidate differs only in
`html/index.ts` and the new constructor test. Full source checking, 546 focused
HTML, CustomElement, Mount, SSR and hydration tests, the emitted-consumer gate,
child-Instance contracts and all nine unchanged compiler ceilings pass.
Restored negative controls reject missing or extra definitions, wrong void
flags, invalid factory mappings and changed callable metadata.

Shared adoption is structurally identical to that isolated source after
formatting. The adopted source SHA-256 is
`e6e05295d8736d75dce894fad99a509954c44b61ac51dbb2a4ea0ca5d480d1de`;
the test SHA-256 is
`2d0383df25efa98854957b65ca5962a8fb4b2ec707ddf1c0b3c3434e49dd0348`.
The shared checkout separately passes 118 focused tests, full source checking,
lint and formatting. These tests overlap the isolated suite.

The [hardened verification receipt](preview-final-20261107/rendering/measurements/html-definitions-hardened-20261108/verification.json)
records commands, source identities, restoration checks and emitted output.
The [manifest](preview-final-20261107/rendering/measurements/html-definitions-hardened-20261108/manifest.json)
binds its retained files. The original measured archive remains separate.

## Bundle and timing evidence

Fresh builds of both current-commit twins reproduce the published-preview
assets byte-for-byte. The hardened candidate's production JavaScript and
benchmark assets also match the originally measured candidate exactly.

| Variant   | Baseline raw / gzip | Candidate raw / gzip | Raw / gzip reduction |
| --------- | ------------------: | -------------------: | -------------------: |
| Naive     |   475,519 / 147,123 |    462,740 / 142,804 |       12,779 / 4,319 |
| Optimized |   482,112 / 148,452 |    469,333 / 144,175 |       12,779 / 4,277 |

These are whole-asset byte totals. The [current asset receipt](preview-final-20261107/rendering/measurements/html-definitions-hardened-20261108/current-assets.json)
records exact hashes, compression and resolved package links.

The [ordinary timing archive](preview-final-20261107/rendering/measurements/html-definitions-20261107/README.md)
retains all 72 samples, two byte-identical baselines per variant, unchanged
400 synchronous and 400 animation-frame callbacks, functional checks and
cleanup. It demonstrates neither a regression nor a speedup. The
duplicate-baseline variation prevents an equivalence claim or exclusion of
smaller effects. No startup, allocation or memory improvement is claimed.

The [research reconciliation](preview-open-performance-prs-20261107.md)
corrects the earlier dominant-Mount attribution and preserves the prior
measured #1576 pair as the input for any further experiment.

## Remaining gates

The preceding stabilization commit passed independent review and the full
normal push gate. This HTML change needs its own exact-commit review, normal
push gate and CI. Diagnostic CPU and work-count captures remain separate from
ordinary timing evidence. Another preview publication requires approval.
