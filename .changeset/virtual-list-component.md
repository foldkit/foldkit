---
'foldkit': minor
---

Add `Ui.VirtualList` component. A virtualization primitive for large lists (10k+ rows). Only items inside the viewport plus an overscan buffer are mounted; spacer divs above and below the visible slice keep the scrollbar's apparent total height correct.

The component owns scroll position, container measurement, and any in-flight programmatic scroll. Items live in the consumer's Model and pass through `ViewConfig.items` on each render, so consumers can swap, filter, sort, or paginate the underlying array freely without sending Messages to the list.

```ts
import * as Ui from 'foldkit/ui'

const Model = S.Struct({
  list: Ui.VirtualList.Model,
  todos: S.Array(Todo),
})

// init: { ..., list: Ui.VirtualList.init({ id: 'todos', rowHeightPx: 40 }) }

// update GotListMessage: dispatch to Ui.VirtualList.update

// view:
Ui.VirtualList.view({
  model: model.list,
  items: model.todos,
  itemToKey: todo => todo.id,
  itemToView: todo => Todo.view(todo),
  className: 'h-96 border rounded',
})
```

The container element needs a constrained height (via `className` or `attributes`) for virtualization to work. Without it, the container grows to fit children and never scrolls. The component sets only `overflow: auto` inline; pass `overscroll-behavior` (or any other styling) through your `className` or `attributes` if the default browser behavior isn't what you want.

`Ui.VirtualList.scrollToIndex(model, 500)` returns `[Model, Commands]` for programmatic scrolling. Stale completions are version-cancelled, so rapid successive calls don't fight each other. If `initialScrollTop` is non-zero on `init`, the same Command path applies it the first time the container is measured, so consumers don't need a separate kick.
