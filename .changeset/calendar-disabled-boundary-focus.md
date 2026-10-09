---
'@foldkit/ui': patch
---

Keep Calendar keyboard focus off a disabled `minDate` or `maxDate`. Say `maxDate` is a Saturday and weekends are disabled. ArrowRight from the Friday before it moved focus onto the Saturday, where Enter did nothing. Focus now stays on the Friday. A longer move that reaches past the boundary, such as PageDown or the next-month button, now lands on the last enabled date before the boundary. The next-month and previous-month buttons only do this when that date is in the month they show. A key press that finds no enabled date in either direction now leaves focus where it is.
