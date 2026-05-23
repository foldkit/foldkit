---
'foldkit': patch
---

Fix DevTools model tree rendering artifacts after time-travel pause + new Messages. Tree rows showed merged field labels (e.g. `"newCardTitle: maybeNewCardColumnId:"`) and orphaned values, caused by text-node accumulation inside spans whose role changed across renders.

Each row-child view in `flatNodeView` (`arrow`, `diff-dot`, `key`, `tag`, `value`) now declares an explicit `h.Key(...)` so snabbdom's keyed-diff path is used instead of position-and-tag matching. This sidesteps a snabbdom children-diff edge case (see snabbdom/snabbdom#970 and #440) where unkeyed spans with different classes were recycled across roles and accumulated stale text-node children.
