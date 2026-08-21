# Anchor

## Overview

Anchor is the positioning runtime the floating components are built on. [Listbox](/ui/listbox), [Combobox](/ui/combobox), [Menu](/ui/menu), [Popover](/ui/popover), and [Tooltip](/ui/tooltip) hand their `anchor` prop straight to it, and [Date Picker](/ui/date-picker) forwards its own through Popover. It wraps [Floating UI](https://floating-ui.com), adding the portaling, focus choreography, and styling hooks those components share.

It is exported so you can build an anchored component Foldkit does not ship. If one of the six above fits, use it. Reach for this module when the panel you need differs structurally from all of them, for example a virtualized list with group headers, or a multi-select that stages changes against an open-time baseline and commits them with a Done action.

```ts
import {
  AnchorConfig,
  Padding,
  Placement,
  anchorSetup,
  portalToContainingRoot,
} from '@foldkit/ui/anchor'
import type { SetupConfig } from '@foldkit/ui/anchor'
```

The module is also exported from the root barrel, as `import { Anchor } from '@foldkit/ui'`.

## Positioning a Panel

`anchorSetup` is a plain DOM function. It takes the element and a config, and returns a cleanup. An element exists in the rendered tree and the factory uses that element to do DOM work, so [Mount](/core/mount) is the primitive that owns it. `Mount.define` covers the one-shot acquire-with-cleanup shape.

::Snippet{name="uiAnchorBasic" label="anchored panel"}

Two details decide whether the panel behaves:

The trigger needs a stable id. `anchorSetup` resolves the button by `buttonId` through the element's own root, so a panel rendered inside a shadow root finds a trigger in that same shadow root. A document-scoped lookup would not. When the lookup misses, `anchorSetup` returns a cleanup that does nothing and never positions anything, which leaves the panel hidden with no error reported. A panel that mounts but never appears is the symptom of a `buttonId` that does not match the trigger.

The panel must start hidden. `anchorSetup` clears `visibility` after the first position resolves, which means the element is expected to render at `visibility: hidden`. Skip it and the panel paints at the top left corner for a frame before Floating UI places it.

Mount args are captured at mount, not refreshed across renders. A changed `anchor` value does not reach a running Mount, so unmount and remount the panel when the config has to change.

## Portaling

`anchorSetup` portals the panel itself. `AnchorConfig.portal` defaults to `true`, which relocates the element into a shared `foldkit-portal-root` div so it escapes any ancestor stacking context or `overflow: hidden`. Pass `portal: false` to leave the panel where it was rendered.

`portalToContainingRoot` is the same relocation as a standalone function, for the elements `anchorSetup` does not touch. A modal backdrop is the usual case: Popover portals its backdrop through a second Mount for exactly this reason. Give it its own `Mount.define`, since [one element takes one Mount](/core/mount).

The containing root is the shadow root when the app is mounted inside one, and `document.body` otherwise, so a portaled panel keeps that root's scoped styles. The portal root div is prepended rather than appended, which keeps component wrappers painting above a backdrop and leaves click-outside detection working.

## What Anchor Writes to Your Element {#managed-styles}

Anchor writes the following while the Mount is alive. Except where a row says otherwise, whatever you set is overwritten. `data-placement` and the two arrow custom properties are removed on unmount; the other inline styles are left on the element, which is normally invisible because the element unmounts with the Mount.

| Property                             | Description                                                                                                                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `left` / `top`                       | The resolved position, recomputed on scroll, resize, and layout shift.                                                                                                                                   |
| `visibility`                         | Cleared once the first position resolves. Render the element at `visibility: hidden`.                                                                                                                    |
| `max-height`                         | The height available in the viewport, so a long panel scrolls instead of overflowing. Always written, including when `arrowId` resolves and the panel scrolls through a container of your own.           |
| `overflow-y` / `overscroll-behavior` | Set to `auto` and `none`, so a scrolled panel does not chain its scroll to the page. Neither is written once `arrowId` resolves, because a scrolling panel clips on both axes and would erase the arrow. |
| `--button-width`                     | The trigger's width as a custom property. Use it to match panel width to trigger width in CSS.                                                                                                           |
| `--arrow-x` / `--arrow-y`            | The arrow's offset along the panel edge, published only when `arrowId` resolves. One axis per placement; the other is removed. Both are removed on cleanup.                                              |
| `position`                           | Set to `fixed` only inside a shadow root, where the absolute strategy mis-measures against the light-DOM host. Otherwise the element keeps the `position: absolute` you gave it.                         |
| `data-placement`                     | The side the panel currently sits on: `top`, `right`, `bottom`, or `left`. Removed on cleanup.                                                                                                           |

`data-placement` is the hook for styling by side, for example an arrow that flips with the panel. With `isPlacementLocked: true` it holds the side the first positioning picked and stays there.

## Reach for a Component First

Building on Anchor means owning the parts the components already handle: open and closed state, click-outside dismissal, Escape handling, focus return, ARIA wiring, and enter and leave animation. Anchor covers positioning and portaling, and nothing above them.

[Popover](/ui/popover) is the closest thing to a blank panel Foldkit ships. It takes arbitrary content, handles dismissal and focus, and leaves the inside to you. Check that it does not fit before writing your own.

## API Reference

### anchorSetup {#anchor-setup}

`(element: Element, config: SetupConfig) => () => void`

Positions an element against the trigger named by `config.buttonId`, portals it unless `anchor.portal` is `false`, and returns a cleanup. Call it inside `Effect.sync` in a Mount and register the cleanup with `Effect.acquireRelease`.

### AnchorConfig {#anchor-config}

Static positioning options. Every field is optional. This is the same Schema the six components accept as their `anchor` prop, and it is available as a value here rather than as a type alone.

| Name                | Type        | Default          | Description                                                                                                                                                                         |
| ------------------- | ----------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `placement`         | `Placement` | `'bottom-start'` | Preferred side and alignment. Floating UI flips to the opposite side when the preferred one does not fit, unless `isPlacementLocked` is set.                                        |
| `gap`               | `number`    | `0`              | Distance in pixels between the trigger and the panel, along the placement axis.                                                                                                     |
| `offset`            | `number`    | `0`              | Shift in pixels along the cross axis, for nudging the panel sideways from its alignment.                                                                                            |
| `padding`           | `Padding`   | `0`              | Minimum distance to the viewport edge, honored by shift, the height calculation, and flip while placement is unlocked. A number applies to all sides; an object sets them per side. |
| `portal`            | `boolean`   | `true`           | Relocates the panel into the shared portal root so it escapes ancestor clipping and stacking contexts.                                                                              |
| `isPlacementLocked` | `boolean`   | `false`          | Keeps the side the first positioning resolves, dropping flip from every later update. Use it when a panel that flips mid-interaction reads as a jump.                               |

### SetupConfig {#setup-config}

The second argument to `anchorSetup`.

| Name                 | Type           | Default | Description                                                                                                                                                                                                                                                                                                                           |
| -------------------- | -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buttonId`           | `string`       | —       | Id of the trigger to position against. Resolved through the element's own root, so it works inside a shadow root. Required.                                                                                                                                                                                                           |
| `anchor`             | `AnchorConfig` | —       | The static positioning options above. Required.                                                                                                                                                                                                                                                                                       |
| `interceptTab`       | `boolean`      | `true`  | Returns focus to the trigger when Tab is pressed inside a portaled panel. Set it to `false` when the panel holds focusable content Tab should move through.                                                                                                                                                                           |
| `focusAfterPosition` | `boolean`      | `false` | Focuses the panel once the first position resolves, deferred a frame so the element is painted first.                                                                                                                                                                                                                                 |
| `focusSelector`      | `string`       | —       | Focuses a descendant matching this selector instead of the panel itself, for example a grid inside a panel. Only read when `focusAfterPosition` is true.                                                                                                                                                                              |
| `arrowId`            | `string`       | —       | Id of an arrow element inside the panel, resolved through the element's own root. When it resolves, Anchor computes the arrow's offset along the panel edge, publishes it as `--arrow-x` and `--arrow-y`, and stops making the panel a scroll container. With no id, or an id that resolves to nothing, no arrow work happens at all. |
| `arrowPadding`       | `number`       | `0`     | Distance in pixels the arrow keeps from the panel's corners. Separate from `anchor.padding`, which is the viewport padding that flip, shift, and the height calculation consume.                                                                                                                                                      |

### portalToContainingRoot {#portal-to-containing-root}

`(element: Element) => () => void`

Relocates an element into the shared `foldkit-portal-root` div within its containing root and returns a cleanup that removes it. Use it for elements outside the anchored panel, since `anchorSetup` already portals the panel unless `portal: false` says otherwise.

### Placement and Padding

`Placement` is a Schema over the twelve Floating UI placements: a side (`top`, `right`, `bottom`, `left`), optionally suffixed with `-start` or `-end`.

`Padding` is a Schema over a uniform `number` or a partial per-side object with `top`, `right`, `bottom`, and `left`. Both are exported so an `AnchorConfig` can be described from this subpath alone.
