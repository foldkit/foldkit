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
const ENTER_TRANSITION_VERSION = 1
const LEAVE_TRANSITION_VERSION = 2

/** Builds a `Story.Command.resolveAll` step that drains a single toast
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
 *  The enter steps match animation transition version `1`, which the entry's
 *  `Showed` starts, and the exit steps match version `2`, which its `Hid`
 *  starts. Each step matches only its own version, so the helper also drains
 *  an entry whose enter the test has already resolved. These versions are
 *  separate from the auto-dismiss timer `version`.
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
    [
      Animation.WaitForPaint({ version: ENTER_TRANSITION_VERSION }),
      Animation.Message.CompletedWaitForPaint({
        version: ENTER_TRANSITION_VERSION,
      }),
    ],
    [
      Animation.WaitForAnimationSettled({
        id: entryId,
        version: ENTER_TRANSITION_VERSION,
      }),
      Animation.Message.EndedAnimation({ version: ENTER_TRANSITION_VERSION }),
    ],
    [
      WaitBeforeDismissal,
      Message.CompletedWaitBeforeDismissal({ entryId, version }),
    ],
    [
      Animation.WaitForPaint({ version: LEAVE_TRANSITION_VERSION }),
      Animation.Message.CompletedWaitForPaint({
        version: LEAVE_TRANSITION_VERSION,
      }),
    ],
    [
      Animation.WaitForAnimationSettled({
        id: entryId,
        version: LEAVE_TRANSITION_VERSION,
      }),
      Animation.Message.EndedAnimation({ version: LEAVE_TRANSITION_VERSION }),
    ],
  )
