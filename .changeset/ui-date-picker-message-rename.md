---
'foldkit': minor
---

Rename `Ui.DatePicker` internal `SelectedDate` Message to `RequestedSelectDate`. The new name is more honest. It's a request to select a date, not the event of one being selected. The actual event the parent observes is the `SelectedDate` OutMessage described in the broader OutMessage migration. The new name also frees `SelectedDate` for the OutMessage so the public-facing name lines up with `Ui.Calendar.SelectedDate`, which propagates the same fact from one layer down.

### Migration

```ts
// Before
update(model, Ui.DatePicker.SelectedDate({ date }))

// After
update(model, Ui.DatePicker.RequestedSelectDate({ date }))
```
