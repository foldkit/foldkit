---
'@foldkit/ui': minor
---

Evict the selected date from `Calendar` and `DatePicker`. Both stay Submodels (they keep genuine view-navigation and popover interaction state), but the selected date is now owned by the parent and passed in via `ViewInputs.maybeSelectedDate`. The two ship together because `DatePicker` embeds `Calendar`, and the value flows app → `DatePicker.ViewInputs.maybeSelectedDate` → `Calendar.ViewInputs.maybeSelectedDate`.

Calendar:

- `Calendar.Model` drops `maybeSelectedDate`. The view-navigation state (`viewYear`, `viewMonth`, `viewMode`, `maybeFocusedDate`, `isGridFocused`) and the config (`today`, `locale`, min/max, disabled) stay.
- `Calendar.ViewInputs` gains a required `maybeSelectedDate`. The selected-day marker derives from it.
- `Calendar.init` renames `initialSelectedDate` to `initialViewDate` (it only seeds the initial view month now).
- `reflectSelectedDate` is replaced by `focusDate(model, date)`, which moves the view and cursor to a date without changing the selection. Selection still surfaces only as the `SelectedDate` OutMessage.

DatePicker:

- `DatePicker.Model` drops `maybeSelectedDate`; it is now `{ id, calendar, popover }`.
- `DatePicker.ViewInputs` gains a required `maybeSelectedDate` (feeds the calendar, the trigger content, and the hidden form input).
- `DatePicker.init` renames `initialSelectedDate` to `initialViewDate`.
- `reflectSelectedDate` is replaced by `focusDate`. A new `ClearedDate` OutMessage is emitted by `Cleared` / `clear`, so the parent learns of a clear (previously it emitted nothing).

BREAKING: `Calendar.reflectSelectedDate`, `DatePicker.reflectSelectedDate`, and the `maybeSelectedDate` Model fields are removed, and `init` renames `initialSelectedDate` to `initialViewDate`. Move the selected date to a parent Model field: store it, pass it as `maybeSelectedDate`, fold `SelectedDate` (and DatePicker's `ClearedDate`) into it, and use `focusDate` to navigate to a date without selecting it. The `reflectMinDate` / `reflectMaxDate` / `reflectDisabledDates` / `reflectDisabledDaysOfWeek` config setters are unchanged. Part of #676.
