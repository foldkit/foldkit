# Definition-owned map Bindings, October 27

## Decision

Adopt `Definition.makeMapBinding` and remove the standalone `foldkit/mapBinding`
entry point for the next preview. The parent-specialized callable also works when
destructured and imported from the feature's `definition.ts`. Consumers need no
casts, generic lists or additional annotations.

The complete exported surface exceeds the old four-group compiler ceiling. We
accept that specific cost after repeated paired editor and memory measurements,
strict declaration checks and a larger composition. Only that fixture's ceilings
change; no fixture is narrowed. The earlier [receiver-method investigation](map-binding-method-experiment-20261027.md)
remains evidence about its rejected encodings, not a universal TypeScript limit.

## Consumer code and ownership

Before, in `composition.ts`:

```ts
import { makeMapBinding } from 'foldkit/mapBinding'

import { ApplicationDefinition } from './definition'
import { ChildBlock } from './child'

export const ChildrenBinding = makeMapBinding(
  ApplicationDefinition,
  ChildBlock,
  { field: 'children' },
)
```

Now:

```ts
import { ApplicationDefinition } from './definition'
import { ChildBlock } from './child'

export const ChildrenBinding = ApplicationDefinition.makeMapBinding(
  ChildBlock,
  { field: 'children' },
)
```

Feature-local extraction follows the existing authoring convention:

```ts
// definition.ts
export const { makeMapBinding } = ApplicationDefinition
```

```ts
// composition.ts
import { makeMapBinding } from './definition'
import { ChildBlock } from './child'

export const ChildrenBinding = makeMapBinding(ChildBlock, {
  field: 'children',
})
```

The split-file consumer still imports the completed child Block. Its parent
Model uses the checked `ChildBlock.Model` Schema; the local Definition imports
that parent Model and its Messages. No dependency points back from Definition or
Model into Composition. All three Workspace map Bindings use the extracted
helper, including IssueDetail's separately selected OutMessage policy. Advanced
type consumers can refer to `Block.MakeMapBinding`; ordinary apps do not need it.

## Encoding and maintenance cost

`MakeMapBinding` is specialized once for the parent Model, Message, OutMessage
and child-init context Schemas. Each call infers its child Block and exact config
through the existing reverse-mapped properties and validation tuples. It does
not infer a generic Definition receiver and does not depend on `this`.

The passive runtime factory captures the native parent-owned `makeBinding`,
marks map storage explicitly and calls that constructor. Storage enumeration,
existing-only replacement, generation identity, registration and lifecycle
execution remain the shared keyed Binding implementation. It adds one closure
per Definition, without another Runtime phase or a parallel implementation.

The obsolete caller-supplied Definition validation and standalone-only type
extractors are removed. Native Schema/config validation remains, including
checks for erased callers. Ordinary direct Bindings can still hold a single
child whose entire Model is a Record or HashMap.

## Compiler costs and deliberate ceiling revision

Baseline: optimized commit `14e5d7330eca3bacdef2b6591cc204c8440061af`, not the
published preview or original slow baseline. The snapshots use the same lockfile,
Node `24.22.1`, and official native TypeScript `7.1.0-beta` on macOS arm64.
Concurrent Workspace and initialization work is excluded from the final patch
and verification checkout.

| Fixture                | Baseline Instantiations | Final Instantiations | Baseline Types | Final Types |
| ---------------------- | ----------------------: | -------------------: | -------------: | ----------: |
| Deep eight             |                 635,409 |              635,409 |         51,416 |      51,416 |
| Wide 100               |               1,331,305 |            1,331,305 |         80,466 |      80,466 |
| Commands 200           |                 335,824 |              335,824 |         62,285 |      62,285 |
| Subscriptions 100      |                 548,398 |              548,398 |         24,566 |      24,566 |
| Workspace four groups  |               2,510,412 |            2,642,699 |        203,019 |     229,173 |
| Workspace eight groups |               4,278,713 |            4,265,971 |        279,563 |     276,909 |

The first candidate without the public `Block.MakeMapBinding` type export fits
all six old ceilings. The complete exported surface produces the table above.
This does not isolate the export's mechanism: type/module discovery order also
changes compiler caching, and counts do not increase monotonically with size.

The unchanged-budget run fails only Workspace four groups. Its ceilings move
from 2,639,574 Instantiations / 206,314 Types to the exact observed
2,642,699 / 229,173. That is a 0.12% / 11.08% ceiling increase, and a 5.27% / 12.88%
count increase over baseline. All five other ceilings and every existing fixture
source remain unchanged. The subsequent six-fixture gate passes. The
[compiler evidence](map-binding-method-adoption-20261027/compiler-budget-results.json)
retains both the original-budget failure and reviewed result.

## Final paired editor measurements

Three fresh-server runs per side, in A1/B1/B2/A2/A3/B3 order, use identical
incremental edits and requests. Our builds, tests and other profiler processes
finish before timing begins. Other local activity is not controlled. Each driver
validates typed hover, required completion members, an initially clean report,
exactly the expected TS2322 title error, and clean diagnostics after restoration.
Disk source/declarations remain unchanged throughout each individual run.

Post-edit hover/completion follows a whitespace edit; error/clear diagnostics
follow semantic title edits. These are native server request latencies, not an
end-to-end editor keystroke measurement or a tsrs comparison. Background checking
and GC can contribute to each request. Subsequent import-specifier ordering and
lint-provenance corrections do not change the measured Block typing or Runtime
implementation. The benchmark input patch preserves the timed snapshot.

### Actual Workspace

| Request                                      | Standalone median (range), ms | Definition method median (range), ms |
| -------------------------------------------- | ----------------------------: | -----------------------------------: |
| Binding hover after edit                     |           329.5 (311.7–331.9) |                  274.4 (259.0–284.0) |
| Binding completion after edit                |           312.9 (308.4–315.9) |                  278.6 (269.3–284.5) |
| Completed Block member completion after edit |              59.0 (50.3–77.1) |                     52.5 (49.0–59.3) |
| Error appearance                             |           200.9 (193.8–202.3) |                  205.9 (190.9–210.1) |
| Error clearing                               |           184.6 (172.9–207.8) |                  179.8 (171.3–183.5) |

Maximum sampled server RSS is 462.4 MiB baseline / 441.4 MiB method. Binding
hover and completion improve with separated ranges; diagnostics remain similar.

### Larger composition

The existing generator produces 16 groups, with one added Record map Binding per
group alongside its direct, optional and array children, Commands, Services,
Mounts and OutMessage policies. The first map Binding supplies hover/completion;
the completed root supplies Block completion and title error/clear diagnostics.
The full-root diagnostic test is distinct from the preliminary leaf-only control.

| Request                                      | Standalone median (range), ms | Definition method median (range), ms |
| -------------------------------------------- | ----------------------------: | -----------------------------------: |
| Binding hover after edit                     |           101.6 (100.7–114.4) |                     48.5 (48.5–53.0) |
| Binding completion after edit                |           109.1 (102.6–109.9) |                     52.5 (48.5–53.1) |
| Completed Block member completion after edit |              18.7 (17.9–35.8) |                     28.5 (25.1–30.5) |
| Root error appearance                        |     1,724.0 (1,723.2–2,140.2) |            1,743.8 (1,729.8–1,751.6) |
| Root error clearing                          |     1,865.4 (1,700.0–2,506.8) |            1,735.6 (1,705.6–1,759.9) |

Maximum sampled RSS is 492.8 / 512.6 MiB: about 4% higher in this sample. Root
Block completion is about 10 ms higher at the median, with overlapping ranges.
Root diagnostic ranges overlap substantially; these samples do not establish a
diagnostic speedup. Roughly 1.7-second root diagnostics remain a limitation.
This is one generated larger workload, not a guarantee for arbitrary app sizes.

RSS is sampled every 250 ms, so short peaks may be missed. The
[portable evidence pack](map-binding-method-adoption-20261027/README.md) preserves
per-run timings, validation, hashes and peaks. Initial measurements without the
final public export are labeled separately and are not substituted for these.

## Safety, declarations and adoption

- Full core source typecheck, the full emitted-declaration harness and strict
  relocated consumer checks pass. The new method group checks accepted/rejected
  source and emitted declarations, including rejection of the removed subpath.
- Exact parent Model and branded/literal Record/HashMap keys, wrapped children,
  placements and delivery contexts are checked. Detached helpers retain those
  contracts across a separate module import.
- Concrete and unresolved generic UI factories compile without casts or generic
  call lists. Rejections retain wrong child/storage/key/config, invalid context,
  operation argument, OutMessage and wrong-graph checks.
- Equality assertions preserve lifted Command and Service requirements,
  constructor errors, generated envelopes, registration evidence and required,
  optional and rest init arguments. Existing source/emitted lifecycle contracts
  remain in the full harness.
- All 3,813 core tests pass, with one intentional skip. The added runtime case
  checks passive detached construction, parent ownership and one-time child init;
  existing keyed lifecycle, missing-entry, wrapper and erased-config tests pass.
- Both final 16-group graphs emit three byte-identical fixture declarations,
  totaling 3,140,462 bytes each. Strict relocation with `skipLibCheck: false`
  reaches all three through declarations only and verifies exact requirements,
  errors and rejected operations. No repository source mappings are used.
- Workspace, Website and Typing Game typechecks pass. All 639 lint-plugin tests
  pass, plus plugin typecheck, build and typed real-Oxlint fixtures. Focused core
  lint and affected consumer lint pass.
- Lint recognition follows qualified, aliased, destructured and directly imported
  feature helpers back to their owning Definition. Shadowed/unrelated helpers
  remain accepted. Arbitrary factory wrappers and re-export chains are not
  universally resolved; the documented static provenance limits remain.
- Full purpose/example/key/storage/membership/init TSDoc lives on the Definition
  method. Native method, extracted-call and destructured-property hovers expose
  it. Generated TypeDoc contains that member and no standalone namespace, with
  zero errors and 282 warnings (including an isolated remote/source-link warning).
- Both changed Website guide sections render at 1,280px desktop width, including
  the expanded snippet, without page overflow or browser errors. The snippet keeps
  internal horizontal scrolling. Local placeholder preview metadata supports
  rendering only and is not release artifact verification.
- Active guides, snippet, scaffold and skills use the method. Historical reports
  retain their measurements, and the old experiment decision is labeled
  superseded. The published preview's Ready snapshot is unchanged.

This verifies the task-only method change. It does not certify concurrent work,
promote a preview deployment or authorize publication. The exact committed diff
must pass independent review before pushing the development branch.
