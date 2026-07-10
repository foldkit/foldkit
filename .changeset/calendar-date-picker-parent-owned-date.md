---
'@foldkit/ui': minor
---

Breaking: Calendar and DatePicker no longer store the selected date. The parent Model owns an `Option<CalendarDate>`, passes it in per render via `ViewInputs.maybeSelectedDate`, and folds the OutMessages back into its own state. DatePicker gains a `ClearedDate` OutMessage: clearing no longer silently empties internal state, it announces the fact so the parent clears its own field. `InitConfig` replaces `initialSelectedDate` with `initialViewDate`, which only controls the month the calendar opens onto; pass the parent's current value to open onto it. `reflectSelectedDate` is replaced on both components by `focusDate`, which moves the view and cursor to a plain `CalendarDate` without touching the selection. Config reflectors (`reflectMinDate`, `reflectMaxDate`, `reflectDisabledDates`, `reflectDisabledDaysOfWeek`) are unchanged, since bounds and disabled dates remain child configuration. Part of #676.

### Migration

Add a field for the selected date to your Model and seed it in init:

```ts
// Before
const Model = S.Struct({
  datePicker: DatePicker.Model,
})

const init = (today: CalendarDate) => ({
  datePicker: DatePicker.init({
    id: 'due-date',
    today,
    initialSelectedDate: today,
  }),
})
```

```ts
// After
const Model = S.Struct({
  datePicker: DatePicker.Model,
  maybeDueDate: S.Option(Calendar.CalendarDate),
})

const init = (today: CalendarDate) => ({
  datePicker: DatePicker.init({
    id: 'due-date',
    today,
    initialViewDate: today,
  }),
  maybeDueDate: Option.some(today),
})
```

In update, fold the `SelectedDate` and `ClearedDate` OutMessages into the parent-owned field:

```ts
GotDatePickerMessage: ({ message }) => {
  const [nextDatePicker, datePickerCommands, maybeOutMessage] =
    DatePicker.update(model.datePicker, message)

  const nextMaybeDueDate = Option.match(maybeOutMessage, {
    onNone: () => model.maybeDueDate,
    onSome: M.type<DatePicker.OutMessage>().pipe(
      M.tagsExhaustive({
        SelectedDate: ({ date }) => Option.some(date),
        ClearedDate: () => Option.none(),
        ChangedViewMonth: () => model.maybeDueDate,
      }),
    ),
  })

  return [
    evo(model, {
      datePicker: () => nextDatePicker,
      maybeDueDate: () => nextMaybeDueDate,
    }),
    Command.mapMessages(datePickerCommands, message =>
      GotDatePickerMessage({ message }),
    ),
  ]
}
```

In view, pass the parent-owned selection back in (Calendar takes the same `maybeSelectedDate` view input):

```ts
h.submodel({
  slotId: model.datePicker.id,
  model: model.datePicker,
  view: DatePicker.view,
  viewInputs: {
    anchor,
    maybeSelectedDate: model.maybeDueDate,
    triggerContent,
    toCalendarView,
  },
  toParentMessage: message => GotDatePickerMessage({ message }),
})
```

Callers of `reflectSelectedDate` should set the parent-owned field and, when the picker should open onto the new date, call `focusDate`:

```ts
// Before
evo(model, {
  datePicker: DatePicker.reflectSelectedDate(Option.some(date)),
})
```

```ts
// After
evo(model, {
  maybeDueDate: () => Option.some(date),
  datePicker: DatePicker.focusDate(date),
})
```
