import { describe, it } from '@effect/vitest'
import { expect } from 'vitest'

import * as Story from '../../test/story'
import {
  AdvancedTransitionFrame,
  EndedTransition,
  Hid,
  RequestFrame,
  Showed,
  StartedLeaveAnimating,
  TransitionedOut,
  WaitForTransitions,
  init,
  update,
} from './index'

describe('Transition', () => {
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
      it('starts enter transition when hidden', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test' })),
          Story.message(Showed()),
          Story.model(model => {
            expect(model.isShowing).toBe(true)
            expect(model.transitionState).toBe('EnterStart')
          }),
          Story.expectHasCommands(RequestFrame),
          Story.resolve(RequestFrame, AdvancedTransitionFrame()),
          Story.model(model => {
            expect(model.transitionState).toBe('EnterAnimating')
          }),
          Story.resolve(WaitForTransitions, EndedTransition()),
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
      it('starts leave transition when showing', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', isShowing: true })),
          Story.message(Hid()),
          Story.model(model => {
            expect(model.isShowing).toBe(false)
            expect(model.transitionState).toBe('LeaveStart')
          }),
          Story.expectHasCommands(RequestFrame),
          Story.resolve(RequestFrame, AdvancedTransitionFrame()),
          Story.model(model => {
            expect(model.transitionState).toBe('LeaveAnimating')
          }),
          Story.expectNoCommands(),
          Story.expectOutMessage(StartedLeaveAnimating()),
          Story.message(EndedTransition()),
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
          Story.resolve(RequestFrame, AdvancedTransitionFrame()),
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

    describe('AdvancedTransitionFrame', () => {
      it('does nothing when Idle', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test' })),
          Story.message(AdvancedTransitionFrame()),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.expectNoCommands(),
        )
      })
    })

    describe('EndedTransition', () => {
      it('does nothing when Idle', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test' })),
          Story.message(EndedTransition()),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.expectNoCommands(),
        )
      })
    })
  })
})
