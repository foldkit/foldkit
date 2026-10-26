# Test-only child Message construction

## Recommendation

Adopt `toParentMessage` from `foldkit/test` for a parent Story that deliberately
tests parent delivery or OutMessage policy from a decoded child Message. The
helper accepts the actual generated Binding and invokes the Binding's retained
tracked mapper. It does not add a production Binding operation.

Keep child state and OutMessage behavior in the child Story. Use a Scene when
rendered event wiring matters. Continue resolving child Commands and emitting
Subscriptions through their existing captured mapper paths.

## Parent Story migration

Previous tests either fabricated a generated envelope or built an unused child
view only to access its mapper:

```ts
Schema.decodeSync(SearchComposition.Message)({
  _tag: 'GotDialogMessage',
  placement: 'dialog',
  generation: 0,
  message: DialogBlock.Message.RequestedOpen(),
})

DialogBinding.embedView({
  slotId: 'dialog',
  model: parentModel.dialog,
  view: emptyDialogView,
}).toParentMessage(DialogBlock.Message.RequestedOpen())
```

The parent test now names the real Binding and the child fact directly:

```ts
toParentMessage(DialogBinding, DialogBlock.Message.RequestedOpen())
```

A keyed Binding receives its decoded key before the child Message:

```ts
toParentMessage(
  EntriesBinding,
  entryId,
  EntryBlock.Message.UpdatedTitle({ value: 'Ready' }),
)
```

Nested delivery wraps one exact boundary at a time:

```ts
toParentMessage(
  ParentBinding,
  toParentMessage(ChildBinding, ChildBlock.Message.ChangedValue()),
)
```

## Contract matrix

| Contract        | Accepted or preserved                                                                                                  | Rejected or excluded                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Binding         | One exact generated static or keyed Binding, including an OutMessage policy alias                                      | Manual, Message-free, broad, `any`, `unknown`, or top-level Binding union                             |
| Child Message   | Exact decoded child Message, including refined payloads and generic factory instances                                  | Foreign Message, incompatible generic instance, parent envelope in place of the raw child Message     |
| Key             | No key for static Bindings; exact decoded string, number, literal, refined or transformed-Codec key for keyed Bindings | Missing or extra key, wrong decoded type, invalid refinement, encoded Codec input                     |
| Result          | Exact generated parent envelope with placement, optional key and the original child Message identity                   | Caller-authored tag, placement, envelope or generation                                                |
| Construction    | Passive wrapping through the retained tracked mapper                                                                   | update execution, Model writes, Commands, Layers, resources, views, ViewInputs or occurrence creation |
| Replay          | Synthetic generation `0`; explicit removal and reinsertion replay uses the current parent Model selection              | Claim of a current live occurrence or arbitrary generation override                                   |
| Parent dispatch | Presence, delivery gate, update context, policy and exact Binding provenance remain active                             | Missing child recreation or foreign Binding provenance                                                |
| Runtime input   | Erased and JavaScript values are checked synchronously against child Message and key Schemas' decoded Type sides       | Invalid decoded values and encoded values at a decoded boundary                                       |

Pass one narrowed Binding. When a test holds a Binding union, branch before
calling so the selected Binding stays correlated with its key and child Message.
TypeScript cannot statically reject an `any` child Message; runtime Schema
validation remains the boundary for erased and JavaScript Message inputs. Codec
decoding transformations and their decoding Services do not run. As with
`Schema.is`, asynchronous or defectful Type-side declarations may throw at this
synchronous boundary.

Synthetic headless wrapping does not test Runtime live-origin or lifecycle
admission. View and Scene-origin paths retain live generations and continue to
exercise stale-occurrence rejection.

## Evidence

- Focused runtime tests cover static, direct keyed, wrapped keyed and custom
  Codec-keyed Bindings; two placements; optional absence; removal and
  reinsertion; delivery gates; contextual updates; OutMessage policy aliases;
  passivity; exact identity; foreign Binding provenance; generation zero; and
  separation from live-origin admission.
- Source and emitted/relocated declaration fixtures cover exact results,
  complex ViewInputs without a view, generic factory instances, nested
  wrapping, key Schema variants, wrong arities, erased Binding types and
  Binding-union correlation.
- Search Story replaces its manually decoded generated records. Repository
  Story tests that used `embedView` only to reach `toParentMessage` now use the
  test helper without placeholder Model, view or ViewInputs values.
- A repository sweep found five remaining manually decoded generated envelopes
  in the Menu, DatePicker, Popover and Toast UI component Stories. They cross
  private implementation Bindings that those modules deliberately do not
  expose. Migrating them would require expanding a component's production or
  package-test surface solely for its white-box tests, so they remain scoped
  exceptions rather than uses the public helper can replace.

A mutation bypassing both decoded-value Schema checks fails the erased-input
regression at the refined amount `0`. Restoring the exact helper source passes
the Story and helper suites (77 tests). The isolated mutation logs are retained
at `/private/tmp/foldkit-followup-mutation-20261025`; shared source was not edited.
