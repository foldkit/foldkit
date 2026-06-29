import * as Story from 'foldkit/story'

import {
  AdvancedAnimationFrame,
  type Message as AnimationMessage,
  EndedAnimation,
  RequestFrame,
  WaitForAnimationSettled,
} from '../animation/index.js'
import { ElapsedDuration, GotAnimationMessage } from './schema.js'
import { DismissAfter } from './update.js'

/** The toast Messages a drain step feeds back through update. These are the
 *  payload-independent lifecycle Messages (`GotAnimationMessage` wrapping the
 *  entry's Animation submodel, and `ElapsedDuration` from the auto-dismiss
 *  timer). The drain never touches the payload, so it stays generic over the
 *  parent Message via `toParentMessage`. */
type DrainMessage =
  | ReturnType<typeof GotAnimationMessage>
  | ReturnType<typeof ElapsedDuration>

/** Input for {@link drainEntry}. `entryId` selects the entry whose lifecycle
 *  to drain. `toParentMessage` lifts each toast lifecycle Message into the
 *  parent's Message universe, matching the `Got*` wrap a parent applies when
 *  it embeds the toast Submodel. `version` is the auto-dismiss timer version
 *  echoed back by `ElapsedDuration`; it defaults to `0`, the version a freshly
 *  shown entry carries. */
export type DrainEntryInput<ParentMessage> = Readonly<{
  entryId: string
  toParentMessage: (message: DrainMessage) => ParentMessage
  version?: number
}>

const DEFAULT_VERSION = 0

/** Builds a {@link Story.Command.resolveAll} step that drains a single toast
 *  entry's full animation and dismiss lifecycle. Resolving these Commands in
 *  order takes a freshly shown entry from its enter animation through
 *  auto-dismiss and its exit animation, ending with the entry removed from the
 *  stack and the `DismissedToast` OutMessage emitted.
 *
 *  Showing a toast via `Toast.show` emits a multi-step lifecycle that a Story
 *  test must resolve in full or the story fails on leftover Commands. The
 *  steps are:
 *
 *  - enter animation: `RequestFrame` then `AdvancedAnimationFrame`
 *  - enter settle: `WaitForAnimationSettled` then `EndedAnimation`
 *  - auto-dismiss: `DismissAfter` then `ElapsedDuration`
 *  - exit animation: `RequestFrame` then `AdvancedAnimationFrame`
 *  - exit settle: `WaitForAnimationSettled` then `EndedAnimation`
 *
 *  All animation Messages route through the entry's `GotAnimationMessage`
 *  wrapper, then through `toParentMessage`.
 *
 *  @example
 *  ```ts
 *  Story.story(
 *    update,
 *    Story.with(model),
 *    Story.message(ClickedSave()),
 *    Toast.testing.drainEntry({
 *      entryId: 'toast-entry-0',
 *      toParentMessage: GotToastMessage,
 *    }),
 *  )
 *  ```
 */
export const drainEntry = <ParentMessage>({
  entryId,
  toParentMessage,
  version = DEFAULT_VERSION,
}: DrainEntryInput<ParentMessage>) => {
  const toAnimationParent = (message: AnimationMessage): ParentMessage =>
    toParentMessage(GotAnimationMessage({ entryId, message }))

  return Story.Command.resolveAll(
    [RequestFrame, AdvancedAnimationFrame(), toAnimationParent],
    [WaitForAnimationSettled, EndedAnimation(), toAnimationParent],
    [DismissAfter, ElapsedDuration({ entryId, version }), toParentMessage],
    [RequestFrame, AdvancedAnimationFrame(), toAnimationParent],
    [WaitForAnimationSettled, EndedAnimation(), toAnimationParent],
  )
}
