---
'foldkit': patch
---

Build `taggedStruct` values with optional keys without going through `Schema.make`. The callable constructor already copied required keys of plain types directly, but a single optional key, such as the `fill` of a `Canvas.Rect`, sent every call through `make`. Views that build many shapes every frame paid for that validation on each one.

Optional keys of plain types are now copied too. A key the input leaves out stays out of the result, as `make` leaves it out. Keys with a constructor default, keys with checks, and `undefined` given for an exact optional key (`Schema.optionalKey`) still go through `make`, so their defaults and validation errors are the same as before.
