---
'foldkit': minor
---

Add DatePicker UI component and Popover contentFocus mode.

DatePicker wraps Calendar in a Popover with focus choreography (opening
focuses the grid, closing returns focus to the trigger), click-outside
dismissal, and an optional hidden form input for native form submission.
Consumers provide the trigger face and calendar grid layout.

Popover gains a `contentFocus` option that hands focus ownership to the
consumer — the panel is not focusable and does not close on blur, so the
consumer must focus a descendant on open. DatePicker uses this to focus
the calendar grid instead of the panel.
