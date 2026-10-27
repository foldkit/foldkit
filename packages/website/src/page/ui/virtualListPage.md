# VirtualList

## Overview

VirtualList renders large lists by mounting only items inside the viewport plus an overscan buffer. It preserves the full content height so the scroll range still covers every item.

VirtualList supports fixed, known-variable, and measured row heights. Logical scroll targets can address an index, stable item key, pixel offset, or the end. End following and stable-key anchoring cover chat, logs, and reverse infinite feeds while keeping DOM and visual row order aligned.

Create a typed completed Block once at module scope with `VirtualList.create<Item>()`, then connect it in the parent.

:::Info{label="See it in an app"}
Check out how VirtualList is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/virtualList.ts).
:::

## Example

Items live in your Model and pass through `ViewInputs.items` on each render. Each item must have a stable `itemToKey`; VirtualList uses that identity for VDOM reconciliation, key-based scrolling, measurement caching, and viewport anchoring.

### Basic

Every row uses the same height, configured through `rowHeightPx`. Prefer this path when row heights are stable.

::Demo{name="fixed"}

::Snippet{name="uiVirtualListBasic" label="Fixed-height VirtualList"}

### Known variable heights

Pass `itemToRowHeightPx` when the application already knows each row's exact height. VirtualList computes cumulative offsets for the visible slice and spacers.

::Demo{name="variable"}

::Snippet{name="uiVirtualListVariable" label="Known variable-height VirtualList"}

## Scroll containers and row layouts

VirtualList observes its own scroll container by default. Set `scrollContainer` in the Binding’s init configuration when the list belongs inside an existing scrolling region or uses page scrolling:

- `ScrollContainer.Self()` keeps scrolling on the list itself. Constrain its height through `containerClassName` or `containerAttributes`.
- `ScrollContainer.Ancestor({ selector })` selects the nearest matching ancestor, starting at the list’s parent. The parent owns that element’s height and overflow styles.
- `ScrollContainer.Window()` uses the page viewport and document scrolling.

For an external scroll container, VirtualList measures the list’s position within that viewport. Content before the list contributes to its position. Scrolling operations target the selected owner, and VirtualList preserves the owner’s layout and overflow styles. The `ObservedContainerScroll` OutMessage reports offsets relative to the list; its `scrollTop` can be negative while the list begins below the viewport’s top edge.

### Page scrolling with absolute rows

`rowLayout: 'Spacers'` is the default. Spacer elements above and below the mounted rows preserve the full content height. Use `rowLayout: 'Absolute'` to position each mounted row at its logical offset inside a surface with the full content height. Both layouts support fixed, known-variable, and measured row heights.

The following list uses page scrolling and absolute row positioning. The parent renders the section heading and button, and VirtualList renders the list surface.

::Snippet{name="uiVirtualListExternalAbsolute" label="Page scrolling with absolute rows"}

### Supported combinations

Ordinary lists use a `ul`, `ol`, or `div` surface. Native table rendering uses `tbody`.

| Scroll container       | Row elements      | Row layout              | History loading |
| ---------------------- | ----------------- | ----------------------- | --------------- |
| `Self`                 | Ordinary rows     | `Spacers` or `Absolute` | Disabled        |
| `Ancestor` or `Window` | Ordinary rows     | `Spacers` or `Absolute` | Disabled        |
| `Ancestor` or `Window` | Native table rows | `Spacers`               | Disabled        |
| `Self`                 | Ordinary rows     | `Spacers`               | Enabled         |

History loading requires the list’s own scroll container and spacer layout. Native table rows require an external scroll container and spacer layout.

## Native tables

The parent renders the `<table>`, caption, column definitions, and header. VirtualList renders a `<tbody>` containing the mounted `<tr>` elements and spacer rows. Set `containerElement: 'tbody'`, `rowElement: 'tr'`, and a positive integer `tableColumns` matching the table’s column count. Each spacer row contains a cell that spans those columns.

Return the row’s cells from `itemToView`, as one Html value or an array of Html values. Do not return another `<tr>`; VirtualList owns that wrapper. Use `itemToAttributes` for attributes on the row wrapper, including application-owned `aria-rowindex` values. The parent also owns `aria-rowcount` on the table and must include header rows in those counts.

The following table has one header row, so invoice rows start at `aria-rowindex="2"`. Its scrolling ancestor constrains the height, and fixed column widths keep headers and mounted cells aligned.

::Snippet{name="uiVirtualListNativeTable" label="Native table with a scrolling ancestor"}

## End-anchored dynamic heights

For chat, logs, and reverse infinite feeds, combine an initial `End` target, `followEnd`, `contentAlignment: 'End'`, and `dynamicRowHeights`. The chat demo below shows these options together.

### Anchoring and measurement

Dynamic mode treats `rowHeightPx` as the default estimate. Rendered rows are measured with `ResizeObserver`. Keep the stable-key and height-estimate functions stable across renders so VirtualList can reuse row offsets as the user scrolls.

Call the Binding’s `informItemsChanged` operation in the same parent update for ordinary item changes. Appends follow the end while the user is within the configured threshold. When the user scrolls away, VirtualList preserves the visible keyed row.

### Requesting older history

Set `history` in the VirtualList Binding’s init configuration with a loading buffer (`reservePx`) and a prefetch distance (`prefetchViewports`). VirtualList emits an `ApproachedLoadedStart` OutMessage as an upward scroll nears the first loaded row. The parent owns the request, loading state, items, and fetch Command. Ignore repeated requests while a page is loading.

Choose the buffer and prefetch distance for the expected request latency and scroll speed. If a gesture reaches the end of the available scroll range before a response arrives, the browser can stop there.

### Prepending a page

In the update that prepends fetched items to the parent Model, call the Binding’s `informHistoryPrepended` operation with the complete loaded array, the new page, the same `itemToKey` function used by the view, and `HistoryPage.More()`. VirtualList extends the upward scroll range without a position write, so an ongoing gesture can continue through the new rows. The parent controls how many items remain loaded; VirtualList bounds the mounted DOM rows.

### Completing history

Pass `HistoryPage.Complete()` with the final page. VirtualList removes the loading buffer, allowing the user to reach the actual first item.

### Accessible history

Rows report their position and set size to assistive technology. The default `AccessibleSet.Loaded()` uses the number of items passed to the view. Use `AccessibleSet.Unknown()` while the total history size is unknown; it reports `aria-setsize="-1"`. If a data source provides the complete size and the first loaded item's position, use `AccessibleSet.Known({ size, firstPosition })`. The chat demo reports a known set size in finite-history mode and announces loading and completion. An application that fetches history should expose its loading and failure states alongside the list.

::Demo{name="chat"}

::Snippet{name="uiVirtualListChat" label="End-anchored dynamic-height VirtualList"}

## Programmatic scrolling

### Choose a target

The Binding’s `requestScrollToIndex`, `requestScrollToKey`, `requestScrollToOffset`, and `requestScrollToEnd` operations return logical scroll requests. The next view selects the target window, then the Command aligns the live rendered row or applies the live maximum offset.

An initial index, key, offset, or end target remains pending if the list mounts before its items arrive. Notify VirtualList when the parent loads the items; it applies the target once a row can be rendered. A later scrolling operation supersedes the initial target.

Index and key operations accept `Start`, `Center`, `End`, or `Nearest` alignment. `Nearest` leaves a fully visible row in place and otherwise reveals its closest edge. Missing keys produce no movement. Negative and oversized pixel offsets clamp to the list’s live scroll range. With an external owner, `End` aligns the list’s end rather than the end of the page or ancestor; content after the list remains outside that target.

Use the same scrolling operations for every sizing mode. The VirtualList Block’s canonical view resolves each row’s offset from its current height inputs. While dynamic measurements settle, VirtualList retains the logical target so updated estimates do not leave End or row alignment short. Native scrolling or an ordinary item change releases a settled target; `followEnd` remains a separate option.

## Lifecycle

### Observe the container

VirtualList renders an `ObserveVirtualList` Mount on its list element. The Mount owns the scroll listener, container `ResizeObserver`, dynamic-row `ResizeObserver`, and descendant observation. Delete `VirtualList.subscriptions.containerEvents` from existing Subscription wiring. VirtualList no longer exports `subscriptions`, so TypeScript will identify any remaining callers.

### Run scroll Commands

The Mount also supplies the live list and its selected scroll owner to scroll Commands, so programmatic scrolling works when VirtualList is rendered inside a shadow root. Give every mounted VirtualList a distinct `id`, including lists in separate shadow roots; a scroll Command skips if multiple mounted lists share an `id`. Observation pauses while DevTools displays a historical view. External position observation covers preceding content resizing, insertion, removal and style changes. It does not continuously sample CSS animations that move content without changing its size.

### Handle observations

The Mount reports the scroll position and container dimensions through the Block’s Messages. The Binding routes those Messages to the child update. Handle the `ObservedContainerScroll`, `ApproachedLoadedStart`, and `EndedContainerScroll` OutMessages in the parent’s exhaustive OutMessage policy.

## Styling

### Constrain the container

With `ScrollContainer.Self()`, the container needs a constrained height. Without it, the container grows to fit children and never scrolls. Use `containerClassName` or `containerAttributes` to apply that height. For `Ancestor`, constrain the ancestor instead; `Window` uses the page viewport.

### Select the container

The configured `id` stays on the Self viewport or, with external scrolling, the list surface. Self absolute layout adds an inner content surface while keeping the `id` and container attributes on the outer viewport. Use that for selectors instead of the removed `data-virtual-list-id` attribute.

Keep VirtualList’s surface padding, row sizing and positioning intact. Use classes for decoration; a replacement Style attribute can overwrite the inline geometry styles.

### Align short lists

`contentAlignment: 'End'` adds a leading inset when all rows are shorter than the viewport, so an underfilled chat sits against the bottom. History-enabled lists use bottom-origin scrolling, which lets prepended rows extend the upward range while the current viewport stays in place. When a row size change would move the visible anchor, VirtualList corrects its position by stable key.

| Attribute                          | Condition                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `data-virtual-list-item-key`       | Present on each rendered row and carries its stable key.                            |
| `data-virtual-list-item-index`     | Present on each rendered row and carries its zero-based logical index.              |
| `data-virtual-list-measure`        | Present on rows rendered with `dynamicRowHeights`.                                  |
| `data-virtual-list-layout-version` | Present on dynamically measured rows so stale measurement callbacks can be ignored. |

## Accessibility

The container defaults to `<ul>` and each row defaults to `<li>`. Ordinary rows retain list semantics when configured with another supported element. Ordinary spacer rows carry `role="presentation"`. Table spacer rows carry `aria-hidden="true"`. Ordinary rendered rows carry `aria-setsize` and `aria-posinset`, so assistive technology receives each row’s logical position and the declared set size even though only a window is mounted.

History-enabled lists use `flex-direction: column-reverse` with explicit row ordering. Their visual order matches DOM, keyboard, and assistive-technology order.

## API Reference

### InitConfig {#init-config}

| Name               | Type                                                    | Default                  | Description                                                                                                                              |
| ------------------ | ------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | `string`                                                | —                        | ID applied to the scroll container and used by scroll Commands; unique across all mounted VirtualLists, including separate shadow roots. |
| `rowHeightPx`      | `number`                                                | —                        | Fixed row height, or the fallback estimate in dynamic mode.                                                                              |
| `initialScroll`    | `{ target: ScrollTarget; alignment?: ScrollAlignment }` | —                        | Logical initial position applied after the first container measurement.                                                                  |
| `initialScrollTop` | `number`                                                | `0`                      | Compatibility alias for an initial pixel-offset target. `initialScroll` takes precedence when both are given.                            |
| `followEnd`        | `{ thresholdPx?: number }`                              | —                        | Keeps an End anchor while the viewport remains within the threshold. The default threshold is `1`.                                       |
| `scrollContainer`  | `ScrollContainer`                                       | `ScrollContainer.Self()` | Selects the list, a matching ancestor, or the page as the scroll owner.                                                                  |
| `history`          | `{ reservePx: number; prefetchViewports: number }`      | —                        | Enables upward history loading. Adds a loading buffer before the first loaded row and emits `ApproachedLoadedStart` near it.             |

### ViewInputs {#view-config}

Pass the child Model as `model` and these fields as `viewInputs` to the VirtualList Binding's `embedView` method. The Binding supplies the canonical view, Message wrapper, and composition scope. Keep callback fields at the top level, and use `childAttributes` for handler-bearing `containerAttributes`; see [Callback dispatch boundaries](/core/block#callback-dispatch-boundaries).

| Name                         | Type                                                           | Default                  | Description                                                                                                            |
| ---------------------------- | -------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `items`                      | `ReadonlyArray<Item>`                                          | —                        | Full parent-owned item array.                                                                                          |
| `itemToKey`                  | `(item: Item, index: number) => string`                        | —                        | Stable identity used by rendering, key targets, measurement, and anchoring.                                            |
| `itemToView`                 | `(item: Item, index: number) => Html \| ReadonlyArray<Html>`   | —                        | Renders one row's content.                                                                                             |
| `itemToRowHeightPx`          | `(item: Item, index: number) => number`                        | —                        | Exact known height for each row.                                                                                       |
| `dynamicRowHeights`          | `true`                                                         | —                        | Measures rendered rows. Do not combine with `itemToRowHeightPx`.                                                       |
| `itemToEstimatedRowHeightPx` | `(item: Item, index: number) => number`                        | —                        | Optional per-item estimate in dynamic mode; falls back to `rowHeightPx`.                                               |
| `contentAlignment`           | `'Start' \| 'End'`                                             | `'Start'`                | Aligns an underfilled list within the viewport.                                                                        |
| `accessibleSet`              | `AccessibleSet`                                                | `AccessibleSet.Loaded()` | Declares the total set size and the first loaded item’s position.                                                      |
| `overscan`                   | `number`                                                       | `5`                      | Rows mounted before and after the visible window.                                                                      |
| `rowElement`                 | `Exclude<TagName, 'textarea'>`                                 | `'li'`                   | Element used for row wrappers. Use `tr` only with a `tbody` container.                                                 |
| `containerElement`           | `'ul' \| 'ol' \| 'div' \| 'tbody'`                             | `'ul'`                   | Element used for the list surface. Native table mode uses `tbody`.                                                     |
| `rowLayout`                  | `'Spacers' \| 'Absolute'`                                      | `'Spacers'`              | Preserves content height with spacers or positions rows at their offsets. Native tables and history require `Spacers`. |
| `tableColumns`               | `number`                                                       | —                        | Required positive integer column count when `containerElement` is `tbody`.                                             |
| `itemToAttributes`           | `(item: Item, index: number) => ReadonlyArray<ChildAttribute>` | —                        | Additional attributes on each row wrapper. Use `childAttributes` for event handlers.                                   |
| `containerClassName`         | `string`                                                       | —                        | CSS class for the viewport or external list surface.                                                                   |
| `containerAttributes`        | `ReadonlyArray<ChildAttribute>`                                | —                        | Attributes on the viewport or external list surface. Preserve owned geometry styles.                                   |

### History loading

The `ApproachedLoadedStart` OutMessage includes `distanceToLoadedStartPx` and `containerHeight`. Handle it in the Binding’s OutMessage policy and return a parent-owned fetch Command when a page is needed. Call the Binding’s `informHistoryPrepended` operation in the update that puts fetched rows in the parent Model. Pass `{ items, prependedItems, itemToKey, page }`, using the same stable key function as the view. Pass `HistoryPage.Complete()` on the last page so the real beginning becomes reachable.

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
