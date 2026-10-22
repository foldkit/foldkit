# Block type performance

This harness measures TypeScript compiler diagnostics for completed Block
composition through Foldkit's published declarations. Each checked-in fixture
imports public `foldkit` package entry points, completes its Block graph, and
finishes with an Application update, `ApplicationComposition.assembleBlock`,
`Program.makeElement`, and the completed Program's `.provide(...)` method.

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
separate, explicit command and write the deltas observed in that one run
without adding a tolerance. The native compiler's instantiation counts vary by
up to about 1% between identical runs, so after an intentional change run the
check several times and keep the highest count as the ceiling, either by
repeating the update until it has written the highest run or by editing
`budgets.json` to that value:

```sh
pnpm check:block-type-performance deep-composition-8
pnpm update:block-type-performance
pnpm update:block-type-performance command-requirements-200
```

Only update budgets after reviewing an intentional type-level change. The
ordinary check never changes them and fails when either gated metric exceeds
its stored maximum. Repeat a check that exceeds a ceiling by less than that
run-to-run variance before treating it as a regression.

## Language service latency

Compiler instantiation and type counts provide regression signals,
but they do not predict the delay of an editor request after a file changes.
Use the opt-in native LSP benchmark after building `packages/foldkit` when a
type-level change is intended to improve authoring latency:

```sh
node packages/foldkit/scripts/profile-block-language-service.ts --runs 5 > /tmp/foldkit-block-language-service.json
```

The benchmark starts a fresh pinned native TypeScript language server for each
Website hover, go-to-definition, Route completion, Binding member completion,
and changed URL workflow scenario. Route completion retains the narrowed
`previousRoute.` query. Binding completion uses valid
`packages/website/src/update/handleChangedUrl.ts`, placing the cursor after
`SearchBinding.` in `SearchBinding.informRouteChanged()` and requiring
`informRouteChanged` and `embedView`. It records first and warm requests before
and after a ranged newline edit.

The changed URL workflow hovers `SearchBinding` at that call, repeats the hover
after a ranged newline edit, and pulls a full clean diagnostic report. It then
replaces only `nextRoute` in `route: () => nextRoute` with `1709`, requires an
error with code 2322 whose range is exactly the `route` property, restores
`nextRoute`, and requires a full report with no errors. Hover requests after restored diagnostics
measure the first and warm query costs separately; the final completion is
explicitly warm. All edits stay in server memory, and the workflow verifies that
the source returns to its original text plus the deliberate newline.

The client advertises snippet support and pull diagnostics, requires incremental
synchronization and UTF-16 positions, and returns null workspace configuration
sections to select server defaults. This protocol profile and the moved Binding
completion site are recorded in format version 2; compare measurements only when
these workload settings match. Existing hover and definition scenarios also
record post-whitespace and post-semantic-edit requests where applicable.

JSON output includes raw samples, medians, full response hashes, document versions
and content hashes, diagnostic validation evidence, the source commit and dirty state, and a hash of
the Website and mapped workspace TypeScript sources, workspace declarations and
declaration maps, package manifests, TypeScript configuration, and lockfile. It
also records separate lockfile and benchmark-script hashes and the compiler,
server, Node, and platform versions. Set `--timeout-ms` when profiling a graph
that legitimately takes longer than the default 60 seconds. Missing or empty
hover contents, definitions, server identity, or expected completion labels fail
the run. The actual-file Binding hover requires `InitializedBinding` with the `Search`
Owner and rejects a direct `any`, `unknown`, or `never` type. Missing route errors
or errors remaining after restoration fail instead of recording an
artificially fast response.

The benchmark has no CI latency threshold. Run baseline and candidate samples
on the same idle host and compare their metadata before comparing medians.
Inspect post-edit samples and slow requests alongside medians. Repeat small
compiler-count differences with identical source and emitted declarations.
Wall-clock results vary with CPU contention, filesystem cache state, profiling,
and language-server scheduling. Keep captured JSON outside the source tree.

The initial investigation at commit
`3edb273870b898ef963f1ed3a308424554bfd370` reproduced a 3.3–4.4 second Website
hover after invalidation and a 3.8–4.2 second first go-to-definition request.
Warm hovers were normally below one millisecond, while the focused Route
completion remained around 20 milliseconds after a whitespace edit. Hover
responses were about one kilobyte. Native profiles attributed the delay to
conditional type instantiation and relation work, with allocation and garbage
collection pressure, rather than response formatting or transport.
Whole-program compiler traces highlighted several large Block validation
graphs. Request-scoped traces found the post-edit work distributed across
local Block validation, deferred Message policy resolution, selected Binding
resolution, and delivery indexes, so they do not establish one validator as
the interactive stall. A local assembly channel projection was adopted because
it reduced Website compiler instantiations by 8.09% and focused fixture counts
by 8–13% on the integrated factory surface. Its paired native timings were
modest and noisy, so it is a compiler-cost optimization rather than a claimed
interactive latency fix.
Other safe encodings reduced compiler counts without a repeatable
post-edit LSP improvement and were not adopted as latency fixes.

This benchmark drives the native server directly. Editor extensions, editor UI
rendering, and editor-side request scheduling remain outside its scope.

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
checked-in ceilings gate instantiation and type counts rather than timing or
memory, which vary with host and cache state.

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

## Source Model Schema boundaries

The Website's parent Model composes canonical child Schemas exported from
feature barrels. It uses `Ui.Model` when declaring state and the completed
`UiBlock` for Bindings. This prevents a Schema query from demanding the inferred
child implementation, including unrelated views and child policies. It does not
change assembly validation or runtime behavior.

The external `schema-boundary` declaration fixture checks exact Schema and
Codec channels, Service requirements, operation arguments, and registration
checks through the public barrel, then emits and relocates the consumer. The actual-file editor benchmark above
measures the source dependency. A full-program count does not establish that an
editor demand boundary is cheap: the compiler must still validate the producer.

## Assembly validation attribution

A Website root completion (`ApplicationBlock.` in `packages/website/src/block.ts`)
takes several seconds because the native language server creates a fresh checker
for every program version, so a post-edit request recomputes the full demand
closure, and that closure is the entire application graph. Attribution needs the
native checker itself. Go profiles on macOS place about 40% of samples on
`madvise` although the process spends about 1 s of 16 s in the kernel, and the
JS TypeScript 6 trace ranks call sites that cost nothing natively. The numbers
below came from a typescript-go build of the pinned 7.0.2 revision with a counter
on instantiation-cache misses in `getConditionalTypeInstantiation` and
`getObjectTypeInstantiation`, keyed by declaration site, with inclusive and self
time per checker and optional Go stack capture per alias.

One cold root request on that build spent 4.45 s of 5.69 s inside those misses,
4.04 s of it in Foldkit aliases, spread across the assembly validations, the
requirement and delivery checks, and the update-result evidence channels. Three
encodings repeated work the checker only needs once per call:

- `ValidHandlerContracts` compared every handler entry with every entry sharing
  its key, including the singleton groups, through two `Equal` checks per pair,
  and resolved the index's key set once per entry. The check now resolves the
  key set once and runs the pairwise comparison only where the key's group is
  not identical to the entry itself. Per request this alias went from 0.48 s
  to under 0.1 s.
- Six `assembleBlock` overloads carried their composition validation as a
  top-level intersection constituent. The checker resolves each candidate's
  parameter type while checking arity, before inference, and again while
  checking applicability, so those validations ran on generic placeholders and
  then on the concrete implementation for candidates that failed on
  `view?: never` or a missing `EffectsLayer`. Each now sits behind a
  conditional on the overload's own type parameter. The check type is a tuple
  so the conditional does not distribute over a union or `never`
  implementation, and the shapes include the always-present `init` so they are
  not weak types; the checker rejects any object that shares no property with
  a weak type. The selected overload runs the full validation.
- `ConflictingDeliveryTags` recomputed `keyof OutgoingIndexes` for every
  incoming tag. The tag set is now a defaulted type parameter computed once per
  Composition.

The fixtures keep their widths. The ceilings move from 1,152,618, 3,132,298,
and 2,659,415 instantiations to the highest counts seen over six runs. The
before column holds the higher of two runs at `9a5f9307c`, the commit this
change builds on:

| Fixture                    | Before instantiations | After instantiations | Before types | After types |
| -------------------------- | --------------------: | -------------------: | -----------: | ----------: |
| `deep-composition-8`       |               878,121 |              859,410 |       45,901 |      46,030 |
| `wide-composition-100`     |             1,975,974 |            1,609,445 |       74,682 |      73,107 |
| `command-requirements-200` |               911,507 |              386,770 |       67,274 |      60,899 |

Serial native measurements of the root workload on one idle macOS host with
TypeScript 7.0.2 (four root completions and two diagnostics runs per arm,
interleaved in two blocks, medians): cold completion 5842 ms to
4947 ms, post-edit completion 5736 ms to 4872 ms, diagnostics error appearance
5487 ms to 4722 ms. Garbage collector settings and push diagnostics do not change these
numbers. The remaining cost is spread across the update-result
evidence channels, requirement satisfaction, deferred policy resolution, and the
child Binding graph, each a few percent of a request.

## Placement lookup index

Deferred policy resolution finds the child Binding registered at a placement.
`BindingAt` distributed a conditional type over `Children[number]` for every
lookup, so each lookup cost one structural check per registered Binding, and a
Composition with many children paid for the whole list on every lookup. On the
Website root request that was 1,664 instantiation-cache misses and 0.21 s of
self time, the largest single alias in the request.

`BindingAt` now indexes `BindingIndex<Children>`, a key-remapped mapped type
keyed by each Binding's placement and built once per Composition. Placements
that are not a single string literal (`string`, template patterns, unions,
enum members, `never`, `any`) go into one unindexed bucket that keeps the
scan, and a lookup key that is not a single string literal scans every Binding
as before, so the resolved Binding is the same for every input.
`deferredPolicy.test.ts` pins each placement shape. After the change the
lookup costs 150 misses and under 0.01 s on the same request; the fixture
counts move within run-to-run noise.

## Channel-keyed assembly validation

Each `assembleBlock` overload validated its candidate through a `Readonly`
composition object built from that candidate's inferred implementation.
Overload resolution builds that object once per candidate, so the local
requirement validation ran once per candidate even when every candidate had
resolved the same `init`, `update`, lifecycle registrations, `EffectsLayer`,
and `hostHandlers`. On the instrumented build's cold Website root completion
this showed up as the composition channel projection instantiating about
fourteen times per Block, 0.21 s of a 3.7 s request.

`ValidateImplementationChannels` takes those channel types directly.
Candidates that resolve the same channels share one cached validation, and
candidates whose channels are generic defer it. The validation error
keys, the accepted and rejected fixtures, and the emitted declarations are
unchanged.

The fixtures keep their widths. The before column holds the ceilings this
change builds on; the after column holds the highest counts seen over six
runs:

| Fixture                    | Before instantiations | After instantiations | Before types | After types |
| -------------------------- | --------------------: | -------------------: | -----------: | ----------: |
| `deep-composition-8`       |               859,410 |              767,670 |       46,030 |      44,061 |
| `wide-composition-100`     |             1,609,445 |            1,389,469 |       73,107 |      71,562 |
| `command-requirements-200` |               386,770 |              354,779 |       60,899 |      59,354 |

On the instrumented TypeScript 7.0.2 build, one cold root completion went
from 254,263 instantiation-cache misses to 246,357. The per-candidate
projection no longer appears; `SatisfyLocalRequirements` fell from 634 to 492
misses and `IsAny` from 3,318 to 2,674. The remaining cost is spread across
the update-result evidence channels, deferred policy resolution, delivery
indexes, and the child Binding graph.

Measured together with the placement lookup index on the Website root
`ApplicationBlock.` member completion with the pinned native TypeScript 7.0.2
on one idle macOS host (four root completions and two diagnostics runs per
arm, interleaved in two blocks, foldkit rebuilt per arm, medians): cold
completion 4600 ms to 4098 ms, post-edit completion 4440 ms to 3974 ms, clean
root diagnostics 4540 ms to 4098 ms; on 7.1.0-beta, cold completion 3256 ms
to 2944 ms. The same run measured `9a5f9307c`, the commit the previous
section built on, at 5627 ms cold, so the two sections' runs are not
comparable with each other.
