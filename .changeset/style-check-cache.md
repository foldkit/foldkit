---
'foldkit': patch
---

Check each `h.Style` entry once instead of on every render. Every inline style ran its full property name and value checks each time a view built it, which for views that rebuild the same styles every frame added up to a noticeable share of render time.

An entry whose property name and string value passed the checks is now remembered, along with its declaration name, so later renders skip straight to the duplicate declaration check. That check still runs on every style, so two spellings of one declaration such as `fontSize` and `font-size` are refused even when each passed alone. The cache holds up to 4,096 entries and then starts over. Every error, and the order in which errors are reported, is the same as before.
