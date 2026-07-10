---
'@foldkit/ui': minor
---

Breaking: `Listbox` and `Listbox.Multi` no longer store the selection. The Submodel Model kept a copy of a value the parent Model already owned, so every app carried two sources of truth and had to keep them in sync. The Model now holds interaction state only (open/closed, active item, activation trigger, typeahead search). The selection lives in the parent Model, flows into the view each render (`ViewInputs.maybeSelectedValue` for single-select, `ViewInputs.selectedValues` for multi-select), and comes back out as a neutral `Selected({ value })` OutMessage the parent folds: single-select stores the value, multi-select toggles the value's membership.

API changes:

- `Listbox.Model` drops `maybeSelectedItem`; `Listbox.Multi.Model` drops `selectedItems`.
- `Listbox.init` no longer accepts `selectedItem`; `Listbox.Multi.init` no longer accepts `selectedItems`. Seed the parent field instead.
- `ViewInputs` gains a required selection input: single-select takes `maybeSelectedValue: Option<Value>`, multi-select takes `selectedValues: ReadonlyArray<Value>`. It drives `aria-selected` and `data-selected` on items, which item the Listbox highlights when it opens onto a selection, and the hidden form inputs submitted under `name`.
- The `Selected` OutMessage drops `wasAdded`. It now carries only the activated `value`; the parent owns the selection and decides what activation means.
- `reflectSelectedItem` and `reflectSelectedItems` are removed from both variants and from `create`. To mirror external truth (a URL parameter, restored storage, a server push), update the parent field that owns the selection. The Listbox has nothing left to sync.

### Migration

Own the selection in the parent Model and stop seeding it through `init`. Declaring the values as an `S.Literals` Schema keeps the field literal-typed end to end:

```ts
// Before
const Model = S.Struct({
  planListbox: Listbox.Model,
})

const init = (): Model => ({
  planListbox: Listbox.init({ id: 'plan-listbox', selectedItem: 'Pro' }),
})

// After
const Plan = S.Literals(['Free', 'Pro', 'Enterprise'])
type Plan = typeof Plan.Type

const PlanListbox = Listbox.create<Plan>()

const Model = S.Struct({
  planListbox: Listbox.Model,
  maybeSelectedPlan: S.Option(Plan),
})

const init = (): Model => ({
  planListbox: Listbox.init({ id: 'plan-listbox' }),
  maybeSelectedPlan: Option.some('Pro'),
})
```

Pass the selection into the view. Single-select passes an `Option` as `maybeSelectedValue`, multi-select passes its full array as `selectedValues`:

```ts
h.submodel({
  model: model.planListbox,
  view: PlanListbox.view,
  viewInputs: {
    items: plans,
    maybeSelectedValue: model.maybeSelectedPlan,
    itemToConfig: planItemConfig,
    buttonContent: planButtonContent(model.maybeSelectedPlan),
  },
  toParentMessage: message => GotPlanListboxMessage({ message }),
})
```

Fold the OutMessage into the selection you own. Single-select stores the value:

```ts
GotPlanListboxMessage: ({ message }) => {
  const [nextListbox, commands, maybeOutMessage] = PlanListbox.update(
    model.planListbox,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotPlanListboxMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [
      evo(model, { planListbox: () => nextListbox }),
      mappedCommands,
    ],
    onSome: M.type<Listbox.OutMessage<Plan>>().pipe(
      M.tagsExhaustive({
        Selected: ({ value }) => [
          evo(model, {
            planListbox: () => nextListbox,
            maybeSelectedPlan: () => Option.some(value),
          }),
          mappedCommands,
        ],
      }),
    ),
  })
}
```

Multi-select folds the same OutMessage by toggling membership, replacing the removed `wasAdded` branch:

```ts
// Before
Selected: ({ value, wasAdded }) => [
  evo(model, {
    peopleListbox: () => nextListbox,
    selectedPeople: () =>
      wasAdded
        ? Array.append(model.selectedPeople, value)
        : Array.filter(model.selectedPeople, person => person !== value),
  }),
  mappedCommands,
],

// After
Selected: ({ value }) => [
  evo(model, {
    peopleListbox: () => nextListbox,
    selectedPeople: () =>
      Array.contains(model.selectedPeople, value)
        ? Array.filter(model.selectedPeople, person => person !== value)
        : Array.append(model.selectedPeople, value),
  }),
  mappedCommands,
],
```

Callers of `reflectSelectedItem`/`reflectSelectedItems` delete the reflect call and read the selection from the state that already owned it.

Part of #676.
