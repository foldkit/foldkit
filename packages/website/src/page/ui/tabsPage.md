# Tabs

## Overview

Tab panel navigation with roving tabindex keyboard support, horizontal and vertical orientation, and automatic or manual activation modes. Tabs renders a tab list with buttons and corresponding panels. Only the active panel is visible.

### State Ownership and Completed Type

`Tabs.makeBlock()` and Blocks returned by `Tabs.makeBlock` keep their own keyboard-focus state, but the parent owns the active tab. Store the active value in your Model, pass it in as `selectedValue`, and fold the `Selected` OutMessage back into that field through the Binding’s selected `fold` policy.

What `Tabs.makeBlock<Value>()` returns is typed [`Completed<Value>` from `@foldkit/ui/tabs`](/ui/selection-blocks#completed-type), for cases where a created Block has to be named.

:::Info{label="See it in an app"}
Check out how Tabs is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/tabs.ts).
:::

:::Info{label="Each item its own URL?"}
Tabs switches content within one page and applies the `tablist`/`tab`/`tabpanel` roles. For URL-driven navigation where each section has its own URL, reach for [Nav](/ui/nav), which uses `aria-current="page"` instead.
:::

## Examples

### Horizontal

Declare the tabs component once at module scope with `Tabs.makeBlock<Value>()` to lift the tab type through `view` and `update` without casting. Pass the typed `tabs` array and a `toView` callback that receives one `TabInfo<Value>` per tab (with attribute bundles for the tab button and its panel).

::Demo{name="horizontal"}

::Snippet{name="uiTabsBasic" label="Tabs"}

### Vertical

Pass `orientation: 'Vertical'` to switch to up/down arrow navigation.

::Demo{name="vertical"}

::Snippet{name="uiTabsVertical" label="Vertical tabs"}

## Styling

Tabs is headless. The `toView` callback owns all tab and panel markup, spreading the attribute bundles from each `TabInfo` onto the consumer's elements. A common styling trick is to use a negative margin (`mb-[-1px]` for horizontal, `mr-[-1px]` for vertical) on the active tab to overlap the panel border.

| Attribute       | Condition                                       |
| --------------- | ----------------------------------------------- |
| `data-selected` | Present on the active tab button and its panel. |
| `data-disabled` | Present on disabled tab buttons.                |

## Keyboard Interaction

Tabs uses roving tabindex: only the focused tab is in the tab order. Arrow direction depends on orientation: left/right for horizontal, up/down for vertical. Disabled tabs are skipped during navigation.

| Key                  | Description                                                            |
| -------------------- | ---------------------------------------------------------------------- |
| `Arrow Right / Down` | Move to the next tab. In Automatic mode, also selects it.              |
| `Arrow Left / Up`    | Move to the previous tab. In Automatic mode, also selects it.          |
| `Home`               | Move to the first tab.                                                 |
| `End`                | Move to the last tab.                                                  |
| `Enter / Space`      | Select the focused tab (Manual mode only; Automatic selects on focus). |

## Accessibility

The tab list receives `role="tablist"` with `aria-orientation` and `aria-label`. Each tab button gets `role="tab"` with `aria-selected`. It receives `aria-controls` when its panel is mounted, so the relationship never points at a missing panel. Panels receive `role="tabpanel"` with `aria-labelledby` pointing back to the tab. The default `panelMount: 'ActiveOnly'` fits views that render only the active panel. Set `panelMount: 'All'` when your view keeps every panel mounted and hides inactive ones.

## API Reference

### InitConfig {#init-config}

Configuration passed to the Binding for the completed Block returned by `Tabs.makeBlock<Tab>()`.

| Name             | Type                      | Default       | Description                                                                                                                      |
| ---------------- | ------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | `string`                  | —             | Unique ID for the tabs instance.                                                                                                 |
| `activationMode` | `'Automatic' \| 'Manual'` | `'Automatic'` | In Automatic mode, arrow keys select tabs on focus. In Manual mode, arrow keys focus only. Enter or Space is required to select. |

### ViewInputs {#view-config}

Pass the child Model as `model` and these fields as `viewInputs` to the composed Binding's `embedView` method. The Binding supplies the canonical view, Message wrapper, and composition scope. Keep callback fields at the top level, and spread the published `ChildAttribute` groups unchanged; see [Callback dispatch boundaries](/core/block#callback-dispatch-boundaries).

| Name            | Type                                       | Default        | Description                                                                                                                                                                                                                                     |
| --------------- | ------------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tabs`          | `ReadonlyArray<Value>`                     | —              | The list of tab values, in display order. When the tabs component is declared via `Tabs.makeBlock<MyUnion>()`, `Value` is your union type and each `TabInfo.value` is typed as `MyUnion`.                                                       |
| `selectedValue` | `Value`                                    | —              | The active tab, owned by the parent Model and passed back in on each render. `aria-selected`, the `data-selected` marker, the active panel, and `RenderInfo.activeIndex` all derive from it. Update it in the Binding's selected `fold` policy. |
| `ariaLabel`     | `string`                                   | —              | Accessible label for the tab list.                                                                                                                                                                                                              |
| `toView`        | `(render: RenderInfo<Value>) => Html`      | —              | Callback that receives the `tablist` attribute bundle, one `TabInfo<Value>` per tab, and the current `activeIndex`. Returns the composed layout.                                                                                                |
| `isTabDisabled` | `(value: Value, index: number) => boolean` | —              | Disables individual tabs.                                                                                                                                                                                                                       |
| `orientation`   | `'Horizontal' \| 'Vertical'`               | `'Horizontal'` | Controls arrow key direction and `aria-orientation`. Horizontal uses left/right, vertical uses up/down.                                                                                                                                         |
| `panelMount`    | `'ActiveOnly' \| 'All'`                    | `'ActiveOnly'` | Describes whether `toView` renders only the active panel or keeps every panel mounted. With `All`, every tab receives `aria-controls` for its mounted panel.                                                                                    |

### RenderInfo {#render-info}

Payload delivered to the `toView` callback each render.

| Name          | Type                            | Default | Description                                                                                                                                       |
| ------------- | ------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tablist`     | `ReadonlyArray<ChildAttribute>` | —       | Spread onto the tab list container. Includes `role="tablist"`, `aria-orientation`, and `aria-label`.                                              |
| `tabs`        | `ReadonlyArray<TabInfo<Value>>` | —       | One entry per tab in `ViewInputs.tabs`, in the same order. See TabInfo below.                                                                     |
| `activeIndex` | `number`                        | —       | The currently-active tab index. Convenient when the consumer wants to render only the active panel (vs all panels with `hidden` for transitions). |

### TabInfo {#tab-info}

Each entry in `RenderInfo.tabs`. Carries the value, derived state flags, and attribute bundles for the tab button and its panel.

| Name         | Type                            | Default | Description                                                                                                                                                                                 |
| ------------ | ------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`      | `Value`                         | —       | The tab value. Typed as your `Value` union when the tabs component is declared via `Tabs.makeBlock<Value>()`.                                                                               |
| `index`      | `number`                        | —       | Position in the `tabs` array.                                                                                                                                                               |
| `isActive`   | `boolean`                       | —       | Whether this tab is currently active.                                                                                                                                                       |
| `isFocused`  | `boolean`                       | —       | Whether this tab owns the roving tabindex (the one in the tab order).                                                                                                                       |
| `isDisabled` | `boolean`                       | —       | Whether this tab is disabled via `isTabDisabled`.                                                                                                                                           |
| `tab`        | `ReadonlyArray<ChildAttribute>` | —       | Spread onto the tab button element. Includes `role="tab"`, `type="button"`, `aria-selected`, `tabindex`, the click handler, and the keyboard handler. `aria-controls` follows `panelMount`. |
| `panel`      | `ReadonlyArray<ChildAttribute>` | —       | Spread onto the tab panel element. Includes `role="tabpanel"`, `aria-labelledby` pointing back to the tab, and `tabindex`.                                                                  |

### OutMessage {#out-message}

Messages emitted to the parent through the optional `outMessage` field. Handle the OutMessage in the Binding’s selected `fold` policy.

| Name       | Type                              | Default | Description                                                                                                                                                                                                       |
| ---------- | --------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Selected` | `{ value: Value; index: number }` | —       | Emitted when a tab is committed via click or keyboard. Carries both the tab’s value (typed as your `Value` union via `Tabs.makeBlock<Value>()`) and its index. Handle it in the Binding's selected `fold` policy. |
