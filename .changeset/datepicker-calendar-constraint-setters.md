---
'foldkit': minor
---

Add programmatic setters for `Calendar` and `DatePicker` constraint props — `setMinDate`, `setMaxDate`, `setDisabledDates`, `setDisabledDaysOfWeek`. These allow consumers to update the `minDate`, `maxDate`, `disabledDates`, and `disabledDaysOfWeek` fields after `init()`, which is how cross-field date validation works (e.g. an end date picker whose minimum tracks a start date picker's selection).

Constraints remain set at init time via `InitConfig` and live in the Model — the new setters update those fields. They do not reconcile the current selection if it falls outside the new constraint range; callers should `clear` or reassign the selection explicitly if their domain requires it.

```ts
GotStartDateMessage: ({ message }) => {
  const [nextStartDate, commands] = Ui.DatePicker.update(model.startDate, message)
  const nextEndDate = Ui.DatePicker.setMinDate(
    model.endDate,
    nextStartDate.maybeSelectedDate,
  )
  return [evo(model, { startDate: () => nextStartDate, endDate: () => nextEndDate }), ...]
},
```
