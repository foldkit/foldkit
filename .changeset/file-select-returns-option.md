---
'foldkit': minor
---

`File.select` now returns `Effect<Option<File>>` instead of `Effect<ReadonlyArray<File>>`. The browser only ever produces zero or one file from a single-select picker, so `Option` makes the impossible "two or more files from a singular picker" state unrepresentable and matches Foldkit's preference for `Option` over array sentinels.

`File.selectMultiple` is unchanged. It legitimately resolves with zero-to-many files and keeps `Effect<ReadonlyArray<File>>`.

Migration: replace `Array.match`/`Array.head` over the result with `Option.match`. The cancel branch maps to `Option.none()`, the picked-a-file branch to `Option.some(file)`.

```ts
// Before
File.select(['application/pdf']).pipe(
  Effect.map(
    Array.match({
      onEmpty: () => CancelledSelectResume(),
      onNonEmpty: files => SelectedResume({ files }),
    }),
  ),
)

// After
File.select(['application/pdf']).pipe(
  Effect.map(
    Option.match({
      onNone: () => CancelledSelectResume(),
      onSome: file => SelectedResume({ file }),
    }),
  ),
)
```
