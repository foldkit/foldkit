# Drag and Drop

## Overview

Sortable lists and cross-container movement with pointer tracking, keyboard navigation, collision detection, auto-scrolling, and screen reader announcements.

### Integration Model

DragAndDrop is different from other Foldkit UI components in two ways. First, it doesn’t have a `view()` function. Instead, you spread `draggable()` and `droppable()` attributes onto your own elements. Second, its update function can return `Reordered` and `Cancelled` through the optional `outMessage` field. You handle those OutMessages to decide how to reorder your data.

Integration requires four pieces: a `DragAndDrop.Model` field in your Model, an [`Update.foldChild`](/core/submodel#fold-child) fold with a `foldOutMessage`, `DragAndDrop.subscriptions` for document-level pointer and keyboard listeners, and `draggable()` / `droppable()` attributes in your view.

:::Info{label="See it in an app"}
Check out how DragAndDrop is wired up in the [kanban example](https://github.com/foldkit/foldkit/tree/main/examples/kanban/src) or the [UI showcase](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/dragAndDrop.ts).
:::

## Examples

### Demo

The snippet below shows a minimal sortable list with all four integration pieces. For a full example with persistence, cross-container moves, and add-card forms, see the [Kanban example](/example-apps/kanban).

::Demo{name="demo"}

::Snippet{name="uiDragAndDropBasic" label="Drag and drop"}

## Styling

DragAndDrop is fully headless. You render all items, containers, and ghost elements. Use `isDragging()` and `maybeDraggedItemId()` to conditionally style items during drag (e.g. reduced opacity on the source, a drop placeholder at the target).

| Attribute           | Condition                                     |
| ------------------- | --------------------------------------------- |
| `data-draggable-id` | Set on draggable items with the item ID.      |
| `data-sortable-id`  | Set on sortable items with the item ID.       |
| `data-droppable-id` | Set on drop containers with the container ID. |

## Keyboard Interaction

DragAndDrop supports full keyboard navigation. Space/Enter activates drag mode, arrow keys move the item, Tab/Shift+Tab moves between containers, and Escape cancels.

| Key                  | Description                                                     |
| -------------------- | --------------------------------------------------------------- |
| `Space / Enter`      | Starts a keyboard drag on the focused item.                     |
| `Arrow Down / Right` | Moves the item one position later in its container.             |
| `Arrow Up / Left`    | Moves the item one position earlier in its container.           |
| `Tab / Shift+Tab`    | Moves the item to the next / previous container.                |
| `Space / Enter`      | Drops the dragged item at its current position.                 |
| `Escape`             | Cancels the drag and returns the item to its original position. |

## Accessibility

Draggable items receive `role="option"` with `aria-roledescription="draggable"`. Drop containers receive `role="listbox"`. Screen reader announcements are emitted for drag start, movement, and drop via a live region.

### Drag Instructions

`dragInstructions(model)` renders a hidden element that tells a screen reader user how to drag with the keyboard. Render it once per DragAndDrop instance and set `hasDragInstructions: true` in each `draggable()` config. Each draggable then gets `aria-describedby` pointing at that element, so a screen reader reads the instructions when the item receives focus.

With no keyboard drag in progress, the text says to press Space or Enter to start dragging. During a keyboard drag, it names the arrow keys, Tab and Shift+Tab, Space or Enter, and Escape. A screen reader reads a description when focus lands on the item, not when its text changes, so the instructions do not replace the announcement your application makes when a drag starts.

To replace either string, for example with a translation, pass `{ idle, keyboardDragging }` as the second argument. Set `hasDragInstructions` only when the view renders `dragInstructions()`, so no draggable points `aria-describedby` at a missing element.

## Testing

In [Story tests](/testing/story), use `DragAndDrop.test` to resolve keyboard drag Commands:

- `DragAndDrop.test.settleFocus({ itemId })` resolves the item's focus after a drop or cancellation.
- `DragAndDrop.test.resolveKeyboardMove({ itemId, targetContainerId, targetIndex })` supplies a target container and index for an arrow-key move, then resolves the item's focus.

## API Reference

### InitConfig {#init-config}

Configuration object passed to `DragAndDrop.init()`.

| Name                  | Type                         | Default      | Description                                                                                        |
| --------------------- | ---------------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| `id`                  | `string`                     | —            | Unique ID for the drag-and-drop instance.                                                          |
| `orientation`         | `'Vertical' \| 'Horizontal'` | `'Vertical'` | Item flow direction. Pointer collision compares vertical or horizontal item midpoints.             |
| `activationThreshold` | `number`                     | `5`          | Minimum pointer movement in pixels before a drag activates. Prevents accidental drags from clicks. |

### View Helpers

Functions for attaching drag-and-drop behavior to your elements and reading drag state.

| Name                             | Type                       | Default | Description                                                                                                                                                                                                                                                   |
| -------------------------------- | -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `draggable(config)`              | `ReadonlyArray<Attribute>` | —       | Spread onto draggable items. Attaches pointer-down, keyboard activation, and ARIA attributes. Config requires model, toParentMessage, itemId, containerId, and index. Set optional `hasDragInstructions` to point `aria-describedby` at `dragInstructions()`. |
| `droppable(containerId, label?)` | `ReadonlyArray<Attribute>` | —       | Spread onto drop containers. Attaches the container ID for collision detection and optional ARIA label.                                                                                                                                                       |
| `dragInstructions(model, text?)` | `Html`                     | —       | Renders the hidden keyboard instructions element. Render it once per instance. `text` replaces the `idle` and `keyboardDragging` strings.                                                                                                                     |
| `dragInstructionsId(model)`      | `string`                   | —       | The id of the `dragInstructions` element: the instance id followed by `-drag-instructions`.                                                                                                                                                                   |
| `sortable(itemId)`               | `ReadonlyArray<Attribute>` | —       | Spread onto items that are both draggable and sortable targets.                                                                                                                                                                                               |
| `ghostStyle(model)`              | `Option<CSSProperties>`    | —       | Returns positioning styles for a ghost element that follows the pointer during drag. Use with Option.match to conditionally render.                                                                                                                           |
| `isDragging(model)`              | `boolean`                  | —       | Whether a drag is currently in progress.                                                                                                                                                                                                                      |
| `maybeDraggedItemId(model)`      | `Option<string>`           | —       | The ID of the item being dragged, if any.                                                                                                                                                                                                                     |
| `maybeDropTarget(model)`         | `Option<DropTarget>`       | —       | The current drop target (containerId + index), if any.                                                                                                                                                                                                        |

### OutMessage {#out-message}

Messages emitted to the parent through the optional `outMessage` field. Fold the OutMessage in the `foldOutMessage` of your [`Update.foldChild`](/core/submodel#fold-child) config.

| Name        | Type                                                             | Default | Description                                                                                                                                                                                                                                            |
| ----------- | ---------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Reordered` | `{ itemId, fromContainerId, fromIndex, toContainerId, toIndex }` | —       | Emitted when a drag completes with a valid drop target. The parent uses this to commit the reorder against its own data (move the item in the source array, splice it into the destination). Fold it in the `foldOutMessage` of your DragAndDrop fold. |
| `Cancelled` | `{}`                                                             | —       | Emitted when a drag is cancelled via Escape or a pointer release without a valid drop target. No reorder should be applied.                                                                                                                            |
