# Definition map Binding investigation, October 27

## Decision at this checkpoint

This retained-standalone decision is superseded by the subsequent
[parent-specialized method adoption](map-binding-method-adoption-20261027.md).
The rejected encodings and their measurements below remain unchanged.

Retain `makeMapBinding` from `foldkit/mapBinding` for the next preview. Two new
shared receiver-method encodings compile and support the requested consumer
spelling, but both exceed the unchanged larger-composition compiler budgets.
Editor measurements of the Schema-contract variant show no clear benefit. This rejects these candidates;
it does not establish a universal TypeScript limitation.

Move the authoritative contract documentation onto the exported callable, with
the `MakeMapBinding` interface linking to it. Native TypeScript hover on both an
import and a call, plus generated TypeDoc JSON, expose the example, supported
storage and key contracts, `childField`, membership ownership and initialization
path.

## Baseline and bounded scope

The baseline is optimized followup commit
`f71d3db6cceb3c93943e1e1b65b2719e779168dc`, not the published preview or the
original slow baseline. Both snapshots use native TypeScript `7.1.0-beta`,
Node `24.22.1`, the same lockfile and built dependencies on macOS arm64.
Concurrent Workspace edits are outside these pinned measurements.

The [earlier assessment](record-hashmap-binding-assessment.md) records failures
for map discrimination inside ordinary Binding overloads and a parent-specialized
map constructor property. The integrated overload backup was inspected. The
exact earlier constructor-property patch and its paired raw measurements were
not recovered, so its old absolute Type counts are not presented as a current
comparison.

This pass tests one different family and one narrow refinement:

1. A single shared `MakeMapBindingMethod` interface with a generic `this`
   receiver. Infer the parent Definition only at invocation; do not specialize
   the method interface for each parent.
2. Infer only the receiver's Model, Message, optional OutMessage and child-init
   context Schemas, instead of capturing the whole Definition type.

Both retain the existing reverse-mapped contextual config, validation tuples,
exact result and evidence types. Their shared runtime adapter calls the existing
standalone implementation, which marks map storage explicitly and lowers through
the native `makeBinding`. Neither changes storage, occurrence identity,
membership policy, initialization or lifecycle machinery.

The exact alternatives and focused probe changes are preserved:

- [Definition receiver patch](map-binding-method-experiment-20261027/receiver-definition.patch)
- [Schema-contract receiver patch](map-binding-method-experiment-20261027/receiver-contracts.patch)
- [Contract and editor probe patch](map-binding-method-experiment-20261027/method-contract-checks.patch)

Apply either receiver patch to the baseline, not both, using
`git apply --unidiff-zero` for these pinned, zero-context patches. The probe patch converts
the existing map acceptance/rejection and runtime cases to method calls, rejects
detached calls, and updates the editor driver's obsolete initialization-file
path to the current split-file Workspace. That same path correction was applied
to the baseline driver. The compiler fixtures and ceilings are unmodified.

## Consumer experience

The split-file shape stays ordinary: `model.ts` imports the completed child Block
and constructs `Schema.Record(Schema.String, ChildBlock.Model)`; `definition.ts`
owns the parent contracts; `composition.ts` imports those contracts and the child
Block. No implementation imports back from the Composition are introduced.

Current `composition.ts`:

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

Prototyped `composition.ts`:

```ts
import { ApplicationDefinition } from './definition'
import { ChildBlock } from './child'

export const ChildrenBinding = ApplicationDefinition.makeMapBinding(
  ChildBlock,
  { field: 'children' },
)
```

Workspace's three real map Bindings use the second form in the candidate,
including IssueDetail's OutMessage policy and Board/ProjectSettings composition.
The app typechecks without consumer casts, annotations or generic lists. Existing
direct Bindings retain their ordinary meaning even when one child's entire Model
is itself a Record or HashMap.

The receiver-based method also has an ergonomic cost: unlike `makeBinding`, it
cannot be destructured and called without its Definition receiver. The probe
rejects that form rather than inferring an unrelated parent or widening checks.
This limits its consistency with the feature-local helper convention.

## Unchanged compiler budgets

All six baseline fixtures pass. Both method encodings produce the same measured
counts and fail the four-group and eight-group Workspace fixtures:

| Fixture                | Baseline Types | Method Types | Type ceiling | Baseline Instantiations | Method Instantiations | Instantiation ceiling |
| ---------------------- | -------------: | -----------: | -----------: | ----------------------: | --------------------: | --------------------: |
| Workspace four groups  |        203,019 |      229,173 |      206,314 |               2,510,412 |             2,642,699 |             2,639,574 |
| Workspace eight groups |        279,563 |      303,062 |      280,523 |               4,278,713 |             4,398,255 |             4,515,010 |

Types increase by 12.9% and 8.4%; Instantiations increase by 5.3% and 2.8%.
Deep composition, wide composition, Command requirements and wide Subscriptions
remain inside their ceilings. [All six results](map-binding-method-experiment-20261027/compiler-results.json)
include Symbols and the unchanged budget-file hash.

These are costs of the complete candidate patches. They do not isolate receiver
inference as the cause: importing the map surface into Definition also changes
module/type discovery order. No causal claim about that mechanism is needed to
reject the candidates under the existing gates.

## Paired editor measurements

The editor candidate is the second, Schema-contract receiver encoding. The first
variant received compiler checks without separate editor timing.

Three fresh-server runs per snapshot, ordered A1/B1/B2/A2/A3/B3, use identical
in-memory edits and requests. Builds and tests do not overlap the timed runs.
The driver validates typed Binding hover, expected Binding/Block completion
members, the exact title error, and clean diagnostics after restoration. It also
checks that source and declarations remain unchanged during each run.

| Workspace workflow                    | Standalone median | Method median |
| ------------------------------------- | ----------------: | ------------: |
| Binding hover after edit              |          323.8 ms |      334.9 ms |
| Binding completion after edit         |          310.3 ms |      321.0 ms |
| Completed Block completion after edit |           50.8 ms |       49.8 ms |
| Error appearance                      |          193.0 ms |      196.8 ms |
| Error clearing                        |          184.6 ms |      186.2 ms |

The overlapping ranges do not support a material editor speedup or a strong
latency-regression claim from this small sample. Maximum sampled process RSS is
438 MiB for the baseline and 461 MiB for the method. The [per-run evidence](map-binding-method-experiment-20261027/editor-results.json)
retains timings, diagnostic evidence, memory peaks, compiler identity and workload
hashes; repetitive RSS samples are omitted. These are upstream native TypeScript
results, not tsrs measurements, rendering benchmarks or an extrapolation to
arbitrarily large applications.

## Safety and verification limits

- Both candidate library builds and the method-authored Workspace typecheck pass.
- The Schema-contract method's keyed-map source acceptance/rejection fixtures pass.
  They cover exact direct/wrapped child Schemas, Record and HashMap keys,
  contextual Subscription predicates, placement, unsupported key/value Schemas,
  conflicting config, native constructor contracts and detached-call rejection.
- Strict external declaration emission, rejection checks and relocated
  consumption pass without source path mappings or `skipLibCheck`.
- The two focused runtime files pass all 28 tests after changing their typed
  construction sites to the method. They exercise existing-only replacement,
  wrappers, keyed routing, Subscription gating, explicit initialization,
  passive recipes, child Commands, and missing-registration rejection.
- The retained standalone API passes its source, external rejection and relocated
  declaration checks. The TSDoc usage example compiles with matching public
  parent/child definitions. Native import/call hovers and generated TypeDoc expose
  its full documentation.

The failed budget gate ends this investigation. The candidate checks are not an
exhaustive certification of every generic factory, Service/constructor-error
combination or lifecycle sequence. No experimental type or runtime change is
adopted, so the shipped inference, requirements, registration, identity and
lifecycle contracts remain the current implementation's contracts.

Independent review supports retaining the standalone surface and the qualified
performance explanation. No budgets were raised and no consumer migration is
required by this decision. The [verification record](map-binding-method-experiment-20261027/verification.json)
identifies the scoped checks and documentation probes.

## Reproduction

Create separate checkouts at the pinned baseline, install the frozen lockfile and
build their public packages. Apply one receiver patch and the probe patch only to
the candidate. Apply just the initialization-path correction to the baseline
editor driver. Use the same compiler/dependency versions for both.

```sh
node packages/foldkit/scripts/check-block-type-performance.ts
node packages/foldkit/node_modules/typescript/bin/tsc -p packages/foldkit/declaration-tests/tsconfig.keyed-map-field.source.json
node packages/foldkit/node_modules/typescript/bin/tsc -p examples/workspace/tsconfig.json --noEmit
node packages/foldkit/scripts/profile-block-language-service.ts --scenario workspace --runs 1
```

Repeat the final command in the paired order above, with no overlapping builds
or tests. For emitted/relocated checks, use the keyed-map group in
`packages/foldkit/scripts/check-emitted-declarations.ts`; the full existing
harness also checks unrelated contracts. Run the focused runtime files with
`vitest run src/block/keyedMapFieldConnection.test.ts src/block/insertInitialization.test.ts`
from `packages/foldkit`.
