import { describe, it } from '@effect/vitest'
import { Option } from 'effect'
import { expect } from 'vitest'

import * as Story from '../../test/story.js'
import * as Animation from '../animation/index.js'
import {
  CloseDialog,
  Closed,
  CompletedCloseDialog,
  CompletedShowDialog,
  GotAnimationMessage,
  Opened,
  ShowDialog,
  descriptionId,
  init,
  titleId,
  update,
} from './index.js'

const animationToDialogMessage = (message: Animation.Message) =>
  GotAnimationMessage({ message })

describe('Dialog', () => {
  describe('init', () => {
    it('defaults isOpen to false', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        animation: Animation.init({ id: 'test-panel' }),
        maybeFocusSelector: Option.none(),
      })
    })

    it('accepts a custom isOpen', () => {
      expect(init({ id: 'test', isOpen: true })).toStrictEqual({
        id: 'test',
        isOpen: true,
        isAnimated: false,
        animation: Animation.init({ id: 'test-panel', isShowing: true }),
        maybeFocusSelector: Option.none(),
      })
    })

    it('accepts a focusSelector', () => {
      expect(
        init({ id: 'test', focusSelector: '#search-input' }),
      ).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        animation: Animation.init({ id: 'test-panel' }),
        maybeFocusSelector: Option.some('#search-input'),
      })
    })
  })

  describe('update', () => {
    describe('non-animated', () => {
      it('opens when closed on Opened', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test' })),
          Story.message(Opened()),
          Story.resolve(ShowDialog, CompletedShowDialog()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('opens without command when already open on Opened', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', isOpen: true })),
          Story.message(Opened()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('closes when open on Closed', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', isOpen: true })),
          Story.message(Closed()),
          Story.resolve(CloseDialog, CompletedCloseDialog()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })

      it('closes without command when already closed on Closed', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test' })),
          Story.message(Closed()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })

      it('returns model unchanged on CompletedShowDialog', () => {
        const originalModel = init({ id: 'test' })
        Story.story(
          update,
          Story.with(originalModel),
          Story.message(CompletedShowDialog()),
          Story.model(model => {
            expect(model).toBe(originalModel)
          }),
        )
      })
    })

    describe('animated', () => {
      it('opens with enter animation on Opened', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', isAnimated: true })),
          Story.message(Opened()),
          Story.expectHasCommands(ShowDialog, Animation.RequestFrame),
          Story.resolveAll(
            [ShowDialog, CompletedShowDialog()],
            [
              Animation.RequestFrame,
              Animation.AdvancedAnimationFrame(),
              animationToDialogMessage,
            ],
            [
              Animation.WaitForAnimationSettled,
              Animation.EndedAnimation(),
              animationToDialogMessage,
            ],
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.animation.transitionState).toBe('Idle')
          }),
        )
      })

      it('closes with leave animation and CloseDialog on Closed', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', isOpen: true, isAnimated: true })),
          Story.message(Closed()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.animation.transitionState).toBe('LeaveStart')
          }),
          Story.resolveAll(
            [
              Animation.RequestFrame,
              Animation.AdvancedAnimationFrame(),
              animationToDialogMessage,
            ],
            [
              Animation.WaitForAnimationSettled,
              Animation.EndedAnimation(),
              animationToDialogMessage,
            ],
            [CloseDialog, CompletedCloseDialog()],
          ),
          Story.model(model => {
            expect(model.animation.transitionState).toBe('Idle')
          }),
        )
      })

      it('ignores Closed when already in LeaveStart', () => {
        const leavingModel = {
          ...init({ id: 'test', isOpen: true, isAnimated: true }),
          isOpen: false,
          animation: {
            id: 'test-panel',
            isShowing: false,
            transitionState: 'LeaveStart' as const,
          },
        }
        Story.story(
          update,
          Story.with(leavingModel),
          Story.message(Closed()),
          Story.model(model => {
            expect(model).toBe(leavingModel)
          }),
          Story.expectNoCommands(),
        )
      })

      it('ignores Closed when already in LeaveAnimating', () => {
        const leavingModel = {
          ...init({ id: 'test', isOpen: true, isAnimated: true }),
          isOpen: false,
          animation: {
            id: 'test-panel',
            isShowing: false,
            transitionState: 'LeaveAnimating' as const,
          },
        }
        Story.story(
          update,
          Story.with(leavingModel),
          Story.message(Closed()),
          Story.model(model => {
            expect(model).toBe(leavingModel)
          }),
          Story.expectNoCommands(),
        )
      })
    })
  })

  describe('titleId', () => {
    it('returns the id suffixed with -title', () => {
      const model = init({ id: 'my-dialog' })
      expect(titleId(model)).toBe('my-dialog-title')
    })
  })

  describe('descriptionId', () => {
    it('returns the id suffixed with -description', () => {
      const model = init({ id: 'my-dialog' })
      expect(descriptionId(model)).toBe('my-dialog-description')
    })
  })
})
