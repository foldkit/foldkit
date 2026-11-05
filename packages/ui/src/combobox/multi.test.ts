import { Effect, Option, Schema } from 'effect'
import type * as Block from 'foldkit/block'
import { inertHtml as ih } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import type * as Update from 'foldkit/update'
import { it as baseIt, expect, expectTypeOf } from 'vitest'

import { describe, makeMethods } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import { makeInitialModel as makeAnimationModel } from '../animation/schema.js'
import { layer, makeBlock } from './multi.js'
import type { Model, ViewInputs } from './multi.js'
import {
  Anchor,
  AttachPreventBlur,
  FocusInput,
  InertOthers,
  LockScroll,
  Message,
  OutMessage,
  PortalBackdrop,
  RestoreInert,
  ScrollItemIntoView,
  UnlockScroll,
  inputId,
} from './shared.js'

const TestCombobox = makeBlock()

const Fruit = Schema.Literals(['Apple', 'Pear'])
type Fruit = typeof Fruit.Type

const FruitCombobox = makeBlock(Fruit)

type TestHtmlBuilder = Parameters<
  Story.TestBlock<typeof TestCombobox>['view']
>[2]

const acknowledgeAnchor = Scene.Mount.resolve(Anchor, Message.CompletedAnchor())
const acknowledgeBackdrop = Scene.Mount.resolve(
  PortalBackdrop,
  Message.CompletedPortalBackdrop(),
)
const acknowledgePreventBlur = Scene.Mount.resolve(
  AttachPreventBlur,
  Message.CompletedAttachPreventBlur(),
)

const givenClosed = Story.init({ id: 'test' })

const givenOpenMulti = Story.steps(
  Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
)

const givenOpenModal = Story.steps(
  Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
  Story.Command.resolveAllExact(
    [LockScroll, Message.CompletedLockScroll()],
    [InertOthers, Message.CompletedInertOthers()],
  ),
)

const sceneViewInputs = (
  overrides: Omit<
    Partial<ViewInputs<string>>,
    'items' | 'itemToValue' | 'itemToDisplayText'
  > = {},
): ViewInputs<string> => ({
  items: ['Apple', 'Banana'],
  itemToConfig: () => ({
    content: null,
  }),
  itemToValue: item => item,
  itemToDisplayText: item => item,
  selectedValues: [],
  restingInputValue: '',
  ...overrides,
})

const makeFixture = (block: Story.TestBlock<typeof TestCombobox>) => {
  const { init, update, view, operations } = block
  const givenClosed = Story.given(init({ id: 'test' }).model)

  const givenOpenMulti = Story.steps(
    givenClosed,
    Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
  )

  const givenOpenModal = Story.steps(
    Story.given(init({ id: 'test', isModal: true }).model),
    Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
    Story.Command.resolveAllExact(
      [LockScroll, Message.CompletedLockScroll()],
      [InertOthers, Message.CompletedInertOthers()],
    ),
  )

  const closedModel = () => init({ id: 'test' }).model

  const openMultiModel = (): Model => Story.story(update, givenOpenMulti)

  const sceneView =
    (
      overrides: Omit<
        Partial<ViewInputs<string>>,
        'items' | 'itemToValue' | 'itemToDisplayText'
      > = {},
    ) =>
    (model: Model, h: TestHtmlBuilder) =>
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
  return {
    init,
    update,
    view,
    operations,
    givenClosed,
    givenOpenMulti,
    givenOpenModal,
    closedModel,
    openMultiModel,
    sceneView,
  }
}
const it = makeMethods(
  baseIt.extend<{
    combobox: ReturnType<typeof makeFixture>
    fruit: Story.TestBlock<typeof FruitCombobox>
  }>({
    combobox: async ({}, use) =>
      Effect.runPromise(
        Story.withBlock(TestCombobox, block =>
          Effect.promise(() => use(makeFixture(block))),
        ).pipe(Effect.provide(layer)),
      ),
    fruit: async ({}, use) =>
      Effect.runPromise(
        Story.withBlock(FruitCombobox, fruit =>
          Effect.promise(() => use(fruit)),
        ).pipe(Effect.provide(layer)),
      ),
  }),
)

describe('Combobox.Multi', () => {
  describe('completed Block', () => {
    it('preserves refined payloads and registered Steps', ({
      combobox: { update, init },
      fruit,
    }) => {
      expectTypeOf<typeof FruitCombobox.OutMessage.Type>().toEqualTypeOf<
        OutMessage<Fruit>
      >()
      FruitCombobox.Message.SelectedItem({
        item: 'Apple',
        displayText: 'Apple',
        wasSelected: false,
      })
      FruitCombobox.OutMessage.Selected({ value: 'Apple' })
      FruitCombobox.Message.SelectedItem({
        // @ts-expect-error The completed factory preserves the refined Message constructor.
        item: 'Banana',
        displayText: 'Banana',
        wasSelected: false,
      })
      // @ts-expect-error The completed factory preserves the refined OutMessage constructor.
      FruitCombobox.OutMessage.Selected({ value: 'Banana' })
      expectTypeOf<
        Update.RequirementsOf<
          Block.ExecutableOf<typeof FruitCombobox>['update']
        >
      >().toEqualTypeOf<Update.RequirementsOf<typeof update>>()
      expect(FruitCombobox.owner).toBe(TestCombobox.owner)

      const selected = fruit.operations.requestSelectItem(
        init({ id: 'fruit-multi' }).model,
        'Apple',
      )
      const closed = fruit.operations.requestClose(selected.model)

      expect(selected.outMessage).toStrictEqual(
        FruitCombobox.OutMessage.Selected({ value: 'Apple' }),
      )
      expect(closed.model.isOpen).toBe(false)
    })

    it.effect('routes Animation Messages for a generic multi Combobox', () =>
      Story.story(
        FruitCombobox,
        Story.init({ id: 'fruit-combobox', isAnimated: true }),
        Story.message(
          FruitCombobox.Message.Opened({
            maybeActiveItemIndex: Option.some(0),
          }),
        ),
        Story.Command.resolveAll(
          [
            Animation.WaitForPaint,
            Animation.Message.CompletedWaitForPaint({ generation: 1 }),
          ],
          [
            Animation.WaitForAnimationSettled,
            Animation.Message.EndedAnimation({ generation: 1 }),
          ],
        ),
        Story.model(model => {
          expect(model.animation.transitionState).toBe('Idle')
        }),
      ).pipe(Effect.provide(layer)),
    )
  })

  describe('init', () => {
    it.effect('defaults to closed with no active item and an empty input', () =>
      Story.story(
        TestCombobox,
        Story.init({ id: 'test' }),
        Story.model(model => {
          expect(model).toStrictEqual({
            id: 'test',
            isOpen: false,
            isAnimated: false,
            isModal: false,
            nullable: false,
            immediate: false,
            selectInputOnFocus: false,
            animation: makeAnimationModel({ id: 'test-items' }),
            maybeActiveItemIndex: Option.none(),
            activationTrigger: 'Keyboard',
            inputValue: '',
            maybeLastPointerPosition: Option.none(),
          })
        }),
      ).pipe(Effect.provide(layer)),
    )
  })

  describe('update', () => {
    describe('SelectedItem (multiple)', () => {
      it.effect('emits Selected with the item value', () =>
        Story.story(
          TestCombobox,
          givenClosed,
          givenOpenMulti,
          Story.message(
            Message.SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: false,
            }),
          ),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
        ).pipe(Effect.provide(layer)),
      )

      it.effect('stays open after selection', () =>
        Story.story(
          TestCombobox,
          givenClosed,
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
        ).pipe(Effect.provide(layer)),
      )

      it.effect(
        'emits Selected again when the same item is activated (parent toggles off)',
        () =>
          Story.story(
            TestCombobox,
            givenClosed,
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
          ).pipe(Effect.provide(layer)),
      )

      it.effect('emits Selected for each activated item', () =>
        Story.story(
          TestCombobox,
          givenClosed,
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
        ).pipe(Effect.provide(layer)),
      )

      it.effect('preserves active item after selection', () =>
        Story.story(
          TestCombobox,
          givenClosed,
          givenOpenMulti,
          Story.message(
            Message.ActivatedItem({
              index: 2,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.Command.resolve(
            ScrollItemIntoView,
            Message.CompletedScrollItemIntoView(),
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
        ).pipe(Effect.provide(layer)),
      )
    })

    describe('Closed', () => {
      it('resets input to empty regardless of the resting input value', ({
        combobox: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(
            modifyFields(init({ id: 'test' }).model, {
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

      it.effect(
        'does not emit ClearedSelection when nullable, since the input rests empty',
        () =>
          Story.story(
            TestCombobox,
            Story.init({ id: 'test', nullable: true }),
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
          ).pipe(Effect.provide(layer)),
      )

      it('is a no-op when already closed', ({ combobox: { init, update } }) => {
        const closedModel = modifyFields(init({ id: 'test' }).model, {
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
      it.effect(
        'emits Selected on each immediate activation (parent toggles)',
        () =>
          Story.story(
            TestCombobox,
            Story.init({ id: 'test', immediate: true }),
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
              ScrollItemIntoView,
              Message.CompletedScrollItemIntoView(),
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
              ScrollItemIntoView,
              Message.CompletedScrollItemIntoView(),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
            }),
          ).pipe(Effect.provide(layer)),
      )
    })
  })

  describe('modal commands', () => {
    it.effect('unwinds modal commands when closed', () =>
      Story.story(
        TestCombobox,
        Story.init({ id: 'test', isModal: true }),
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
      ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'stays open without unwinding modal commands after selection',
      () =>
        Story.story(
          TestCombobox,
          Story.init({ id: 'test', isModal: true }),
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
        ).pipe(Effect.provide(layer)),
    )
  })

  describe('view', () => {
    describe('aria-multiselectable', () => {
      it('items container has aria-multiselectable', ({
        combobox: { update, sceneView, openMultiModel },
      }) => {
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
      it('multiple items have data-selected', ({
        combobox: { update, sceneView, openMultiModel },
      }) => {
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
      it.effect('renders multiple hidden inputs for multi-select', () =>
        Scene.scene(
          {
            block: TestCombobox,
            viewInputs: sceneViewInputs({
              formName: 'fruit',
              selectedValues: ['Apple', 'Banana'],
            }),
          },
          Scene.init({ id: 'test' }),
          Scene.tap(({ html }) => {
            const inputs = Scene.findAll(html, 'input[type="hidden"]')
            expect(inputs).toHaveLength(2)
            expect(Option.some(inputs[0]!)).toHaveAttr('value', 'Apple')
            expect(Option.some(inputs[1]!)).toHaveAttr('value', 'Banana')
          }),
        ).pipe(Effect.provide(layer)),
      )

      it.effect('renders empty hidden input when no items selected', () =>
        Scene.scene(
          {
            block: TestCombobox,
            viewInputs: sceneViewInputs({ formName: 'fruit' }),
          },
          Scene.init({ id: 'test' }),
          Scene.tap(({ html }) => {
            const inputs = Scene.findAll(html, 'input[type="hidden"]')
            expect(inputs).toHaveLength(1)
            expect(Scene.find(html, 'input[type="hidden"]')).not.toHaveAttr(
              'value',
            )
          }),
        ).pipe(Effect.provide(layer)),
      )
    })

    describe('input labeling', () => {
      it.effect(
        'no aria-label or aria-labelledby on the input by default',
        () =>
          Scene.scene(
            { block: TestCombobox, viewInputs: sceneViewInputs() },
            Scene.init({ id: 'test' }),
            Scene.tap(({ html }) => {
              const input = Scene.find(html, 'input[role="combobox"]')
              expect(input).not.toHaveAttr('aria-label')
              expect(input).not.toHaveAttr('aria-labelledby')
            }),
          ).pipe(Effect.provide(layer)),
      )

      it.effect(
        'applies aria-label to the input when ariaLabel is provided',
        () =>
          Scene.scene(
            {
              block: TestCombobox,
              viewInputs: sceneViewInputs({ ariaLabel: 'Fruit' }),
            },
            Scene.init({ id: 'test' }),
            Scene.tap(({ html }) => {
              const input = Scene.find(html, 'input[role="combobox"]')
              expect(input).toHaveAttr('aria-label', 'Fruit')
              expect(input).not.toHaveAttr('aria-labelledby')
            }),
          ).pipe(Effect.provide(layer)),
      )

      it.effect(
        'applies aria-labelledby to the input when ariaLabelledBy is provided',
        () =>
          Scene.scene(
            {
              block: TestCombobox,
              viewInputs: sceneViewInputs({ ariaLabelledBy: 'fruit-label' }),
            },
            Scene.init({ id: 'test' }),
            Scene.tap(({ html }) => {
              const input = Scene.find(html, 'input[role="combobox"]')
              expect(input).toHaveAttr('aria-labelledby', 'fruit-label')
              expect(input).not.toHaveAttr('aria-label')
            }),
          ).pipe(Effect.provide(layer)),
      )

      it.effect(
        'prefers aria-label over aria-labelledby when both are provided',
        () =>
          Scene.scene(
            {
              block: TestCombobox,
              viewInputs: sceneViewInputs({
                ariaLabel: 'Fruit',
                ariaLabelledBy: 'fruit-label',
              }),
            },
            Scene.init({ id: 'test' }),
            Scene.tap(({ html }) => {
              const input = Scene.find(html, 'input[role="combobox"]')
              expect(input).toHaveAttr('aria-label', 'Fruit')
              expect(input).not.toHaveAttr('aria-labelledby')
            }),
          ).pipe(Effect.provide(layer)),
      )

      it('inputId derives the input id from the base id', ({}) => {
        expect(inputId('test')).toBe('test-input')
      })
    })

    describe('read-only', () => {
      const input = Scene.selector('#test-input')
      const itemsContainer = Scene.selector('#test-items')
      const button = Scene.selector('#test-button')
      const item = (index: number) => Scene.selector(`#test-item-${index}`)

      const toggleButtonContent = ih.span([])

      it('emits the read-only attributes on the input, panel, and items', ({
        combobox: { update, sceneView, openMultiModel },
      }) => {
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

      it('emits data-readonly on the wrapper', ({
        combobox: { update, sceneView, openMultiModel },
      }) => {
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

      it('emits data-readonly on the toggle button', ({
        combobox: { update, sceneView, openMultiModel },
      }) => {
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

      it('emits no read-only attributes by default', ({
        combobox: { update, sceneView, openMultiModel },
      }) => {
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

      it('drops the input and item click handlers', ({
        combobox: { update, sceneView, openMultiModel },
      }) => {
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

      it('emits Selected on item click when not read-only', ({
        combobox: { update, sceneView, openMultiModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ selectedValues: ['Apple'] }) },
          Scene.given(openMultiModel()),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.click(item(1)),
          Scene.expectOutMessage(OutMessage.Selected({ value: 'Banana' })),
        )
      })

      it('reports Enter on the active item as SuppressedItemCommit', ({
        combobox: { update, sceneView, openMultiModel },
      }) => {
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

      it('does not commit while navigating an immediate combobox', ({
        combobox: { update, sceneView, openMultiModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({
              isReadOnly: true,
              selectedValues: ['Apple'],
            }),
          },
          Scene.given(
            modifyFields(openMultiModel(), { immediate: () => true }),
          ),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'ArrowDown'),
          Scene.expect(item(1)).toHaveAttr('data-active', ''),
          Scene.expectNoOutMessage(),
          Scene.Command.resolve(
            ScrollItemIntoView,
            Message.CompletedScrollItemIntoView(),
          ),
        )
      })

      it('moves the active item off the selection without changing it', ({
        combobox: { update, sceneView, openMultiModel },
      }) => {
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
            ScrollItemIntoView,
            Message.CompletedScrollItemIntoView(),
          ),
        )
      })

      it('passes isReadOnly to itemToConfig', ({
        combobox: { update, sceneView, openMultiModel },
      }) => {
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

      it('does not clear the selection when Escape closes a nullable group', ({
        combobox: { update, sceneView, openMultiModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({ isReadOnly: true, selectedValues: ['Apple'] }),
          },
          Scene.given(
            modifyFields(openMultiModel(), {
              nullable: () => true,
              inputValue: () => '',
            }),
          ),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'Escape'),
          Scene.expectNoOutMessage(),
          Scene.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Scene.Mount.expectEnded(Anchor, PortalBackdrop),
        )
      })

      it('does not clear the selection when Escape closes a nullable group that is not read-only', ({
        combobox: { update, sceneView, openMultiModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({ selectedValues: ['Apple'] }),
          },
          Scene.given(
            modifyFields(openMultiModel(), {
              nullable: () => true,
              inputValue: () => '',
            }),
          ),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'Escape'),
          Scene.expectNoOutMessage(),
          Scene.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Scene.Mount.expectEnded(Anchor, PortalBackdrop),
        )
      })
    })
  })
})
