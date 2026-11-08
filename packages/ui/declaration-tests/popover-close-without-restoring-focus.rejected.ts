import { PopoverBinding } from './popover-close-without-restoring-focus.accepted.js'

// @ts-expect-error The public method names the focus-restoration behavior explicitly.
PopoverBinding.requestCloseWithoutFocus

// @ts-expect-error The close request carries no payload.
PopoverBinding.requestCloseWithoutRestoringFocus({})
