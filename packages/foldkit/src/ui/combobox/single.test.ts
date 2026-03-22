import { describe, it } from '@effect/vitest'
import { Effect, Option, Predicate, flow } from 'effect'
import type { VNode } from 'snabbdom'
import { expect } from 'vitest'

import { Dispatch } from '../../runtime'
import { noOpDispatch } from '../../runtime/crashUI'
import * as Test from '../../test'
import {
  ActivatedItem,
  AdvancedTransitionFrame,
  ClickItem,
  Closed,
  ClosedByTab,
  CompletedClickItem,
  CompletedFocusInput,
  CompletedLockScroll,
  CompletedScrollIntoView,
  CompletedSetupInert,
  CompletedTeardownInert,
  CompletedUnlockScroll,
  DeactivatedItem,
  DetectMovementOrTransitionEnd,
  DetectedInputMovement,
  EndedTransition,
  FocusInput,
  InertOthers,
  LockScroll,
  MovedPointerOverItem,
  Opened,
  PressedToggleButton,
  RequestFrame,
  RequestedItemClick,
  RestoreInert,
  ScrollIntoView,
  SelectedItem,
  UnlockScroll,
  UpdatedInputValue,
  WaitForTransitions,
} from './shared'
import { init, update, view } from './single'
import type { Model, ViewConfig } from './single'

const withClosed = Test.with(init({ id: 'test' }))

const withOpen = flow(
  withClosed,
  Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
)

const withClosedAnimated = Test.with(init({ id: 'test', isAnimated: true }))

const withOpenAnimated = flow(
  withClosedAnimated,
  Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
  Test.resolveAll([
    [RequestFrame, AdvancedTransitionFrame()],
    [WaitForTransitions, EndedTransition()],
    [DetectMovementOrTransitionEnd, EndedTransition()],
  ]),
)

describe('Combobox', () => {
  describe('init', () => {
    it('defaults to closed with no active item and no selection', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        isModal: false,
        nullable: false,
        immediate: false,
        selectInputOnFocus: false,
        transitionState: 'Idle',
        maybeActiveItemIndex: Option.none(),
        activationTrigger: 'Keyboard',
        inputValue: '',
        maybeLastPointerPosition: Option.none(),
        maybeSelectedItem: Option.none(),
        maybeSelectedDisplayText: Option.none(),
      })
    })

    it('accepts isAnimated option', () => {
      const model = init({ id: 'test', isAnimated: true })
      expect(model.isAnimated).toBe(true)
      expect(model.transitionState).toBe('Idle')
    })

    it('defaults isModal to false', () => {
      expect(init({ id: 'test' }).isModal).toBe(false)
    })

    it('accepts isModal option', () => {
      expect(init({ id: 'test', isModal: true }).isModal).toBe(true)
    })

    it('accepts selectedItem option', () => {
      const model = init({
        id: 'test',
        selectedItem: 'apple',
        selectedDisplayText: 'Apple',
      })
      expect(model.maybeSelectedItem).toStrictEqual(Option.some('apple'))
      expect(model.maybeSelectedDisplayText).toStrictEqual(Option.some('Apple'))
    })

    it('defaults maybeSelectedItem to none', () => {
      expect(init({ id: 'test' }).maybeSelectedItem).toStrictEqual(
        Option.none(),
      )
    })

    it('uses selectedItem as selectedDisplayText when selectedDisplayText is omitted', () => {
      const model = init({ id: 'test', selectedItem: 'apple' })
      expect(model.maybeSelectedItem).toStrictEqual(Option.some('apple'))
      expect(model.maybeSelectedDisplayText).toStrictEqual(Option.some('apple'))
    })

    it('accepts nullable option', () => {
      expect(init({ id: 'test', nullable: true }).nullable).toBe(true)
    })

    it('defaults nullable to false', () => {
      expect(init({ id: 'test' }).nullable).toBe(false)
    })

    it('accepts immediate option', () => {
      expect(init({ id: 'test', immediate: true }).immediate).toBe(true)
    })

    it('defaults immediate to false', () => {
      expect(init({ id: 'test' }).immediate).toBe(false)
    })

    it('accepts selectInputOnFocus option', () => {
      expect(
        init({ id: 'test', selectInputOnFocus: true }).selectInputOnFocus,
      ).toBe(true)
    })

    it('defaults selectInputOnFocus to false', () => {
      expect(init({ id: 'test' }).selectInputOnFocus).toBe(false)
    })
  })

  describe('update', () => {
    describe('Opened', () => {
      it('opens with given active item', () => {
        Test.story(
          update,
          withClosed,
          Test.message(Opened({ maybeActiveItemIndex: Option.some(2) })),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })

      it('resets pointer position on open', () => {
        Test.story(
          update,
          Test.with({
            ...init({ id: 'test' }),
            maybeLastPointerPosition: Option.some({
              screenX: 100,
              screenY: 200,
            }),
          }),
          Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Test.tap(({ model }) => {
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })

      it('sets trigger to Keyboard when opened with active item', () => {
        Test.story(
          update,
          withClosed,
          Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Test.tap(({ model }) => {
            expect(model.activationTrigger).toBe('Keyboard')
          }),
        )
      })

      it('sets trigger to Pointer when opened without active item', () => {
        Test.story(
          update,
          withClosed,
          Test.message(Opened({ maybeActiveItemIndex: Option.none() })),
          Test.tap(({ model }) => {
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })
    })

    describe('Closed', () => {
      it('closes and restores input to selected display text', () => {
        Test.story(
          update,
          Test.with({
            ...init({ id: 'test' }),
            isOpen: true,
            inputValue: 'app',
            maybeSelectedItem: Option.some('apple'),
            maybeSelectedDisplayText: Option.some('Apple'),
          }),
          Test.message(Closed()),
          Test.resolve(FocusInput, CompletedFocusInput()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.inputValue).toBe('Apple')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })

      it('closes with nullable and empty input clears selection', () => {
        Test.story(
          update,
          Test.with({
            ...init({ id: 'test' }),
            isOpen: true,
            nullable: true,
            inputValue: '',
            maybeSelectedItem: Option.some('apple'),
            maybeSelectedDisplayText: Option.some('Apple'),
          }),
          Test.message(Closed()),
          Test.resolve(FocusInput, CompletedFocusInput()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.inputValue).toBe('')
            expect(model.maybeSelectedItem).toStrictEqual(Option.none())
            expect(model.maybeSelectedDisplayText).toStrictEqual(Option.none())
          }),
        )
      })

      it('returns focus-input and close commands', () => {
        Test.story(
          update,
          withOpen,
          Test.message(Closed()),
          Test.resolve(FocusInput, CompletedFocusInput()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('ClosedByTab', () => {
      it('closes without focus command', () => {
        Test.story(
          update,
          withOpen,
          Test.message(ClosedByTab()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })

      it('restores input value', () => {
        Test.story(
          update,
          Test.with({
            ...init({ id: 'test' }),
            isOpen: true,
            inputValue: 'app',
            maybeSelectedDisplayText: Option.some('Apple'),
          }),
          Test.message(ClosedByTab()),
          Test.tap(({ model }) => {
            expect(model.inputValue).toBe('Apple')
          }),
        )
      })
    })

    describe('ActivatedItem', () => {
      it('sets the active item index', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            ActivatedItem({
              index: 3,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Test.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
          }),
        )
      })

      it('replaces previous active item', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            ActivatedItem({
              index: 1,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Test.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Test.message(
            ActivatedItem({
              index: 4,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Test.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(4))
          }),
        )
      })

      it('stores activation trigger', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            ActivatedItem({
              index: 1,
              activationTrigger: 'Pointer',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Test.tap(({ model }) => {
            expect(model.activationTrigger).toBe('Pointer')
          }),
        )
      })

      it('returns scroll command for keyboard activation', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            ActivatedItem({
              index: 2,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Test.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })

      it('applies immediate selection when maybeImmediateSelection is Some', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            ActivatedItem({
              index: 1,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.some({
                item: 'banana',
                displayText: 'Banana',
              }),
            }),
          ),
          Test.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Test.tap(({ model }) => {
            expect(model.maybeSelectedItem).toStrictEqual(Option.some('banana'))
            expect(model.maybeSelectedDisplayText).toStrictEqual(
              Option.some('Banana'),
            )
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('DeactivatedItem', () => {
      it('clears active item when pointer-activated', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            ActivatedItem({
              index: 1,
              activationTrigger: 'Pointer',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Test.message(DeactivatedItem()),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('preserves active item when keyboard-activated', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            ActivatedItem({
              index: 2,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Test.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Test.message(DeactivatedItem()),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })
    })

    describe('MovedPointerOverItem', () => {
      it('activates item on first pointer move', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            MovedPointerOverItem({ index: 2, screenX: 100, screenY: 200 }),
          ),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeLastPointerPosition).toStrictEqual(
              Option.some({ screenX: 100, screenY: 200 }),
            )
          }),
        )
      })

      it('skips when position is same', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            MovedPointerOverItem({ index: 1, screenX: 100, screenY: 200 }),
          ),
          Test.message(
            MovedPointerOverItem({ index: 2, screenX: 100, screenY: 200 }),
          ),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(1))
          }),
        )
      })

      it('updates position when different', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            MovedPointerOverItem({ index: 1, screenX: 100, screenY: 200 }),
          ),
          Test.message(
            MovedPointerOverItem({ index: 3, screenX: 150, screenY: 250 }),
          ),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
            expect(model.maybeLastPointerPosition).toStrictEqual(
              Option.some({ screenX: 150, screenY: 250 }),
            )
          }),
        )
      })
    })

    describe('SelectedItem', () => {
      it('sets selected item and display text, closes', () => {
        Test.story(
          update,
          withOpen,
          Test.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Test.resolve(FocusInput, CompletedFocusInput()),
          Test.tap(({ model }) => {
            expect(model.maybeSelectedItem).toStrictEqual(Option.some('apple'))
            expect(model.maybeSelectedDisplayText).toStrictEqual(
              Option.some('Apple'),
            )
            expect(model.inputValue).toBe('Apple')
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('clears selection when nullable and already selected', () => {
        Test.story(
          update,
          Test.with({
            ...init({ id: 'test' }),
            isOpen: true,
            nullable: true,
            maybeSelectedItem: Option.some('apple'),
            maybeSelectedDisplayText: Option.some('Apple'),
          }),
          Test.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Test.resolve(FocusInput, CompletedFocusInput()),
          Test.tap(({ model }) => {
            expect(model.maybeSelectedItem).toStrictEqual(Option.none())
            expect(model.maybeSelectedDisplayText).toStrictEqual(Option.none())
            expect(model.inputValue).toBe('')
            expect(model.isOpen).toBe(false)
          }),
        )
      })

      it('returns focus-input command', () => {
        Test.story(
          update,
          withOpen,
          Test.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Test.resolve(FocusInput, CompletedFocusInput()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('RequestedItemClick', () => {
      it('returns click element command', () => {
        Test.story(
          update,
          withOpen,
          Test.message(RequestedItemClick({ index: 2 })),
          Test.resolve(ClickItem, CompletedClickItem()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('UpdatedInputValue', () => {
      it('sets input value and activates first item when open', () => {
        Test.story(
          update,
          withOpen,
          Test.message(UpdatedInputValue({ value: 'app' })),
          Test.tap(({ model }) => {
            expect(model.inputValue).toBe('app')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(0))
            expect(model.activationTrigger).toBe('Keyboard')
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('opens combobox when closed and typing', () => {
        Test.story(
          update,
          withClosed,
          Test.message(UpdatedInputValue({ value: 'b' })),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
            expect(model.inputValue).toBe('b')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(0))
            expect(model.activationTrigger).toBe('Keyboard')
          }),
        )
      })
    })

    describe('PressedToggleButton', () => {
      it('opens when closed', () => {
        Test.story(
          update,
          withClosed,
          Test.message(PressedToggleButton()),
          Test.resolve(FocusInput, CompletedFocusInput()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('closes when open', () => {
        Test.story(
          update,
          withOpen,
          Test.message(PressedToggleButton()),
          Test.resolve(FocusInput, CompletedFocusInput()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('CompletedFocusInput', () => {
      it('returns model unchanged', () => {
        Test.story(
          update,
          withOpen,
          Test.message(CompletedFocusInput()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('transitions', () => {
      describe('enter flow', () => {
        it('sets EnterStart and emits nextFrame on Opened', () => {
          Test.story(
            update,
            withClosedAnimated,
            Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('EnterStart')
            }),
            Test.resolveAll([
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('advances EnterStart to EnterAnimating on AdvancedTransitionFrame', () => {
          Test.story(
            update,
            withClosedAnimated,
            Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Test.resolve(RequestFrame, AdvancedTransitionFrame()),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('EnterAnimating')
            }),
            Test.resolveAll([
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('completes EnterAnimating to Idle on EndedTransition', () => {
          Test.story(
            update,
            withClosedAnimated,
            Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Test.resolveAll([
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('leave flow', () => {
        it('sets LeaveStart on Closed', () => {
          Test.story(
            update,
            withOpenAnimated,
            Test.message(Closed()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Test.resolveAll([
              [FocusInput, CompletedFocusInput()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('sets LeaveStart on ClosedByTab', () => {
          Test.story(
            update,
            withOpenAnimated,
            Test.message(ClosedByTab()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Test.resolveAll([
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('sets LeaveStart on SelectedItem', () => {
          Test.story(
            update,
            withOpenAnimated,
            Test.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Test.resolveAll([
              [FocusInput, CompletedFocusInput()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('advances LeaveStart to LeaveAnimating on AdvancedTransitionFrame', () => {
          Test.story(
            update,
            withOpenAnimated,
            Test.message(Closed()),
            Test.resolve(RequestFrame, AdvancedTransitionFrame()),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('LeaveAnimating')
            }),
            Test.resolveAll([
              [FocusInput, CompletedFocusInput()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('completes LeaveAnimating to Idle on EndedTransition', () => {
          Test.story(
            update,
            withOpenAnimated,
            Test.message(Closed()),
            Test.resolveAll([
              [FocusInput, CompletedFocusInput()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('non-animated', () => {
        it('keeps transitionState Idle on Opened', () => {
          Test.story(
            update,
            withClosed,
            Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('keeps transitionState Idle on Closed', () => {
          Test.story(
            update,
            withOpen,
            Test.message(Closed()),
            Test.resolve(FocusInput, CompletedFocusInput()),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('stale messages', () => {
        it('ignores AdvancedTransitionFrame when Idle', () => {
          Test.story(
            update,
            withOpen,
            Test.message(AdvancedTransitionFrame()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('ignores EndedTransition when Idle', () => {
          Test.story(
            update,
            withOpen,
            Test.message(EndedTransition()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('interruptions', () => {
        it('transitions to LeaveStart when Closed during EnterStart', () => {
          Test.story(
            update,
            withClosedAnimated,
            Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Test.resolveAll([
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
            Test.message(Closed()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Test.resolveAll([
              [FocusInput, CompletedFocusInput()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('transitions to LeaveStart when Closed during EnterAnimating', () => {
          Test.story(
            update,
            withClosedAnimated,
            Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Test.resolveAll([
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
            Test.message(Closed()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Test.resolveAll([
              [FocusInput, CompletedFocusInput()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })
      })

      describe('DetectedInputMovement', () => {
        it('cancels leave animation by setting transitionState to Idle', () => {
          Test.story(
            update,
            Test.with({
              ...init({ id: 'test', isAnimated: true }),
              isOpen: false,
              transitionState: 'LeaveAnimating' as const,
            }),
            Test.message(DetectedInputMovement()),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('is a no-op during Idle', () => {
          Test.story(
            update,
            withOpen,
            Test.message(DetectedInputMovement()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('is a no-op during EnterAnimating', () => {
          Test.story(
            update,
            Test.with({
              ...init({ id: 'test', isAnimated: true }),
              isOpen: true,
              transitionState: 'EnterAnimating' as const,
            }),
            Test.message(DetectedInputMovement()),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('EnterAnimating')
            }),
          )
        })
      })
    })
  })

  describe('modal commands', () => {
    const withClosedModal = Test.with(init({ id: 'test', isModal: true }))

    const withOpenModal = flow(
      withClosedModal,
      Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
      Test.resolveAll([
        [LockScroll, CompletedLockScroll()],
        [InertOthers, CompletedSetupInert()],
      ]),
    )

    it('emits lockScroll and inertOthers commands on Opened when isModal is true', () => {
      Test.story(
        update,
        withClosedModal,
        Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
        Test.resolveAll([
          [LockScroll, CompletedLockScroll()],
          [InertOthers, CompletedSetupInert()],
        ]),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(true)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on Closed when isModal is true', () => {
      Test.story(
        update,
        withOpenModal,
        Test.message(Closed()),
        Test.resolveAll([
          [FocusInput, CompletedFocusInput()],
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedTeardownInert()],
        ]),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on ClosedByTab when isModal is true', () => {
      Test.story(
        update,
        withOpenModal,
        Test.message(ClosedByTab()),
        Test.resolveAll([
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedTeardownInert()],
        ]),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on SelectedItem when isModal is true', () => {
      Test.story(
        update,
        withOpenModal,
        Test.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
        Test.resolveAll([
          [FocusInput, CompletedFocusInput()],
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedTeardownInert()],
        ]),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('does not emit modal commands when isModal is false', () => {
      Test.story(
        update,
        withClosed,
        Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(true)
        }),
        Test.message(Closed()),
        Test.resolve(FocusInput, CompletedFocusInput()),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })
  })

  describe('view', () => {
    type TestMessage = string

    const closedModel = () => init({ id: 'test' })
    const openModel = (): Model => {
      let model!: Model
      Test.story(
        update,
        withOpen,
        Test.tap(simulation => {
          model = simulation.model
        }),
      )
      return model
    }

    const baseViewConfig = (model: Model): ViewConfig<TestMessage, string> => ({
      model,
      toMessage: message => message._tag,
      items: ['Apple', 'Banana'],
      itemToConfig: () => ({ content: Effect.succeed(null) }),
      itemToValue: item => item,
      itemToDisplayText: item => item,
    })

    const renderView = (config: ViewConfig<TestMessage, string>): VNode => {
      const vnode = Effect.runSync(
        Effect.provideService(view(config), Dispatch, noOpDispatch),
      )
      if (Predicate.isNull(vnode)) {
        throw new Error('Expected vnode, got null')
      }
      return vnode
    }

    const findChildByKey = (vnode: VNode, key: string): VNode | undefined =>
      vnode.children?.find(
        (child): child is VNode =>
          typeof child !== 'string' && child.key === key,
      )

    const findAllByKey = (
      vnode: VNode,
      keyPrefix: string,
    ): ReadonlyArray<VNode> =>
      (vnode.children?.filter(
        (child): child is VNode =>
          typeof child !== 'string' &&
          typeof child.key === 'string' &&
          child.key.startsWith(keyPrefix),
      ) ?? []) as ReadonlyArray<VNode>

    const findInputElement = (vnode: VNode): VNode | undefined => {
      const inputWrapper = (vnode.children as ReadonlyArray<VNode>)?.[0]
      return (inputWrapper?.children as ReadonlyArray<VNode>)?.find(
        (child): child is VNode =>
          typeof child !== 'string' && child.sel === 'input',
      )
    }

    it('renders input with role="combobox" when closed', () => {
      const inputElement = findInputElement(
        renderView(baseViewConfig(closedModel())),
      )
      expect(inputElement?.data?.attrs?.['role']).toBe('combobox')
    })

    it('renders items container with role="listbox" when open', () => {
      const itemsContainer = findChildByKey(
        renderView(baseViewConfig(openModel())),
        'test-items-container',
      )
      expect(itemsContainer?.data?.attrs?.['role']).toBe('listbox')
    })

    it('shows items when open', () => {
      const vnode = renderView(baseViewConfig(openModel()))
      const itemsContainer = findChildByKey(vnode, 'test-items-container')
      expect(itemsContainer).toBeDefined()
      expect(findAllByKey(itemsContainer!, 'test-item-')).toHaveLength(2)
    })

    it('hides items when closed', () => {
      expect(
        findChildByKey(
          renderView(baseViewConfig(closedModel())),
          'test-items-container',
        ),
      ).toBeUndefined()
    })

    it('marks selected item with data-selected', () => {
      const model = { ...openModel(), maybeSelectedItem: Option.some('Banana') }
      const vnode = renderView(baseViewConfig(model))
      const itemsContainer = findChildByKey(vnode, 'test-items-container')
      expect(
        findChildByKey(itemsContainer!, 'test-item-0')?.data?.attrs?.[
          'data-selected'
        ],
      ).toBeUndefined()
      expect(
        findChildByKey(itemsContainer!, 'test-item-1')?.data?.attrs?.[
          'data-selected'
        ],
      ).toBe('')
    })

    it('marks active item with data-active', () => {
      const model = { ...openModel(), maybeActiveItemIndex: Option.some(1) }
      const vnode = renderView(baseViewConfig(model))
      const itemsContainer = findChildByKey(vnode, 'test-items-container')
      expect(
        findChildByKey(itemsContainer!, 'test-item-0')?.data?.attrs?.[
          'data-active'
        ],
      ).toBeUndefined()
      expect(
        findChildByKey(itemsContainer!, 'test-item-1')?.data?.attrs?.[
          'data-active'
        ],
      ).toBe('')
    })

    it('renders hidden inputs when formName set', () => {
      const model = {
        ...closedModel(),
        maybeSelectedItem: Option.some('Apple'),
      }
      const config = { ...baseViewConfig(model), formName: 'fruit' }
      const vnode = renderView(config)
      const children = vnode.children as ReadonlyArray<VNode>
      const hiddenInput = children.find(
        (child): child is VNode =>
          typeof child !== 'string' && child.sel === 'input',
      )
      expect(hiddenInput).toBeDefined()
      expect(hiddenInput?.data?.props?.['type']).toBe('hidden')
      expect(hiddenInput?.data?.props?.['name']).toBe('fruit')
      expect(hiddenInput?.data?.props?.['value']).toBe('Apple')
    })

    it('renders empty hidden input when no selection and formName set', () => {
      const config = { ...baseViewConfig(closedModel()), formName: 'fruit' }
      const vnode = renderView(config)
      const children = vnode.children as ReadonlyArray<VNode>
      const hiddenInput = children.find(
        (child): child is VNode =>
          typeof child !== 'string' && child.sel === 'input',
      )
      expect(hiddenInput).toBeDefined()
      expect(hiddenInput?.data?.props?.['type']).toBe('hidden')
      expect(hiddenInput?.data?.props?.['name']).toBe('fruit')
      expect(hiddenInput?.data?.props?.['value']).toBeUndefined()
    })

    it('items have role="option"', () => {
      const vnode = renderView(baseViewConfig(openModel()))
      const itemsContainer = findChildByKey(vnode, 'test-items-container')
      findAllByKey(itemsContainer!, 'test-item-').forEach(item => {
        expect(item.data?.attrs?.['role']).toBe('option')
      })
    })

    it('selected item has aria-selected="true"', () => {
      const model = { ...openModel(), maybeSelectedItem: Option.some('Apple') }
      const itemsContainer = findChildByKey(
        renderView(baseViewConfig(model)),
        'test-items-container',
      )
      expect(
        findChildByKey(itemsContainer!, 'test-item-0')?.data?.attrs?.[
          'aria-selected'
        ],
      ).toBe('true')
    })

    it('non-selected items have aria-selected="false"', () => {
      const model = { ...openModel(), maybeSelectedItem: Option.some('Apple') }
      const itemsContainer = findChildByKey(
        renderView(baseViewConfig(model)),
        'test-items-container',
      )
      expect(
        findChildByKey(itemsContainer!, 'test-item-1')?.data?.attrs?.[
          'aria-selected'
        ],
      ).toBe('false')
    })

    it('items container has no aria-multiselectable', () => {
      const itemsContainer = findChildByKey(
        renderView(baseViewConfig(openModel())),
        'test-items-container',
      )
      expect(
        itemsContainer?.data?.attrs?.['aria-multiselectable'],
      ).toBeUndefined()
    })

    it('input has aria-expanded when open', () => {
      expect(
        findInputElement(renderView(baseViewConfig(openModel())))?.data
          ?.attrs?.['aria-expanded'],
      ).toBe('true')
    })

    it('input has aria-expanded false when closed', () => {
      expect(
        findInputElement(renderView(baseViewConfig(closedModel())))?.data
          ?.attrs?.['aria-expanded'],
      ).toBe('false')
    })

    it('wrapper has data-disabled when isDisabled is true', () => {
      expect(
        renderView({ ...baseViewConfig(closedModel()), isDisabled: true }).data
          ?.attrs?.['data-disabled'],
      ).toBe('')
    })

    it('wrapper does not have data-disabled when isDisabled is false', () => {
      expect(
        renderView(baseViewConfig(closedModel())).data?.attrs?.[
          'data-disabled'
        ],
      ).toBeUndefined()
    })

    it('wrapper has data-invalid when isInvalid is true', () => {
      expect(
        renderView({ ...baseViewConfig(closedModel()), isInvalid: true }).data
          ?.attrs?.['data-invalid'],
      ).toBe('')
    })

    it('wrapper does not have data-invalid when isInvalid is false', () => {
      expect(
        renderView(baseViewConfig(closedModel())).data?.attrs?.['data-invalid'],
      ).toBeUndefined()
    })

    it('no hidden input when formName is not provided', () => {
      const children = renderView(baseViewConfig(closedModel()))
        .children as ReadonlyArray<VNode>
      expect(
        children.find(
          (child): child is VNode =>
            typeof child !== 'string' && child.sel === 'input',
        ),
      ).toBeUndefined()
    })

    describe('anchor', () => {
      it('adds absolute positioning, initial visibility hidden, and hooks when anchor is provided', () => {
        const config = {
          ...baseViewConfig(openModel()),
          anchor: { placement: 'bottom-start' as const },
        }
        const itemsContainer = findChildByKey(
          renderView(config),
          'test-items-container',
        )
        expect(itemsContainer?.data?.style?.position).toBe('absolute')
        expect(itemsContainer?.data?.style?.margin).toBe('0')
        expect(itemsContainer?.data?.style?.visibility).toBe('hidden')
        expect(itemsContainer?.data?.hook?.insert).toBeTypeOf('function')
        expect(itemsContainer?.data?.hook?.destroy).toBeTypeOf('function')
      })

      it('does not add positioning styles when anchor is absent', () => {
        const itemsContainer = findChildByKey(
          renderView(baseViewConfig(openModel())),
          'test-items-container',
        )
        expect(itemsContainer?.data?.style).toBeUndefined()
      })
    })

    describe('item context', () => {
      it('itemToConfig receives isSelected: true for selected item', () => {
        const model = {
          ...openModel(),
          maybeSelectedItem: Option.some('Apple'),
        }
        const contexts: Array<{
          isActive: boolean
          isDisabled: boolean
          isSelected: boolean
        }> = []
        renderView({
          ...baseViewConfig(model),
          itemToConfig: (
            _item: string,
            context: {
              isActive: boolean
              isDisabled: boolean
              isSelected: boolean
            },
          ) => {
            contexts.push(context)
            return { content: Effect.succeed(null) }
          },
        })
        expect(contexts[0]?.isSelected).toBe(true)
      })

      it('itemToConfig receives isSelected: false for non-selected items', () => {
        const model = {
          ...openModel(),
          maybeSelectedItem: Option.some('Apple'),
        }
        const contexts: Array<{
          isActive: boolean
          isDisabled: boolean
          isSelected: boolean
        }> = []
        renderView({
          ...baseViewConfig(model),
          itemToConfig: (
            _item: string,
            context: {
              isActive: boolean
              isDisabled: boolean
              isSelected: boolean
            },
          ) => {
            contexts.push(context)
            return { content: Effect.succeed(null) }
          },
        })
        expect(contexts[1]?.isSelected).toBe(false)
      })
    })
  })
})
