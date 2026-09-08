import { Option } from 'effect'
import { type HtmlBuilder, inertHtml as ih } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { evo } from 'foldkit/struct'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/index.js'
import { create, init, update } from './multi.js'
import type { Model, ViewInputs } from './multi.js'
import {
  AnchorCombobox,
  AttachComboboxPreventBlur,
  FocusInput,
  InertOthers,
  LockScroll,
  Message,
  OutMessage,
  PortalComboboxBackdrop,
  RestoreInert,
  ScrollIntoView,
  UnlockScroll,
  inputId,
} from './shared.js'

const TestCombobox = create<string>()
const view = TestCombobox.view

const acknowledgeAnchor = Scene.Mount.resolve(
  AnchorCombobox,
  Message.CompletedAnchorCombobox(),
)
const acknowledgeBackdrop = Scene.Mount.resolve(
  PortalComboboxBackdrop,
  Message.CompletedPortalComboboxBackdrop(),
)
const acknowledgePreventBlur = Scene.Mount.resolve(
  AttachComboboxPreventBlur,
  Message.CompletedAttachComboboxPreventBlur(),
)

const givenClosed = Story.given(init({ id: 'test' }))

const givenOpenMulti = Story.steps(
  givenClosed,
  Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
)

describe('Combobox.Multi', () => {
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
  })

  describe('update', () => {
    describe('SelectedItem (multiple)', () => {
      it('emits Selected with the item value', () => {
        Story.story(
          update,
          givenOpenMulti,
          Story.message(
            Message.SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: false,
            }),
          ),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
        )
      })

      it('stays open after selection', () => {
        Story.story(
          update,
          givenOpenMulti,
          Story.message(
            Message.SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: false,
            }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('emits Selected again when the same item is activated (parent toggles off)', () => {
        Story.story(
          update,
          givenOpenMulti,
          Story.message(
            Message.SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: false,
            }),
          ),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
          Story.message(
            Message.SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: true,
            }),
          ),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
        )
      })

      it('emits Selected for each activated item', () => {
        Story.story(
          update,
          givenOpenMulti,
          Story.message(
            Message.SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: false,
            }),
          ),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
          Story.message(
            Message.SelectedItem({
              item: 'banana',
              displayText: 'Banana',
              wasSelected: false,
            }),
          ),
          Story.expectOutMessage(OutMessage.Selected({ value: 'banana' })),
        )
      })

      it('preserves active item after selection', () => {
        Story.story(
          update,
          givenOpenMulti,
          Story.message(
            Message.ActivatedItem({
              index: 2,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.Command.resolve(
            ScrollIntoView,
            Message.CompletedScrollIntoView(),
          ),
          Story.message(
            Message.SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: false,
            }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })
    })

    describe('Closed', () => {
      it('resets input to empty regardless of the resting input value', () => {
        Story.story(
          update,
          Story.given(
            evo(init({ id: 'test' }), {
              isOpen: () => true,
              inputValue: () => 'app',
            }),
          ),
          Story.message(
            Message.Closed({ restingInputValue: 'Apple', isClearable: true }),
          ),
          Story.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.inputValue).toBe('')
          }),
        )
      })

      it('does not emit ClearedSelection when nullable, since the input rests empty', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test', nullable: true })),
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          ),
          Story.message(
            Message.Closed({ restingInputValue: '', isClearable: true }),
          ),
          Story.expectNoOutMessage(),
          Story.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })

      it('is a no-op when already closed', () => {
        const closedModel = evo(init({ id: 'test' }), {
          inputValue: () => 'app',
        })

        Story.story(
          update,
          Story.given(closedModel),
          Story.message(
            Message.Closed({ restingInputValue: 'Stale', isClearable: true }),
          ),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model).toStrictEqual(closedModel)
            expect(model.inputValue).toBe('app')
          }),
        )
      })
    })

    describe('handleImmediateActivation', () => {
      it('emits Selected on each immediate activation (parent toggles)', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test', immediate: true })),
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          ),
          Story.message(
            Message.ActivatedItem({
              index: 0,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.some({
                item: 'apple',
              }),
            }),
          ),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
          Story.Command.resolve(
            ScrollIntoView,
            Message.CompletedScrollIntoView(),
          ),
          Story.message(
            Message.ActivatedItem({
              index: 0,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.some({
                item: 'apple',
              }),
            }),
          ),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
          Story.Command.resolve(
            ScrollIntoView,
            Message.CompletedScrollIntoView(),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })
  })

  describe('modal commands', () => {
    const givenOpenModal = Story.steps(
      Story.given(init({ id: 'test', isModal: true })),
      Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
      Story.Command.resolveAllExact(
        [LockScroll, Message.CompletedLockScroll()],
        [InertOthers, Message.CompletedInertOthers()],
      ),
    )

    it('unwinds modal commands when closed', () => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(
          Message.Closed({ restingInputValue: '', isClearable: true }),
        ),
        Story.Command.resolveAllExact(
          [FocusInput, Message.CompletedFocusInput()],
          [UnlockScroll, Message.CompletedUnlockScroll()],
          [RestoreInert, Message.CompletedRestoreInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('stays open without unwinding modal commands after selection', () => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(
          Message.SelectedItem({
            item: 'apple',
            displayText: 'Apple',
            wasSelected: false,
          }),
        ),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
        Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
      )
    })
  })

  describe('view', () => {
    const closedModel = () => init({ id: 'test' })

    const openMultiModel = (): Model => {
      let model!: Model
      Story.story(
        update,
        givenOpenMulti,
        Story.model(extractedModel => {
          model = extractedModel
        }),
      )
      return model
    }

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
            itemToConfig: () => ({
              content: null,
            }),
            itemToValue: item => item,
            itemToDisplayText: item => item,
            selectedValues: [],
            restingInputValue: '',
            ...overrides,
          },
          h,
        )

    describe('aria-multiselectable', () => {
      it('items container has aria-multiselectable', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(openMultiModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-items-container"]')).toHaveAttr(
              'aria-multiselectable',
              'true',
            )
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })
    })

    describe('multiple data-selected', () => {
      it('multiple items have data-selected', () => {
        Scene.scene(
          {
            update,
            view: sceneView({ selectedValues: ['Apple', 'Banana'] }),
          },
          Scene.given(openMultiModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-item-0"]')).toHaveAttr(
              'data-selected',
              '',
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
    })

    describe('form integration', () => {
      it('renders multiple hidden inputs for multi-select', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              formName: 'fruit',
              selectedValues: ['Apple', 'Banana'],
            }),
          },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const inputs = Scene.findAll(html, 'input[type="hidden"]')
            expect(inputs).toHaveLength(2)
            expect(Option.some(inputs[0]!)).toHaveAttr('value', 'Apple')
            expect(Option.some(inputs[1]!)).toHaveAttr('value', 'Banana')
          }),
        )
      })

      it('renders empty hidden input when no items selected', () => {
        Scene.scene(
          { update, view: sceneView({ formName: 'fruit' }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const inputs = Scene.findAll(html, 'input[type="hidden"]')
            expect(inputs).toHaveLength(1)
            expect(Scene.find(html, 'input[type="hidden"]')).not.toHaveAttr(
              'value',
            )
          }),
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

      const toggleButtonContent = ih.span([])

      it('emits the read-only attributes on the input, panel, and items', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              isReadOnly: true,
              selectedValues: ['Apple'],
            }),
          },
          Scene.given(openMultiModel()),
          Scene.expect(input).toHaveAttr('readOnly', 'true'),
          Scene.expect(input).toHaveAttr('aria-readonly', 'true'),
          Scene.expect(input).toHaveAttr('data-readonly', ''),
          Scene.expect(itemsContainer).toHaveAttr('aria-readonly', 'true'),
          Scene.expect(itemsContainer).toHaveAttr('data-readonly', ''),
          Scene.expect(item(0)).toHaveAttr('data-readonly', ''),
          Scene.expect(item(1)).toHaveAttr('data-readonly', ''),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('emits data-readonly on the wrapper', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              isReadOnly: true,
              selectedValues: ['Apple'],
              className: 'test-wrapper',
            }),
          },
          Scene.given(openMultiModel()),
          Scene.expect(Scene.selector('.test-wrapper')).toHaveAttr(
            'data-readonly',
            '',
          ),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('emits data-readonly on the toggle button', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              isReadOnly: true,
              selectedValues: ['Apple'],
              buttonContent: toggleButtonContent,
            }),
          },
          Scene.given(openMultiModel()),
          Scene.expect(button).toHaveAttr('data-readonly', ''),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          acknowledgePreventBlur,
        )
      })

      it('emits no read-only attributes by default', () => {
        Scene.scene(
          { update, view: sceneView({ selectedValues: ['Apple'] }) },
          Scene.given(openMultiModel()),
          Scene.expect(input).not.toHaveAttr('readOnly'),
          Scene.expect(itemsContainer).not.toHaveAttr('aria-readonly'),
          Scene.expect(item(0)).not.toHaveAttr('data-readonly'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('drops the input and item click handlers', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              isReadOnly: true,
              selectedValues: ['Apple'],
            }),
          },
          Scene.given(openMultiModel()),
          Scene.expect(input).not.toHaveHandler('input'),
          Scene.expect(input).toHaveHandler('keydown'),
          Scene.expect(item(0)).not.toHaveHandler('click'),
          Scene.expect(item(1)).not.toHaveHandler('click'),
          Scene.expect(item(1)).toHaveHandler('pointerleave'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('emits Selected on item click when not read-only', () => {
        Scene.scene(
          { update, view: sceneView({ selectedValues: ['Apple'] }) },
          Scene.given(openMultiModel()),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.click(item(1)),
          Scene.expectOutMessage(OutMessage.Selected({ value: 'Banana' })),
        )
      })

      it('reports Enter on the active item as SuppressedItemCommit', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              isReadOnly: true,
              selectedValues: ['Apple'],
            }),
          },
          Scene.given(openMultiModel()),
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
            view: sceneView({
              isReadOnly: true,
              selectedValues: ['Apple'],
            }),
          },
          Scene.given(evo(openMultiModel(), { immediate: () => true })),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'ArrowDown'),
          Scene.expect(item(1)).toHaveAttr('data-active', ''),
          Scene.expectNoOutMessage(),
          Scene.Command.resolve(
            ScrollIntoView,
            Message.CompletedScrollIntoView(),
          ),
        )
      })

      it('moves the active item off the selection without changing it', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              isReadOnly: true,
              selectedValues: ['Apple'],
            }),
          },
          Scene.given(openMultiModel()),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.expect(item(0)).toHaveAttr('data-selected', ''),
          Scene.expect(item(0)).toHaveAttr('data-active', ''),
          Scene.keydown(input, 'ArrowDown'),
          Scene.expect(item(1)).toHaveAttr('data-active', ''),
          Scene.expect(item(0)).toHaveAttr('data-selected', ''),
          Scene.expect(item(1)).not.toHaveAttr('data-selected'),
          Scene.expectNoOutMessage(),
          Scene.Command.resolve(
            ScrollIntoView,
            Message.CompletedScrollIntoView(),
          ),
        )
      })

      it('passes isReadOnly to itemToConfig', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              isReadOnly: true,
              selectedValues: ['Apple'],
              itemToConfig: (_item, context) => ({
                content: null,
                className: context.isReadOnly ? 'is-read-only' : 'is-editable',
              }),
            }),
          },
          Scene.given(openMultiModel()),
          Scene.expect(item(0)).toHaveClass('is-read-only'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('does not clear the selection when Escape closes a nullable group', () => {
        Scene.scene(
          {
            update,
            view: sceneView({ isReadOnly: true, selectedValues: ['Apple'] }),
          },
          Scene.given(
            evo(openMultiModel(), {
              nullable: () => true,
              inputValue: () => '',
            }),
          ),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'Escape'),
          Scene.expectNoOutMessage(),
          Scene.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Scene.Mount.expectEnded(AnchorCombobox, PortalComboboxBackdrop),
        )
      })

      it('does not clear the selection when Escape closes a nullable group that is not read-only', () => {
        Scene.scene(
          {
            update,
            view: sceneView({ selectedValues: ['Apple'] }),
          },
          Scene.given(
            evo(openMultiModel(), {
              nullable: () => true,
              inputValue: () => '',
            }),
          ),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'Escape'),
          Scene.expectNoOutMessage(),
          Scene.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Scene.Mount.expectEnded(AnchorCombobox, PortalComboboxBackdrop),
        )
      })
    })
  })
})
