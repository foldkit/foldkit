---
'@foldkit/ui': minor
---

Breaking: `Combobox` and `Combobox.Multi` no longer store the selection. The Submodel Model kept a copy of a value the parent Model already owned. The Model now holds interaction state only, including `inputValue`, the transient text being typed. The selection lives in the parent Model, flows into the view each render (`ViewInputs.maybeSelectedValue` for single-select, `ViewInputs.selectedValues` for multi-select) together with `restingInputValue` (the text the input rests at when the combobox closes), and comes back out as OutMessages the parent folds.

API changes:

- `Combobox.Model` drops `maybeSelectedItem` and `maybeSelectedDisplayText`; `Combobox.Multi.Model` drops `selectedItems`. `inputValue` stays.
- `init` no longer accepts `selectedItem`, `selectedDisplayText`, or `selectedItems`. Seed the parent field instead.
- `ViewInputs` gains a required selection input and `restingInputValue: string`. Single-select takes `maybeSelectedValue: Option<Item>`, multi-select takes `selectedValues: ReadonlyArray<Item>`. For single-select, `restingInputValue` is the selection's display text, or empty. The multi-select input always rests empty on close, so multi consumers pass `''`.
- The `Selected` OutMessage drops `wasAdded`. It carries only the activated `value`; the parent decides what activation means (single-select stores it, multi-select toggles membership).
- New `ClearedSelection` OutMessage: sent when a nullable combobox closes with an empty input. The parent clears the selection it owns. `OutMessage` is now the union of `Selected` and `ClearedSelection`, so exhaustive folds must handle both tags.
- Close-path Messages carry the resting text as a payload fact: `Closed`, `BlurredInput`, and `PressedToggleButton` now have a `restingInputValue: string` payload, and `SelectedItem` carries `wasSelected: boolean` so nullable deselect works without the Model knowing the selection. The view computes these payloads from `ViewInputs`.
- `Closed` and `BlurredInput` are no-ops while the combobox is already closed, so a stale close dispatch baked from an old render cannot rewrite `inputValue` or re-emit `ClearedSelection`.
- `Combobox.close(model, restingInputValue)` now takes the resting text. `Combobox.Multi.close(model)` keeps its signature; the multi input always rests empty.
- Immediate mode (`immediate: true`) now emits `Selected` on every keyboard activation while open, so arrow keys commit as they move. Combining `immediate` with `nullable` is discouraged: a toggle fold would deselect as the arrows pass back over the selected item.
- The multi-select hidden form inputs now submit the full parent-owned selection, not just the selected items present in the currently filtered list.

### Migration

Own the selection in the parent Model and stop seeding it through `init`. Declaring the values as an `S.Literals` Schema keeps the field literal-typed end to end:

```ts
// Before
const Model = S.Struct({
  cityCombobox: Combobox.Model,
})

const init = (): Model => ({
  cityCombobox: Combobox.init({ id: 'city-combobox', selectedItem: 'Kyiv' }),
})

// After
const City = S.Literals(['Johannesburg', 'Kyiv', 'Oxford', 'Wellington'])
type City = typeof City.Type

const CityCombobox = Combobox.create<City>()

const Model = S.Struct({
  cityCombobox: Combobox.Model,
  maybeSelectedCity: S.Option(City),
})

const init = (): Model => ({
  cityCombobox: Combobox.init({ id: 'city-combobox' }),
  maybeSelectedCity: Option.some('Kyiv'),
})
```

Pass the selection and the resting text into the view. Single-select passes an `Option` as `maybeSelectedValue`; multi-select passes its full array as `selectedValues` and `restingInputValue: ''`:

```ts
h.submodel({
  model: model.cityCombobox,
  view: CityCombobox.view,
  viewInputs: {
    items: filteredCities,
    maybeSelectedValue: model.maybeSelectedCity,
    restingInputValue: Option.getOrElse(model.maybeSelectedCity, () => ''),
    itemToValue: city => city,
    itemToDisplayText: city => city,
    itemToConfig: cityItemConfig,
  },
  toParentMessage: message => GotCityComboboxMessage({ message }),
})
```

Fold the OutMessages into the selection you own. `ClearedSelection` only fires for nullable comboboxes; a nullable fold clears the field as shown below, while a non-nullable fold keeps its selection in that arm since it can never fire. Either way the match stays exhaustive:

```ts
GotCityComboboxMessage: ({ message }) => {
  const [nextCombobox, commands, maybeOutMessage] = CityCombobox.update(
    model.cityCombobox,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotCityComboboxMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [
      evo(model, { cityCombobox: () => nextCombobox }),
      mappedCommands,
    ],
    onSome: M.type<Combobox.OutMessage<City>>().pipe(
      M.tagsExhaustive({
        Selected: ({ value }) => [
          evo(model, {
            cityCombobox: () => nextCombobox,
            maybeSelectedCity: () => Option.some(value),
          }),
          mappedCommands,
        ],
        ClearedSelection: () => [
          evo(model, {
            cityCombobox: () => nextCombobox,
            maybeSelectedCity: () => Option.none(),
          }),
          mappedCommands,
        ],
      }),
    ),
  })
}
```

Multi-select folds `Selected` by toggling the value's membership in its array, exactly as the Listbox migration shows.

Callers of `reflectSelectedItem`/`reflectSelectedItems` delete the reflect call and read the selection from the state that already owned it.

Part of #676.
