# VirtualList

## Overview

A virtualization component for large lists. Only items inside the viewport plus an overscan buffer are mounted. Spacer divs above and below the visible slice keep the scrollbar physically correct. The demo below manages ten thousand items; only the rows currently visible exist in the DOM.

:::Info{label="See it in an app"}
Check out how VirtualList is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/virtualList.ts).
:::

## Example

Items live in your Model, not the component, and pass through `ViewConfig.items` on each render. The parent owns the data and can swap, filter, sort, or paginate freely without sending Messages to the list. Each item must be keyed via `itemToKey` so the VDOM matches rows by data identity, not by position, when the visible slice shifts.

### Basic

Every row uses the same height, configured at init through `rowHeightPx`. The component divides scroll math by that constant. Prefer this path when row heights are stable.

::Demo{name="fixed"}

::Snippet{name="uiVirtualListBasic" label="virtual list example"}

### Variable row heights

Pass an `itemToRowHeightPx` callback on `ViewConfig` and rows take the height the callback returns for each item. The component walks the items at render time to compute cumulative offsets for the visible slice and the spacers. Use this for tables with wrapping cells, taller detail rows, or any list where heights differ.

Programmatic scrolling for variable-height lists uses `scrollToIndexVariable`, which walks the heights to compute the target `scrollTop`. Pass the same `items` and `itemToRowHeightPx` you pass to `view` so the math agrees.

::Demo{name="variable"}

::Snippet{name="uiVirtualListVariable" label="variable-height virtual list example"}

## Subscriptions

VirtualList exposes a single subscription, `containerEvents`, that listens for `scroll` events on the container and observes its size with `ResizeObserver`. Wire it into your app's subscriptions alongside the rest of the framework subscriptions.

## Styling

The container needs a constrained height for virtualization to work. Without it, the container grows to fit children and never scrolls. Pass `className` or `attributes` on `ViewConfig` to apply the height through your styling system. The component sets only `overflow: auto` inline; the rest is yours.

VirtualList exposes two data attributes for styling and test selectors: `data-virtual-list-id` on the scrollable container and `data-virtual-list-item-index` on each rendered row.

| Attribute                      | Condition                                                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-virtual-list-id`         | Present on the scrollable container. Carries the id from InitConfig so subscriptions and tests can find the right element.                                  |
| `data-virtual-list-item-index` | Present on each rendered row wrapper. Carries the data index of the item being rendered (0-based) so tests and consumer styling can address a specific row. |

## Accessibility

The container is rendered as `<ul>` and each row as `<li>`. The top and bottom spacer `<li>` elements carry `role="presentation"` so they do not contribute to the list. Each rendered row carries `aria-setsize` (total item count) and `aria-posinset` (1-based logical position), so screen readers announce "row 5,234 of 10,000" rather than the much smaller count of mounted rows. No consumer wiring required.

## API Reference

### InitConfig {#init-config}

Configuration object passed to `VirtualList.init()`.

| Name               | Type     | Default | Description                                                                                                                                                           |
| ------------------ | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | `string` | —       | Unique ID for the virtual list instance. Applied to the scrollable container and used by the subscription to attach scroll and resize listeners.                      |
| `rowHeightPx`      | `number` | —       | Height in pixels of every row. All rows share this height; the value drives spacer math, slice math, and the inline height on row wrappers.                           |
| `initialScrollTop` | `number` | `0`     | Initial scroll position in pixels. When non-zero, the first MeasuredContainer message issues an apply-scroll Command so the DOM and model agree from the first frame. |

### ViewConfig {#view-config}

Configuration object passed to `VirtualList.view()`.

| Name                  | Type                                         | Default | Description                                                                                                                                                                                                                                                                                                |
| --------------------- | -------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`               | `VirtualList.Model`                          | —       | The virtual list state from your parent Model.                                                                                                                                                                                                                                                             |
| `items`               | `ReadonlyArray<Item>`                        | —       | The full item array. Items live in your Model, not the component's; pass them fresh on each render. Swap, filter, sort, or paginate freely without sending Messages to the list.                                                                                                                           |
| `itemToKey`           | `(item: Item, index: number) => string`      | —       | Returns a stable identifier for an item. Used to key rendered rows so the VDOM matches by data identity rather than by position when the visible slice shifts.                                                                                                                                             |
| `itemToView`          | `(item: Item, index: number) => Html`        | —       | Renders one row's contents. The framework wraps your output in a row-height grid container; use flex or grid with align-items: center inside to vertically center your content.                                                                                                                            |
| `itemToRowHeightPx`   | `(item: Item, index: number) => number`      | —       | Optional. When provided, the list renders with variable-height rows: each row wrapper takes the height returned for its item, and slice and spacer math walks the items to compute cumulative offsets. When absent, every row uses model.rowHeightPx. Prefer the uniform path when row heights are stable. |
| `overscan`            | `number`                                     | `5`     | Number of rows mounted above and below the visible viewport. Higher values can make fast scrolling smoother at the cost of mounting more DOM. Choose a value that suits the row mount cost.                                                                                                                |
| `rowElement`          | `Exclude<TagName, 'textarea'>`               | `'li'`  | HTML tag for each row wrapper. Textarea is excluded because each row wrapper renders a child. Defaults to li (since the container is rendered as ul). Override only when you also wrap the list in something whose children aren't expected to be li.                                                      |
| `containerClassName`  | `string \| undefined`                        | —       | CSS class applied to the scrollable container. The container needs a constrained height (e.g. h-96) for virtualization to work.                                                                                                                                                                            |
| `containerAttributes` | `ReadonlyArray<ChildAttribute> \| undefined` | —       | Additional attributes spread onto the scrollable container. Pass extra Style({...}) entries for CSS like overscroll-behavior or scroll-margin, data attributes, or any other ChildAttribute.                                                                                                               |
