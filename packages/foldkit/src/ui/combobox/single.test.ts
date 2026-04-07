import { describe, it } from '@effect/vitest'
import { Effect, Option, flow } from 'effect'
import { expect } from 'vitest'

import * as Scene from '../../test/scene'
import * as Story from '../../test/story'
import type { Message } from './shared'
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

const withClosed = Story.with(init({ id: 'test' }))

const withOpen = flow(
  withClosed,
  Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
)

const withClosedAnimated = Story.with(init({ id: 'test', isAnimated: true }))

const withOpenAnimated = flow(
  withClosedAnimated,
  Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
  Story.resolveAll(
    [RequestFrame, AdvancedTransitionFrame()],
    [WaitForTransitions, EndedTransition()],
    [DetectMovementOrTransitionEnd, EndedTransition()],
  ),
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
        Story.story(
          update,
          withClosed,
          Story.message(Opened({ maybeActiveItemIndex: Option.some(2) })),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })

      it('resets pointer position on open', () => {
        Story.story(
          update,
          Story.with({
            ...init({ id: 'test' }),
            maybeLastPointerPosition: Option.some({
              screenX: 100,
              screenY: 200,
            }),
          }),
          Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Story.model(model => {
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })

      it('sets trigger to Keyboard when opened with active item', () => {
        Story.story(
          update,
          withClosed,
          Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Keyboard')
          }),
        )
      })

      it('sets trigger to Pointer when opened without active item', () => {
        Story.story(
          update,
          withClosed,
          Story.message(Opened({ maybeActiveItemIndex: Option.none() })),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })
    })

    describe('Closed', () => {
      it('closes and restores input to selected display text', () => {
        Story.story(
          update,
          Story.with({
            ...init({ id: 'test' }),
            isOpen: true,
            inputValue: 'app',
            maybeSelectedItem: Option.some('apple'),
            maybeSelectedDisplayText: Option.some('Apple'),
          }),
          Story.message(Closed()),
          Story.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.inputValue).toBe('Apple')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })

      it('closes with nullable and empty input clears selection', () => {
        Story.story(
          update,
          Story.with({
            ...init({ id: 'test' }),
            isOpen: true,
            nullable: true,
            inputValue: '',
            maybeSelectedItem: Option.some('apple'),
            maybeSelectedDisplayText: Option.some('Apple'),
          }),
          Story.message(Closed()),
          Story.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.inputValue).toBe('')
            expect(model.maybeSelectedItem).toStrictEqual(Option.none())
            expect(model.maybeSelectedDisplayText).toStrictEqual(Option.none())
          }),
        )
      })

      it('returns focus-input and close commands', () => {
        Story.story(
          update,
          withOpen,
          Story.message(Closed()),
          Story.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('ClosedByTab', () => {
      it('closes without focus command', () => {
        Story.story(
          update,
          withOpen,
          Story.message(ClosedByTab()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })

      it('restores input value', () => {
        Story.story(
          update,
          Story.with({
            ...init({ id: 'test' }),
            isOpen: true,
            inputValue: 'app',
            maybeSelectedDisplayText: Option.some('Apple'),
          }),
          Story.message(ClosedByTab()),
          Story.model(model => {
            expect(model.inputValue).toBe('Apple')
          }),
        )
      })
    })

    describe('ActivatedItem', () => {
      it('sets the active item index', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            ActivatedItem({
              index: 3,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
          }),
        )
      })

      it('replaces previous active item', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            ActivatedItem({
              index: 1,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.message(
            ActivatedItem({
              index: 4,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(4))
          }),
        )
      })

      it('stores activation trigger', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            ActivatedItem({
              index: 1,
              activationTrigger: 'Pointer',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Pointer')
          }),
        )
      })

      it('returns scroll command for keyboard activation', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            ActivatedItem({
              index: 2,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })

      it('applies immediate selection when maybeImmediateSelection is Some', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            ActivatedItem({
              index: 1,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.some({
                item: 'banana',
                displayText: 'Banana',
              }),
            }),
          ),
          Story.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.model(model => {
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
        Story.story(
          update,
          withOpen,
          Story.message(
            ActivatedItem({
              index: 1,
              activationTrigger: 'Pointer',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.message(DeactivatedItem()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('preserves active item when keyboard-activated', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            ActivatedItem({
              index: 2,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.message(DeactivatedItem()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })
    })

    describe('MovedPointerOverItem', () => {
      it('activates item on first pointer move', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            MovedPointerOverItem({ index: 2, screenX: 100, screenY: 200 }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeLastPointerPosition).toStrictEqual(
              Option.some({ screenX: 100, screenY: 200 }),
            )
          }),
        )
      })

      it('skips when position is same', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            MovedPointerOverItem({ index: 1, screenX: 100, screenY: 200 }),
          ),
          Story.message(
            MovedPointerOverItem({ index: 2, screenX: 100, screenY: 200 }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(1))
          }),
        )
      })

      it('updates position when different', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            MovedPointerOverItem({ index: 1, screenX: 100, screenY: 200 }),
          ),
          Story.message(
            MovedPointerOverItem({ index: 3, screenX: 150, screenY: 250 }),
          ),
          Story.model(model => {
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
        Story.story(
          update,
          withOpen,
          Story.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Story.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
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
        Story.story(
          update,
          Story.with({
            ...init({ id: 'test' }),
            isOpen: true,
            nullable: true,
            maybeSelectedItem: Option.some('apple'),
            maybeSelectedDisplayText: Option.some('Apple'),
          }),
          Story.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Story.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
            expect(model.maybeSelectedItem).toStrictEqual(Option.none())
            expect(model.maybeSelectedDisplayText).toStrictEqual(Option.none())
            expect(model.inputValue).toBe('')
            expect(model.isOpen).toBe(false)
          }),
        )
      })

      it('returns focus-input command', () => {
        Story.story(
          update,
          withOpen,
          Story.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Story.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('RequestedItemClick', () => {
      it('returns click element command', () => {
        Story.story(
          update,
          withOpen,
          Story.message(RequestedItemClick({ index: 2 })),
          Story.resolve(ClickItem, CompletedClickItem()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('UpdatedInputValue', () => {
      it('sets input value and activates first item when open', () => {
        Story.story(
          update,
          withOpen,
          Story.message(UpdatedInputValue({ value: 'app' })),
          Story.model(model => {
            expect(model.inputValue).toBe('app')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(0))
            expect(model.activationTrigger).toBe('Keyboard')
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('opens combobox when closed and typing', () => {
        Story.story(
          update,
          withClosed,
          Story.message(UpdatedInputValue({ value: 'b' })),
          Story.model(model => {
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
        Story.story(
          update,
          withClosed,
          Story.message(PressedToggleButton()),
          Story.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('closes when open', () => {
        Story.story(
          update,
          withOpen,
          Story.message(PressedToggleButton()),
          Story.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('CompletedFocusInput', () => {
      it('returns model unchanged', () => {
        Story.story(
          update,
          withOpen,
          Story.message(CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('transitions', () => {
      describe('enter flow', () => {
        it('sets EnterStart and emits nextFrame on Opened', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('EnterStart')
            }),
            Story.resolveAll(
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
          )
        })

        it('advances EnterStart to EnterAnimating on AdvancedTransitionFrame', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.resolve(RequestFrame, AdvancedTransitionFrame()),
            Story.model(model => {
              expect(model.transitionState).toBe('EnterAnimating')
            }),
            Story.resolveAll(
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
          )
        })

        it('completes EnterAnimating to Idle on EndedTransition', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.resolveAll(
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
            Story.model(model => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('leave flow', () => {
        it('sets LeaveStart on Closed', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Story.resolveAll(
              [FocusInput, CompletedFocusInput()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
          )
        })

        it('sets LeaveStart on ClosedByTab', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(ClosedByTab()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Story.resolveAll(
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
          )
        })

        it('sets LeaveStart on SelectedItem', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(
              SelectedItem({ item: 'apple', displayText: 'Apple' }),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Story.resolveAll(
              [FocusInput, CompletedFocusInput()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
          )
        })

        it('advances LeaveStart to LeaveAnimating on AdvancedTransitionFrame', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(Closed()),
            Story.resolve(RequestFrame, AdvancedTransitionFrame()),
            Story.model(model => {
              expect(model.transitionState).toBe('LeaveAnimating')
            }),
            Story.resolveAll(
              [FocusInput, CompletedFocusInput()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
          )
        })

        it('completes LeaveAnimating to Idle on EndedTransition', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(Closed()),
            Story.resolveAll(
              [FocusInput, CompletedFocusInput()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
            Story.model(model => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('non-animated', () => {
        it('keeps transitionState Idle on Opened', () => {
          Story.story(
            update,
            withClosed,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.model(model => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('keeps transitionState Idle on Closed', () => {
          Story.story(
            update,
            withOpen,
            Story.message(Closed()),
            Story.resolve(FocusInput, CompletedFocusInput()),
            Story.model(model => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('stale messages', () => {
        it('ignores AdvancedTransitionFrame when Idle', () => {
          Story.story(
            update,
            withOpen,
            Story.message(AdvancedTransitionFrame()),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('ignores EndedTransition when Idle', () => {
          Story.story(
            update,
            withOpen,
            Story.message(EndedTransition()),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('interruptions', () => {
        it('transitions to LeaveStart when Closed during EnterStart', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.resolveAll(
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
            Story.message(Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Story.resolveAll(
              [FocusInput, CompletedFocusInput()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
          )
        })

        it('transitions to LeaveStart when Closed during EnterAnimating', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.resolveAll(
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
            Story.message(Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Story.resolveAll(
              [FocusInput, CompletedFocusInput()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
          )
        })
      })

      describe('DetectedInputMovement', () => {
        it('cancels leave animation by setting transitionState to Idle', () => {
          Story.story(
            update,
            Story.with({
              ...init({ id: 'test', isAnimated: true }),
              isOpen: false,
              transitionState: 'LeaveAnimating' as const,
            }),
            Story.message(DetectedInputMovement()),
            Story.model(model => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('is a no-op during Idle', () => {
          Story.story(
            update,
            withOpen,
            Story.message(DetectedInputMovement()),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('is a no-op during EnterAnimating', () => {
          Story.story(
            update,
            Story.with({
              ...init({ id: 'test', isAnimated: true }),
              isOpen: true,
              transitionState: 'EnterAnimating' as const,
            }),
            Story.message(DetectedInputMovement()),
            Story.model(model => {
              expect(model.transitionState).toBe('EnterAnimating')
            }),
          )
        })
      })
    })
  })

  describe('modal commands', () => {
    const withClosedModal = Story.with(init({ id: 'test', isModal: true }))

    const withOpenModal = flow(
      withClosedModal,
      Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
      Story.resolveAll(
        [LockScroll, CompletedLockScroll()],
        [InertOthers, CompletedSetupInert()],
      ),
    )

    it('emits lockScroll and inertOthers commands on Opened when isModal is true', () => {
      Story.story(
        update,
        withClosedModal,
        Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
        Story.resolveAll(
          [LockScroll, CompletedLockScroll()],
          [InertOthers, CompletedSetupInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on Closed when isModal is true', () => {
      Story.story(
        update,
        withOpenModal,
        Story.message(Closed()),
        Story.resolveAll(
          [FocusInput, CompletedFocusInput()],
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedTeardownInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on ClosedByTab when isModal is true', () => {
      Story.story(
        update,
        withOpenModal,
        Story.message(ClosedByTab()),
        Story.resolveAll(
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedTeardownInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on SelectedItem when isModal is true', () => {
      Story.story(
        update,
        withOpenModal,
        Story.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
        Story.resolveAll(
          [FocusInput, CompletedFocusInput()],
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedTeardownInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('does not emit modal commands when isModal is false', () => {
      Story.story(
        update,
        withClosed,
        Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
        Story.message(Closed()),
        Story.resolve(FocusInput, CompletedFocusInput()),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })
  })

  describe('view', () => {
    const closedModel = () => init({ id: 'test' })
    const openModel = (): Model => {
      let model!: Model
      Story.story(
        update,
        withOpen,
        Story.model(extractedModel => {
          model = extractedModel
        }),
      )
      return model
    }

    const sceneView =
      (
        overrides: Omit<
          Partial<ViewConfig<Message, string>>,
          'model' | 'toParentMessage'
        > = {},
      ) =>
      (model: Model) =>
        view({
          items: ['Apple', 'Banana'],
          itemToConfig: () => ({ content: Effect.succeed(null) }),
          itemToValue: item => item,
          itemToDisplayText: item => item,
          ...overrides,
          model,
          toParentMessage: message => message,
        })

    it('renders input with role="combobox" when closed', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(closedModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'input')).toHaveAttr('role', 'combobox')
        }),
      )
    })

    it('renders items container with role="listbox" when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-items-container"]')).toHaveAttr(
            'role',
            'listbox',
          )
        }),
      )
    })

    it('shows items when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-items-container"]')).toExist()
          expect(Scene.findAll(html, '[key^="test-item-"]')).toHaveLength(2)
        }),
      )
    })

    it('hides items when closed', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(closedModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-items-container"]')).toBeAbsent()
        }),
      )
    })

    it('marks selected item with data-selected', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with({
          ...openModel(),
          maybeSelectedItem: Option.some('Banana'),
        }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-item-0"]')).not.toHaveAttr(
            'data-selected',
          )
          expect(Scene.find(html, '[key="test-item-1"]')).toHaveAttr(
            'data-selected',
            '',
          )
        }),
      )
    })

    it('marks active item with data-active', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with({
          ...openModel(),
          maybeActiveItemIndex: Option.some(1),
        }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-item-0"]')).not.toHaveAttr(
            'data-active',
          )
          expect(Scene.find(html, '[key="test-item-1"]')).toHaveAttr(
            'data-active',
            '',
          )
        }),
      )
    })

    it('renders hidden inputs when formName set', () => {
      Scene.scene(
        { update, view: sceneView({ formName: 'fruit' }) },
        Scene.with({
          ...closedModel(),
          maybeSelectedItem: Option.some('Apple'),
        }),
        Scene.tap(({ html }) => {
          const hiddenInput = Scene.find(html, 'input[type="hidden"]')
          expect(hiddenInput).toExist()
          expect(hiddenInput).toHaveAttr('name', 'fruit')
          expect(hiddenInput).toHaveAttr('value', 'Apple')
        }),
      )
    })

    it('renders empty hidden input when no selection and formName set', () => {
      Scene.scene(
        { update, view: sceneView({ formName: 'fruit' }) },
        Scene.with(closedModel()),
        Scene.tap(({ html }) => {
          const hiddenInput = Scene.find(html, 'input[type="hidden"]')
          expect(hiddenInput).toExist()
          expect(hiddenInput).toHaveAttr('name', 'fruit')
          expect(hiddenInput).not.toHaveAttr('value')
        }),
      )
    })

    it('items have role="option"', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel()),
        Scene.tap(({ html }) => {
          Scene.findAll(html, '[key^="test-item-"]').forEach(item => {
            expect(Option.some(item)).toHaveAttr('role', 'option')
          })
        }),
      )
    })

    it('selected item has aria-selected="true"', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with({
          ...openModel(),
          maybeSelectedItem: Option.some('Apple'),
        }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-item-0"]')).toHaveAttr(
            'aria-selected',
            'true',
          )
        }),
      )
    })

    it('non-selected items have aria-selected="false"', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with({
          ...openModel(),
          maybeSelectedItem: Option.some('Apple'),
        }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-item-1"]')).toHaveAttr(
            'aria-selected',
            'false',
          )
        }),
      )
    })

    it('items container has no aria-multiselectable', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel()),
        Scene.tap(({ html }) => {
          expect(
            Scene.find(html, '[key="test-items-container"]'),
          ).not.toHaveAttr('aria-multiselectable')
        }),
      )
    })

    it('input has aria-expanded when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'input')).toHaveAttr('aria-expanded', 'true')
        }),
      )
    })

    it('input has aria-expanded false when closed', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(closedModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'input')).toHaveAttr('aria-expanded', 'false')
        }),
      )
    })

    it('wrapper has data-disabled when isDisabled is true', () => {
      Scene.scene(
        { update, view: sceneView({ isDisabled: true }) },
        Scene.with(closedModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'div')).toHaveAttr('data-disabled', '')
        }),
      )
    })

    it('wrapper does not have data-disabled when isDisabled is false', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(closedModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'div')).not.toHaveAttr('data-disabled')
        }),
      )
    })

    it('wrapper has data-invalid when isInvalid is true', () => {
      Scene.scene(
        { update, view: sceneView({ isInvalid: true }) },
        Scene.with(closedModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'div')).toHaveAttr('data-invalid', '')
        }),
      )
    })

    it('wrapper does not have data-invalid when isInvalid is false', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(closedModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'div')).not.toHaveAttr('data-invalid')
        }),
      )
    })

    it('no hidden input when formName is not provided', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(closedModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'input[type="hidden"]')).toBeAbsent()
        }),
      )
    })

    describe('anchor', () => {
      it('adds absolute positioning, initial visibility hidden, and hooks when anchor is provided', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              anchor: { placement: 'bottom-start' as const },
            }),
          },
          Scene.with(openModel()),
          Scene.tap(({ html }) => {
            const itemsContainer = Scene.find(
              html,
              '[key="test-items-container"]',
            )
            expect(itemsContainer).toHaveStyle('position', 'absolute')
            expect(itemsContainer).toHaveStyle('margin', '0')
            expect(itemsContainer).toHaveStyle('visibility', 'hidden')
            expect(itemsContainer).toHaveHook('insert')
            expect(itemsContainer).toHaveHook('destroy')
          }),
        )
      })

      it('does not add positioning styles when anchor is absent', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.with(openModel()),
          Scene.tap(({ html }) => {
            expect(
              Scene.find(html, '[key="test-items-container"]'),
            ).not.toHaveStyle('position')
          }),
        )
      })
    })

    describe('item context', () => {
      it('itemToConfig receives isSelected: true for selected item', () => {
        const contexts: Array<
          Readonly<{
            isActive: boolean
            isDisabled: boolean
            isSelected: boolean
          }>
        > = []
        Scene.scene(
          {
            update,
            view: sceneView({
              itemToConfig: (
                _item: string,
                context: Readonly<{
                  isActive: boolean
                  isDisabled: boolean
                  isSelected: boolean
                }>,
              ) => {
                contexts.push(context)
                return { content: Effect.succeed(null) }
              },
            }),
          },
          Scene.with({
            ...openModel(),
            maybeSelectedItem: Option.some('Apple'),
          }),
          Scene.tap(() => {
            expect(contexts[0]?.isSelected).toBe(true)
          }),
        )
      })

      it('itemToConfig receives isSelected: false for non-selected items', () => {
        const contexts: Array<
          Readonly<{
            isActive: boolean
            isDisabled: boolean
            isSelected: boolean
          }>
        > = []
        Scene.scene(
          {
            update,
            view: sceneView({
              itemToConfig: (
                _item: string,
                context: Readonly<{
                  isActive: boolean
                  isDisabled: boolean
                  isSelected: boolean
                }>,
              ) => {
                contexts.push(context)
                return { content: Effect.succeed(null) }
              },
            }),
          },
          Scene.with({
            ...openModel(),
            maybeSelectedItem: Option.some('Apple'),
          }),
          Scene.tap(() => {
            expect(contexts[1]?.isSelected).toBe(false)
          }),
        )
      })
    })
  })
})
