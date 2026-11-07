# Binding migration

This guide describes the approved candidate API. The two Workspace compiler
limits use their explicitly approved measured counts. Publication remains held.

## Choose the relationship at declaration

Replace implicit field/accessor overloads with the parent-owned constructor that
matches the existing Model. Keep the Model, init arguments, policies, operations
and construction Layer wiring intact.

| Previous configuration                                             | Parent constructor                          |
| ------------------------------------------------------------------ | ------------------------------------------- |
| `makeBinding(Child, { field })` with an exact child field          | `makeRequiredFieldBinding`                  |
| The same call with an `Option<ChildModel>` field                   | `makeOptionalFieldBinding`                  |
| `field`, `key`, `childField` on a keyed Option wrapper             | `makeOptionalKeyedFieldBinding`             |
| `field`, `key`, optional `childField` on a required array          | `makeKeyedArrayBinding`                     |
| `makeMapBinding` with a required Record field                      | `makeRecordBinding`                         |
| `makeMapBinding` with a required HashMap field                     | `makeHashMapBinding`                        |
| `read` and `write` accessors                                       | `makeCustomBinding`                         |
| `readAll`, `key`, `read`, `writeAt`, plus `keySchema` for delivery | `makeCustomKeyedBinding`                    |
| Standalone `makeVariantBinding(Parent, Child, config?)`            | `Parent.makeVariantBinding(Child, config?)` |

Custom keyed children with generated Message delivery require `keySchema`. Message-free children omit both `keySchema` and `delivery`; their `key` callback still establishes the exact occurrence-key type.

Optional and keyed describe independent properties of the relationship. A
required field whose child Model is itself an Option, array, Record or HashMap
still uses `makeRequiredFieldBinding`. Do not infer a collection relationship
from the child's own Model shape.

Record and HashMap membership and identity come from the container entry key.
Record keys decode to strings; HashMap keys decode to strings or finite-number
occurrence keys. Existing branded and literal key contracts remain exact.
`childField` selects the child inside a closed parent-owned wrapper and preserves
its other fields. The parent continues to own insertion and removal.

## Keep builder extraction ordinary

Export needed bound constructors beside the passive Block contract, then import
them into Composition modules. Existing `.withOutMessagePolicy`, init selectors,
delivery context, Subscription gates and bound operations retain their spelling
and ownership. Constructor names carry the storage distinction; neither imports
nor extracted callbacks need new application types, casts or generic lists.

For example, a Workspace Record declaration changes from:

```ts
export const { makeMapBinding } = ApplicationBlock

export const IssueDetailsBinding = makeMapBinding(IssueDetailBlock, {
  field: 'issueDetails',
  delivery: {
    toUpdateContext: (model, issueId) => [
      Option.getOrThrow(maybeConfirmedIssue(model, issueId)),
    ],
  },
})
```

to:

```ts
export const { makeRecordBinding } = ApplicationBlock

export const IssueDetailsBinding = makeRecordBinding(IssueDetailBlock, {
  field: 'issueDetails',
  delivery: {
    toUpdateContext: (model, issueId) => [
      Option.getOrThrow(maybeConfirmedIssue(model, issueId)),
    ],
  },
})
```

The same unchanged complete policy can be chained onto either declaration. The
Composition still registers the resulting Binding, its Layer constructor yields
that Binding, and the child implementation is still supplied through Layers.

## Rename the whole-occurrence gate

Rename `presentWhen` to `activeWhen` wherever the existing direct field gate is
used. Its predicate and semantics stay the same. A required field can retain a
child Model while its behavior is inactive.

Keep `delivery.when` for admission of incoming child Messages, and
`subscriptions.when` for Stream activation. Neither narrower gate becomes a
whole-occurrence gate. Keep custom presence in the existing reader. This rename
does not add a new gate to keyed, map, custom or variant storage.

## Use the Binding helper entry point

Before:

```ts
import { initAndSet, makeInitIfMissingStep } from 'foldkit/bindingInit'
```

After:

```ts
import { initAndSet, makeInitIfMissingStep } from 'foldkit/binding'
```

Helper behavior does not change. `initAndSet` places required/optional direct
children or the supported keyed Option wrapper. `initAndAppend` uses the
existing array startup projection, and `initAndInsert` / `makeInitIfMissingStep`
support direct-value Record/HashMap storage. Retain explicit `Binding.init` for
custom wrapper metadata, deliberate replacement, sibling changes, parent
Commands or whole variants.

The API has one spelling per relationship and one helper entry point. Internal
lowering functions are private implementation details. The removed constructors
and subpaths have no compatibility aliases.
