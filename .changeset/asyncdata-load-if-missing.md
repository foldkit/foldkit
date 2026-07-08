---
'foldkit': minor
---

Add `AsyncData.loadIfMissing`, the load-only sibling of `revalidateOrLoad` and `revalidate`. The cold no-data states (`Idle`, `Failure`) start a fresh `Loading`; every other state yields `None`, so loaded data is kept without revalidation and a request in flight is not restarted. It is the state-machine form of TanStack Query's `staleTime: Infinity`: fetch on first visit, keep the cache afterwards.
