---
'foldkit': minor
---

Add `devTools.excludeFromHistory` and `devTools.maxEntries` to control DevTools history behavior.

```ts
const program = Runtime.makeProgram({
  // ...
  devTools: {
    Message,
    excludeFromHistory: ['TickedFrame', 'MovedPointer'],
    maxEntries: 500,
  },
})
```

`excludeFromHistory` skips recording the listed Message tags. The Messages still drive `update` and the runtime as usual; they just don't appear in the history panel and don't pay the per-Message diff cost. Reach for this when an animation-frame Subscription, pointer-move handler, scroll listener, or other high-frequency dispatcher would otherwise flood history with entries that all look the same. The history panel becomes useful again, and DevTools recording stops dominating frame time on dev builds.

When `excludeFromHistory` is set, DevTools also switches to a per-entry snapshot strategy: every recorded entry stores the live model at the moment it was recorded, so time-travel jumps to that entry are exact and never need to replay through Messages that were excluded. Without this, jumping to a recorded entry would replay only the kept Messages and miss any cumulative state the excluded ones would have produced. The DevTools "Live" model view stays in sync as well: excluded Messages still update the latest-model snapshot, they just don't append a history entry or compute a diff.

`maxEntries` caps how many recorded Messages are retained before the oldest is evicted. The default drops from 500 to **100**: at modest message rates a deeper history is rarely useful for debugging, and the smaller cap keeps the panel snappy under heavy traffic. Clamped to the range 20-500. Each retained entry is one append + diff in the regular case, or one append + full Model snapshot when `excludeFromHistory` is active, so memory cost scales with both `maxEntries` and your Model size.
