import { describe, it } from '@effect/vitest'
import { Duration, Option, flow } from 'effect'
import { expect } from 'vitest'

import * as Story from '../../test/story'
import {
  BlurredTrigger,
  ChangedShowDelay,
  ElapsedShowDelay,
  EnteredTrigger,
  FocusedTrigger,
  LeftTrigger,
  PressedEscape,
  PressedPointerOnTrigger,
  ShowAfterDelay,
  init,
  update,
} from './index'

const STALE_SHOW_VERSION = -1

const resolveShowAsStale = Story.resolve(
  ShowAfterDelay,
  ElapsedShowDelay({ version: STALE_SHOW_VERSION }),
)

const withHidden = Story.with(init({ id: 'test' }))

const withHoveredOpen = flow(
  withHidden,
  Story.message(EnteredTrigger()),
  Story.resolve(ShowAfterDelay, ElapsedShowDelay({ version: 1 })),
)

const withFocusedOpen = flow(withHidden, Story.message(FocusedTrigger()))

describe('Tooltip', () => {
  describe('init', () => {
    it('defaults to hidden with the standard show delay', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
        isHovered: false,
        isFocused: false,
        isDismissed: false,
        showDelay: Duration.millis(500),
        pendingShowVersion: 0,
        maybeLastPointerType: Option.none(),
      })
    })

    it('accepts a custom show delay as a number of milliseconds', () => {
      const model = init({ id: 'test', showDelay: 100 })
      expect(model.showDelay).toStrictEqual(Duration.millis(100))
    })

    it('accepts a custom show delay as a Duration', () => {
      const model = init({ id: 'test', showDelay: Duration.seconds(1) })
      expect(model.showDelay).toStrictEqual(Duration.seconds(1))
    })
  })

  describe('update', () => {
    describe('EnteredTrigger', () => {
      it('starts a show-delay timer when hidden', () => {
        Story.story(
          update,
          withHidden,
          Story.message(EnteredTrigger()),
          Story.model(model => {
            expect(model.isHovered).toBe(true)
            expect(model.isOpen).toBe(false)
            expect(model.pendingShowVersion).toBe(1)
          }),
          Story.expectHasCommands(ShowAfterDelay),
          Story.resolve(ShowAfterDelay, ElapsedShowDelay({ version: 1 })),
        )
      })

      it('opens the tooltip when the delay completes while hovering', () => {
        Story.story(
          update,
          withHidden,
          Story.message(EnteredTrigger()),
          Story.resolve(ShowAfterDelay, ElapsedShowDelay({ version: 1 })),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.isHovered).toBe(true)
          }),
        )
      })

      it('does not start a new timer when already open via focus', () => {
        Story.story(
          update,
          withFocusedOpen,
          Story.message(EnteredTrigger()),
          Story.expectNoCommands(),
          Story.model(model => {
            expect(model.isHovered).toBe(true)
            expect(model.isFocused).toBe(true)
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('schedules a show on re-hover after Escape even while focus stays active', () => {
        Story.story(
          update,
          withHidden,
          Story.message(FocusedTrigger()),
          Story.message(EnteredTrigger()),
          Story.message(PressedEscape()),
          Story.message(LeftTrigger()),
          Story.message(EnteredTrigger()),
          Story.expectHasCommands(ShowAfterDelay),
          Story.model(model => {
            expect(model.isFocused).toBe(true)
            expect(model.isHovered).toBe(true)
            expect(model.isOpen).toBe(false)
            expect(model.isDismissed).toBe(false)
          }),
          Story.resolve(ShowAfterDelay, ElapsedShowDelay({ version: 4 })),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('LeftTrigger', () => {
      it('cancels a pending show-delay by advancing the version', () => {
        Story.story(
          update,
          withHidden,
          Story.message(EnteredTrigger()),
          Story.model(model => {
            expect(model.pendingShowVersion).toBe(1)
          }),
          resolveShowAsStale,
          Story.message(LeftTrigger()),
          Story.model(model => {
            expect(model.isHovered).toBe(false)
            expect(model.isOpen).toBe(false)
            expect(model.pendingShowVersion).toBe(2)
          }),
        )
      })

      it('hides the tooltip when hover was the only source', () => {
        Story.story(
          update,
          withHoveredOpen,
          Story.message(LeftTrigger()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.isHovered).toBe(false)
          }),
        )
      })

      it('keeps the tooltip open when focus is still active', () => {
        Story.story(
          update,
          withFocusedOpen,
          Story.message(EnteredTrigger()),
          Story.message(LeftTrigger()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.isHovered).toBe(false)
            expect(model.isFocused).toBe(true)
          }),
        )
      })
    })

    describe('FocusedTrigger', () => {
      it('shows the tooltip immediately', () => {
        Story.story(
          update,
          withHidden,
          Story.message(FocusedTrigger()),
          Story.expectNoCommands(),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.isFocused).toBe(true)
          }),
        )
      })

      it('invalidates a pending hover-delay', () => {
        Story.story(
          update,
          withHidden,
          Story.message(EnteredTrigger()),
          resolveShowAsStale,
          Story.message(FocusedTrigger()),
          Story.model(model => {
            expect(model.pendingShowVersion).toBe(2)
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('BlurredTrigger', () => {
      it('hides the tooltip when focus was the only source', () => {
        Story.story(
          update,
          withFocusedOpen,
          Story.message(BlurredTrigger()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.isFocused).toBe(false)
          }),
        )
      })

      it('keeps the tooltip open when hover is still active', () => {
        Story.story(
          update,
          withHoveredOpen,
          Story.message(FocusedTrigger()),
          Story.message(BlurredTrigger()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.isFocused).toBe(false)
            expect(model.isHovered).toBe(true)
          }),
        )
      })
    })

    describe('PressedEscape', () => {
      it('hides the tooltip without lying about hover or focus state', () => {
        Story.story(
          update,
          withHoveredOpen,
          Story.message(PressedEscape()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.isHovered).toBe(true)
            expect(model.isDismissed).toBe(true)
          }),
        )
      })

      it('does not re-open on hover until the pointer leaves', () => {
        Story.story(
          update,
          withHoveredOpen,
          Story.message(PressedEscape()),
          Story.expectNoCommands(),
          Story.message(EnteredTrigger()),
          Story.expectNoCommands(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.isDismissed).toBe(true)
          }),
        )
      })

      it('does not re-open on focus until the trigger blurs', () => {
        Story.story(
          update,
          withFocusedOpen,
          Story.message(PressedEscape()),
          Story.message(FocusedTrigger()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.isFocused).toBe(true)
            expect(model.isDismissed).toBe(true)
          }),
        )
      })

      it('clears the dismissed flag on leave', () => {
        Story.story(
          update,
          withHoveredOpen,
          Story.message(PressedEscape()),
          Story.message(LeftTrigger()),
          Story.model(model => {
            expect(model.isDismissed).toBe(false)
            expect(model.isHovered).toBe(false)
          }),
        )
      })

      it('clears the dismissed flag on blur', () => {
        Story.story(
          update,
          withFocusedOpen,
          Story.message(PressedEscape()),
          Story.message(BlurredTrigger()),
          Story.model(model => {
            expect(model.isDismissed).toBe(false)
            expect(model.isFocused).toBe(false)
          }),
        )
      })

      it('re-opens on a fresh hover after leaving', () => {
        Story.story(
          update,
          withHoveredOpen,
          Story.message(PressedEscape()),
          Story.message(LeftTrigger()),
          Story.message(EnteredTrigger()),
          Story.expectHasCommands(ShowAfterDelay),
          Story.resolve(ShowAfterDelay, ElapsedShowDelay({ version: 4 })),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.isDismissed).toBe(false)
          }),
        )
      })
    })

    describe('ElapsedShowDelay', () => {
      it('ignores a stale delay whose version does not match', () => {
        Story.story(
          update,
          withHidden,
          Story.message(EnteredTrigger()),
          Story.resolve(ShowAfterDelay, ElapsedShowDelay({ version: 99 })),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })

      it('stays hidden when a stale delay fires and the user then leaves', () => {
        Story.story(
          update,
          withHidden,
          Story.message(EnteredTrigger()),
          resolveShowAsStale,
          Story.message(LeftTrigger()),
          Story.model(model => {
            expect(model.pendingShowVersion).toBe(2)
            expect(model.isOpen).toBe(false)
            expect(model.isHovered).toBe(false)
          }),
        )
      })
    })

    describe('PressedPointerOnTrigger', () => {
      it('records the pointer type without opening when closed', () => {
        Story.story(
          update,
          withHidden,
          Story.message(
            PressedPointerOnTrigger({ pointerType: 'mouse', button: 0 }),
          ),
          Story.expectNoCommands(),
          Story.model(model => {
            expect(model.maybeLastPointerType).toStrictEqual(
              Option.some('mouse'),
            )
            expect(model.isOpen).toBe(false)
          }),
        )
      })

      it('suppresses the auto-show on focus that follows a mouse press and does not count it as keyboard focus', () => {
        Story.story(
          update,
          withHidden,
          Story.message(
            PressedPointerOnTrigger({ pointerType: 'mouse', button: 0 }),
          ),
          Story.message(FocusedTrigger()),
          Story.model(model => {
            expect(model.isFocused).toBe(false)
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastPointerType).toStrictEqual(Option.none())
          }),
        )
      })

      it('does not suppress focus from a touch or pen press', () => {
        Story.story(
          update,
          withHidden,
          Story.message(
            PressedPointerOnTrigger({ pointerType: 'touch', button: 0 }),
          ),
          Story.message(FocusedTrigger()),
          Story.model(model => {
            expect(model.isFocused).toBe(true)
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('does not suppress a keyboard focus with no preceding pointer press', () => {
        Story.story(
          update,
          withHidden,
          Story.message(FocusedTrigger()),
          Story.model(model => {
            expect(model.isFocused).toBe(true)
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('clears the recorded pointer type on blur', () => {
        Story.story(
          update,
          withHidden,
          Story.message(
            PressedPointerOnTrigger({ pointerType: 'mouse', button: 0 }),
          ),
          Story.message(FocusedTrigger()),
          Story.message(BlurredTrigger()),
          Story.model(model => {
            expect(model.maybeLastPointerType).toStrictEqual(Option.none())
          }),
        )
      })

      it('dismisses an open tooltip on left-click of the trigger and clears focus so leave closes cleanly on next cycle', () => {
        Story.story(
          update,
          withHoveredOpen,
          Story.message(
            PressedPointerOnTrigger({ pointerType: 'mouse', button: 0 }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.isDismissed).toBe(true)
            expect(model.isFocused).toBe(false)
            expect(model.isHovered).toBe(true)
          }),
        )
      })

      it('closes on leave after hover, click, leave, and re-hover', () => {
        Story.story(
          update,
          withHoveredOpen,
          Story.message(
            PressedPointerOnTrigger({ pointerType: 'mouse', button: 0 }),
          ),
          Story.message(FocusedTrigger()),
          Story.message(LeftTrigger()),
          Story.message(EnteredTrigger()),
          Story.resolve(ShowAfterDelay, ElapsedShowDelay({ version: 4 })),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
          Story.message(LeftTrigger()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.isFocused).toBe(false)
          }),
        )
      })

      it('does not dismiss the tooltip on right-click', () => {
        Story.story(
          update,
          withHoveredOpen,
          Story.message(
            PressedPointerOnTrigger({ pointerType: 'mouse', button: 2 }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.isDismissed).toBe(false)
          }),
        )
      })

      it('stays dismissed after click until the pointer leaves', () => {
        Story.story(
          update,
          withHoveredOpen,
          Story.message(
            PressedPointerOnTrigger({ pointerType: 'mouse', button: 0 }),
          ),
          Story.message(EnteredTrigger()),
          Story.expectNoCommands(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.isDismissed).toBe(true)
          }),
        )
      })

      it('re-enables show after leave and re-hover following a click', () => {
        Story.story(
          update,
          withHoveredOpen,
          Story.message(
            PressedPointerOnTrigger({ pointerType: 'mouse', button: 0 }),
          ),
          Story.message(LeftTrigger()),
          Story.message(EnteredTrigger()),
          Story.expectHasCommands(ShowAfterDelay),
          Story.model(model => {
            expect(model.isDismissed).toBe(false)
          }),
          resolveShowAsStale,
        )
      })
    })

    describe('ChangedShowDelay', () => {
      it('updates the stored show delay without side effects', () => {
        Story.story(
          update,
          withHidden,
          Story.message(ChangedShowDelay({ showDelay: Duration.seconds(1) })),
          Story.expectNoCommands(),
          Story.model(model => {
            expect(model.showDelay).toStrictEqual(Duration.seconds(1))
            expect(model.isOpen).toBe(false)
            expect(model.pendingShowVersion).toBe(0)
          }),
        )
      })

      it('uses the new delay on a subsequent fresh hover', () => {
        Story.story(
          update,
          withHidden,
          Story.message(EnteredTrigger()),
          resolveShowAsStale,
          Story.message(LeftTrigger()),
          Story.message(ChangedShowDelay({ showDelay: Duration.millis(50) })),
          Story.message(EnteredTrigger()),
          Story.model(model => {
            expect(model.showDelay).toStrictEqual(Duration.millis(50))
          }),
          Story.resolve(ShowAfterDelay, ElapsedShowDelay({ version: 3 })),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })
  })
})
