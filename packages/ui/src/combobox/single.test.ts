import { Option, flow } from 'effect'
import { type HtmlBuilder, inertHtml as ih } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/index.js'
import {
  ActivatedItem,
  AnchorCombobox,
  AttachComboboxPreventBlur,
  BlurredInput,
  ClearedSelection,
  ClickItem,
  Closed,
  CompletedAnchorCombobox,
  CompletedAttachComboboxPreventBlur,
  CompletedClickItem,
  CompletedFocusInput,
  CompletedInertOthers,
  CompletedLockScroll,
  CompletedPortalComboboxBackdrop,
  CompletedRestoreInert,
  CompletedScrollIntoView,
  CompletedUnlockScroll,
  DeactivatedItem,
  DetectMovementOrAnimationEnd,
  FocusInput,
  GotAnimationMessage,
  InertOthers,
  LockScroll,
  type Message,
  MovedPointerOverItem,
  Opened,
  PortalComboboxBackdrop,
  PressedToggleButton,
  RequestedItemClick,
  RestoreInert,
  ScrollIntoView,
  Selected,
  SelectedItem,
  SuppressedItemCommit,
  UnlockScroll,
  UpdatedInputValue,
  inputId,
} from './shared.js'
import { create, init, update } from './single.js'
import type { Model, ViewInputs } from './single.js'

const TestCombobox = create<string>()
const view = TestCombobox.view

const acknowledgeAnchor = Scene.Mount.resolve(
  AnchorCombobox,
  CompletedAnchorCombobox(),
)
const acknowledgeBackdrop = Scene.Mount.resolve(
  PortalComboboxBackdrop,
  CompletedPortalComboboxBackdrop(),
)
const acknowledgePreventBlur = Scene.Mount.resolve(
  AttachComboboxPreventBlur,
  CompletedAttachComboboxPreventBlur(),
)

const animationEndMessage = GotAnimationMessage({
  message: Animation.EndedAnimation(),
})

const givenClosed = Story.given(init({ id: 'test' }))

const givenOpen = flow(
  givenClosed,
  Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
)

const givenClosedAnimated = Story.given(init({ id: 'test', isAnimated: true }))

const givenOpenAnimated = flow(
  givenClosedAnimated,
  Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
  Story.Command.resolveAll(
    [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
    [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
  ),
)

describe('Combobox', () => {
  describe('init', () => {
    it('defaults to closed with no active item and an empty input', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        isModal: false,
        nullable: false,
        immediate: false,
        selectInputOnFocus: false,
        animation: Animation.init({ id: 'test-items' }),
        maybeActiveItemIndex: Option.none(),
        activationTrigger: 'Keyboard',
        inputValue: '',
        maybeLastPointerPosition: Option.none(),
      })
    })

    it('accepts isAnimated option', () => {
      const model = init({ id: 'test', isAnimated: true })
      expect(model.isAnimated).toBe(true)
      expect(model.animation.transitionState).toBe('Idle')
    })

    it('defaults isModal to false', () => {
      expect(init({ id: 'test' }).isModal).toBe(false)
    })

    it('accepts isModal option', () => {
      expect(init({ id: 'test', isModal: true }).isModal).toBe(true)
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
          givenClosed,
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
          Story.given({
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
          givenClosed,
          Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Keyboard')
          }),
        )
      })

      it('sets trigger to Pointer when opened without active item', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(Opened({ maybeActiveItemIndex: Option.none() })),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })
    })

    describe('Closed', () => {
      it('closes and restores input to the resting input value', () => {
        Story.story(
          update,
          Story.given({
            ...init({ id: 'test' }),
            isOpen: true,
            inputValue: 'app',
          }),
          Story.message(
            Closed({ restingInputValue: 'Apple', isClearable: true }),
          ),
          Story.Command.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.inputValue).toBe('Apple')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })

      it('emits ClearedSelection when nullable and input is empty', () => {
        Story.story(
          update,
          Story.given({
            ...init({ id: 'test' }),
            isOpen: true,
            nullable: true,
            inputValue: '',
          }),
          Story.message(
            Closed({ restingInputValue: 'Apple', isClearable: true }),
          ),
          Story.expectOutMessage(ClearedSelection()),
          Story.Command.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.inputValue).toBe('')
          }),
        )
      })

      it('returns focus-input and close commands', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(Closed({ restingInputValue: '', isClearable: true })),
          Story.Command.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })

      it('is a no-op when already closed', () => {
        const closedModel = { ...init({ id: 'test' }), inputValue: 'Apple' }

        Story.story(
          update,
          Story.given(closedModel),
          Story.message(
            Closed({ restingInputValue: 'Stale', isClearable: true }),
          ),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model).toStrictEqual(closedModel)
            expect(model.inputValue).toBe('Apple')
          }),
        )
      })
    })

    describe('BlurredInput', () => {
      it('closes without restoring input focus', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            BlurredInput({ restingInputValue: '', isClearable: true }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })

      it('restores input value to the resting input value', () => {
        Story.story(
          update,
          Story.given({
            ...init({ id: 'test' }),
            isOpen: true,
            inputValue: 'app',
          }),
          Story.message(
            BlurredInput({ restingInputValue: 'Apple', isClearable: true }),
          ),
          Story.model(model => {
            expect(model.inputValue).toBe('Apple')
          }),
        )
      })

      it('emits ClearedSelection when nullable and input is empty', () => {
        Story.story(
          update,
          Story.given({
            ...init({ id: 'test' }),
            isOpen: true,
            nullable: true,
            inputValue: '',
          }),
          Story.message(
            BlurredInput({ restingInputValue: 'Apple', isClearable: true }),
          ),
          Story.expectOutMessage(ClearedSelection()),
          Story.model(model => {
            expect(model.inputValue).toBe('')
          }),
        )
      })

      it('is a no-op when already closed', () => {
        const closedModel = { ...init({ id: 'test' }), inputValue: 'Apple' }

        Story.story(
          update,
          Story.given(closedModel),
          Story.message(
            BlurredInput({ restingInputValue: 'Stale', isClearable: true }),
          ),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model).toStrictEqual(closedModel)
            expect(model.inputValue).toBe('Apple')
          }),
        )
      })

      it('does not emit ClearedSelection when nullable with an empty input and already closed', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test', nullable: true })),
          Story.message(
            BlurredInput({ restingInputValue: 'Stale', isClearable: true }),
          ),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.inputValue).toBe('')
          }),
        )
      })
    })

    describe('ActivatedItem', () => {
      it('sets the active item index', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            ActivatedItem({
              index: 3,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
          }),
        )
      })

      it('replaces previous active item', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            ActivatedItem({
              index: 1,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.message(
            ActivatedItem({
              index: 4,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(4))
          }),
        )
      })

      it('stores activation trigger', () => {
        Story.story(
          update,
          givenOpen,
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
          givenOpen,
          Story.message(
            ActivatedItem({
              index: 2,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })

      it('emits Selected and stays open when maybeImmediateSelection is Some', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            ActivatedItem({
              index: 1,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.some({
                item: 'banana',
              }),
            }),
          ),
          Story.expectOutMessage(Selected({ value: 'banana' })),
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(1))
          }),
        )
      })
    })

    describe('DeactivatedItem', () => {
      it('clears active item when pointer-activated', () => {
        Story.story(
          update,
          givenOpen,
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
          givenOpen,
          Story.message(
            ActivatedItem({
              index: 2,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
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
          givenOpen,
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
          givenOpen,
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
          givenOpen,
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
      it('closes, sets input to the display text, and emits Selected', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: false,
            }),
          ),
          Story.expectOutMessage(Selected({ value: 'apple' })),
          Story.Command.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
            expect(model.inputValue).toBe('Apple')
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('resets input and emits Selected when nullable and item was selected', () => {
        Story.story(
          update,
          Story.given({
            ...init({ id: 'test' }),
            isOpen: true,
            nullable: true,
            inputValue: 'Apple',
          }),
          Story.message(
            SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: true,
            }),
          ),
          Story.expectOutMessage(Selected({ value: 'apple' })),
          Story.Command.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
            expect(model.inputValue).toBe('')
            expect(model.isOpen).toBe(false)
          }),
        )
      })

      it('returns focus-input command', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: false,
            }),
          ),
          Story.Command.resolve(FocusInput, CompletedFocusInput()),
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
          givenOpen,
          Story.message(RequestedItemClick({ index: 2 })),
          Story.Command.resolve(ClickItem, CompletedClickItem()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('SuppressedItemCommit', () => {
      it('leaves the model unchanged and emits no OutMessage', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(SuppressedItemCommit()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(0))
            expect(model.inputValue).toBe('')
          }),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
        )
      })
    })

    describe('UpdatedInputValue', () => {
      it('sets input value and activates first item when open', () => {
        Story.story(
          update,
          givenOpen,
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
          givenClosed,
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
          givenClosed,
          Story.message(
            PressedToggleButton({ restingInputValue: '', isClearable: true }),
          ),
          Story.Command.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('closes and restores input to the resting input value when open', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            PressedToggleButton({
              restingInputValue: 'Apple',
              isClearable: true,
            }),
          ),
          Story.Command.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.inputValue).toBe('Apple')
          }),
        )
      })
    })

    describe('CompletedFocusInput', () => {
      it('returns model unchanged', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('transitions', () => {
      describe('enter flow', () => {
        it('starts enter transition and emits WaitForPaint on Opened', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.animation.transitionState).toBe('EnterStart')
            }),
            Story.Command.expectHas(Animation.WaitForPaint),
            Story.Command.resolveAll(
              [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
              [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
            ),
          )
        })

        it('advances EnterStart to EnterAnimating on CompletedWaitForPaint', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.Command.resolve(
              Animation.WaitForPaint,
              Animation.CompletedWaitForPaint(),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('EnterAnimating')
            }),
            Story.Command.resolveAll([
              Animation.WaitForAnimationSettled,
              Animation.EndedAnimation(),
            ]),
          )
        })

        it('completes EnterAnimating to Idle on EndedAnimation', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.Command.resolveAll(
              [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
              [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('leave flow', () => {
        it('sets LeaveStart on Closed', () => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Closed({ restingInputValue: '', isClearable: true })),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusInput, CompletedFocusInput()],
              [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('begins the leave animation when the input blurs', () => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(
              BlurredInput({ restingInputValue: '', isClearable: true }),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('sets LeaveStart on SelectedItem', () => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(
              SelectedItem({
                item: 'apple',
                displayText: 'Apple',
                wasSelected: false,
              }),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusInput, CompletedFocusInput()],
              [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('advances LeaveStart to LeaveAnimating with DetectMovementOrAnimationEnd', () => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Closed({ restingInputValue: '', isClearable: true })),
            Story.Command.resolve(
              Animation.WaitForPaint,
              Animation.CompletedWaitForPaint(),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('LeaveAnimating')
            }),
            Story.Command.expectHas(DetectMovementOrAnimationEnd),
            Story.Command.resolveAll(
              [FocusInput, CompletedFocusInput()],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('completes LeaveAnimating to Idle on transition end', () => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Closed({ restingInputValue: '', isClearable: true })),
            Story.Command.resolveAll(
              [FocusInput, CompletedFocusInput()],
              [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('non-animated', () => {
        it('keeps transitionState Idle on Opened', () => {
          Story.story(
            update,
            givenClosed,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('keeps transitionState Idle on Closed', () => {
          Story.story(
            update,
            givenOpen,
            Story.message(Closed({ restingInputValue: '', isClearable: true })),
            Story.Command.resolve(FocusInput, CompletedFocusInput()),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('stale messages', () => {
        it('ignores GotAnimationMessage with CompletedWaitForPaint when Idle', () => {
          Story.story(
            update,
            givenOpen,
            Story.message(
              GotAnimationMessage({
                message: Animation.CompletedWaitForPaint(),
              }),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('ignores GotAnimationMessage with EndedAnimation when Idle', () => {
          Story.story(
            update,
            givenOpen,
            Story.message(animationEndMessage),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('interruptions', () => {
        it('transitions to LeaveStart when Closed during enter', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.Command.resolveAll(
              [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
              [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
            ),
            Story.message(Closed({ restingInputValue: '', isClearable: true })),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusInput, CompletedFocusInput()],
              [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })
      })
    })
  })

  describe('modal commands', () => {
    const givenClosedModal = Story.given(init({ id: 'test', isModal: true }))

    const givenOpenModal = flow(
      givenClosedModal,
      Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
      Story.Command.resolveAllExact(
        [LockScroll, CompletedLockScroll()],
        [InertOthers, CompletedInertOthers()],
      ),
    )

    it('emits lockScroll and inertOthers commands on Opened when isModal is true', () => {
      Story.story(
        update,
        givenClosedModal,
        Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
        Story.Command.resolveAllExact(
          [LockScroll, CompletedLockScroll()],
          [InertOthers, CompletedInertOthers()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on Closed when isModal is true', () => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(Closed({ restingInputValue: '', isClearable: true })),
        Story.Command.resolveAllExact(
          [FocusInput, CompletedFocusInput()],
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedRestoreInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands when the input blurs in modal mode', () => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(
          BlurredInput({ restingInputValue: '', isClearable: true }),
        ),
        Story.Command.resolveAllExact(
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedRestoreInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on SelectedItem when isModal is true', () => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(
          SelectedItem({
            item: 'apple',
            displayText: 'Apple',
            wasSelected: false,
          }),
        ),
        Story.Command.resolveAllExact(
          [FocusInput, CompletedFocusInput()],
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedRestoreInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands when the toggle button closes a modal combobox', () => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(
          PressedToggleButton({ restingInputValue: '', isClearable: true }),
        ),
        Story.Command.resolveAllExact(
          [FocusInput, CompletedFocusInput()],
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedRestoreInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('does not emit cleanup commands for a stale close message', () => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(Closed({ restingInputValue: '', isClearable: true })),
        Story.Command.resolveAllExact(
          [FocusInput, CompletedFocusInput()],
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedRestoreInert()],
        ),
        Story.message(
          Closed({ restingInputValue: 'Stale', isClearable: true }),
        ),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
          expect(model.inputValue).toBe('')
        }),
      )
    })

    it('does not emit modal commands when isModal is false', () => {
      Story.story(
        update,
        givenClosed,
        Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
        Story.message(Closed({ restingInputValue: '', isClearable: true })),
        Story.Command.resolveAllExact([FocusInput, CompletedFocusInput()]),
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
        givenOpen,
        Story.model(extractedModel => {
          model = extractedModel
        }),
      )
      return model
    }

    const toggleButtonContent = ih.span([])

    const sceneView =
      (
        overrides: Omit<
          Partial<ViewInputs<string>>,
          'items' | 'itemToValue' | 'itemToDisplayText'
        > = {},
      ) =>
      (model: Model, h: HtmlBuilder<Message>) =>
        view(
          model,
          {
            items: ['Apple', 'Banana'],
            itemToConfig: () => ({ content: null }),
            itemToValue: item => item,
            itemToDisplayText: item => item,
            maybeSelectedValue: Option.none(),
            restingInputValue: '',
            ...overrides,
          },
          h,
        )

    it('renders input with role="combobox" when closed', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(closedModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'input')).toHaveAttr('role', 'combobox')
        }),
      )
    })

    it('renders items container with role="listbox" when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(openModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-items-container"]')).toHaveAttr(
            'role',
            'listbox',
          )
        }),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      )
    })

    it('shows items when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(openModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-items-container"]')).toExist()
          expect(Scene.findAll(html, '[key^="test-item-"]')).toHaveLength(2)
        }),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      )
    })

    it('hides items when closed', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(closedModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-items-container"]')).toBeAbsent()
        }),
      )
    })

    it('marks selected item with data-selected', () => {
      Scene.scene(
        {
          update,
          view: sceneView({ maybeSelectedValue: Option.some('Banana') }),
        },
        Scene.given(openModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-item-0"]')).not.toHaveAttr(
            'data-selected',
          )
          expect(Scene.find(html, '[key="test-item-1"]')).toHaveAttr(
            'data-selected',
            '',
          )
        }),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      )
    })

    it('marks active item with data-active', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given({
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
        acknowledgeAnchor,
        acknowledgeBackdrop,
      )
    })

    it('renders hidden inputs when formName set', () => {
      Scene.scene(
        {
          update,
          view: sceneView({
            formName: 'fruit',
            maybeSelectedValue: Option.some('Apple'),
          }),
        },
        Scene.given(closedModel()),
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
        Scene.given(closedModel()),
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
        Scene.given(openModel()),
        Scene.tap(({ html }) => {
          Scene.findAll(html, '[key^="test-item-"]').forEach(item => {
            expect(Option.some(item)).toHaveAttr('role', 'option')
          })
        }),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      )
    })

    it('selected item has aria-selected="true"', () => {
      Scene.scene(
        {
          update,
          view: sceneView({ maybeSelectedValue: Option.some('Apple') }),
        },
        Scene.given(openModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-item-0"]')).toHaveAttr(
            'aria-selected',
            'true',
          )
        }),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      )
    })

    it('non-selected items have aria-selected="false"', () => {
      Scene.scene(
        {
          update,
          view: sceneView({ maybeSelectedValue: Option.some('Apple') }),
        },
        Scene.given(openModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-item-1"]')).toHaveAttr(
            'aria-selected',
            'false',
          )
        }),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      )
    })

    it('items container has no aria-multiselectable', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(openModel()),
        Scene.tap(({ html }) => {
          expect(
            Scene.find(html, '[key="test-items-container"]'),
          ).not.toHaveAttr('aria-multiselectable')
        }),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      )
    })

    it('input has aria-expanded when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(openModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'input')).toHaveAttr('aria-expanded', 'true')
        }),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      )
    })

    it('input has aria-expanded false when closed', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(closedModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'input')).toHaveAttr('aria-expanded', 'false')
        }),
      )
    })

    it('wrapper has data-disabled when isDisabled is true', () => {
      Scene.scene(
        { update, view: sceneView({ isDisabled: true }) },
        Scene.given(closedModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'div')).toHaveAttr('data-disabled', '')
        }),
      )
    })

    it('wrapper does not have data-disabled when isDisabled is false', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(closedModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'div')).not.toHaveAttr('data-disabled')
        }),
      )
    })

    it('wrapper has data-invalid when isInvalid is true', () => {
      Scene.scene(
        { update, view: sceneView({ isInvalid: true }) },
        Scene.given(closedModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'div')).toHaveAttr('data-invalid', '')
        }),
      )
    })

    it('wrapper does not have data-invalid when isInvalid is false', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(closedModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'div')).not.toHaveAttr('data-invalid')
        }),
      )
    })

    it('no hidden input when formName is not provided', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(closedModel()),
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
          Scene.given(openModel()),
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
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('applies anchor positioning by default when anchor is absent', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(openModel()),
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
          acknowledgeAnchor,
          acknowledgeBackdrop,
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
              maybeSelectedValue: Option.some('Apple'),
              itemToConfig: (
                _item: string,
                context: Readonly<{
                  isActive: boolean
                  isDisabled: boolean
                  isSelected: boolean
                }>,
              ) => {
                contexts.push(context)
                return { content: null }
              },
            }),
          },
          Scene.given(openModel()),
          Scene.tap(() => {
            expect(contexts[0]?.isSelected).toBe(true)
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
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
              maybeSelectedValue: Option.some('Apple'),
              itemToConfig: (
                _item: string,
                context: Readonly<{
                  isActive: boolean
                  isDisabled: boolean
                  isSelected: boolean
                }>,
              ) => {
                contexts.push(context)
                return { content: null }
              },
            }),
          },
          Scene.given(openModel()),
          Scene.tap(() => {
            expect(contexts[1]?.isSelected).toBe(false)
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })
    })

    describe('input labeling', () => {
      it('no aria-label or aria-labelledby on the input by default', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const input = Scene.find(html, 'input[role="combobox"]')
            expect(input).not.toHaveAttr('aria-label')
            expect(input).not.toHaveAttr('aria-labelledby')
          }),
        )
      })

      it('applies aria-label to the input when ariaLabel is provided', () => {
        Scene.scene(
          { update, view: sceneView({ ariaLabel: 'Fruit' }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const input = Scene.find(html, 'input[role="combobox"]')
            expect(input).toHaveAttr('aria-label', 'Fruit')
            expect(input).not.toHaveAttr('aria-labelledby')
          }),
        )
      })

      it('applies aria-labelledby to the input when ariaLabelledBy is provided', () => {
        Scene.scene(
          { update, view: sceneView({ ariaLabelledBy: 'fruit-label' }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const input = Scene.find(html, 'input[role="combobox"]')
            expect(input).toHaveAttr('aria-labelledby', 'fruit-label')
            expect(input).not.toHaveAttr('aria-label')
          }),
        )
      })

      it('prefers aria-label over aria-labelledby when both are provided', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              ariaLabel: 'Fruit',
              ariaLabelledBy: 'fruit-label',
            }),
          },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const input = Scene.find(html, 'input[role="combobox"]')
            expect(input).toHaveAttr('aria-label', 'Fruit')
            expect(input).not.toHaveAttr('aria-labelledby')
          }),
        )
      })

      it('inputId derives the input id from the base id', () => {
        expect(inputId('test')).toBe('test-input')
      })
    })

    describe('read-only', () => {
      const input = Scene.selector('#test-input')
      const itemsContainer = Scene.selector('#test-items')
      const button = Scene.selector('#test-button')
      const item = (index: number) => Scene.selector(`#test-item-${index}`)

      const readOnlyView = (overrides: Parameters<typeof sceneView>[0] = {}) =>
        sceneView({
          isReadOnly: true,
          maybeSelectedValue: Option.some('Apple'),
          restingInputValue: 'Apple',
          ...overrides,
        })

      it('emits readonly, aria-readonly, and data-readonly on the input', () => {
        Scene.scene(
          { update, view: readOnlyView() },
          Scene.given(openModel()),
          Scene.expect(input).toHaveAttr('readOnly', 'true'),
          Scene.expect(input).toHaveAttr('aria-readonly', 'true'),
          Scene.expect(input).toHaveAttr('data-readonly', ''),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('emits aria-readonly and data-readonly on the items panel, and data-readonly on the button and every item', () => {
        Scene.scene(
          {
            update,
            view: readOnlyView({ buttonContent: toggleButtonContent }),
          },
          Scene.given(openModel()),
          Scene.expect(itemsContainer).toHaveAttr('aria-readonly', 'true'),
          Scene.expect(itemsContainer).toHaveAttr('data-readonly', ''),
          Scene.expect(button).toHaveAttr('data-readonly', ''),
          Scene.expect(item(0)).toHaveAttr('data-readonly', ''),
          Scene.expect(item(1)).toHaveAttr('data-readonly', ''),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          acknowledgePreventBlur,
        )
      })

      it('emits data-readonly on the wrapper', () => {
        Scene.scene(
          {
            update,
            view: readOnlyView({ className: 'test-wrapper' }),
          },
          Scene.given(openModel()),
          Scene.expect(Scene.selector('.test-wrapper')).toHaveAttr(
            'data-readonly',
            '',
          ),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('emits no read-only attributes by default', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              buttonContent: toggleButtonContent,
              maybeSelectedValue: Option.some('Apple'),
              restingInputValue: 'Apple',
            }),
          },
          Scene.given(openModel()),
          Scene.expect(input).not.toHaveAttr('readOnly'),
          Scene.expect(input).not.toHaveAttr('aria-readonly'),
          Scene.expect(input).not.toHaveAttr('data-readonly'),
          Scene.expect(itemsContainer).not.toHaveAttr('aria-readonly'),
          Scene.expect(itemsContainer).not.toHaveAttr('data-readonly'),
          Scene.expect(button).not.toHaveAttr('data-readonly'),
          Scene.expect(item(0)).not.toHaveAttr('data-readonly'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          acknowledgePreventBlur,
        )
      })

      it('passes isReadOnly to itemToConfig', () => {
        Scene.scene(
          {
            update,
            view: readOnlyView({
              itemToConfig: (_item, context) => ({
                content: null,
                className: context.isReadOnly ? 'is-read-only' : 'is-editable',
              }),
            }),
          },
          Scene.given(openModel()),
          Scene.expect(item(0)).toHaveClass('is-read-only'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('emits both read-only and disabled attribute sets when set together', () => {
        Scene.scene(
          {
            update,
            view: readOnlyView({
              isDisabled: true,
              buttonContent: toggleButtonContent,
            }),
          },
          Scene.given(openModel()),
          Scene.expect(input).toHaveAttr('aria-readonly', 'true'),
          Scene.expect(input).toHaveAttr('data-readonly', ''),
          Scene.expect(input).toHaveAttr('aria-disabled', 'true'),
          Scene.expect(input).toHaveAttr('data-disabled', ''),
          Scene.expect(button).toHaveAttr('data-readonly', ''),
          Scene.expect(button).toHaveAttr('data-disabled', ''),
          Scene.expect(button).toHaveAttr('aria-disabled', 'true'),
          Scene.expect(button).not.toHaveHandler('click'),
          Scene.expect(input).not.toHaveHandler('keydown'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          acknowledgePreventBlur,
        )
      })

      it('drops the input handler while keeping keydown, blur, and focus', () => {
        Scene.scene(
          {
            update,
            view: readOnlyView({ openOnFocus: true }),
          },
          Scene.given(openModel()),
          Scene.expect(input).not.toHaveHandler('input'),
          Scene.expect(input).toHaveHandler('keydown'),
          Scene.expect(input).toHaveHandler('blur'),
          Scene.expect(input).toHaveHandler('focus'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('keeps the input handler when not read-only', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              maybeSelectedValue: Option.some('Apple'),
              restingInputValue: 'Apple',
            }),
          },
          Scene.given(openModel()),
          Scene.expect(input).toHaveHandler('input'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('emits Selected on item click when not read-only', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              maybeSelectedValue: Option.some('Apple'),
              restingInputValue: 'Apple',
            }),
          },
          Scene.given(openModel()),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.click(item(1)),
          Scene.expectOutMessage(Selected({ value: 'Banana' })),
          Scene.Command.resolve(FocusInput, CompletedFocusInput()),
          Scene.Mount.expectEnded(AnchorCombobox, PortalComboboxBackdrop),
        )
      })

      it('drops the item click handler while keeping the pointer handlers', () => {
        Scene.scene(
          {
            update,
            view: readOnlyView(),
          },
          Scene.given(openModel()),
          Scene.expect(item(0)).not.toHaveHandler('click'),
          Scene.expect(item(1)).not.toHaveHandler('click'),
          Scene.expect(item(1)).toHaveHandler('pointermove'),
          Scene.expect(item(1)).toHaveHandler('pointerleave'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('reports Enter on the active item as SuppressedItemCommit', () => {
        Scene.scene(
          {
            update,
            view: readOnlyView(),
          },
          Scene.given(openModel()),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'Enter'),
          Scene.expectHandled(),
          Scene.expectNoOutMessage(),
        )
      })

      it('does not commit while navigating an immediate combobox', () => {
        Scene.scene(
          {
            update,
            view: readOnlyView(),
          },
          Scene.given({ ...openModel(), immediate: true }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'ArrowDown'),
          Scene.expect(item(1)).toHaveAttr('data-active', ''),
          Scene.expectNoOutMessage(),
          Scene.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
        )
      })

      it('commits while navigating an immediate combobox when not read-only', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              maybeSelectedValue: Option.some('Apple'),
              restingInputValue: 'Apple',
            }),
          },
          Scene.given({ ...openModel(), immediate: true }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'ArrowDown'),
          Scene.expectOutMessage(Selected({ value: 'Banana' })),
          Scene.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
        )
      })

      it('moves the active item off the selection without changing it', () => {
        Scene.scene(
          {
            update,
            view: readOnlyView(),
          },
          Scene.given(openModel()),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.expect(item(0)).toHaveAttr('data-selected', ''),
          Scene.expect(item(0)).toHaveAttr('data-active', ''),
          Scene.keydown(input, 'ArrowDown'),
          Scene.expect(item(1)).toHaveAttr('data-active', ''),
          Scene.expect(item(0)).not.toHaveAttr('data-active'),
          Scene.expect(item(0)).toHaveAttr('data-selected', ''),
          Scene.expect(item(1)).not.toHaveAttr('data-selected'),
          Scene.expect(input).toHaveAttr(
            'aria-activedescendant',
            'test-item-1',
          ),
          Scene.expectNoOutMessage(),
          Scene.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
        )
      })

      it('keeps Home and End navigation live', () => {
        Scene.scene(
          {
            update,
            view: readOnlyView(),
          },
          Scene.given(openModel()),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'End'),
          Scene.expect(item(1)).toHaveAttr('data-active', ''),
          Scene.expectNoOutMessage(),
          Scene.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Scene.keydown(input, 'Home'),
          Scene.expect(item(0)).toHaveAttr('data-active', ''),
          Scene.expectNoOutMessage(),
          Scene.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
        )
      })

      it('still opens with ArrowDown and closes on Escape', () => {
        Scene.scene(
          {
            update,
            view: readOnlyView(),
          },
          Scene.given(closedModel()),
          Scene.keydown(input, 'ArrowDown'),
          Scene.expect(itemsContainer).toExist(),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'Escape'),
          Scene.Command.resolve(FocusInput, CompletedFocusInput()),
          Scene.expect(itemsContainer).toBeAbsent(),
          Scene.Mount.expectEnded(AnchorCombobox, PortalComboboxBackdrop),
        )
      })

      it('does not emit ClearedSelection while nullable with a selection present', () => {
        Scene.scene(
          {
            update,
            view: readOnlyView(),
          },
          Scene.given({
            ...openModel(),
            nullable: true,
            inputValue: 'Apple',
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'Escape'),
          Scene.expectNoOutMessage(),
          Scene.Command.resolve(FocusInput, CompletedFocusInput()),
          Scene.Mount.expectEnded(AnchorCombobox, PortalComboboxBackdrop),
        )
      })

      it('does not clear the selection when Escape closes over an unseeded input', () => {
        Scene.scene(
          {
            update,
            view: readOnlyView(),
          },
          Scene.given({ ...openModel(), nullable: true, inputValue: '' }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'Escape'),
          Scene.expectNoOutMessage(),
          Scene.Command.resolve(FocusInput, CompletedFocusInput()),
          Scene.Mount.expectEnded(AnchorCombobox, PortalComboboxBackdrop),
        )
      })

      it('does not clear the selection when a blur closes over an unseeded input', () => {
        Scene.scene(
          {
            update,
            view: readOnlyView(),
          },
          Scene.given({ ...openModel(), nullable: true, inputValue: '' }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.blur(input),
          Scene.expectNoOutMessage(),
          Scene.Mount.expectEnded(AnchorCombobox, PortalComboboxBackdrop),
        )
      })

      it('clears the selection over an unseeded input when not read-only', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              maybeSelectedValue: Option.some('Apple'),
              restingInputValue: 'Apple',
            }),
          },
          Scene.given({ ...openModel(), nullable: true, inputValue: '' }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'Escape'),
          Scene.expectOutMessage(ClearedSelection()),
          Scene.Command.resolve(FocusInput, CompletedFocusInput()),
          Scene.Mount.expectEnded(AnchorCombobox, PortalComboboxBackdrop),
        )
      })

      it('does not report SuppressedItemCommit when no item is active', () => {
        Scene.scene(
          {
            update,
            view: readOnlyView(),
          },
          Scene.given({
            ...openModel(),
            maybeActiveItemIndex: Option.none(),
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'Enter'),
          Scene.expectIgnored(),
          Scene.expectNoOutMessage(),
        )
      })

      it('still opens from the toggle button', () => {
        Scene.scene(
          {
            update,
            view: readOnlyView({ buttonContent: toggleButtonContent }),
          },
          Scene.given(closedModel()),
          acknowledgePreventBlur,
          Scene.click(button),
          Scene.Command.resolve(FocusInput, CompletedFocusInput()),
          Scene.expect(itemsContainer).toExist(),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('emits RequestedItemClick on Enter when not read-only', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              maybeSelectedValue: Option.some('Apple'),
              restingInputValue: 'Apple',
            }),
          },
          Scene.given(openModel()),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'Enter'),
          Scene.expectHandled(),
          Scene.Command.resolve(ClickItem, CompletedClickItem()),
        )
      })
    })
  })
})
