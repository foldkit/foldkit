# Record and HashMap child Binding assessment

## Recommendation

Use the owning Definition's schema-derived `makeMapBinding` method. The
[parent-specialized method investigation](map-binding-method-adoption-20261027.md)
supersedes the earlier standalone authoring choice while retaining this storage
and lifecycle contract:

```ts
const DatePickerBinding = ApplicationDefinition.makeMapBinding(
  DatePickerBlock,
  { field: 'datePickers' },
)

const WrappedDatePickerBinding = ApplicationDefinition.makeMapBinding(
  DatePickerBlock,
  {
    field: 'datePickerRows',
    childField: 'picker',
  },
)
```

`field` names parent-owned storage. `placement` remains the Binding occurrence in
the composition graph and defaults to `field` for this shorthand. The Record
property or HashMap key is the keyed child occurrence identity. `childField`
selects an exact child Model inside a closed parent-owned Struct value; Foldkit
replaces only that field and preserves the wrapper's other fields.

The shorthand derives `readAll`, `key`, `keySchema`, `read`, and `writeAt`. It
rejects authored versions of those policies, `presentWhen`, and configuration
initialization. Callers use the general keyed form when they need custom write
policy or a relationship the parent Schema does not state exactly.

A config can receive `field` or `childField` as a union of compatible literal
names. The runtime value still selects one string when the immutable Binding is
created, so storage and lifecycle identity do not change afterward. The return
type conservatively retains the possible fields, key Schemas, and default
placements. That can make generated Message ownership overlap another Binding
in the same Composition. Narrow the selector before construction, or author one
explicit literal `placement` when a reusable factory intentionally accepts
multiple compatible storage fields. Literal configs retain one exact field,
child field, key Schema, placement, and generated Message tag.

Map storage is selected explicitly through `makeMapBinding`. An ordinary direct
Binding can store one child whose whole Model is a Record or HashMap; its Schema
shape alone does not make it a keyed collection of children. Runtime regressions
cover both whole-Model shapes alongside explicit map validation.

HashMap is the better default for a newly modeled dynamic dictionary because
membership and immutable replacement are explicit. Record remains useful for
existing JSON-shaped application state and string-keyed wire data.

## Support matrix

| Storage          | Key Schema                                                                     | Value Schema                                                            | Enumeration                                                | Missing update                  |
| ---------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------- |
| `Schema.Record`  | Decoded strings, including string literals, templates, refinements, and brands | Exact child Model or closed Struct with one exact required `childField` | JavaScript own enumerable string-key order                 | Parent Model returned unchanged |
| `Schema.HashMap` | Decoded strings or numbers, including literals, refinements, and brands        | Exact child Model or closed Struct with one exact required `childField` | Effect HashMap iteration order; no display-order guarantee | Parent Model returned unchanged |

Record numeric key Schemas are rejected. JavaScript object properties are
strings, and accepting a numeric Schema would silently cross a coercion boundary.
The adapter enumerates with `Record.keys`, validates every key against the
declared Schema, reads only own properties, and uses existing-only replacement.
An own `__proto__` property is data, not prototype lookup, because presence uses
`Object.hasOwn` and replacement uses a computed property.

HashMap iteration is appropriate for lifecycle discovery and identity tracking.
A view that promises display order must derive and sort an explicit key list or
store ordering separately in the parent Model. The shorthand does not imply
insertion-order rendering.

A numeric HashMap key Schema such as `Schema.Number` is accepted, but every
actual occurrence key must be finite. Enumeration and delivery reject `NaN` and
positive or negative infinity at runtime. `Schema.Finite` expresses the same
constraint at the storage Schema boundary when the application can use it.

## Ownership and lifecycle guarantees

Both adapters lower to the existing keyed Binding runtime. This retains:

- generated keyed Message envelopes with the exact Schema-derived key;
- update context, Commands, Services, failures, OutMessages, and registration
  evidence;
- independent keyed Subscription, ManagedResource, Mount, and view scopes;
- generation checks and stale dispatch or Command-result isolation;
- cleanup when a property or map entry disappears;
- replacement-only ordinary folds and operations;
- explicit insertion through `Binding.init({ key, args, toParentModel })`.

An ordinary fold first resolves the key in the current parent Model. The writer
checks membership again and returns the same parent object when the key is gone.
It never calls `Record.set` or `HashMap.set` for an absent occurrence. The parent
continues to own insertion, removal, and wrapper fields.

`subscriptions.when` remains a Subscription-only gate. Property or map
membership controls presence for updates and every lifecycle channel. These two
concepts remain distinct.

## Representative reported paired DatePicker pattern

The reported `bound:column` case can use an exact string dictionary without
duplicating identity in the DatePicker Model.

`model.ts`:

```ts
import { Schema } from 'effect'
import { DatePickerBlock } from './datePicker/index.js'

export const Bound = Schema.Literals(['Lower', 'Upper'])
export const Column = Schema.Literals(['StartedAt', 'CompletedAt'])
export const DatePickerKey = Schema.TemplateLiteral([
  Bound,
  Schema.Literal(':'),
  Column,
])

export const Model = Schema.Struct({
  datePickers: Schema.Record(DatePickerKey, DatePickerBlock.Model),
})
```

`composition.ts`:

```ts
import { ApplicationDefinition } from './definition.js'
import { DatePickerBlock } from './datePicker/index.js'

export const DatePickerBinding = ApplicationDefinition.makeMapBinding(
  DatePickerBlock,
  { field: 'datePickers' },
)

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [DatePickerBinding],
})
```

`update.ts`:

```ts
import { Record } from 'effect'
import { Struct } from 'foldkit'

import { ApplicationComposition } from './composition.js'
export const update = ApplicationComposition.makeUpdate({
  RemovedDatePicker: (model, { key }) => ({
    model: Struct.modifyFields(model, {
      datePickers: Record.remove(key),
    }),
  }),
})
```

`view.ts` enumerates `Record.toEntries(model.datePickers)` and passes each same
key and child to `DatePickerBinding.embedView({ key, model: child })`. Dynamic
creation remains a parent action and can use `DatePickerBinding.init` when child
initialization Commands must be lifted.

The shorthand removes the reported mechanical accessors. It does not remove the
domain decision that turns `bound` and `column` into a collision-free string.
The template literal Schema makes that wire key exact rather than accepting an
unbounded `string`.

A parent can instead store one closed wrapper per column with required `lower`
and `upper` child fields. Two bindings of the same child Block select those
fields and use distinct placements, which derive distinct generated parent
Message variants. The accepted declaration fixture composes this shape. It can
avoid an encoded bound segment, but it couples both required child Models to one
map entry and one entry lifecycle. The exact template-literal key remains a
better fit when either bound can be independently present or removed.

## Composite HashMap keys

Composite HashMap keys are deliberately unsupported in this preview adapter.
The current public `InstanceKey` contract is `string | number`, and that key is
used by generated Message envelopes, nested native `Map` occurrence graphs,
generation lookup, rendered scopes, Command capture, and stale-result guards.
Changing only the storage reader would produce a HashMap lookup that appears to
work while lifecycle identity still uses JavaScript reference equality.

`Schema.Struct` does not by itself give freshly allocated plain objects
structural Effect equality and hashing. A fresh `{ bound, column }` must not be
assumed to locate an existing HashMap entry. Effect `Data` values or an explicit
`Equal` and `Hash` implementation can give the domain key structural HashMap
semantics, but Foldkit would still need a bounded expansion of `InstanceKey` and
all identity channels before that value can be the occurrence identity.

The supported repair today is one of:

1. Use the exact template-literal string key above. This fits the reported
   paired DatePicker domain and the generated keyed Binding contract.
2. Keep `Schema.HashMap(CompositeKey, ChildModel)` and use the general keyed
   Binding form. Enumerate entries as `{ occurrenceKey, mapKey, child }`, derive
   a collision-free primitive `occurrenceKey`, and retain the stored `mapKey` for
   `HashMap.set`. This keeps Effect HashMap equality at the storage boundary and
   Foldkit's primitive identity at the lifecycle boundary.

The second form is intentionally explicit. A projection such as
`key => `${key.bound}:${key.column}`` belongs to the application unless its
collision and reversibility rules are represented by a Schema Foldkit can
validate.

## Proposed active documentation text

> A parent Record or Effect HashMap can store keyed child Models directly. Pass
> the child Block and required Struct field to the owning Definition's
> `makeMapBinding` method; Foldkit derives enumeration, lookup, the generated
> Message key Schema, and an existing-only writer. The
> property or map key identifies the child occurrence. Add `childField` when a
> closed Struct value wraps the exact child Model and the parent owns the other
> fields. Record keys must decode to strings. HashMap key Schemas must decode to
> strings or numbers, and numeric occurrence values must be finite. Removing an
> entry ends that occurrence, and ordinary child results never recreate it. Use
> `Binding.init` for explicit creation and the
> general keyed form for custom writers, ordering policy, or composite domain
> keys that need a separate primitive occurrence identity.

## Verification plan and evidence

The implementation has focused source tests for exact and wrapped Record and
HashMap replacement, absent-entry preservation, Schema-derived key inference,
generated delivery, explicit initialization, and runtime rejection. Existing
keyed runtime tests remain the authoritative shared suite for lifecycle cleanup,
same-key generations, stale view dispatches, stale Subscription emissions,
Command results, Mount ordering, and ManagedResource release. Because both
adapters lower to `bindEach`, those tests exercise the same runtime path.

Dedicated declaration fixtures cover source acceptance and rejection plus a
relocated emitted-package consumer. Compiler performance budgets remain
unchanged.

The direct-source config maps `foldkit` to its source entry point and checks
the accepted, rejected, and split consumer modules together. The new method
fixtures additionally check detached and separately imported Definition helpers. The ordinary accepted, rejected, and consumer configs resolve the
built package declarations. The full emitted-declaration harness then copies
the built package and fixture to a relocated consumer before checking it.

## Earlier encoding measurements

These results explain the earlier standalone surface; they do not describe the
subsequently adopted parent-specialized callable.

Prototype measurements motivated the dedicated subpath. Putting the map overload
or a map constructor property on the main Definition and Block surface caused
the workspace fixtures to exceed their fixed TypeScript budgets in the tested
encodings. At that earlier checkpoint, keeping the exact map signature in its
own package subpath left ordinary Binding consumers at 203,903 types for the
four-group workspace and 277,968 for the eight-group workspace. This supported the isolated surface at that checkpoint; it
does not establish that every possible Definition method encoding has the same
compiler cost.

The [October 27 bounded investigation](map-binding-method-experiment-20261027.md)
compares two shared receiver-method encodings against the current optimized
followup. Both fail the unchanged larger-composition budgets; paired editor
measurements show no clear benefit. That checkpoint retained the standalone
surface with exact patches and per-run evidence, without attributing every added Type to receiver
inference or claiming that all method encodings must fail.

The later parent-specialized callable supports detached feature helpers and is
measured against the optimized branch and a larger composition. See its
[adoption report](map-binding-method-adoption-20261027.md) for the final compiler,
editor, declaration and safety results.
