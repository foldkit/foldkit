---
'foldkit': patch
---

Fix `Calendar.toDateLocal` for years 0 to 99. The function passed the year to the `Date(year, monthIndex, day)` constructor, which reads 0 to 99 as 1900 to 1999, so `Calendar.toDateLocal(Calendar.make(50, 3, 1)).getFullYear()` returned `1950`. February 29 of year 0 came back as March 1, 1900. The function now sets the year with `setFullYear`, and the returned `Date` has the year of the `CalendarDate`.
