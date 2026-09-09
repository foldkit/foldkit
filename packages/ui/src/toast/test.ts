import * as Story from 'foldkit/story'

import * as Animation from '../animation/index.js'
import { Message } from './schema.js'
import { WaitBeforeDismissal } from './update.js'

/** Input for {@link drainEntry}. `entryId` selects the entry whose lifecycle
 *  to drain. `version` is the auto-dismiss timer version echoed back by
 *  `CompletedWaitBeforeDismissal`; it defaults to `0`, the version a freshly
 *  shown entry carries. */
export type DrainEntryInput = Readonly<{
  entryId: string
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
 *  - enter animation: `WaitForPaint` then `CompletedWaitForPaint`
 *  - enter settle: `WaitForAnimationSettled` then `EndedAnimation`
 *  - auto-dismiss: `WaitBeforeDismissal` then
 *    `CompletedWaitBeforeDismissal`
 *  - exit animation: `WaitForPaint` then `CompletedWaitForPaint`
 *  - exit settle: `WaitForAnimationSettled` then `EndedAnimation`
 *
 *  Each step resolves with the child's raw result Message. `resolveAll` replays
 *  the matched Command's own recorded wrapping, so a parent that embeds the
 *  toast Submodel drains the same way without restating its `Got*` lift.
 *
 *  @example
 *  ```ts
 *  Story.story(
 *    update,
 *    Story.given(model),
 *    Story.message(ClickedSave()),
 *    Toast.test.drainEntry({ entryId: 'toast-entry-0' }),
 *  )
 *  ```
 */
export const drainEntry = ({
  entryId,
  version = DEFAULT_VERSION,
}: DrainEntryInput) =>
  Story.Command.resolveAll(
    [Animation.WaitForPaint, Animation.Message.CompletedWaitForPaint()],
    [Animation.WaitForAnimationSettled, Animation.Message.EndedAnimation()],
    [
      WaitBeforeDismissal,
      Message.CompletedWaitBeforeDismissal({ entryId, version }),
    ],
    [Animation.WaitForPaint, Animation.Message.CompletedWaitForPaint()],
    [Animation.WaitForAnimationSettled, Animation.Message.EndedAnimation()],
  )
