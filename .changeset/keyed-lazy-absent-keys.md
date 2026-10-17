---
'foldkit': minor
---

`createKeyedLazy({ evict: 'AbsentFromRender' })` drops keys the latest render did not call. The default still keeps every key. A virtual list memoized by row id needs the new option, because each cached entry holds that row's DOM element and the default map keeps every row that has scrolled past.
