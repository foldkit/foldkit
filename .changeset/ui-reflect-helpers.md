---
'foldkit': minor
---

Establish `reflect*` as the convention for conforming a Submodel to
externally-sourced state. A `reflect*` helper sets a Submodel's value to mirror
something that originated outside it (a URL, a server push, restored storage,
parent state, or a sibling Submodel), without emitting an OutMessage. It is the
inbound complement to OutMessage's outbound direction: OutMessage announces a
change the Submodel made itself, so the parent reacts; `reflect*` conforms the
Submodel to a change the world made, silently, because the external thing is
already the source of truth. The silence is what lets a parent reflect external
state without echoing it back out and looping (for example a `ChangedUrl`
handler syncing a listbox to the URL).

Each `reflect*` returns `Model` directly, not the `[Model, Commands,
Option<OutMessage>]` tuple the choice-based setters (`selectItem`, `select`,
`selectTab`, `selectDate`, `setChecked`, `toggle`) return. The different return
type makes "this cannot emit" visible at the call site. Each is also
`Function.dual`, so it reads point-free in an `evo` callback:

```ts
ChangedUrl: () => [
  evo(model, {
    dietListbox: DietListbox.reflectSelectedItem(fromUrl),
  }),
  [],
]
```

### Added

- `Listbox.create().reflectSelectedItem(model, Option<Value>)` and
  `Listbox.Multi.create().reflectSelectedItems(model, ReadonlyArray<Value>)`
- `Combobox.create().reflectSelectedItem(model, Option<{ item, displayText }>)`
  (sets the input text alongside the selection) and
  `Combobox.Multi.create().reflectSelectedItems(model, ReadonlyArray<Value>)`
- `RadioGroup.create().reflectSelectedValue(model, Option<Value>)`
- `Tabs.create().reflectSelectedTab(model, value, options)` (resolves the value
  to an index, mirroring `select`; a value not in `options` is a no-op)
- `Calendar.reflectSelectedDate(model, Option<CalendarDate>)` and
  `DatePicker.reflectSelectedDate(model, Option<CalendarDate>)` (the picker also
  reflects onto its embedded calendar); both move the view to the date so the
  selection stays visible
- `Checkbox.reflectChecked(model, boolean)`,
  `Switch.reflectChecked(model, boolean)`, and
  `Disclosure.reflectOpenState(model, boolean)`

### Renamed (breaking)

The silent setters that already existed are renamed to the `reflect*` convention
and are now dual. Behavior is unchanged; only the names change, plus the added
data-last form.

- `Calendar` and `DatePicker`: `setMinDate` → `reflectMinDate`, `setMaxDate` →
  `reflectMaxDate`, `setDisabledDates` → `reflectDisabledDates`,
  `setDisabledDaysOfWeek` → `reflectDisabledDaysOfWeek`
- `Slider`: `setValue` → `reflectValue`, `setRange` → `reflectRange`

The choice-based setters that emit (`setChecked`, `selectItem`, `selectDate`,
and the rest) keep their names.
