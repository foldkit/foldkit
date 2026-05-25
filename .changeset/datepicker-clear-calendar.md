---
'foldkit': patch
---

Fix `Ui.DatePicker.clear` (and the underlying `Cleared` Message) leaving the
embedded calendar's selection highlighted. `clear` cleared the picker's
`maybeSelectedDate` but not the embedded calendar's, and the popover grid
renders from the calendar's own state, so reopening showed the old date still
highlighted even though the trigger and hidden input read empty. `clear` now
clears the calendar's selection too.
