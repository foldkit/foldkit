# VirtualList

## Overview

A virtualization component for large lists. Only items inside the viewport plus an overscan buffer are mounted. Spacer rows above and below the visible slice keep the scrollbar physically correct.

VirtualList supports fixed, known-variable, and measured row heights. Logical scroll targets can address an index, stable item key, pixel offset, or the end. End following and stable-key anchoring cover chat, logs, and reverse infinite feeds without reversing DOM order or browser scroll coordinates.

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

### End-anchored dynamic heights

For chat, logs, and reverse infinite feeds, combine an initial `End` target, `followEnd`, `contentAlignment: 'End'`, and `dynamicRowHeights`. Rows remain in logical DOM order with ordinary nonnegative `scrollTop` coordinates.

Dynamic mode treats `rowHeightPx` as the default estimate. Rendered rows are measured with `ResizeObserver`; when estimates change, VirtualList corrects the scroll position around the stored stable-key anchor. Keep the key and height-estimate functions stable across renders so VirtualList can reuse row offsets while only the scroll position changes. Call `informItemsChanged` in the same parent update for ordinary item changes. Appends follow the end only while the user remains within the configured threshold. Once they scroll away, their visible anchor is preserved instead.

An initial index, key, offset, or end target remains pending if the list mounts before its items arrive. Notify VirtualList when the parent loads the items; it applies the target once a row can be rendered. An explicit later `scrollTo` request supersedes the initial target. The chat demo starts with 24 messages and loads older history as an upward scroll approaches the loaded boundary. Each batch replaces reserved space without a scroll-position write. When scrolling ends, `replenishStartPadding` restores that space while preserving the visible position before the next gesture. The demo can load consecutive batches without a fixed message limit. For a history fetch, the parent owns the request Command and calls `informItemsPrependedFromStartPadding` with the new row keys and the same height estimates used by the view. Enable `observeStartGestures` to receive `StartedScrollTowardStart` and `EndedContainerScroll`. The latter uses native `scrollend` where available and a delayed scroll-idle signal elsewhere.

The reserve is a runway for one gesture, not an estimate of all remaining history. A direct jump into it needs enough rows in the next update to fill the visible region; an asynchronous fetch must complete before the scroll reaches those rows to avoid showing a loading gap. Replenishing after `EndedContainerScroll` preserves the viewport but changes the scroll offset, so do it only after scrolling settles. When the data source reaches its actual beginning, pass `isFinalPage: true` with the last batch. VirtualList uses the reserve for that batch, then removes any unused space on the next `replenishStartPadding` call after scrolling settles. A batch larger than the remaining reserve uses ordinary keyed anchor restoration. VirtualList bounds mounted DOM rows; the parent still owns the size and lifetime of its loaded item collection.

Rows report their position and set size to assistive technology. The default `AccessibleSet.Loaded()` uses the number of items passed to the view. Use `AccessibleSet.Unknown()` while the total history size is unknown; it reports `aria-setsize="-1"`. If a data source provides the complete size and the first loaded item's position, use `AccessibleSet.Known({ size, firstPosition })`. The chat demo provides a Load older button and announces the number of older messages loaded after each scroll gesture. An application that fetches history should expose its loading and failure states alongside the list.

::Demo{name="chat"}

::Snippet{name="uiVirtualListChat" label="End-anchored dynamic-height VirtualList"}

## Programmatic scrolling

`scrollToIndex`, `scrollToKey`, `scrollToOffset`, and `scrollToEnd` all create logical scroll requests. The next view selects the target window, then the Command aligns the live rendered row or applies the live maximum offset.

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

`contentAlignment: 'End'` adds a leading inset when all rows are shorter than the viewport, so an underfilled chat sits against the bottom. VirtualList lets the browser anchor rendered rows as content above them changes, while excluding spacer rows. Its stable-key correction restores the selected row when native anchoring does not.

| Attribute                          | Condition                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `data-virtual-list-item-key`       | Present on each rendered row and carries its stable key.                            |
| `data-virtual-list-item-index`     | Present on each rendered row and carries its zero-based logical index.              |
| `data-virtual-list-measure`        | Present on rows rendered with `dynamicRowHeights`.                                  |
| `data-virtual-list-layout-version` | Present on dynamically measured rows so stale measurement callbacks can be ignored. |

## Accessibility

The container is a `<ul>` and each row defaults to `<li>`. Spacer rows carry `role="presentation"`. Rendered rows carry `aria-setsize` and `aria-posinset`, so assistive technology receives the logical position and full list size even though only a window is mounted.

End anchoring never uses `flex-direction: column-reverse`; visual, DOM, keyboard, and assistive-technology order remain the same.

## API Reference

### InitConfig {#init-config}

| Name               | Type                                                    | Default | Description                                                                                                                              |
| ------------------ | ------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | `string`                                                | —       | ID applied to the scroll container and used by scroll Commands; unique across all mounted VirtualLists, including separate shadow roots. |
| `rowHeightPx`      | `number`                                                | —       | Fixed row height, or the fallback estimate in dynamic mode.                                                                              |
| `initialScroll`    | `{ target: ScrollTarget; alignment?: ScrollAlignment }` | —       | Logical initial position applied after the first container measurement.                                                                  |
| `initialScrollTop` | `number`                                                | `0`     | Compatibility alias for an initial pixel-offset target. `initialScroll` takes precedence when both are given.                            |
| `followEnd`        | `{ thresholdPx?: number }`                              | —       | Keeps an End anchor while the viewport remains within the threshold. The default threshold is `1`.                                       |

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
