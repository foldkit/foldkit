# VirtualList

## Overview

A virtualization component for large lists. Only items inside the viewport plus an overscan buffer are mounted. Spacer rows above and below the visible slice keep the scrollbar physically correct.

VirtualList supports fixed, known-variable, and measured row heights. Logical scroll targets can address an index, stable item key, pixel offset, or the end. End following and stable-key anchoring cover chat, logs, and reverse infinite feeds while keeping DOM and visual row order aligned.

:::Info{label="See it in an app"}
Check out how VirtualList is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/virtualList.ts).
:::

## Example

Items live in your Model and pass through `ViewConfig.items` on each render. Each item must have a stable `itemToKey`; VirtualList uses that identity for VDOM reconciliation, key-based scrolling, measurement caching, and viewport anchoring.

### Basic

Every row uses the same height, configured through `rowHeightPx`. Prefer this path when row heights are stable.

::Demo{name="fixed"}

::Snippet{name="uiVirtualListBasic" label="Fixed-height VirtualList"}

### Known variable heights

Pass `itemToRowHeightPx` when the application already knows each row's exact height. VirtualList computes cumulative offsets for the visible slice and spacers.

::Demo{name="variable"}

::Snippet{name="uiVirtualListVariable" label="Known variable-height VirtualList"}

## End-anchored dynamic heights

For chat, logs, and reverse infinite feeds, combine an initial `End` target, `followEnd`, `contentAlignment: 'End'`, and `dynamicRowHeights`. The chat demo below shows these options together.

### Anchoring and measurement

Dynamic mode treats `rowHeightPx` as the default estimate. Rendered rows are measured with `ResizeObserver`. Keep the stable-key and height-estimate functions stable across renders so VirtualList can reuse row offsets as the user scrolls.

Call `informItemsChanged` in the same parent update for ordinary item changes. Appends follow the end while the user is within the configured threshold. When the user scrolls away, VirtualList preserves the visible keyed row.

### Requesting older history

Set `history` in `VirtualList.init` with a loading buffer (`reservePx`) and a prefetch distance (`prefetchViewports`). VirtualList emits `ApproachedLoadedStart` as an upward scroll nears the first loaded row. The parent owns the request, loading state, items, and fetch Command. Ignore repeated requests while a page is loading.

Choose the buffer and prefetch distance for the expected request latency and scroll speed. If a gesture reaches the end of the available scroll range before a response arrives, the browser can stop there.

### Prepending a page

In the update that prepends fetched items to the parent Model, call `informHistoryPrepended` with the complete loaded array, the new page, the same `itemToKey` function used by the view, and `HistoryPage.More()`. VirtualList extends the upward scroll range without a position write, so an ongoing gesture can continue through the new rows. The parent controls how many items remain loaded; VirtualList bounds the mounted DOM rows.

### Completing history

Pass `HistoryPage.Complete()` with the final page. VirtualList removes the loading buffer, allowing the user to reach the actual first item.

### Accessible history

Rows report their position and set size to assistive technology. The default `AccessibleSet.Loaded()` uses the number of items passed to the view. Use `AccessibleSet.Unknown()` while the total history size is unknown; it reports `aria-setsize="-1"`. If a data source provides the complete size and the first loaded item's position, use `AccessibleSet.Known({ size, firstPosition })`. The chat demo reports a known set size in finite-history mode and announces loading and completion. An application that fetches history should expose its loading and failure states alongside the list.

::Demo{name="chat"}

::Snippet{name="uiVirtualListChat" label="End-anchored dynamic-height VirtualList"}

## Programmatic scrolling

`scrollToIndex`, `scrollToKey`, `scrollToOffset`, and `scrollToEnd` all create logical scroll requests. The next view selects the target window, then the Command aligns the live rendered row or applies the live maximum offset.

An initial index, key, offset, or end target remains pending if the list mounts before its items arrive. Notify VirtualList when the parent loads the items; it applies the target once a row can be rendered. An explicit later `scrollTo` request supersedes the initial target.

Index and key helpers accept `Start`, `Center`, `End`, or `Nearest` alignment. `Nearest` leaves a fully visible row in place and otherwise reveals its closest edge. Missing keys produce no movement. Negative and oversized offsets clamp to the live scroll range.

Use `scrollToIndex` for every sizing mode; the view resolves each row's offset from its current height inputs. Replace old `scrollToIndexVariable(model, items, itemToRowHeightPx, index, options)` calls with `scrollToIndex(model, index, options)`.

Remove calls to `visibleWindow` and `visibleWindowVariable`. Those helpers no longer describe the rendered slice once a logical target, measured height, or anchor is active. Render through `VirtualList.view`, which owns the current layout and visible window.

## Lifecycle

VirtualList renders an `ObserveVirtualList` Mount on its scroll container. The Mount owns the scroll listener, container `ResizeObserver`, dynamic-row `ResizeObserver`, and descendant observation. Delete `VirtualList.subscriptions.containerEvents` from existing Subscription wiring. VirtualList no longer exports `subscriptions`, so TypeScript will identify any remaining callers.

The Mount also supplies the live container to scroll Commands, so programmatic scrolling works when VirtualList is rendered inside a shadow root. Give every mounted VirtualList a distinct `id`, including lists in separate shadow roots; a scroll Command skips if multiple mounted lists share an `id`. Observation pauses while DevTools displays a historical view.

The Mount emits `ObservedContainerScroll` with the scroll position, scroll height, container height, and visible row anchor, and `ResizedContainer` with both container dimensions. Delete manual `ScrolledContainer` and `MeasuredContainer` dispatches; the Mount supplies those observations. Update exhaustive Message matches for the new variants.

## Styling

The container needs a constrained height. Without it, the container grows to fit children and never scrolls. Use `containerClassName` or `containerAttributes` to apply that height.

The scrollable container keeps its configured `id`. Use that for selectors instead of the removed `data-virtual-list-id` attribute.

`contentAlignment: 'End'` adds a leading inset when all rows are shorter than the viewport, so an underfilled chat sits against the bottom. History-enabled lists use bottom-origin scrolling, which lets prepended rows extend the upward range while the current viewport stays in place. When a row size change would move the visible anchor, VirtualList corrects its position by stable key.

| Attribute                          | Condition                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `data-virtual-list-item-key`       | Present on each rendered row and carries its stable key.                            |
| `data-virtual-list-item-index`     | Present on each rendered row and carries its zero-based logical index.              |
| `data-virtual-list-measure`        | Present on rows rendered with `dynamicRowHeights`.                                  |
| `data-virtual-list-layout-version` | Present on dynamically measured rows so stale measurement callbacks can be ignored. |

## Accessibility

The container is a `<ul>` and each row defaults to `<li>`. Spacer rows carry `role="presentation"`. Rendered rows carry `aria-setsize` and `aria-posinset`, so assistive technology receives the logical position and full list size even though only a window is mounted.

History-enabled lists use `flex-direction: column-reverse` with explicit row ordering. Their visual order matches DOM, keyboard, and assistive-technology order.

## API Reference

### InitConfig {#init-config}

| Name               | Type                                                    | Default | Description                                                                                                                              |
| ------------------ | ------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | `string`                                                | —       | ID applied to the scroll container and used by scroll Commands; unique across all mounted VirtualLists, including separate shadow roots. |
| `rowHeightPx`      | `number`                                                | —       | Fixed row height, or the fallback estimate in dynamic mode.                                                                              |
| `initialScroll`    | `{ target: ScrollTarget; alignment?: ScrollAlignment }` | —       | Logical initial position applied after the first container measurement.                                                                  |
| `initialScrollTop` | `number`                                                | `0`     | Compatibility alias for an initial pixel-offset target. `initialScroll` takes precedence when both are given.                            |
| `followEnd`        | `{ thresholdPx?: number }`                              | —       | Keeps an End anchor while the viewport remains within the threshold. The default threshold is `1`.                                       |
| `history`          | `{ reservePx: number; prefetchViewports: number }`      | —       | Enables upward history loading. Adds a loading buffer before the first loaded row and emits `ApproachedLoadedStart` near it.             |

### ViewConfig {#view-config}

| Name                         | Type                                    | Default   | Description                                                                 |
| ---------------------------- | --------------------------------------- | --------- | --------------------------------------------------------------------------- |
| `items`                      | `ReadonlyArray<Item>`                   | —         | Full parent-owned item array.                                               |
| `itemToKey`                  | `(item: Item, index: number) => string` | —         | Stable identity used by rendering, key targets, measurement, and anchoring. |
| `itemToView`                 | `(item: Item, index: number) => Html`   | —         | Renders one row's content.                                                  |
| `itemToRowHeightPx`          | `(item: Item, index: number) => number` | —         | Exact known height for each row.                                            |
| `dynamicRowHeights`          | `true`                                  | —         | Measures rendered rows. Do not combine with `itemToRowHeightPx`.            |
| `itemToEstimatedRowHeightPx` | `(item: Item, index: number) => number` | —         | Optional per-item estimate in dynamic mode; falls back to `rowHeightPx`.    |
| `contentAlignment`           | `'Start' \| 'End'`                      | `'Start'` | Aligns an underfilled list within the viewport.                             |
| `overscan`                   | `number`                                | `5`       | Rows mounted before and after the visible window.                           |
| `rowElement`                 | `Exclude<TagName, 'textarea'>`          | `'li'`    | Element used for row wrappers.                                              |
| `containerClassName`         | `string`                                | —         | CSS class for the scroll container.                                         |
| `containerAttributes`        | `ReadonlyArray<ChildAttribute>`         | —         | Additional container attributes.                                            |

### History loading

`ApproachedLoadedStart` includes the distance to the first loaded row and container height. Use it to start a parent-owned fetch when one is not already in progress. Call `informHistoryPrepended` in the same update that puts the fetched rows in the parent Model. Pass `{ items, prependedItems, itemToKey, page }`, using the same stable key function as the view. Pass `HistoryPage.Complete()` on the last page so the real beginning becomes reachable.

### ScrollTarget {#scroll-target}

| Variant  | Description                                                     |
| -------- | --------------------------------------------------------------- |
| `Index`  | Targets a logical item index, clamped to the nearest list edge. |
| `Key`    | Targets the item with a matching stable key.                    |
| `Offset` | Targets a pixel offset from the logical start of the list.      |
| `End`    | Targets the live maximum scroll offset.                         |

### ScrollAlignment {#scroll-alignment}

| Value     | Behavior                                                                |
| --------- | ----------------------------------------------------------------------- |
| `Start`   | Places the row at the start of the viewport. This is the default.       |
| `Center`  | Centers the row in the viewport.                                        |
| `End`     | Places the row at the end of the viewport.                              |
| `Nearest` | Keeps a fully visible row in place; otherwise reveals its closest edge. |
