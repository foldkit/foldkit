import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type * as BlockTypes from 'foldkit/block'
import { inertHtml as ih } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { scene } from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import { makeBlock } from './multi.js'
import type { Model as ComboboxModel, InitConfig, ViewInputs } from './multi.js'
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
  mounts,
} from './shared.js'

type Model = BlockTypes.Resolved<ComboboxModel>

const TestCombobox = makeBlock()
const testConfig: InitConfig = { id: 'test' }

const Fruit = Schema.Literals(['Apple', 'Pear'])
type Fruit = typeof Fruit.Type

const FruitCombobox = makeBlock(Fruit)

const initialModel = (config: InitConfig): Model => {
  let model!: Model
  Effect.runSync(
    story(
      TestCombobox.Live,
      config,
      Story.model(constructedModel => {
        model = constructedModel
      }),
    ),
  )
  return model
}

class ComboboxScene extends Block<ComboboxScene, ViewInputs<string>>()(
  'ComboboxScene',
  { Model: Schema.Struct({ combobox: TestCombobox }), OutMessage },
) {}

const ComboboxSceneLive = ComboboxScene.make(
  Effect.fn(function* (_id, viewInputs) {
    const combobox = yield* new TestCombobox('combobox', testConfig)

    return {
      model: { combobox },
      update: {
        ...combobox.on({
          Selected: (model, outMessage) => ({ model, outMessage }),
          ClearedSelection: (model, outMessage) => ({ model, outMessage }),
        }),
      },
      view: model => model.combobox.view(viewInputs),
    }
  }),
).pipe(Layer.provide(TestCombobox.Live))

const acknowledgeAnchor = Scene.Mount.resolve(Anchor, Message.CompletedAnchor())
const acknowledgeBackdrop = Scene.Mount.resolve(
  PortalBackdrop,
  Message.CompletedPortalBackdrop(),
)
const acknowledgePreventBlur = Scene.Mount.resolve(
  AttachPreventBlur,
  Message.CompletedAttachPreventBlur(),
)

const givenClosed = Story.given(initialModel({ id: 'test' }))

const givenOpenMulti = Story.steps(
  givenClosed,
  Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
)

describe('Combobox.Multi', () => {
  describe('completed Block', () => {
    it('preserves refined payloads with shared definitions', () => {
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
        // @ts-expect-error The factory preserves the refined Message constructor.
        item: 'Banana',
        displayText: 'Banana',
        wasSelected: false,
      })
      // @ts-expect-error The factory preserves the refined OutMessage constructor.
      FruitCombobox.OutMessage.Selected({ value: 'Banana' })
      expect(FruitCombobox.Mount).toEqual(mounts)
      expect(FruitCombobox.Command).toEqual(TestCombobox.Command)
    })

    it.effect('selects and closes through parent-sent Messages', () =>
      story(
        FruitCombobox.Live,
        { id: 'fruit-multi' },
        Story.message(
          FruitCombobox.Message.RequestedSelectItem({
            item: 'Apple',
            displayText: 'Apple',
          }),
        ),
        Story.expectOutMessage(
          FruitCombobox.OutMessage.Selected({ value: 'Apple' }),
        ),
        Story.message(
          FruitCombobox.Message.RequestedClose({
            restingInputValue: '',
            isClearable: true,
          }),
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      ),
    )

    it.effect('routes Animation Messages for a generic multi Combobox', () =>
      story(
        FruitCombobox.Live,
        { id: 'fruit-combobox', isAnimated: true },
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
      ),
    )
  })

  describe('init', () => {
    it('defaults to closed with no active item and an empty input', () => {
      expect(initialModel({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        isModal: false,
        nullable: false,
        immediate: false,
        selectInputOnFocus: false,
        animation: {
          id: 'test-items',
          isShowing: false,
          transitionState: 'Idle',
          transitionGeneration: 0,
        },
        maybeActiveItemIndex: Option.none(),
        activationTrigger: 'Keyboard',
        inputValue: '',
        maybeLastPointerPosition: Option.none(),
      })
    })
  })

  describe('update', () => {
    describe('SelectedItem (multiple)', () => {
      it.effect('emits Selected with the item value', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpenMulti,
          Story.message(
            Message.SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: false,
            }),
          ),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
        ),
      )

      it.effect('stays open after selection', () =>
        story(
          TestCombobox.Live,
          testConfig,
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
        ),
      )

      it.effect(
        'emits Selected again when the same item is activated (parent toggles off)',
        () =>
          story(
            TestCombobox.Live,
            testConfig,
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
          ),
      )

      it.effect('emits Selected for each activated item', () =>
        story(
          TestCombobox.Live,
          testConfig,
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
        ),
      )

      it.effect('preserves active item after selection', () =>
        story(
          TestCombobox.Live,
          testConfig,
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
        ),
      )
    })

    describe('Closed', () => {
      it.effect(
        'resets input to empty regardless of the resting input value',
        () =>
          story(
            TestCombobox.Live,
            testConfig,
            Story.given(
              modifyFields(initialModel({ id: 'test' }), {
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
          ),
      )

      it.effect(
        'does not emit ClearedSelection when nullable, since the input rests empty',
        () =>
          story(
            TestCombobox.Live,
            testConfig,
            Story.given(initialModel({ id: 'test', nullable: true })),
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
          ),
      )

      it.effect('is a no-op when already closed', () => {
        const closedModel = modifyFields(initialModel({ id: 'test' }), {
          inputValue: () => 'app',
        })

        return story(
          TestCombobox.Live,
          testConfig,
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
          story(
            TestCombobox.Live,
            testConfig,
            Story.given(initialModel({ id: 'test', immediate: true })),
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
          ),
      )
    })
  })

  describe('modal commands', () => {
    const givenOpenModal = Story.steps(
      Story.given(initialModel({ id: 'test', isModal: true })),
      Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
      Story.Command.resolveAllExact(
        [LockScroll, Message.CompletedLockScroll()],
        [InertOthers, Message.CompletedInertOthers()],
      ),
    )

    it.effect('unwinds modal commands when closed', () =>
      story(
        TestCombobox.Live,
        testConfig,
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
      ),
    )

    it.effect(
      'stays open without unwinding modal commands after selection',
      () =>
        story(
          TestCombobox.Live,
          testConfig,
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
        ),
    )
  })

  describe('view', () => {
    const closedModel = () => initialModel({ id: 'test' })

    const openMultiModel = (): Model => {
      let model!: Model
      Effect.runSync(
        story(
          TestCombobox.Live,
          testConfig,
          givenOpenMulti,
          Story.model(extractedModel => {
            model = extractedModel
          }),
        ),
      )
      return model
    }

    const sceneView = (
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

    describe('aria-multiselectable', () => {
      it.effect('items container has aria-multiselectable', () =>
        scene(
          ComboboxSceneLive,
          sceneView(),
          Scene.given({ combobox: openMultiModel() }),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-items-container"]')).toHaveAttr(
              'aria-multiselectable',
              'true',
            )
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )
    })

    describe('multiple data-selected', () => {
      it.effect('multiple items have data-selected', () =>
        scene(
          ComboboxSceneLive,
          sceneView({ selectedValues: ['Apple', 'Banana'] }),
          Scene.given({ combobox: openMultiModel() }),
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
        ),
      )
    })

    describe('form integration', () => {
      it.effect('renders multiple hidden inputs for multi-select', () =>
        scene(
          ComboboxSceneLive,
          sceneView({
            formName: 'fruit',
            selectedValues: ['Apple', 'Banana'],
          }),
          Scene.given({ combobox: closedModel() }),
          Scene.tap(({ html }) => {
            const inputs = Scene.findAll(html, 'input[type="hidden"]')
            expect(inputs).toHaveLength(2)
            expect(Option.some(inputs[0]!)).toHaveAttr('value', 'Apple')
            expect(Option.some(inputs[1]!)).toHaveAttr('value', 'Banana')
          }),
        ),
      )

      it.effect('renders empty hidden input when no items selected', () =>
        scene(
          ComboboxSceneLive,
          sceneView({ formName: 'fruit' }),
          Scene.given({ combobox: closedModel() }),
          Scene.tap(({ html }) => {
            const inputs = Scene.findAll(html, 'input[type="hidden"]')
            expect(inputs).toHaveLength(1)
            expect(Scene.find(html, 'input[type="hidden"]')).not.toHaveAttr(
              'value',
            )
          }),
        ),
      )
    })

    describe('input labeling', () => {
      it.effect(
        'no aria-label or aria-labelledby on the input by default',
        () =>
          scene(
            ComboboxSceneLive,
            sceneView(),
            Scene.given({ combobox: closedModel() }),
            Scene.tap(({ html }) => {
              const input = Scene.find(html, 'input[role="combobox"]')
              expect(input).not.toHaveAttr('aria-label')
              expect(input).not.toHaveAttr('aria-labelledby')
            }),
          ),
      )

      it.effect(
        'applies aria-label to the input when ariaLabel is provided',
        () =>
          scene(
            ComboboxSceneLive,
            sceneView({ ariaLabel: 'Fruit' }),
            Scene.given({ combobox: closedModel() }),
            Scene.tap(({ html }) => {
              const input = Scene.find(html, 'input[role="combobox"]')
              expect(input).toHaveAttr('aria-label', 'Fruit')
              expect(input).not.toHaveAttr('aria-labelledby')
            }),
          ),
      )

      it.effect(
        'applies aria-labelledby to the input when ariaLabelledBy is provided',
        () =>
          scene(
            ComboboxSceneLive,
            sceneView({ ariaLabelledBy: 'fruit-label' }),
            Scene.given({ combobox: closedModel() }),
            Scene.tap(({ html }) => {
              const input = Scene.find(html, 'input[role="combobox"]')
              expect(input).toHaveAttr('aria-labelledby', 'fruit-label')
              expect(input).not.toHaveAttr('aria-label')
            }),
          ),
      )

      it.effect(
        'prefers aria-label over aria-labelledby when both are provided',
        () =>
          scene(
            ComboboxSceneLive,
            sceneView({
              ariaLabel: 'Fruit',
              ariaLabelledBy: 'fruit-label',
            }),
            Scene.given({ combobox: closedModel() }),
            Scene.tap(({ html }) => {
              const input = Scene.find(html, 'input[role="combobox"]')
              expect(input).toHaveAttr('aria-label', 'Fruit')
              expect(input).not.toHaveAttr('aria-labelledby')
            }),
          ),
      )

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

      it.effect(
        'emits the read-only attributes on the input, panel, and items',
        () =>
          scene(
            ComboboxSceneLive,
            sceneView({
              isReadOnly: true,
              selectedValues: ['Apple'],
            }),
            Scene.given({ combobox: openMultiModel() }),
            Scene.expect(input).toHaveAttr('readOnly', 'true'),
            Scene.expect(input).toHaveAttr('aria-readonly', 'true'),
            Scene.expect(input).toHaveAttr('data-readonly', ''),
            Scene.expect(itemsContainer).toHaveAttr('aria-readonly', 'true'),
            Scene.expect(itemsContainer).toHaveAttr('data-readonly', ''),
            Scene.expect(item(0)).toHaveAttr('data-readonly', ''),
            Scene.expect(item(1)).toHaveAttr('data-readonly', ''),
            acknowledgeAnchor,
            acknowledgeBackdrop,
          ),
      )

      it.effect('emits data-readonly on the wrapper', () =>
        scene(
          ComboboxSceneLive,
          sceneView({
            isReadOnly: true,
            selectedValues: ['Apple'],
            className: 'test-wrapper',
          }),
          Scene.given({ combobox: openMultiModel() }),
          Scene.expect(Scene.selector('.test-wrapper')).toHaveAttr(
            'data-readonly',
            '',
          ),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )

      it.effect('emits data-readonly on the toggle button', () =>
        scene(
          ComboboxSceneLive,
          sceneView({
            isReadOnly: true,
            selectedValues: ['Apple'],
            buttonContent: toggleButtonContent,
          }),
          Scene.given({ combobox: openMultiModel() }),
          Scene.expect(button).toHaveAttr('data-readonly', ''),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          acknowledgePreventBlur,
        ),
      )

      it.effect('emits no read-only attributes by default', () =>
        scene(
          ComboboxSceneLive,
          sceneView({ selectedValues: ['Apple'] }),
          Scene.given({ combobox: openMultiModel() }),
          Scene.expect(input).not.toHaveAttr('readOnly'),
          Scene.expect(itemsContainer).not.toHaveAttr('aria-readonly'),
          Scene.expect(item(0)).not.toHaveAttr('data-readonly'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )

      it.effect('drops the input and item click handlers', () =>
        scene(
          ComboboxSceneLive,
          sceneView({
            isReadOnly: true,
            selectedValues: ['Apple'],
          }),
          Scene.given({ combobox: openMultiModel() }),
          Scene.expect(input).not.toHaveHandler('input'),
          Scene.expect(input).toHaveHandler('keydown'),
          Scene.expect(item(0)).not.toHaveHandler('click'),
          Scene.expect(item(1)).not.toHaveHandler('click'),
          Scene.expect(item(1)).toHaveHandler('pointerleave'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )

      it.effect('emits Selected on item click when not read-only', () =>
        scene(
          ComboboxSceneLive,
          sceneView({ selectedValues: ['Apple'] }),
          Scene.given({ combobox: openMultiModel() }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.click(item(1)),
          Scene.expectOutMessage(OutMessage.Selected({ value: 'Banana' })),
        ),
      )

      it.effect(
        'reports Enter on the active item as SuppressedItemCommit',
        () =>
          scene(
            ComboboxSceneLive,
            sceneView({
              isReadOnly: true,
              selectedValues: ['Apple'],
            }),
            Scene.given({ combobox: openMultiModel() }),
            acknowledgeAnchor,
            acknowledgeBackdrop,
            Scene.keydown(input, 'Enter'),
            Scene.expectHandled(),
            Scene.expectNoOutMessage(),
          ),
      )

      it.effect('does not commit while navigating an immediate combobox', () =>
        scene(
          ComboboxSceneLive,
          sceneView({
            isReadOnly: true,
            selectedValues: ['Apple'],
          }),
          Scene.given({
            combobox: modifyFields(openMultiModel(), { immediate: () => true }),
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'ArrowDown'),
          Scene.expect(item(1)).toHaveAttr('data-active', ''),
          Scene.expectNoOutMessage(),
          Scene.Command.resolve(
            ScrollItemIntoView,
            Message.CompletedScrollItemIntoView(),
          ),
        ),
      )

      it.effect(
        'moves the active item off the selection without changing it',
        () =>
          scene(
            ComboboxSceneLive,
            sceneView({
              isReadOnly: true,
              selectedValues: ['Apple'],
            }),
            Scene.given({ combobox: openMultiModel() }),
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
          ),
      )

      it.effect('passes isReadOnly to itemToConfig', () =>
        scene(
          ComboboxSceneLive,
          sceneView({
            isReadOnly: true,
            selectedValues: ['Apple'],
            itemToConfig: (_item, context) => ({
              content: null,
              className: context.isReadOnly ? 'is-read-only' : 'is-editable',
            }),
          }),
          Scene.given({ combobox: openMultiModel() }),
          Scene.expect(item(0)).toHaveClass('is-read-only'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )

      it.effect(
        'does not clear the selection when Escape closes a nullable group',
        () =>
          scene(
            ComboboxSceneLive,
            sceneView({ isReadOnly: true, selectedValues: ['Apple'] }),
            Scene.given({
              combobox: modifyFields(openMultiModel(), {
                nullable: () => true,
                inputValue: () => '',
              }),
            }),
            acknowledgeAnchor,
            acknowledgeBackdrop,
            Scene.keydown(input, 'Escape'),
            Scene.expectNoOutMessage(),
            Scene.Command.resolve(FocusInput, Message.CompletedFocusInput()),
            Scene.Mount.expectEnded(Anchor, PortalBackdrop),
          ),
      )

      it.effect(
        'does not clear the selection when Escape closes a nullable group that is not read-only',
        () =>
          scene(
            ComboboxSceneLive,
            sceneView({ selectedValues: ['Apple'] }),
            Scene.given({
              combobox: modifyFields(openMultiModel(), {
                nullable: () => true,
                inputValue: () => '',
              }),
            }),
            acknowledgeAnchor,
            acknowledgeBackdrop,
            Scene.keydown(input, 'Escape'),
            Scene.expectNoOutMessage(),
            Scene.Command.resolve(FocusInput, Message.CompletedFocusInput()),
            Scene.Mount.expectEnded(Anchor, PortalBackdrop),
          ),
      )
    })
  })
})
