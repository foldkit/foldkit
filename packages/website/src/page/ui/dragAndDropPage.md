# Drag and Drop

## Overview

Sortable lists and cross-container movement with pointer tracking, keyboard navigation, collision detection, auto-scrolling, and screen reader announcements.

### Integration Model

DragAndDrop is different from other Foldkit UI components in two ways. First, it doesn’t have a `view()` function. Instead, you spread `draggable()` and `droppable()` attributes onto your own elements. Second, it reports `Reordered` and `Cancelled` as OutMessages. You handle those OutMessages to decide how to reorder your data.

Integration requires four pieces: a `DragAndDrop.DragAndDrop` instance created in the parent's constructor and held in the parent Model, OutMessage handlers spread from `...dragAndDrop.on({ ... })`, a call to `model.dragAndDrop.view({ toView })` whose `toView` callback receives bound `draggable`, `droppable`, and `sortable` attribute helpers, and `DragAndDrop.DragAndDropLive` provided to the parent's Layer. The parent chooses all markup and spreads the supplied attributes directly.

:::Info{label="See it in an app"}
Check out how DragAndDrop is wired up in the [kanban example](https://github.com/foldkit/foldkit/tree/main/examples/kanban/src) or the [UI showcase](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/page/dragAndDropPage.ts).
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
| `Arrow Up / Down`    | Moves the item within its container (vertical orientation).     |
| `Arrow Left / Right` | Moves the item within its container (horizontal orientation).   |
| `Tab / Shift+Tab`    | Moves the item to the next / previous container.                |
| `Space / Enter`      | Drops the dragged item at its current position.                 |
| `Escape`             | Cancels the drag and returns the item to its original position. |

## Accessibility

Draggable items receive `role="option"` with `aria-roledescription="draggable"`. Drop containers receive `role="listbox"`. The parent owns a live region and its announcement text. Handle `StartedKeyboardDrag`, `ChangedKeyboardTarget`, `Reordered`, and `Cancelled` with `.on` and update the announcement there. `ChangedKeyboardTarget` describes a proposed keyboard position; the parent applies the actual move after `Reordered`. Announce the optimistic placement when the parent accepts it, and announce rollback separately if persistence fails.

## Testing

In [Story tests](/testing/story), use `DragAndDrop.test` to resolve keyboard drag Commands:

- `DragAndDrop.test.settleFocus({ itemId })` resolves the item's focus after a drop or cancellation.
- `DragAndDrop.test.resolveKeyboardMove({ itemId, targetContainerId, targetIndex })` supplies a target container and index for an arrow-key move, then resolves the item's focus.

Those forms test a Story whose root is DragAndDrop. In a parent Story, also pass `path`, the instance's path from the root in the form `Block.deliver` takes, such as `path: 'dragAndDrop'` or `path: ['boards', 'board-1', 'dragAndDrop']`. The keyboard move helper verifies the pending move's item and complete invocation arguments before it supplies the result.

Keyboard move results carry the originating `keyboardDragGeneration`. The Story helper copies it from the selected pending Command. Custom handlers and tests constructing `CompletedResolveKeyboardMove` directly must preserve that invocation's generation; a result from an earlier drag cannot move or focus a restarted interaction, including a new drag of the same item.

## API Reference

### InitConfig {#init-config}

The args a parent passes when it creates an instance with `new`.

| Name                  | Type                         | Default      | Description                                                                                        |
| --------------------- | ---------------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| `id`                  | `string`                     | —            | Unique ID for the drag-and-drop instance.                                                          |
| `orientation`         | `'Vertical' \| 'Horizontal'` | `'Vertical'` | Item flow direction. Controls arrow key mapping.                                                   |
| `activationThreshold` | `number`                     | `5`          | Minimum pointer movement in pixels before a drag activates. Prevents accidental drags from clicks. |

### View Helpers

Functions for attaching drag-and-drop behavior to your elements and reading drag state. The state selectors take the instance's Model, as in `isDragging(model.dragAndDrop.model)`.

| Name                             | Type                       | Default | Description                                                                                                                                                                                                                                                        |
| -------------------------------- | -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `draggable(config)`              | `ReadonlyArray<Attribute>` | —       | Spread onto draggable items. Attaches pointer-down, keyboard activation, and ARIA attributes. The instance's view passes this bound helper to `toView`. Config requires itemId, containerId, and index; the helper captures the instance's own Model and dispatch. |
| `droppable(containerId, label?)` | `ReadonlyArray<Attribute>` | —       | Spread onto drop containers. Attaches the container ID for collision detection and optional ARIA label.                                                                                                                                                            |
| `sortable(itemId)`               | `ReadonlyArray<Attribute>` | —       | Spread onto items that are both draggable and sortable targets.                                                                                                                                                                                                    |
| `ghostStyle(model)`              | `Option<CSSProperties>`    | —       | Returns positioning styles for a ghost element that follows the pointer during drag. Use with Option.match to conditionally render.                                                                                                                                |
| `isDragging(model)`              | `boolean`                  | —       | Whether a drag is currently in progress.                                                                                                                                                                                                                           |
| `maybeDraggedItemId(model)`      | `Option<string>`           | —       | The ID of the item being dragged, if any.                                                                                                                                                                                                                          |
| `maybeDropTarget(model)`         | `Option<DropTarget>`       | —       | The current drop target (containerId + index), if any.                                                                                                                                                                                                             |

### OutMessage {#out-message}

Facts the component reports to its parent. Handle them by spreading the instance's `.on({ ... })` into the parent's update record. Variants without a handler are ignored.

| Name                    | Type                                                             | Default | Description                                                                                                                                                                                                                       |
| ----------------------- | ---------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StartedKeyboardDrag`   | `{ itemId, containerId, index }`                                 | —       | Emitted when keyboard drag mode starts. The parent can announce pickup instructions.                                                                                                                                              |
| `ChangedKeyboardTarget` | `{ itemId, fromContainerId, fromIndex, toContainerId, toIndex }` | —       | Emitted only when the keyboard target changes. The `from` fields describe the previous target. The child Model already contains the new target; item data has not been reordered.                                                 |
| `Reordered`             | `{ itemId, fromContainerId, fromIndex, toContainerId, toIndex }` | —       | Emitted when a drag completes with a valid drop target. The parent uses this to commit the reorder against its own data (move the item in the source array, splice it into the destination). Handle it with the instance's `.on`. |
| `Cancelled`             | `{ itemId }`                                                     | —       | Emitted when an active drag is cancelled via Escape or a pointer release without a valid drop target. `itemId` names the dragged item. No reorder should be applied.                                                              |
