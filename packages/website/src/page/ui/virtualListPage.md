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

::Snippet{name="uiVirtualListBasic" label="virtual list example"}

### Known variable heights

Pass `itemToRowHeightPx` when the application already knows each row's exact height. VirtualList computes cumulative offsets for the visible slice and spacers.

::Demo{name="variable"}

::Snippet{name="uiVirtualListVariable" label="variable-height virtual list example"}

### End-anchored dynamic heights

For chat, logs, and reverse infinite feeds, combine an initial `End` target, `followEnd`, `contentAlignment: 'End'`, and `dynamicRowHeights`. Rows remain in logical DOM order with ordinary nonnegative `scrollTop` coordinates.

Dynamic mode treats `rowHeightPx` as the default estimate. Rendered rows are measured with `ResizeObserver`; when estimates change, VirtualList corrects the scroll position around the stored stable-key anchor. Call `informItemsChanged` in the same parent update that appends, prepends, removes, or reorders items. Appends follow the end only while the user remains within the configured threshold. Once they scroll away, their visible anchor is preserved instead.

::Demo{name="chat"}

::Snippet{name="uiVirtualListChat" label="end-anchored dynamic-height list"}

## Programmatic scrolling

`scrollToIndex`, `scrollToKey`, `scrollToOffset`, and `scrollToEnd` all create logical scroll requests. The next view selects the target window, then the Command aligns the live rendered row or applies the live maximum offset.

Index and key helpers accept `Start`, `Center`, `End`, or `Nearest` alignment. `Nearest` leaves a fully visible row in place and otherwise reveals its closest edge. Missing keys produce no movement. Negative and oversized offsets clamp to the live scroll range.

`scrollToIndexVariable` remains as a compatibility alias. New code can use `scrollToIndex` for every sizing mode because the view now owns offset resolution.

## Lifecycle

VirtualList renders an `ObserveVirtualList` Mount on its scroll container. The Mount owns the scroll listener, container `ResizeObserver`, dynamic-row `ResizeObserver`, and descendant observation. Apps no longer need to wire a VirtualList Subscription. The deprecated `subscriptions.containerEvents` entry remains as a no-op so existing aggregate subscription records can migrate without a coordinated break.

## Styling

The container needs a constrained height. Without it, the container grows to fit children and never scrolls. Use `containerClassName` or `containerAttributes` to apply that height.

`contentAlignment: 'End'` adds a leading inset when all rows are shorter than the viewport, so an underfilled chat sits against the bottom. VirtualList disables native CSS scroll anchoring because its stable-key correction owns that behavior.

| Attribute                          | Condition                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| `data-virtual-list-id`             | Present on the scrollable container and carries the `InitConfig.id`.                 |
| `data-virtual-list-item-key`       | Present on each rendered row and carries its stable key.                             |
| `data-virtual-list-item-index`     | Present on each rendered row and carries its zero-based logical index.               |
| `data-virtual-list-measure`        | Present on rows rendered with `dynamicRowHeights`.                                   |
| `data-virtual-list-layout-version` | Identifies the item layout generation so stale measurement callbacks can be ignored. |

## Accessibility

The container is a `<ul>` and each row defaults to `<li>`. Spacer rows carry `role="presentation"`. Rendered rows carry `aria-setsize` and `aria-posinset`, so assistive technology receives the logical position and full list size even though only a window is mounted.

End anchoring never uses `flex-direction: column-reverse`; visual, DOM, keyboard, and assistive-technology order remain the same.

## API Reference

### InitConfig {#init-config}

| Name               | Type                                                    | Default | Description                                                                                                   |
| ------------------ | ------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `id`               | `string`                                                | —       | Unique ID applied to the scroll container and used by scroll Commands.                                        |
| `rowHeightPx`      | `number`                                                | —       | Fixed row height, or the fallback estimate in dynamic mode.                                                   |
| `initialScroll`    | `{ target: ScrollTarget; alignment?: ScrollAlignment }` | —       | Logical initial position applied after the first container measurement.                                       |
| `initialScrollTop` | `number`                                                | `0`     | Compatibility alias for an initial pixel-offset target. `initialScroll` takes precedence when both are given. |
| `followEnd`        | `{ thresholdPx?: number }`                              | —       | Keeps an End anchor while the viewport remains within the threshold. The default threshold is `1`.            |

### ViewConfig {#view-config}

| Name                  | Type                                                       | Default   | Description                                                                                                     |
| --------------------- | ---------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------- |
| `items`               | `ReadonlyArray<Item>`                                      | —         | Full parent-owned item array.                                                                                   |
| `itemToKey`           | `(item: Item, index: number) => string`                    | —         | Stable identity used by rendering, key targets, measurement, and anchoring.                                     |
| `itemToView`          | `(item: Item, index: number) => Html`                      | —         | Renders one row's content.                                                                                      |
| `itemToRowHeightPx`   | `(item: Item, index: number) => number`                    | —         | Exact known height for each row.                                                                                |
| `dynamicRowHeights`   | `{ itemToEstimatedRowHeightPx?: (item, index) => number }` | —         | Measures rendered rows. Per-item estimates fall back to `rowHeightPx`. Do not combine with `itemToRowHeightPx`. |
| `contentAlignment`    | `'Start' \| 'End'`                                         | `'Start'` | Aligns an underfilled list within the viewport.                                                                 |
| `overscan`            | `number`                                                   | `5`       | Rows mounted before and after the visible window.                                                               |
| `rowElement`          | `Exclude<TagName, 'textarea'>`                             | `'li'`    | Element used for row wrappers.                                                                                  |
| `containerClassName`  | `string`                                                   | —         | CSS class for the scroll container.                                                                             |
| `containerAttributes` | `ReadonlyArray<ChildAttribute>`                            | —         | Additional container attributes.                                                                                |

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
