---
'foldkit': minor
---

Replace `Ui.Listbox.view<Item>()` / `Ui.Combobox.view<Item>()` / `Ui.RadioGroup.view` / `Ui.Tabs.view` with `create<Item>()` factories that pair `view`, `update`, and the imperative helpers (`selectItem`, `open`, `close`, `select`, `selectTab`) behind a single type-parameterized entry point. Closes the soundness hole where the previous separate `view<Item>` and `update<Item>` generics could drift independently and TypeScript would accept the mismatch.

### Migration

Before:

```ts
// In view:
Ui.Listbox.view<Color>({
  model: model.colorListbox,
  toParentMessage: message => GotColorListboxMessage({ message }),
  onSelectedItem: value => SelectedColor({ color: value as Color }), // cast required
  // ... other ViewConfig
})

// In update:
const [next, commands] = Ui.Listbox.update(model.colorListbox, message)
```

After:

```ts
// At module scope:
const ColorListbox = Ui.Listbox.create<Color>()

// In view:
h.submodel({
  id: 'colors',
  view: ColorListbox.view,
  model: model.colorListbox,
  toParentMessage: message => GotColorListboxMessage({ message }),
})

// In update:
const [next, commands, maybeOut] = ColorListbox.update(
  model.colorListbox,
  message,
)
// maybeOut: Option<Ui.Listbox.OutMessage<Color>>
// Selected branch carries `item: Color` directly; no cast needed.
```

Declare the factory once at module scope. The returned object pairs everything Item-typed (view, update, selectItem, open, close) so Item drift becomes impossible: there's only one type parameter to set.

### Components in scope

- **`Ui.Listbox.create<Item, Value?>()`** — two type params support object-typed items via `itemToValue`. `Value` defaults to `Item` when `Item extends string`, else `string`. The `itemToValue` extractor on `ViewInputs` is now typed `(item: Item) => Value` (was `=> string`), and is required when items are objects (optional when `Item extends string`, where the default is identity). Closes a soundness gap where `create<Person, 'red' | 'blue'>()` would accept an extractor returning any `string`.
- **`Ui.Listbox.Multi.create<Item, Value?>()`** — same shape.
- **`Ui.Combobox.create<Item>()`** — `Item extends string`. `itemToValue` codomain is now `Item` (was `string`).
- **`Ui.Combobox.Multi.create<Item>()`** — same.
- **`Ui.RadioGroup.create<Value>()`** — single type param, `Value extends string`. The view's ViewInputs stays string-typed (consumers pass a `ReadonlyArray<MyUnion>` which is assignable to `ReadonlyArray<string>`); the fenced cast inside `update` types the OutMessage's `value` as `Value`. The same propagation flows into `toView`: `option.value` is now typed as the consumer's `Value`, removing casts in the slot callback.
- **`Ui.Tabs.create<Value>()`** — single type param, `Value extends string`. `TabInfo.value` in `toView` is typed as the consumer's tab union; removes the `tab.value as MyTab` cast at every Tabs consumer.

`Ui.Menu` is intentionally out of scope. Its OutMessage carries `index: number`, not `item: Item`, so the Item-generic drift problem does not apply.

### Bare runtime exports removed

The factory is the only public path to `view`, `update`, and the imperative helpers (`selectItem`, `open`, `close`, `select`, `selectTab`) for the five components above. `Ui.Listbox.view`, `Ui.Listbox.update`, `Ui.Listbox.open`, `Ui.Listbox.close`, `Ui.Listbox.selectItem`, and the `Multi` counterparts are no longer exported, and the same applies to `Ui.Combobox.*`, `Ui.RadioGroup.update` / `select`, and `Ui.Tabs.view` / `update` / `selectTab`. Forcing every call through `create<Item>()` makes Item-drift impossible: there's only one binding site for the type parameter.

Migration: declare the factory at module scope and use the returned methods.

```ts
// Before
const [next, commands] = Ui.RadioGroup.update<Tool>(model.tool, message)

// After
const ToolRadioGroup = Ui.RadioGroup.create<Tool>()
const [next, commands] = ToolRadioGroup.update(model.tool, message)
```

### Soundness

The Item generic flows from `create<Item>()` to the OutMessage's `value` / `item` field through a fenced cast at `update`'s return. The cast is sound iff the value emitted in the OutMessage was originally drawn from the consumer-supplied items array, which holds for click and typeahead-search paths (both index into the items array).

The realistic violation is a stale model surviving an items-list change: selecting `'Red'` when items are `[Red, Green, Blue]`, then later passing `[Yellow, Purple]` keeps the stored selection at `'Red'`, which the type system would now claim is in the new union but is not. The cast itself never throws; downstream code that assumes exhaustiveness (`Match.exhaustive`, `Record<Union, X>` lookups) might. Consumers using long-lived selections across dynamic-items renders should validate at the boundary if they are concerned.
