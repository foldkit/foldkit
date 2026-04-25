import { describe, it } from '@effect/vitest'
import { expect } from 'vitest'

import * as Story from '../../test/story.js'
import {
  AdvancedAnimationFrame,
  EndedAnimation,
  Hid,
  RequestFrame,
  Showed,
  StartedLeaveAnimating,
  TransitionedOut,
  WaitForAnimationSettled,
  init,
  update,
} from './index.js'

describe('Animation', () => {
  describe('init', () => {
    it('defaults isShowing to false', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isShowing: false,
        transitionState: 'Idle',
      })
    })

    it('accepts a custom isShowing', () => {
      expect(init({ id: 'test', isShowing: true })).toStrictEqual({
        id: 'test',
        isShowing: true,
        transitionState: 'Idle',
      })
    })
  })

  describe('update', () => {
    describe('Showed', () => {
      it('starts enter lifecycle when hidden', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test' })),
          Story.message(Showed()),
          Story.model(model => {
            expect(model.isShowing).toBe(true)
            expect(model.transitionState).toBe('EnterStart')
          }),
          Story.expectHasCommands(RequestFrame),
          Story.resolve(RequestFrame, AdvancedAnimationFrame()),
          Story.model(model => {
            expect(model.transitionState).toBe('EnterAnimating')
          }),
          Story.resolve(WaitForAnimationSettled, EndedAnimation()),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('does nothing when already showing', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', isShowing: true })),
          Story.message(Showed()),
          Story.model(model => {
            expect(model.isShowing).toBe(true)
            expect(model.transitionState).toBe('Idle')
          }),
          Story.expectNoCommands(),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('Hid', () => {
      it('starts leave lifecycle when showing', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', isShowing: true })),
          Story.message(Hid()),
          Story.model(model => {
            expect(model.isShowing).toBe(false)
            expect(model.transitionState).toBe('LeaveStart')
          }),
          Story.expectHasCommands(RequestFrame),
          Story.resolve(RequestFrame, AdvancedAnimationFrame()),
          Story.model(model => {
            expect(model.transitionState).toBe('LeaveAnimating')
          }),
          Story.expectNoCommands(),
          Story.expectOutMessage(StartedLeaveAnimating()),
          Story.message(EndedAnimation()),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.expectOutMessage(TransitionedOut()),
        )
      })

      it('does nothing when already hidden', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test' })),
          Story.message(Hid()),
          Story.model(model => {
            expect(model.isShowing).toBe(false)
          }),
          Story.expectNoCommands(),
          Story.expectNoOutMessage(),
        )
      })

      it('does nothing when already in LeaveAnimating', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', isShowing: true })),
          Story.message(Hid()),
          Story.expectHasCommands(RequestFrame),
          Story.resolve(RequestFrame, AdvancedAnimationFrame()),
          Story.model(model => {
            expect(model.transitionState).toBe('LeaveAnimating')
          }),
          Story.expectNoCommands(),
          Story.expectOutMessage(StartedLeaveAnimating()),
          Story.message(Hid()),
          Story.model(model => {
            expect(model.transitionState).toBe('LeaveAnimating')
          }),
          Story.expectNoCommands(),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('AdvancedAnimationFrame', () => {
      it('does nothing when Idle', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test' })),
          Story.message(AdvancedAnimationFrame()),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.expectNoCommands(),
        )
      })
    })

    describe('EndedAnimation', () => {
      it('does nothing when Idle', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test' })),
          Story.message(EndedAnimation()),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.expectNoCommands(),
        )
      })
    })
  })
})
