import * as Popover from '@foldkit/ui/popover'

import {
  PopoverBinding,
  type PopoverCloseAssertions,
  update,
} from './popover-close-without-restoring-focus.accepted.js'

export const closeWithoutRestoringFocus =
  PopoverBinding.requestCloseWithoutRestoringFocus()
export const requestedCloseWithoutRestoringFocus =
  Popover.InMessage.RequestedCloseWithoutRestoringFocus()
export const relocatedUpdate = update
export type RelocatedPopoverCloseAssertions = PopoverCloseAssertions
