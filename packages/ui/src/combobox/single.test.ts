import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type * as BlockTypes from 'foldkit/block'
import { inertHtml as ih } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { scene } from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import {
  Anchor,
  AttachPreventBlur,
  ClickItem,
  DetectMovementOrAnimationEnd,
  FocusInput,
  InertOthers,
  LockScroll,
  Message,
  OutMessage,
  PortalBackdrop,
  RestoreInert,
  ScrollItemIntoView,
  UnlockScroll,
  commandHandlers,
  inputId,
  mounts,
} from './shared.js'
import { makeBlock } from './single.js'
import type {
  Model as ComboboxModel,
  InitConfig,
  ViewInputs,
} from './single.js'

type Model = BlockTypes.Resolved<ComboboxModel>

const ModalCommandsLayer = Layer.mergeAll(
  LockScroll.toLayer<never>(Effect.succeed(commandHandlers.LockScroll)),
  UnlockScroll.toLayer<never>(Effect.succeed(commandHandlers.UnlockScroll)),
  InertOthers.toLayer<never>(Effect.succeed(commandHandlers.InertOthers)),
  RestoreInert.toLayer<never>(Effect.succeed(commandHandlers.RestoreInert)),
  FocusInput.toLayer<never>(Effect.succeed(commandHandlers.FocusInput)),
)

const TestCombobox = makeBlock()
const testConfig: InitConfig = { id: 'test' }

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

const animationMessage = (message: typeof Animation.Message.Type) =>
  Block.deliver(Animation.Animation, 'animation', message)

type SceneInput = Readonly<{
  toViewInputs: (combobox: ComboboxModel) => ViewInputs<string>
}>

class ComboboxScene extends Block<ComboboxScene, SceneInput>()(
  'ComboboxScene',
  { Model: Schema.Struct({ combobox: TestCombobox }), OutMessage },
) {}

const ComboboxSceneLive = ComboboxScene.make(
  Effect.fn(function* (_id, { toViewInputs }) {
    const combobox = yield* new TestCombobox('combobox', testConfig)

    return {
      model: { combobox },
      update: {
        ...combobox.on({
          Selected: (model, outMessage) => ({ model, outMessage }),
          ClearedSelection: (model, outMessage) => ({ model, outMessage }),
        }),
      },
      view: model => model.combobox.view(toViewInputs(model.combobox.model)),
    }
  }),
).pipe(Layer.provide(TestCombobox.Live))

const Fruit = Schema.Literals(['Apple', 'Pear'])
type Fruit = typeof Fruit.Type

const FruitCombobox = makeBlock(Fruit)

class FruitComboboxTest extends Block<FruitComboboxTest>()(
  'FruitComboboxTest',
  {
    Model: Schema.Struct({
      combobox: FruitCombobox,
      maybeSelectedFruit: Schema.Option(Fruit),
    }),
    Message: defineMessageUnion({
      RequestedSelectFruitAndClose: { item: Fruit },
    }),
  },
) {}

const FruitComboboxTestLive = FruitComboboxTest.make(
  Effect.fn(function* () {
    const combobox = yield* new FruitCombobox('combobox', { id: 'fruit' })

    return {
      model: { combobox, maybeSelectedFruit: Option.none() },
      update: {
        RequestedSelectFruitAndClose: (model, { item }) => ({
          model,
          messages: [
            model.combobox.send(
              FruitCombobox.Message.RequestedSelectItem({
                item,
                displayText: item,
              }),
            ),
            model.combobox.send(
              FruitCombobox.Message.RequestedClose({
                restingInputValue: '',
                isClearable: true,
              }),
            ),
          ],
        }),
        ...combobox.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeSelectedFruit: () => Option.some(value),
            }),
          }),
        }),
      },
      view: (model, h) =>
        h.div(
          [],
          [
            model.combobox.view({
              items: ['Apple', 'Pear'],
              restingInputValue: '',
              itemToConfig: () => ({ content: null }),
              itemToValue: item => item,
              itemToDisplayText: item => item,
              maybeSelectedValue: model.maybeSelectedFruit,
              formName: 'fruit',
            }),
          ],
        ),
    }
  }),
).pipe(Layer.provide(FruitCombobox.Live))

const acknowledgeAnchor = Scene.Mount.resolve(Anchor, Message.CompletedAnchor())
const acknowledgeBackdrop = Scene.Mount.resolve(
  PortalBackdrop,
  Message.CompletedPortalBackdrop(),
)
const acknowledgePreventBlur = Scene.Mount.resolve(
  AttachPreventBlur,
  Message.CompletedAttachPreventBlur(),
)

const completedDetectMovementOrAnimationEnd = (generation: number) =>
  Message.CompletedDetectMovementOrAnimationEnd({ generation })

const STALE_ANIMATION_GENERATION = -1

const givenClosed = Story.given(initialModel({ id: 'test' }))

const givenOpen = Story.steps(
  givenClosed,
  Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
)

const givenClosedAnimated = Story.given(
  initialModel({ id: 'test', isAnimated: true }),
)

const givenOpenAnimated = Story.steps(
  givenClosedAnimated,
  Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
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
  Story.model((model: Model) => {
    expect(model.animation.transitionState).toBe('Idle')
  }),
)

describe('Combobox', () => {
  describe('makeBlock', () => {
    it('preserves refined Message and OutMessage payloads with shared definitions', () => {
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

    it.effect('routes Animation Messages for a generic Combobox', () =>
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

    it.effect(
      'lets a parent select and close a refined Combobox through Messages',
      () =>
        story(
          FruitComboboxTestLive,
          Story.message(
            FruitComboboxTest.Message.RequestedSelectFruitAndClose({
              item: 'Apple',
            }),
          ),
          Story.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Story.model(model => {
            expect(model.maybeSelectedFruit).toStrictEqual(Option.some('Apple'))
            expect(model.combobox.inputValue).toBe('Apple')
            expect(model.combobox.isOpen).toBe(false)
          }),
        ),
    )

    it.effect('renders the refined view with the parent-owned selection', () =>
      scene(
        FruitComboboxTestLive,
        Scene.given({
          combobox: modifyFields(initialModel({ id: 'fruit' }), {
            inputValue: () => 'Pear',
          }),
          maybeSelectedFruit: Option.some<Fruit>('Pear'),
        }),
        Scene.expect(Scene.selector('#fruit-input')).toExist(),
        Scene.expect(Scene.selector('input[type="hidden"]')).toHaveAttr(
          'value',
          'Pear',
        ),
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

    it('accepts isAnimated option', () => {
      const model = initialModel({ id: 'test', isAnimated: true })
      expect(model.isAnimated).toBe(true)
      expect(model.animation.transitionState).toBe('Idle')
    })

    it('defaults isModal to false', () => {
      expect(initialModel({ id: 'test' }).isModal).toBe(false)
    })

    it('accepts isModal option', () => {
      expect(initialModel({ id: 'test', isModal: true }).isModal).toBe(true)
    })

    it('accepts nullable option', () => {
      expect(initialModel({ id: 'test', nullable: true }).nullable).toBe(true)
    })

    it('defaults nullable to false', () => {
      expect(initialModel({ id: 'test' }).nullable).toBe(false)
    })

    it('accepts immediate option', () => {
      expect(initialModel({ id: 'test', immediate: true }).immediate).toBe(true)
    })

    it('defaults immediate to false', () => {
      expect(initialModel({ id: 'test' }).immediate).toBe(false)
    })

    it('accepts selectInputOnFocus option', () => {
      expect(
        initialModel({ id: 'test', selectInputOnFocus: true })
          .selectInputOnFocus,
      ).toBe(true)
    })

    it('defaults selectInputOnFocus to false', () => {
      expect(initialModel({ id: 'test' }).selectInputOnFocus).toBe(false)
    })
  })

  describe('update', () => {
    describe('Opened', () => {
      it.effect('opens with given active item', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenClosed,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(2) }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        ),
      )

      it.effect('resets pointer position on open', () =>
        story(
          TestCombobox.Live,
          testConfig,
          Story.given(
            modifyFields(initialModel({ id: 'test' }), {
              maybeLastPointerPosition: () =>
                Option.some({
                  screenX: 100,
                  screenY: 200,
                }),
            }),
          ),
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          ),
          Story.model(model => {
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        ),
      )

      it.effect('sets trigger to Keyboard when opened with active item', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenClosed,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          ),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Keyboard')
          }),
        ),
      )

      it.effect('sets trigger to Pointer when opened without active item', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenClosed,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.none() }),
          ),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        ),
      )
    })

    describe('Closed', () => {
      it.effect('closes and restores input to the resting input value', () =>
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
            expect(model.inputValue).toBe('Apple')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        ),
      )

      it.effect('emits ClearedSelection when nullable and input is empty', () =>
        story(
          TestCombobox.Live,
          testConfig,
          Story.given(
            modifyFields(initialModel({ id: 'test' }), {
              isOpen: () => true,
              nullable: () => true,
              inputValue: () => '',
            }),
          ),
          Story.message(
            Message.Closed({ restingInputValue: 'Apple', isClearable: true }),
          ),
          Story.expectOutMessage(OutMessage.ClearedSelection()),
          Story.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.inputValue).toBe('')
          }),
        ),
      )

      it.effect('returns focus-input and close commands', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.Closed({ restingInputValue: '', isClearable: true }),
          ),
          Story.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        ),
      )

      it.effect('is a no-op when already closed', () => {
        const closedModel = modifyFields(initialModel({ id: 'test' }), {
          inputValue: () => 'Apple',
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
            expect(model.inputValue).toBe('Apple')
          }),
        )
      })
    })

    describe('BlurredInput', () => {
      it.effect('closes without restoring input focus', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.BlurredInput({ restingInputValue: '', isClearable: true }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        ),
      )

      it.effect('restores input value to the resting input value', () =>
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
            Message.BlurredInput({
              restingInputValue: 'Apple',
              isClearable: true,
            }),
          ),
          Story.model(model => {
            expect(model.inputValue).toBe('Apple')
          }),
        ),
      )

      it.effect('emits ClearedSelection when nullable and input is empty', () =>
        story(
          TestCombobox.Live,
          testConfig,
          Story.given(
            modifyFields(initialModel({ id: 'test' }), {
              isOpen: () => true,
              nullable: () => true,
              inputValue: () => '',
            }),
          ),
          Story.message(
            Message.BlurredInput({
              restingInputValue: 'Apple',
              isClearable: true,
            }),
          ),
          Story.expectOutMessage(OutMessage.ClearedSelection()),
          Story.model(model => {
            expect(model.inputValue).toBe('')
          }),
        ),
      )

      it.effect('is a no-op when already closed', () => {
        const closedModel = modifyFields(initialModel({ id: 'test' }), {
          inputValue: () => 'Apple',
        })

        return story(
          TestCombobox.Live,
          testConfig,
          Story.given(closedModel),
          Story.message(
            Message.BlurredInput({
              restingInputValue: 'Stale',
              isClearable: true,
            }),
          ),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model).toStrictEqual(closedModel)
            expect(model.inputValue).toBe('Apple')
          }),
        )
      })

      it.effect(
        'does not emit ClearedSelection when nullable with an empty input and already closed',
        () =>
          story(
            TestCombobox.Live,
            testConfig,
            Story.given(initialModel({ id: 'test', nullable: true })),
            Story.message(
              Message.BlurredInput({
                restingInputValue: 'Stale',
                isClearable: true,
              }),
            ),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.inputValue).toBe('')
            }),
          ),
      )
    })

    describe('ActivatedItem', () => {
      it.effect('sets the active item index', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.ActivatedItem({
              index: 3,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.Command.resolve(
            ScrollItemIntoView,
            Message.CompletedScrollItemIntoView(),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
          }),
        ),
      )

      it.effect('replaces previous active item', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.ActivatedItem({
              index: 1,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.Command.resolve(
            ScrollItemIntoView,
            Message.CompletedScrollItemIntoView(),
          ),
          Story.message(
            Message.ActivatedItem({
              index: 4,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.Command.resolve(
            ScrollItemIntoView,
            Message.CompletedScrollItemIntoView(),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(4))
          }),
        ),
      )

      it.effect('stores activation trigger', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.ActivatedItem({
              index: 1,
              activationTrigger: 'Pointer',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Pointer')
          }),
        ),
      )

      it.effect('returns scroll command for keyboard activation', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpen,
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
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        ),
      )

      it.effect(
        'emits Selected and stays open when maybeImmediateSelection is Some',
        () =>
          story(
            TestCombobox.Live,
            testConfig,
            givenOpen,
            Story.message(
              Message.ActivatedItem({
                index: 1,
                activationTrigger: 'Keyboard',
                maybeImmediateSelection: Option.some({
                  item: 'banana',
                }),
              }),
            ),
            Story.expectOutMessage(OutMessage.Selected({ value: 'banana' })),
            Story.Command.resolve(
              ScrollItemIntoView,
              Message.CompletedScrollItemIntoView(),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(1))
            }),
          ),
      )
    })

    describe('DeactivatedItem', () => {
      it.effect('clears active item when pointer-activated', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.ActivatedItem({
              index: 1,
              activationTrigger: 'Pointer',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.message(Message.DeactivatedItem()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        ),
      )

      it.effect('preserves active item when keyboard-activated', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpen,
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
          Story.message(Message.DeactivatedItem()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        ),
      )
    })

    describe('MovedPointerOverItem', () => {
      it.effect('activates item on first pointer move', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.MovedPointerOverItem({
              index: 2,
              screenX: 100,
              screenY: 200,
            }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeLastPointerPosition).toStrictEqual(
              Option.some({ screenX: 100, screenY: 200 }),
            )
          }),
        ),
      )

      it.effect('skips when position is same', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.MovedPointerOverItem({
              index: 1,
              screenX: 100,
              screenY: 200,
            }),
          ),
          Story.message(
            Message.MovedPointerOverItem({
              index: 2,
              screenX: 100,
              screenY: 200,
            }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(1))
          }),
        ),
      )

      it.effect('updates position when different', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.MovedPointerOverItem({
              index: 1,
              screenX: 100,
              screenY: 200,
            }),
          ),
          Story.message(
            Message.MovedPointerOverItem({
              index: 3,
              screenX: 150,
              screenY: 250,
            }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
            expect(model.maybeLastPointerPosition).toStrictEqual(
              Option.some({ screenX: 150, screenY: 250 }),
            )
          }),
        ),
      )
    })

    describe('SelectedItem', () => {
      it.effect(
        'closes, sets input to the display text, and emits Selected',
        () =>
          story(
            TestCombobox.Live,
            testConfig,
            givenOpen,
            Story.message(
              Message.SelectedItem({
                item: 'apple',
                displayText: 'Apple',
                wasSelected: false,
              }),
            ),
            Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
            Story.Command.resolve(FocusInput, Message.CompletedFocusInput()),
            Story.model(model => {
              expect(model.inputValue).toBe('Apple')
              expect(model.isOpen).toBe(false)
              expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            }),
          ),
      )

      it.effect(
        'resets input and emits Selected when nullable and item was selected',
        () =>
          story(
            TestCombobox.Live,
            testConfig,
            Story.given(
              modifyFields(initialModel({ id: 'test' }), {
                isOpen: () => true,
                nullable: () => true,
                inputValue: () => 'Apple',
              }),
            ),
            Story.message(
              Message.SelectedItem({
                item: 'apple',
                displayText: 'Apple',
                wasSelected: true,
              }),
            ),
            Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
            Story.Command.resolve(FocusInput, Message.CompletedFocusInput()),
            Story.model(model => {
              expect(model.inputValue).toBe('')
              expect(model.isOpen).toBe(false)
            }),
          ),
      )

      it.effect('returns focus-input command', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: false,
            }),
          ),
          Story.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        ),
      )
    })

    describe('RequestedItemClick', () => {
      it.effect('returns click element command', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpen,
          Story.message(Message.RequestedItemClick({ index: 2 })),
          Story.Command.resolve(ClickItem, Message.CompletedClickItem()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
      )
    })

    describe('SuppressedItemCommit', () => {
      it.effect('leaves the model unchanged and emits no OutMessage', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpen,
          Story.message(Message.SuppressedItemCommit()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(0))
            expect(model.inputValue).toBe('')
          }),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
        ),
      )
    })

    describe('UpdatedInputValue', () => {
      it.effect('sets input value and activates first item when open', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpen,
          Story.message(Message.UpdatedInputValue({ value: 'app' })),
          Story.model(model => {
            expect(model.inputValue).toBe('app')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(0))
            expect(model.activationTrigger).toBe('Keyboard')
            expect(model.isOpen).toBe(true)
          }),
        ),
      )

      it.effect('opens combobox when closed and typing', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenClosed,
          Story.message(Message.UpdatedInputValue({ value: 'b' })),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.inputValue).toBe('b')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(0))
            expect(model.activationTrigger).toBe('Keyboard')
          }),
        ),
      )
    })

    describe('PressedToggleButton', () => {
      it.effect('opens when closed', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenClosed,
          Story.message(
            Message.PressedToggleButton({
              restingInputValue: '',
              isClearable: true,
            }),
          ),
          Story.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        ),
      )

      it.effect(
        'closes and restores input to the resting input value when open',
        () =>
          story(
            TestCombobox.Live,
            testConfig,
            givenOpen,
            Story.message(
              Message.PressedToggleButton({
                restingInputValue: 'Apple',
                isClearable: true,
              }),
            ),
            Story.Command.resolve(FocusInput, Message.CompletedFocusInput()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.inputValue).toBe('Apple')
            }),
          ),
      )
    })

    describe('CompletedFocusInput', () => {
      it.effect('returns model unchanged', () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpen,
          Story.message(Message.CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
      )
    })

    describe('transitions', () => {
      describe('enter flow', () => {
        it.effect(
          'starts enter transition and emits WaitForPaint on Opened',
          () =>
            story(
              TestCombobox.Live,
              testConfig,
              givenClosedAnimated,
              Story.message(
                Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
              ),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
                expect(model.animation.transitionState).toBe('EnterStart')
              }),
              Story.Command.expectHas(Animation.WaitForPaint),
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
            ),
        )

        it.effect(
          'advances EnterStart to EnterAnimating on CompletedWaitForPaint',
          () =>
            story(
              TestCombobox.Live,
              testConfig,
              givenClosedAnimated,
              Story.message(
                Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
              ),
              Story.Command.resolve(
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 1 }),
              ),
              Story.model(model => {
                expect(model.animation.transitionState).toBe('EnterAnimating')
              }),
              Story.Command.resolveAll([
                Animation.WaitForAnimationSettled,
                Animation.Message.EndedAnimation({ generation: 1 }),
              ]),
            ),
        )

        it.effect('completes EnterAnimating to Idle on EndedAnimation', () =>
          story(
            TestCombobox.Live,
            testConfig,
            givenClosedAnimated,
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
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

      describe('leave flow', () => {
        it.effect(
          'preserves ClearedSelection when an animated nullable Combobox closes',
          () =>
            story(
              TestCombobox.Live,
              { id: 'animated-nullable', isAnimated: true, nullable: true },
              Story.message(
                Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
              ),
              Story.message(
                Message.Closed({ restingInputValue: '', isClearable: true }),
              ),
              Story.expectOutMessage(OutMessage.ClearedSelection()),
              Story.model(model => {
                expect(model.isOpen).toBe(false)
                expect(model.animation.transitionState).toBe('LeaveStart')
              }),
              Story.Command.expectExact(
                Animation.WaitForPaint({ generation: 1 }),
                FocusInput({ id: 'animated-nullable' }),
                Animation.WaitForPaint({ generation: 2 }),
              ),
              Story.Command.resolveAll(
                [
                  Animation.WaitForPaint({ generation: 1 }),
                  Animation.Message.CompletedWaitForPaint({ generation: 1 }),
                ],
                [FocusInput, Message.CompletedFocusInput()],
                [
                  Animation.WaitForPaint({ generation: 2 }),
                  Animation.Message.CompletedWaitForPaint({ generation: 2 }),
                ],
                [
                  DetectMovementOrAnimationEnd,
                  completedDetectMovementOrAnimationEnd(2),
                ],
              ),
            ),
        )

        it.effect('sets LeaveStart on Closed', () =>
          story(
            TestCombobox.Live,
            testConfig,
            givenOpenAnimated,
            Story.message(
              Message.Closed({ restingInputValue: '', isClearable: true }),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusInput, Message.CompletedFocusInput()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [
                DetectMovementOrAnimationEnd,
                completedDetectMovementOrAnimationEnd(2),
              ],
            ),
          ),
        )

        it.effect('begins the leave animation when the input blurs', () =>
          story(
            TestCombobox.Live,
            testConfig,
            givenOpenAnimated,
            Story.message(
              Message.BlurredInput({
                restingInputValue: '',
                isClearable: true,
              }),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [
                DetectMovementOrAnimationEnd,
                completedDetectMovementOrAnimationEnd(2),
              ],
            ),
          ),
        )

        it.effect('sets LeaveStart on SelectedItem', () =>
          story(
            TestCombobox.Live,
            testConfig,
            givenOpenAnimated,
            Story.message(
              Message.SelectedItem({
                item: 'apple',
                displayText: 'Apple',
                wasSelected: false,
              }),
            ),
            Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusInput, Message.CompletedFocusInput()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [
                DetectMovementOrAnimationEnd,
                completedDetectMovementOrAnimationEnd(2),
              ],
            ),
          ),
        )

        it.effect(
          'advances LeaveStart to LeaveAnimating with DetectMovementOrAnimationEnd',
          () =>
            story(
              TestCombobox.Live,
              testConfig,
              givenOpenAnimated,
              Story.message(
                Message.Closed({ restingInputValue: '', isClearable: true }),
              ),
              Story.Command.resolve(
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ),
              Story.model(model => {
                expect(model.animation.transitionState).toBe('LeaveAnimating')
              }),
              Story.Command.expectHas(
                DetectMovementOrAnimationEnd({
                  id: 'test',
                  generation: 2,
                }),
              ),
              Story.Command.resolveAll(
                [FocusInput, Message.CompletedFocusInput()],
                [
                  DetectMovementOrAnimationEnd,
                  completedDetectMovementOrAnimationEnd(2),
                ],
              ),
            ),
        )

        it.effect('completes LeaveAnimating to Idle on transition end', () =>
          story(
            TestCombobox.Live,
            testConfig,
            givenOpenAnimated,
            Story.message(
              Message.Closed({ restingInputValue: '', isClearable: true }),
            ),
            Story.Command.resolveAll(
              [FocusInput, Message.CompletedFocusInput()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [
                DetectMovementOrAnimationEnd,
                completedDetectMovementOrAnimationEnd(2),
              ],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          ),
        )
      })

      describe('non-animated', () => {
        it.effect('keeps transitionState Idle on Opened', () =>
          story(
            TestCombobox.Live,
            testConfig,
            givenClosed,
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          ),
        )

        it.effect('keeps transitionState Idle on Closed', () =>
          story(
            TestCombobox.Live,
            testConfig,
            givenOpen,
            Story.message(
              Message.Closed({ restingInputValue: '', isClearable: true }),
            ),
            Story.Command.resolve(FocusInput, Message.CompletedFocusInput()),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          ),
        )
      })

      describe('stale messages', () => {
        it.effect(
          'ignores GotAnimationMessage with CompletedWaitForPaint when Idle',
          () =>
            story(
              TestCombobox.Live,
              testConfig,
              givenOpen,
              Story.message(
                animationMessage(
                  Animation.Message.CompletedWaitForPaint({
                    generation: 0,
                  }),
                ),
              ),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
                expect(model.animation.transitionState).toBe('Idle')
              }),
            ),
        )

        it.effect(
          'ignores CompletedDetectMovementOrAnimationEnd when Idle',
          () =>
            story(
              TestCombobox.Live,
              testConfig,
              givenOpen,
              Story.message(completedDetectMovementOrAnimationEnd(0)),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
                expect(model.animation.transitionState).toBe('Idle')
              }),
            ),
        )
      })

      describe('interruptions', () => {
        it.effect('transitions to LeaveStart when Closed during enter', () =>
          story(
            TestCombobox.Live,
            testConfig,
            givenClosedAnimated,
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            Story.Command.resolveAll(
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 1 }),
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.Message.EndedAnimation({
                  generation: STALE_ANIMATION_GENERATION,
                }),
              ],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('EnterAnimating')
            }),
            Story.message(
              Message.Closed({ restingInputValue: '', isClearable: true }),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusInput, Message.CompletedFocusInput()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [
                DetectMovementOrAnimationEnd,
                completedDetectMovementOrAnimationEnd(2),
              ],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          ),
        )
      })
    })
  })

  describe('modal commands', () => {
    const givenClosedModal = Story.given(
      initialModel({ id: 'test', isModal: true }),
    )

    const givenOpenModal = Story.steps(
      givenClosedModal,
      Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
      Story.Command.resolveAllExact(
        [LockScroll, Message.CompletedLockScroll()],
        [InertOthers, Message.CompletedInertOthers()],
      ),
    )

    it.effect(
      'emits lockScroll and inertOthers commands on Opened when isModal is true',
      () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenClosedModal,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          ),
          Story.Command.resolveAllExact(
            [LockScroll, Message.CompletedLockScroll()],
            [InertOthers, Message.CompletedInertOthers()],
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
    )

    it.effect(
      'emits no Commands when RequestedOpen or Opened reaches an open modal Model',
      () => {
        const openModal = modifyFields(
          initialModel({ id: 'test', isModal: true }),
          {
            isOpen: () => true,
            maybeActiveItemIndex: () => Option.some(1),
            activationTrigger: () => 'Keyboard',
            inputValue: () => 'Ap',
          },
        )

        return Effect.forEach(
          [
            Message.RequestedOpen(),
            Message.Opened({ maybeActiveItemIndex: Option.none() }),
          ],
          reopen =>
            story(
              TestCombobox.Live,
              testConfig,
              Story.given(openModal),
              Story.message(reopen),
              Story.Command.expectNone(),
              Story.expectNoOutMessage(),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
                expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(1))
                expect(model.activationTrigger).toBe('Keyboard')
                expect(model.inputValue).toBe('Ap')
              }),
            ),
          { discard: true },
        )
      },
    )

    it.effect(
      'emits no Commands when focus opens a modal combobox the toggle already opened',
      () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenClosedModal,
          Story.message(
            Message.PressedToggleButton({
              restingInputValue: '',
              isClearable: true,
            }),
          ),
          Story.Command.resolveAllExact(
            [FocusInput, Message.CompletedFocusInput()],
            [LockScroll, Message.CompletedLockScroll()],
            [InertOthers, Message.CompletedInertOthers()],
          ),
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          ),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.activationTrigger).toBe('Pointer')
          }),
        ),
    )

    it.effect(
      'emits unlockScroll and restoreInert commands on Closed when isModal is true',
      () =>
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
      'emits unlockScroll and restoreInert commands when the input blurs in modal mode',
      () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpenModal,
          Story.message(
            Message.BlurredInput({ restingInputValue: '', isClearable: true }),
          ),
          Story.Command.resolveAllExact(
            [UnlockScroll, Message.CompletedUnlockScroll()],
            [RestoreInert, Message.CompletedRestoreInert()],
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        ),
    )

    it.effect(
      'emits unlockScroll and restoreInert commands on SelectedItem when isModal is true',
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
      'emits unlockScroll and restoreInert commands when the toggle button closes a modal combobox',
      () =>
        story(
          TestCombobox.Live,
          testConfig,
          givenOpenModal,
          Story.message(
            Message.PressedToggleButton({
              restingInputValue: '',
              isClearable: true,
            }),
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

    it.effect('does not emit cleanup commands for a stale close message', () =>
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
        Story.message(
          Message.Closed({ restingInputValue: 'Stale', isClearable: true }),
        ),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
          expect(model.inputValue).toBe('')
        }),
      ),
    )

    it.effect('does not emit modal commands when isModal is false', () =>
      story(
        TestCombobox.Live,
        testConfig,
        givenClosed,
        Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
        Story.message(
          Message.Closed({ restingInputValue: '', isClearable: true }),
        ),
        Story.Command.resolveAllExact([
          FocusInput,
          Message.CompletedFocusInput(),
        ]),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      ),
    )
  })

  describe('view', () => {
    const closedModel = () => initialModel({ id: 'test' })
    const openModel = (): Model => {
      let model!: Model
      Effect.runSync(
        story(
          TestCombobox.Live,
          testConfig,
          givenOpen,
          Story.model(extractedModel => {
            model = extractedModel
          }),
        ),
      )
      return model
    }

    const toggleButtonContent = ih.span([])

    type Overrides = Omit<
      Partial<ViewInputs<string>>,
      'items' | 'itemToValue' | 'itemToDisplayText'
    >

    const sceneView = (overrides: Overrides = {}): SceneInput => ({
      toViewInputs: () => ({
        items: ['Apple', 'Banana'],
        itemToConfig: () => ({ content: null }),
        itemToValue: item => item,
        itemToDisplayText: item => item,
        maybeSelectedValue: Option.none(),
        restingInputValue: '',
        ...overrides,
      }),
    })

    const emptyItemsView = (overrides: Overrides = {}): SceneInput => ({
      toViewInputs: () => ({
        items: [],
        itemToConfig: () => ({ content: null }),
        itemToValue: item => item,
        itemToDisplayText: item => item,
        maybeSelectedValue: Option.none(),
        restingInputValue: '',
        ...overrides,
      }),
    })

    it.effect('renders input with role="combobox" when closed', () =>
      scene(
        ComboboxSceneLive,
        sceneView(),
        Scene.given({ combobox: closedModel() }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'input')).toHaveAttr('role', 'combobox')
        }),
      ),
    )

    it.effect('renders items container with role="listbox" when open', () =>
      scene(
        ComboboxSceneLive,
        sceneView(),
        Scene.given({ combobox: openModel() }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-items-container"]')).toHaveAttr(
            'role',
            'listbox',
          )
        }),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      ),
    )

    it.effect('shows items when open', () =>
      scene(
        ComboboxSceneLive,
        sceneView(),
        Scene.given({ combobox: openModel() }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-items-container"]')).toExist()
          expect(Scene.findAll(html, '[key^="test-item-"]')).toHaveLength(2)
        }),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      ),
    )

    it.effect('hides items when closed', () =>
      scene(
        ComboboxSceneLive,
        sceneView(),
        Scene.given({ combobox: closedModel() }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-items-container"]')).toBeAbsent()
        }),
      ),
    )

    it.effect('marks selected item with data-selected', () =>
      scene(
        ComboboxSceneLive,
        sceneView({ maybeSelectedValue: Option.some('Banana') }),
        Scene.given({ combobox: openModel() }),
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
      ),
    )

    it.effect('marks active item with data-active', () =>
      scene(
        ComboboxSceneLive,
        sceneView(),
        Scene.given({
          combobox: modifyFields(openModel(), {
            maybeActiveItemIndex: () => Option.some(1),
          }),
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
      ),
    )

    it.effect('renders hidden inputs when formName set', () =>
      scene(
        ComboboxSceneLive,
        sceneView({
          formName: 'fruit',
          maybeSelectedValue: Option.some('Apple'),
        }),
        Scene.given({ combobox: closedModel() }),
        Scene.tap(({ html }) => {
          const hiddenInput = Scene.find(html, 'input[type="hidden"]')
          expect(hiddenInput).toExist()
          expect(hiddenInput).toHaveAttr('name', 'fruit')
          expect(hiddenInput).toHaveAttr('value', 'Apple')
        }),
      ),
    )

    it.effect(
      'renders empty hidden input when no selection and formName set',
      () =>
        scene(
          ComboboxSceneLive,
          sceneView({ formName: 'fruit' }),
          Scene.given({ combobox: closedModel() }),
          Scene.tap(({ html }) => {
            const hiddenInput = Scene.find(html, 'input[type="hidden"]')
            expect(hiddenInput).toExist()
            expect(hiddenInput).toHaveAttr('name', 'fruit')
            expect(hiddenInput).not.toHaveAttr('value')
          }),
        ),
    )

    it.effect('items have role="option"', () =>
      scene(
        ComboboxSceneLive,
        sceneView(),
        Scene.given({ combobox: openModel() }),
        Scene.tap(({ html }) => {
          Scene.findAll(html, '[key^="test-item-"]').forEach(item => {
            expect(Option.some(item)).toHaveAttr('role', 'option')
          })
        }),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      ),
    )

    it.effect('selected item has aria-selected="true"', () =>
      scene(
        ComboboxSceneLive,
        sceneView({ maybeSelectedValue: Option.some('Apple') }),
        Scene.given({ combobox: openModel() }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-item-0"]')).toHaveAttr(
            'aria-selected',
            'true',
          )
        }),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      ),
    )

    it.effect('non-selected items have aria-selected="false"', () =>
      scene(
        ComboboxSceneLive,
        sceneView({ maybeSelectedValue: Option.some('Apple') }),
        Scene.given({ combobox: openModel() }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-item-1"]')).toHaveAttr(
            'aria-selected',
            'false',
          )
        }),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      ),
    )

    it.effect('items container has no aria-multiselectable', () =>
      scene(
        ComboboxSceneLive,
        sceneView(),
        Scene.given({ combobox: openModel() }),
        Scene.tap(({ html }) => {
          expect(
            Scene.find(html, '[key="test-items-container"]'),
          ).not.toHaveAttr('aria-multiselectable')
        }),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      ),
    )

    it.effect('input has aria-expanded when open', () =>
      scene(
        ComboboxSceneLive,
        sceneView(),
        Scene.given({ combobox: openModel() }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'input')).toHaveAttr('aria-expanded', 'true')
          expect(Scene.find(html, 'input')).toHaveAttr(
            'aria-controls',
            'test-items',
          )
        }),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      ),
    )

    it.effect('input has aria-expanded false when closed', () =>
      scene(
        ComboboxSceneLive,
        sceneView(),
        Scene.given({ combobox: closedModel() }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'input')).toHaveAttr('aria-expanded', 'false')
          expect(Scene.find(html, 'input')).not.toHaveAttr('aria-controls')
        }),
      ),
    )

    it.effect(
      'keeps the modal backdrop available after filtering removes every item',
      () => {
        const input = Scene.selector('#test-input')
        const backdrop = Scene.selector('[key="test-backdrop"]')
        const filteredItemsView: SceneInput = {
          toViewInputs: combobox => ({
            items: combobox.inputValue === 'zzz' ? [] : ['Apple', 'Banana'],
            itemToConfig: () => ({ content: null }),
            itemToValue: item => item,
            itemToDisplayText: item => item,
            maybeSelectedValue: Option.none(),
            restingInputValue: '',
          }),
        }

        return scene(
          ComboboxSceneLive,
          filteredItemsView,
          Scene.given({
            combobox: initialModel({ id: 'test', isModal: true }),
          }),
          Scene.type(input, 'a'),
          Scene.Command.resolveAllExact(
            [LockScroll, Message.CompletedLockScroll()],
            [InertOthers, Message.CompletedInertOthers()],
          ),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.type(input, 'zzz'),
          Scene.Mount.expectEnded(Anchor),
          Scene.expect(input).toHaveAttr('aria-expanded', 'false'),
          Scene.expect(input).not.toHaveAttr('aria-controls'),
          Scene.expect(input).not.toHaveAttr('aria-activedescendant'),
          Scene.expect(backdrop).toHaveHandler('click'),
          Scene.keydown(input, 'ArrowDown'),
          Scene.expectHandled(),
          Scene.expect(input).not.toHaveAttr('aria-activedescendant'),
          Scene.Command.expectNone(),
          Scene.click(backdrop),
          Scene.Command.resolveAllExact(
            [FocusInput, Message.CompletedFocusInput()],
            [UnlockScroll, Message.CompletedUnlockScroll()],
            [RestoreInert, Message.CompletedRestoreInert()],
          ),
          Scene.Mount.expectEnded(PortalBackdrop),
        )
      },
    )

    it.effect(
      'keeps a modal empty combobox dismissible after input opens it',
      () => {
        const input = Scene.selector('#test-input')
        const backdrop = Scene.selector('[key="test-backdrop"]')

        return scene(
          ComboboxSceneLive,
          emptyItemsView(),
          Scene.given({
            combobox: initialModel({ id: 'test', isModal: true }),
          }),
          Scene.type(input, 'zzz'),
          Scene.Command.resolveAllExact(
            [LockScroll, Message.CompletedLockScroll()],
            [InertOthers, Message.CompletedInertOthers()],
          ),
          Scene.expect(input).toHaveAttr('aria-expanded', 'false'),
          Scene.expect(backdrop).toHaveHandler('click'),
          acknowledgeBackdrop,
          Scene.keydown(input, 'Escape'),
          Scene.Command.resolveAllExact(
            [FocusInput, Message.CompletedFocusInput()],
            [UnlockScroll, Message.CompletedUnlockScroll()],
            [RestoreInert, Message.CompletedRestoreInert()],
          ),
          Scene.Mount.expectEnded(PortalBackdrop),
        )
      },
    )

    it.effect(
      'keeps a modal empty combobox dismissible after focus opens it',
      () => {
        const input = Scene.selector('#test-input')
        const backdrop = Scene.selector('[key="test-backdrop"]')

        return scene(
          ComboboxSceneLive,
          emptyItemsView({ openOnFocus: true }),
          Scene.given({
            combobox: initialModel({ id: 'test', isModal: true }),
          }),
          Scene.focus(input),
          Scene.Command.resolveAllExact(
            [LockScroll, Message.CompletedLockScroll()],
            [InertOthers, Message.CompletedInertOthers()],
          ),
          Scene.expect(input).toHaveAttr('aria-expanded', 'false'),
          Scene.expect(backdrop).toHaveHandler('click'),
          acknowledgeBackdrop,
          Scene.keydown(input, 'Escape'),
          Scene.Command.resolveAllExact(
            [FocusInput, Message.CompletedFocusInput()],
            [UnlockScroll, Message.CompletedUnlockScroll()],
            [RestoreInert, Message.CompletedRestoreInert()],
          ),
          Scene.Mount.expectEnded(PortalBackdrop),
        )
      },
    )

    it.effect(
      'keeps a modal empty combobox dismissible after its toggle opens it',
      () => {
        const button = Scene.selector('#test-button')
        const backdrop = Scene.selector('[key="test-backdrop"]')

        return scene(
          ComboboxSceneLive,
          emptyItemsView({ buttonContent: toggleButtonContent }),
          Scene.given({
            combobox: initialModel({ id: 'test', isModal: true }),
          }),
          acknowledgePreventBlur,
          Scene.click(button),
          Scene.Command.resolveAllExact(
            [FocusInput, Message.CompletedFocusInput()],
            [LockScroll, Message.CompletedLockScroll()],
            [InertOthers, Message.CompletedInertOthers()],
          ),
          Scene.expect(button).toHaveAttr('aria-expanded', 'false'),
          Scene.expect(backdrop).toHaveHandler('click'),
          acknowledgeBackdrop,
          Scene.keydown(Scene.selector('#test-input'), 'Escape'),
          Scene.Command.resolveAllExact(
            [FocusInput, Message.CompletedFocusInput()],
            [UnlockScroll, Message.CompletedUnlockScroll()],
            [RestoreInert, Message.CompletedRestoreInert()],
          ),
          Scene.Mount.expectEnded(PortalBackdrop),
        )
      },
    )

    it.effect(
      'keeps the empty-modal portal active while isolating and restoring the page',
      () => {
        const background = document.createElement('main')
        const inputWrapper = document.createElement('div')
        inputWrapper.id = 'modal-empty-input-wrapper'
        const input = document.createElement('input')
        input.id = 'modal-empty-input'
        inputWrapper.appendChild(input)

        const portalRoot = document.createElement('div')
        portalRoot.id = 'modal-empty-portal-root'
        const backdrop = document.createElement('div')
        backdrop.id = 'modal-empty-backdrop'
        portalRoot.appendChild(backdrop)
        document.body.append(background, inputWrapper, portalRoot)

        const cleanup = Effect.gen(function* () {
          yield* RestoreInert({ id: 'modal-empty' }).effect
          yield* UnlockScroll().effect
          background.remove()
          inputWrapper.remove()
          portalRoot.remove()
          document.documentElement.style.overflow = ''
        }).pipe(Effect.provide(ModalCommandsLayer))

        const openAndClose = story(
          TestCombobox.Live,
          { id: 'modal-empty', isModal: true },
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.none() }),
          ),
          Story.Command.expectExact(
            LockScroll(),
            InertOthers({ id: 'modal-empty' }),
          ),
          Story.Command.resolveAll(
            [LockScroll, Message.CompletedLockScroll()],
            [InertOthers, Message.CompletedInertOthers()],
          ),
          Story.message(
            Message.Closed({ restingInputValue: '', isClearable: true }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
          Story.Command.expectExact(
            FocusInput({ id: 'modal-empty' }),
            UnlockScroll(),
            RestoreInert({ id: 'modal-empty' }),
          ),
          Story.Command.resolveAll(
            [FocusInput, Message.CompletedFocusInput()],
            [UnlockScroll, Message.CompletedUnlockScroll()],
            [RestoreInert, Message.CompletedRestoreInert()],
          ),
        )

        return Effect.gen(function* () {
          yield* openAndClose

          yield* LockScroll().effect
          expect(document.documentElement.style.overflow).toBe('hidden')
          yield* InertOthers({ id: 'modal-empty' }).effect

          expect(inputWrapper.inert).toBe(false)
          expect(portalRoot.inert).toBe(false)
          expect(portalRoot.getAttribute('aria-hidden')).toBeNull()
          expect(background.inert).toBe(true)
          expect(background.getAttribute('aria-hidden')).toBe('true')
          expect(document.documentElement.style.overflow).toBe('hidden')

          yield* Effect.all([
            FocusInput({ id: 'modal-empty' }).effect,
            UnlockScroll().effect,
            RestoreInert({ id: 'modal-empty' }).effect,
          ])

          expect(background.inert).toBe(false)
          expect(background.getAttribute('aria-hidden')).toBeNull()
          expect(document.documentElement.style.overflow).not.toBe('hidden')
        }).pipe(Effect.provide(ModalCommandsLayer), Effect.ensuring(cleanup))
      },
    )

    it.effect('wrapper has data-disabled when isDisabled is true', () =>
      scene(
        ComboboxSceneLive,
        sceneView({ isDisabled: true }),
        Scene.given({ combobox: closedModel() }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'div')).toHaveAttr('data-disabled', '')
        }),
      ),
    )

    it.effect(
      'wrapper does not have data-disabled when isDisabled is false',
      () =>
        scene(
          ComboboxSceneLive,
          sceneView(),
          Scene.given({ combobox: closedModel() }),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, 'div')).not.toHaveAttr('data-disabled')
          }),
        ),
    )

    it.effect('wrapper has data-invalid when isInvalid is true', () =>
      scene(
        ComboboxSceneLive,
        sceneView({ isInvalid: true }),
        Scene.given({ combobox: closedModel() }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'div')).toHaveAttr('data-invalid', '')
        }),
      ),
    )

    it.effect(
      'wrapper does not have data-invalid when isInvalid is false',
      () =>
        scene(
          ComboboxSceneLive,
          sceneView(),
          Scene.given({ combobox: closedModel() }),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, 'div')).not.toHaveAttr('data-invalid')
          }),
        ),
    )

    it.effect('no hidden input when formName is not provided', () =>
      scene(
        ComboboxSceneLive,
        sceneView(),
        Scene.given({ combobox: closedModel() }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'input[type="hidden"]')).toBeAbsent()
        }),
      ),
    )

    describe('anchor', () => {
      it.effect(
        'adds absolute positioning, initial visibility hidden, and hooks when anchor is provided',
        () =>
          scene(
            ComboboxSceneLive,
            sceneView({
              anchor: { placement: 'bottom-start' as const },
            }),
            Scene.given({ combobox: openModel() }),
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
          ),
      )

      it.effect(
        'applies anchor positioning by default when anchor is absent',
        () =>
          scene(
            ComboboxSceneLive,
            sceneView(),
            Scene.given({ combobox: openModel() }),
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
          ),
      )
    })

    describe('item context', () => {
      it.effect(
        'itemToConfig receives isSelected: true for selected item',
        () => {
          const contexts: Array<
            Readonly<{
              isActive: boolean
              isDisabled: boolean
              isSelected: boolean
            }>
          > = []
          return scene(
            ComboboxSceneLive,
            sceneView({
              maybeSelectedValue: Option.some('Apple'),
              itemToConfig: (_item, context) => {
                contexts.push(context)
                return { content: null }
              },
            }),
            Scene.given({ combobox: openModel() }),
            Scene.tap(() => {
              expect(contexts[0]?.isSelected).toBe(true)
            }),
            acknowledgeAnchor,
            acknowledgeBackdrop,
          )
        },
      )

      it.effect(
        'itemToConfig receives isSelected: false for non-selected items',
        () => {
          const contexts: Array<
            Readonly<{
              isActive: boolean
              isDisabled: boolean
              isSelected: boolean
            }>
          > = []
          return scene(
            ComboboxSceneLive,
            sceneView({
              maybeSelectedValue: Option.some('Apple'),
              itemToConfig: (_item, context) => {
                contexts.push(context)
                return { content: null }
              },
            }),
            Scene.given({ combobox: openModel() }),
            Scene.tap(() => {
              expect(contexts[1]?.isSelected).toBe(false)
            }),
            acknowledgeAnchor,
            acknowledgeBackdrop,
          )
        },
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

      const readOnlyView = (overrides: Parameters<typeof sceneView>[0] = {}) =>
        sceneView({
          isReadOnly: true,
          maybeSelectedValue: Option.some('Apple'),
          restingInputValue: 'Apple',
          ...overrides,
        })

      it.effect(
        'emits readonly, aria-readonly, and data-readonly on the input',
        () =>
          scene(
            ComboboxSceneLive,
            readOnlyView(),
            Scene.given({ combobox: openModel() }),
            Scene.expect(input).toHaveAttr('readOnly', 'true'),
            Scene.expect(input).toHaveAttr('aria-readonly', 'true'),
            Scene.expect(input).toHaveAttr('data-readonly', ''),
            acknowledgeAnchor,
            acknowledgeBackdrop,
          ),
      )

      it.effect(
        'emits aria-readonly and data-readonly on the items panel, and data-readonly on the button and every item',
        () =>
          scene(
            ComboboxSceneLive,
            readOnlyView({ buttonContent: toggleButtonContent }),
            Scene.given({ combobox: openModel() }),
            Scene.expect(itemsContainer).toHaveAttr('aria-readonly', 'true'),
            Scene.expect(itemsContainer).toHaveAttr('data-readonly', ''),
            Scene.expect(button).toHaveAttr('data-readonly', ''),
            Scene.expect(item(0)).toHaveAttr('data-readonly', ''),
            Scene.expect(item(1)).toHaveAttr('data-readonly', ''),
            acknowledgeAnchor,
            acknowledgeBackdrop,
            acknowledgePreventBlur,
          ),
      )

      it.effect('emits data-readonly on the wrapper', () =>
        scene(
          ComboboxSceneLive,
          readOnlyView({ className: 'test-wrapper' }),
          Scene.given({ combobox: openModel() }),
          Scene.expect(Scene.selector('.test-wrapper')).toHaveAttr(
            'data-readonly',
            '',
          ),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )

      it.effect('emits no read-only attributes by default', () =>
        scene(
          ComboboxSceneLive,
          sceneView({
            buttonContent: toggleButtonContent,
            maybeSelectedValue: Option.some('Apple'),
            restingInputValue: 'Apple',
          }),
          Scene.given({ combobox: openModel() }),
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
        ),
      )

      it.effect('passes isReadOnly to itemToConfig', () =>
        scene(
          ComboboxSceneLive,
          readOnlyView({
            itemToConfig: (_item, context) => ({
              content: null,
              className: context.isReadOnly ? 'is-read-only' : 'is-editable',
            }),
          }),
          Scene.given({ combobox: openModel() }),
          Scene.expect(item(0)).toHaveClass('is-read-only'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )

      it.effect(
        'emits both read-only and disabled attribute sets when set together',
        () =>
          scene(
            ComboboxSceneLive,
            readOnlyView({
              isDisabled: true,
              buttonContent: toggleButtonContent,
            }),
            Scene.given({ combobox: openModel() }),
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
          ),
      )

      it.effect(
        'drops the input handler while keeping keydown, blur, and focus',
        () =>
          scene(
            ComboboxSceneLive,
            readOnlyView({ openOnFocus: true }),
            Scene.given({ combobox: openModel() }),
            Scene.expect(input).not.toHaveHandler('input'),
            Scene.expect(input).toHaveHandler('keydown'),
            Scene.expect(input).toHaveHandler('blur'),
            Scene.expect(input).toHaveHandler('focus'),
            acknowledgeAnchor,
            acknowledgeBackdrop,
          ),
      )

      it.effect('keeps the input handler when not read-only', () =>
        scene(
          ComboboxSceneLive,
          sceneView({
            maybeSelectedValue: Option.some('Apple'),
            restingInputValue: 'Apple',
          }),
          Scene.given({ combobox: openModel() }),
          Scene.expect(input).toHaveHandler('input'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )

      it.effect('emits Selected on item click when not read-only', () =>
        scene(
          ComboboxSceneLive,
          sceneView({
            maybeSelectedValue: Option.some('Apple'),
            restingInputValue: 'Apple',
          }),
          Scene.given({ combobox: openModel() }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.click(item(1)),
          Scene.expectOutMessage(OutMessage.Selected({ value: 'Banana' })),
          Scene.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Scene.Mount.expectEnded(Anchor, PortalBackdrop),
        ),
      )

      it.effect(
        'drops the item click handler while keeping the pointer handlers',
        () =>
          scene(
            ComboboxSceneLive,
            readOnlyView(),
            Scene.given({ combobox: openModel() }),
            Scene.expect(item(0)).not.toHaveHandler('click'),
            Scene.expect(item(1)).not.toHaveHandler('click'),
            Scene.expect(item(1)).toHaveHandler('pointermove'),
            Scene.expect(item(1)).toHaveHandler('pointerleave'),
            acknowledgeAnchor,
            acknowledgeBackdrop,
          ),
      )

      it.effect(
        'reports Enter on the active item as SuppressedItemCommit',
        () =>
          scene(
            ComboboxSceneLive,
            readOnlyView(),
            Scene.given({ combobox: openModel() }),
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
          readOnlyView(),
          Scene.given({
            combobox: modifyFields(openModel(), { immediate: () => true }),
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
        'commits while navigating an immediate combobox when not read-only',
        () =>
          scene(
            ComboboxSceneLive,
            sceneView({
              maybeSelectedValue: Option.some('Apple'),
              restingInputValue: 'Apple',
            }),
            Scene.given({
              combobox: modifyFields(openModel(), { immediate: () => true }),
            }),
            acknowledgeAnchor,
            acknowledgeBackdrop,
            Scene.keydown(input, 'ArrowDown'),
            Scene.expectOutMessage(OutMessage.Selected({ value: 'Banana' })),
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
            readOnlyView(),
            Scene.given({ combobox: openModel() }),
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
            Scene.Command.resolve(
              ScrollItemIntoView,
              Message.CompletedScrollItemIntoView(),
            ),
          ),
      )

      it.effect('keeps Home and End navigation live', () =>
        scene(
          ComboboxSceneLive,
          readOnlyView(),
          Scene.given({ combobox: openModel() }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'End'),
          Scene.expect(item(1)).toHaveAttr('data-active', ''),
          Scene.expectNoOutMessage(),
          Scene.Command.resolve(
            ScrollItemIntoView,
            Message.CompletedScrollItemIntoView(),
          ),
          Scene.keydown(input, 'Home'),
          Scene.expect(item(0)).toHaveAttr('data-active', ''),
          Scene.expectNoOutMessage(),
          Scene.Command.resolve(
            ScrollItemIntoView,
            Message.CompletedScrollItemIntoView(),
          ),
        ),
      )

      it.effect('still opens with ArrowDown and closes on Escape', () =>
        scene(
          ComboboxSceneLive,
          readOnlyView(),
          Scene.given({ combobox: closedModel() }),
          Scene.keydown(input, 'ArrowDown'),
          Scene.expect(itemsContainer).toExist(),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'Escape'),
          Scene.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Scene.expect(itemsContainer).toBeAbsent(),
          Scene.Mount.expectEnded(Anchor, PortalBackdrop),
        ),
      )

      it.effect(
        'does not emit ClearedSelection while nullable with a selection present',
        () =>
          scene(
            ComboboxSceneLive,
            readOnlyView(),
            Scene.given({
              combobox: modifyFields(openModel(), {
                nullable: () => true,
                inputValue: () => 'Apple',
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
        'does not clear the selection when Escape closes over an unseeded input',
        () =>
          scene(
            ComboboxSceneLive,
            readOnlyView(),
            Scene.given({
              combobox: modifyFields(openModel(), {
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
        'does not clear the selection when a blur closes over an unseeded input',
        () =>
          scene(
            ComboboxSceneLive,
            readOnlyView(),
            Scene.given({
              combobox: modifyFields(openModel(), {
                nullable: () => true,
                inputValue: () => '',
              }),
            }),
            acknowledgeAnchor,
            acknowledgeBackdrop,
            Scene.blur(input),
            Scene.expectNoOutMessage(),
            Scene.Mount.expectEnded(Anchor, PortalBackdrop),
          ),
      )

      it.effect(
        'clears the selection over an unseeded input when not read-only',
        () =>
          scene(
            ComboboxSceneLive,
            sceneView({
              maybeSelectedValue: Option.some('Apple'),
              restingInputValue: 'Apple',
            }),
            Scene.given({
              combobox: modifyFields(openModel(), {
                nullable: () => true,
                inputValue: () => '',
              }),
            }),
            acknowledgeAnchor,
            acknowledgeBackdrop,
            Scene.keydown(input, 'Escape'),
            Scene.expectOutMessage(OutMessage.ClearedSelection()),
            Scene.Command.resolve(FocusInput, Message.CompletedFocusInput()),
            Scene.Mount.expectEnded(Anchor, PortalBackdrop),
          ),
      )

      it.effect(
        'does not report SuppressedItemCommit when no item is active',
        () =>
          scene(
            ComboboxSceneLive,
            readOnlyView(),
            Scene.given({
              combobox: modifyFields(openModel(), {
                maybeActiveItemIndex: () => Option.none(),
              }),
            }),
            acknowledgeAnchor,
            acknowledgeBackdrop,
            Scene.keydown(input, 'Enter'),
            Scene.expectIgnored(),
            Scene.expectNoOutMessage(),
          ),
      )

      it.effect('still opens from the toggle button', () =>
        scene(
          ComboboxSceneLive,
          readOnlyView({ buttonContent: toggleButtonContent }),
          Scene.given({ combobox: closedModel() }),
          acknowledgePreventBlur,
          Scene.click(button),
          Scene.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Scene.expect(itemsContainer).toExist(),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )

      it.effect('emits RequestedItemClick on Enter when not read-only', () =>
        scene(
          ComboboxSceneLive,
          sceneView({
            maybeSelectedValue: Option.some('Apple'),
            restingInputValue: 'Apple',
          }),
          Scene.given({ combobox: openModel() }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'Enter'),
          Scene.expectHandled(),
          Scene.Command.resolve(ClickItem, Message.CompletedClickItem()),
        ),
      )
    })
  })
})
