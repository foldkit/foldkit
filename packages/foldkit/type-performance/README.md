# Block type performance

This harness measures deterministic TypeScript diagnostics for completed Block
composition through Foldkit's published declarations. Each checked-in fixture
imports public `foldkit` package entry points, completes its Block graph, and
finishes with `Application.update`,
`ApplicationComposition.makeElement`, and the completed program’s
`.provide(...)` method.

The shared baseline contains the imports and warmup expressions repeated by
every fixture. Fixture cost is the fixture total minus that baseline for these
compiler diagnostics:

- `Instantiations` and `Types` are regression gates.
- `Symbols` is reported for context because symbol count alone is not a stable
  proxy for type computation.

The deep fixture binds a leaf through eight parent Blocks and then binds the
result into an Application. The other fixtures cover 100 sibling Bindings
with exhaustive Message folds and 200 distinct Command requirements. Every
fixture carries an ordinary Effect Service through Application completion and
provides its Layer. Run the check after building `packages/foldkit`:

```sh
pnpm check:block-type-performance
```

Pass a fixture name to measure only that fixture. Threshold updates are a
separate, explicit command and write the exact observed deltas without adding a
tolerance:

```sh
pnpm check:block-type-performance deep-composition-8
pnpm update:block-type-performance
pnpm update:block-type-performance command-requirements-200
```

Only update budgets after reviewing an intentional type-level change. The
ordinary check never changes them and fails when either gated metric exceeds
its stored maximum.

Baseline history for private Binding evidence: the TypeScript 7.0.2 ceilings
include the evidence used by `Block.inspectBinding`. Compared with the
preceding public metadata shape, the reviewed increases were 2.40%
instantiations and 0.94% types for deep composition, 1.35% and 0.76% for wide
composition, and 0.04% and 0.03% for the Command fixture. This evidence
preserves exact handler requirements, registration evidence, Layer services and
errors, and Mount definitions through emitted declarations while keeping
metadata out of ordinary Binding completions.

Baseline history for the named operations boundary: completed Block operations
use a named interface so TypeScript 6 can emit API documentation for generic
registered component graphs without erasing their Model, Message, OutMessage,
Layer, Mount, or Binding evidence. Compared with the private-evidence ceilings
above, this boundary increased deep composition by 4.46% instantiations and
2.95% types. The wide and Command fixtures decreased slightly, so their
ceilings were lowered to the exact final measurements.

## Parent-owned Binding and mandatory Composition staging

The parent-owned Binding API keeps the fixture widths unchanged: eight nested
Blocks, 100 sibling Bindings, and 200 distinct Command requirements. The
mandatory Definition to Composition to completion stages add a fixed type-shape
cost in the deep and Command fixtures. Exact parent Message evidence prevents
the 100-child fixture from repeating the complete parent Message union in every
Binding, so its instantiation count decreases.

| Fixture                    | Baseline instantiations (`11e8ca60e6dd`) | After staging instantiations | Baseline types (`11e8ca60e6dd`) | After staging types |
| -------------------------- | ---------------------------------------: | ---------------------------: | ------------------------------: | ------------------: |
| `deep-composition-8`       |                                1,126,164 |                    1,152,618 |                          49,591 |              55,843 |
| `wide-composition-100`     |                                3,132,298 |                    3,013,262 |                         211,029 |             215,419 |
| `command-requirements-200` |                                2,616,095 |                    2,659,415 |                         382,863 |             389,460 |

Two bounded counterfactuals isolate ordinary Composition helpers from the
mandatory staging cost. Removing the former `Composition.render` helper
changed no instantiations and removed two types from each fixture. Removing
`Composition.bindChild` changed neither gated metric. `Composition.bindChild`
remains in the public API.

Separate process-cold compiler runs on the same TypeScript 7.0.2 installation
showed no material wall-time regression after the filesystem cache was warm.
Baseline `11e8ca60e6dd` versus staged Composition check times were 0.429s versus 0.416s for
deep composition, 1.266s versus 1.294s for wide composition, and 0.948s versus
0.926s for Command requirements. Peak reported memory changed from 142,236K to
146,147K, 280,586K to 283,343K, and 293,411K to 296,906K respectively. The
checked-in ceilings continue to gate deterministic instantiation and type
counts rather than timing or memory, which vary with host and cache state.

## Exact child Binding adapters

Required and Option fields, `presentWhen`, exact keyed arrays, constructor checks,
and duplicate sibling validation retain the existing 8/100/200 fixture widths
and budgets. The adapter and keyed callback inference measurements are:

| Fixture                    | Instantiations delta | Types delta |
| -------------------------- | -------------------: | ----------: |
| `deep-composition-8`       |            1,126,656 |      52,564 |
| `wide-composition-100`     |            3,021,829 |     215,407 |
| `command-requirements-200` |            2,632,385 |     386,042 |

The duplicate check projects placements once and maps each placement to tuple
indexes. An index union identifies a duplicate without recursively copying the
remaining child tuples. Binding overloads check ordinary relationships before
keyed adapters, and exact field/key eligibility is checked at the configuration
properties. Shared conditional overloads preserve required OutMessage policies
and callback inference while avoiding duplicate signature shapes. Deferred
handler validation checks the existing owner evidence directly. Accepted,
rejected, and downstream declaration fixtures verify these changes together.

## Wrapped keyed-array adapter

The `childField` overload retains the same 8/100/200 fixture sizes. Compared
with checkpoint `1c64a700eb`, the final public declarations measure:

| Fixture                    | Before instantiations | After instantiations | Before types | After types |
| -------------------------- | --------------------: | -------------------: | -----------: | ----------: |
| `deep-composition-8`       |             1,126,656 |            1,126,656 |       52,564 |      52,579 |
| `wide-composition-100`     |             3,021,829 |            3,037,198 |      215,407 |     216,662 |
| `command-requirements-200` |             2,632,385 |            2,632,385 |      386,042 |     386,057 |

The wide fixture increases by 0.51% instantiations and 0.58% types. It uses
accessor Bindings; the extra overload contributes contextual type computation
even when no call selects it. A counterfactual with only a required `childField`
parameter still added 226 types, exceeding the previous ceiling's 12-type
headroom. Moving the overload and extracting its signature did not reduce
that cost.

Selected-field validation avoids scanning unrelated generic wrapper payloads.
The wrapped config declares its Subscription policy directly instead of
instantiating and omitting the entire general keyed config. These reductions
retain exact child, key, Message, OutMessage, registration, Service and error
checks. Generic Toast and emitted acceptance/rejection fixtures verify the
result.

Only the wide fixture's Types ceiling changes, to the exact observed 216,662.
All instantiation ceilings and the deep and Command Types ceilings stay in
place. No fixture was narrowed and no rejection test was removed.
