---
'foldkit': patch
---

`Machine.define` now flattens nested state unions when extracting state tags instead of throwing at module load. A state Schema built as a union of unions, such as `S.Union([EnteringPlayers, PlayingState])` where `PlayingState` is itself a union, now works, and `stateTags` lists the tags in depth-first declaration order. Members that are neither a union nor a Struct with a literal `_tag` field still throw the existing error.
