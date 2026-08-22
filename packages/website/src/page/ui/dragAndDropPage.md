# Drag and Drop

## Overview

Sortable lists and cross-container movement with pointer tracking, keyboard navigation, collision detection, auto-scrolling, and screen reader announcements.

DragAndDrop is different from other Foldkit UI components in two ways. First, it doesn’t have a `view()` function. Instead, you spread `draggable()` and `droppable()` attributes onto your own elements. Second, its update function can return `Reordered` and `Cancelled` through the optional `outMessage` field. You handle those OutMessages to decide how to reorder your data.

Integration requires four pieces: a `DragAndDrop.Model` field in your Model, an [`Update.foldChild`](/core/submodel#fold-child) fold with a `foldOutMessage`, `DragAndDrop.subscriptions` for document-level pointer and keyboard listeners, and `draggable()` / `droppable()` attributes in your view.

:::Info{label="See it in an app"}
Check out how DragAndDrop is wired up in the [kanban example](https://github.com/foldkit/foldkit/tree/main/examples/kanban/src) or the [UI showcase](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/dragAndDrop.ts).
:::

## Examples

### Demo

The snippet below shows a minimal sortable list with all four integration pieces. For a full example with persistence, cross-container moves, and add-card forms, see the [Kanban example](/example-apps/kanban).

::Demo{name="demo"}

::Snippet{name="uiDragAndDropBasic" label="drag and drop example"}

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
| `Arrow Up / Down`    | Moves the item within its container (vertical orientation).     |
| `Arrow Left / Right` | Moves the item within its container (horizontal orientation).   |
| `Tab / Shift+Tab`    | Moves the item to the next / previous container.                |
| `Space / Enter`      | Drops the dragged item at its current position.                 |
| `Escape`             | Cancels the drag and returns the item to its original position. |

## Accessibility

Draggable items receive `role="option"` with `aria-roledescription="draggable"`. Drop containers receive `role="listbox"`. Screen reader announcements are emitted for drag start, movement, and drop via a live region.

## API Reference

### InitConfig {#init-config}

Configuration object passed to `DragAndDrop.init()`.

| Name                  | Type                         | Default      | Description                                                                                        |
| --------------------- | ---------------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| `id`                  | `string`                     | —            | Unique ID for the drag-and-drop instance.                                                          |
| `orientation`         | `'Vertical' \| 'Horizontal'` | `'Vertical'` | Item flow direction. Controls arrow key mapping.                                                   |
| `activationThreshold` | `number`                     | `5`          | Minimum pointer movement in pixels before a drag activates. Prevents accidental drags from clicks. |

### View Helpers

Functions for attaching drag-and-drop behavior to your elements and reading drag state.

| Name                             | Type                       | Default | Description                                                                                                                                                           |
| -------------------------------- | -------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `draggable(config)`              | `ReadonlyArray<Attribute>` | —       | Spread onto draggable items. Attaches pointer-down, keyboard activation, and ARIA attributes. Config requires model, toParentMessage, itemId, containerId, and index. |
| `droppable(containerId, label?)` | `ReadonlyArray<Attribute>` | —       | Spread onto drop containers. Attaches the container ID for collision detection and optional ARIA label.                                                               |
| `sortable(itemId)`               | `ReadonlyArray<Attribute>` | —       | Spread onto items that are both draggable and sortable targets.                                                                                                       |
| `ghostStyle(model)`              | `Option<CSSProperties>`    | —       | Returns positioning styles for a ghost element that follows the pointer during drag. Use with Option.match to conditionally render.                                   |
| `isDragging(model)`              | `boolean`                  | —       | Whether a drag is currently in progress.                                                                                                                              |
| `maybeDraggedItemId(model)`      | `Option<string>`           | —       | The ID of the item being dragged, if any.                                                                                                                             |
| `maybeDropTarget(model)`         | `Option<DropTarget>`       | —       | The current drop target (containerId + index), if any.                                                                                                                |

### OutMessage {#out-message}

Messages emitted to the parent through the optional `outMessage` field. Fold the OutMessage in the `foldOutMessage` of your [`Update.foldChild`](/core/submodel#fold-child) config.

| Name        | Type                                                             | Default | Description                                                                                                                                                                                                                                            |
| ----------- | ---------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Reordered` | `{ itemId, fromContainerId, fromIndex, toContainerId, toIndex }` | —       | Emitted when a drag completes with a valid drop target. The parent uses this to commit the reorder against its own data (move the item in the source array, splice it into the destination). Fold it in the `foldOutMessage` of your DragAndDrop fold. |
| `Cancelled` | `{}`                                                             | —       | Emitted when a drag is cancelled via Escape or a pointer release without a valid drop target. No reorder should be applied.                                                                                                                            |
