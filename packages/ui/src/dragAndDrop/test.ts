import * as Story from 'foldkit/story'

import { FocusItem, Message, ResolveKeyboardMove } from './index.js'

/** Identifies the item whose focus Command {@link settleFocus} resolves. */
export type SettleFocusInput = Readonly<{
  itemId: string
}>

/** Returns a Story step that resolves `FocusItem({ itemId })` after a keyboard
 *  drop, cancellation, or move. The step fails if no matching Command is pending
 *  and leaves unrelated Commands pending.
 *
 *  @example
 *  ```ts
 *  Story.story(
 *    update,
 *    Story.given(model),
 *    Story.message(
 *      ParentMessage.GotDragAndDropMessage({
 *        message: DragAndDrop.Message.ConfirmedKeyboardDrop(),
 *      }),
 *    ),
 *    DragAndDrop.test.settleFocus({ itemId: 'card-1' }),
 *  )
 *  ```
 */
export const settleFocus = ({ itemId }: SettleFocusInput) =>
  Story.Command.resolve(FocusItem({ itemId }), Message.CompletedFocusItem())

/** The dragged item and target position supplied to {@link resolveKeyboardMove}. */
export type ResolveKeyboardMoveInput = Readonly<{
  itemId: string
  targetContainerId: string
  targetIndex: number
}>

/** Returns Story steps that resolve a pending `ResolveKeyboardMove` to the
 *  supplied container and index, then resolve `FocusItem` for `itemId`.
 *
 *  The steps fail if either Command is missing or multiple keyboard moves are
 *  pending. Unrelated Commands stay pending.
 *
 *  @example
 *  ```ts
 *  Story.story(
 *    update,
 *    Story.given(keyboardDraggingModel),
 *    Story.message(
 *      ParentMessage.GotDragAndDropMessage({
 *        message: DragAndDrop.Message.PressedArrowKey({
 *          direction: 'NextContainer',
 *        }),
 *      }),
 *    ),
 *    DragAndDrop.test.resolveKeyboardMove({
 *      itemId: 'card-1',
 *      targetContainerId: 'done',
 *      targetIndex: 0,
 *    }),
 *  )
 *  ```
 */
export const resolveKeyboardMove = ({
  itemId,
  targetContainerId,
  targetIndex,
}: ResolveKeyboardMoveInput) =>
  Story.steps(
    Story.Command.resolve(
      ResolveKeyboardMove,
      Message.CompletedResolveKeyboardMove({ targetContainerId, targetIndex }),
    ),
    settleFocus({ itemId }),
  )
