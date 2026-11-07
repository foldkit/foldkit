import { Array, Effect, Layer, Option, Schema, Tuple } from 'effect'
import { Block, Scene, Story, Update } from 'foldkit'
import { inertHtml as ih } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { it as baseIt, expect, expectTypeOf } from 'vitest'

import { describe, makeMethods } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import { makeInitialModel as makeAnimationModel } from '../animation/schema.js'
import {
  Anchor,
  AttachPreventBlur,
  ClickItem,
  DetectMovementOrAnimationEnd,
  EffectsLayer,
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
import { layer, makeBlock } from './single.js'
import type { Model, ViewInputs } from './single.js'

const TestCombobox = makeBlock()

const Fruit = Schema.Literals(['Apple', 'Pear'])
type Fruit = typeof Fruit.Type

const FruitCombobox = makeBlock(Fruit)
const OtherFruitCombobox = makeBlock(Schema.Literals(['Orange']))

const FruitParentModel = Schema.Struct({
  combobox: FruitCombobox.Model,
  maybeSelectedFruit: Schema.Option(Fruit),
})
type FruitParentModel = typeof FruitParentModel.Type

const FruitParentMessage = defineMessageUnion({
  RequestedSelectFruitAndClose: { item: Fruit },
})
type FruitParentMessage = typeof FruitParentMessage.Type

const FruitComboboxTestKey = Symbol('FruitComboboxTest')

const FruitComboboxTestBlock = Block.make('FruitComboboxTest', {
  key: FruitComboboxTestKey,
  InitArgs: Schema.Tuple([]),
  operations: {
    requestSelectFruitAndClose: (item: Fruit) =>
      Tuple.make(FruitParentMessage.RequestedSelectFruitAndClose({ item })),
  },
  Model: FruitParentModel,
  Message: FruitParentMessage,
})

const foldFruitComboboxOutMessage = FruitComboboxTestBlock.makeOutMessageFold(
  FruitCombobox,
  {
    Selected:
      ({ value }) =>
      model => ({
        model: modifyFields(model, {
          maybeSelectedFruit: () => Option.some(value),
        }),
      }),
    ClearedSelection: () => model => ({ model }),
  },
)

const ComboboxBinding = FruitComboboxTestBlock.makeRequiredFieldBinding(
  FruitCombobox,
  {
    field: 'combobox',
    init: { contextToArgs: () => [{ id: 'fruit' }] },
  },
).withOutMessagePolicy({ fold: foldFruitComboboxOutMessage })

const FruitComboboxTestComposition = FruitComboboxTestBlock.makeComposition({
  bindings: [ComboboxBinding],
})

const fruitParentUpdate = FruitComboboxTestComposition.makeUpdate({
  RequestedSelectFruitAndClose: (model, { item }) =>
    Update.combineSteps([
      ComboboxBinding.requestSelectItem(item, item),
      ComboboxBinding.requestClose(''),
    ])(model),
})

const fruitComboboxTest = {
  block: FruitComboboxTestBlock,
  layer: FruitComboboxTestBlock.makeLayer({
    init: FruitComboboxTestComposition.makeInit(() => ({
      model: { maybeSelectedFruit: Option.none() },
    })),
    update: fruitParentUpdate,
  }).pipe(Layer.provide(layer)),
}

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

const completedDetectMovementOrAnimationEnd = (generation: number) =>
  Message.CompletedDetectMovementOrAnimationEnd({ generation })

const STALE_ANIMATION_GENERATION = -1

const givenClosed = Story.init({ id: 'test' })

const givenOpen = Story.steps(
  Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
)

const givenClosedAnimated = Story.init({ id: 'test', isAnimated: true })

const givenOpenAnimated = Story.steps(
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

const givenClosedModal = Story.init({ id: 'test', isModal: true })

const givenOpenModal = Story.steps(
  Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
  Story.Command.resolveAllExact(
    [LockScroll, Message.CompletedLockScroll()],
    [InertOthers, Message.CompletedInertOthers()],
  ),
)

const readOnlyViewInputs = (
  overrides: Parameters<typeof sceneViewInputs>[0] = {},
): ViewInputs<string> =>
  sceneViewInputs({
    isReadOnly: true,
    maybeSelectedValue: Option.some('Apple'),
    restingInputValue: 'Apple',
    ...overrides,
  })

const emptyItemsViewInputs = (
  overrides: Omit<
    Partial<ViewInputs<string>>,
    'items' | 'itemToValue' | 'itemToDisplayText'
  > = {},
): ViewInputs<string> => ({
  items: [],
  itemToConfig: () => ({ content: null }),
  itemToValue: item => item,
  itemToDisplayText: item => item,
  maybeSelectedValue: Option.none(),
  restingInputValue: '',
  ...overrides,
})

const sceneViewInputs = (
  overrides: Omit<
    Partial<ViewInputs<string>>,
    'items' | 'itemToValue' | 'itemToDisplayText'
  > = {},
): ViewInputs<string> => ({
  items: ['Apple', 'Banana'],
  itemToConfig: () => ({ content: null }),
  itemToValue: item => item,
  itemToDisplayText: item => item,
  maybeSelectedValue: Option.none(),
  restingInputValue: '',
  ...overrides,
})

const makeFixture = (block: Story.TestBlock<typeof TestCombobox>) => {
  const { init, update, view, operations } = block
  const gotAnimationMessage = ({
    message,
  }: Readonly<{ message: typeof Animation.AnimationBlock.Message.Type }>) =>
    Schema.decodeUnknownSync(block.Message)({
      _tag: 'GotAnimationMessage',
      placement: 'animation',
      generation: 0,
      message,
    })

  const givenClosed = Story.given(init({ id: 'test' }).model)

  const givenOpen = Story.steps(
    givenClosed,
    Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
  )

  const givenClosedAnimated = Story.given(
    init({ id: 'test', isAnimated: true }).model,
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

  const givenClosedModal = Story.given(
    init({ id: 'test', isModal: true }).model,
  )

  const givenOpenModal = Story.steps(
    givenClosedModal,
    Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
    Story.Command.resolveAllExact(
      [LockScroll, Message.CompletedLockScroll()],
      [InertOthers, Message.CompletedInertOthers()],
    ),
  )

  const closedModel = () => init({ id: 'test' }).model

  const openModel = (): Model => Story.story(update, givenOpen)

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
          itemToConfig: () => ({ content: null }),
          itemToValue: item => item,
          itemToDisplayText: item => item,
          maybeSelectedValue: Option.none(),
          restingInputValue: '',
          ...overrides,
        },
        h,
      )

  const emptyItemsView =
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
          items: [],
          itemToConfig: () => ({ content: null }),
          itemToValue: item => item,
          itemToDisplayText: item => item,
          maybeSelectedValue: Option.none(),
          restingInputValue: '',
          ...overrides,
        },
        h,
      )

  const readOnlyView = (overrides: Parameters<typeof sceneView>[0] = {}) =>
    sceneView({
      isReadOnly: true,
      maybeSelectedValue: Option.some('Apple'),
      restingInputValue: 'Apple',
      ...overrides,
    })
  return {
    init,
    update,
    view,
    operations,
    gotAnimationMessage,
    givenClosed,
    givenOpen,
    givenClosedAnimated,
    givenOpenAnimated,
    givenClosedModal,
    givenOpenModal,
    closedModel,
    openModel,
    sceneView,
    emptyItemsView,
    readOnlyView,
  }
}
const it = makeMethods(
  baseIt.extend<{
    combobox: ReturnType<typeof makeFixture>
    fruit: Story.TestBlock<typeof FruitCombobox>
    parentBlock: Story.TestBlock<typeof fruitComboboxTest>
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
    parentBlock: async ({}, use) =>
      Effect.runPromise(
        Story.withBlock(fruitComboboxTest, parent =>
          Effect.promise(() => use(parent)),
        ),
      ),
  }),
)

describe('Combobox', () => {
  describe('completed Block', () => {
    it('preserves refined Message and OutMessage payloads with shared definitions', ({
      combobox: { update },
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
      expect(FruitCombobox.owner).toBe(OtherFruitCombobox.owner)
      expect(FruitCombobox.owner).toBe(TestCombobox.owner)
    })

    it.effect('routes Animation Messages for a generic Combobox', () =>
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

    it('connects registered Steps and embeds the canonical refined view', ({
      combobox: { init },
      parentBlock,
    }) => {
      const parent: FruitParentModel = {
        combobox: init({ id: 'fruit' }).model,
        maybeSelectedFruit: Option.none(),
      }
      const closed = parentBlock.operations.requestSelectFruitAndClose(
        parent,
        'Apple',
      )
      const embedded = ComboboxBinding.embedView({
        slotId: 'fruit-primary',
        model: closed.model.combobox,
        viewInputs: {
          items: ['Apple', 'Pear'],
          restingInputValue: '',
          itemToConfig: () => ({ content: null }),
          itemToValue: item => item,
          itemToDisplayText: item => item,
          maybeSelectedValue: closed.model.maybeSelectedFruit,
        },
      })
      const repeatedEmbedded = ComboboxBinding.embedView({
        slotId: 'fruit-secondary',
        model: closed.model.combobox,
        viewInputs: embedded.viewInputs,
      })

      expect(closed.model.maybeSelectedFruit).toStrictEqual(
        Option.some('Apple'),
      )
      expect(embedded.view).toBe(repeatedEmbedded.view)
      expect(embedded.view).toBeTypeOf('function')
      expect(embedded.slotId).toBe('fruit-primary')
    })
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

    it.effect('accepts isAnimated option', () =>
      Story.story(
        TestCombobox,
        Story.init({ id: 'test', isAnimated: true }),
        Story.model(model => {
          expect(model.isAnimated).toBe(true)
          expect(model.animation.transitionState).toBe('Idle')
        }),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('defaults isModal to false', () =>
      Story.story(
        TestCombobox,
        Story.init({ id: 'test' }),
        Story.model(model => {
          expect(model.isModal).toBe(false)
        }),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('accepts isModal option', () =>
      Story.story(
        TestCombobox,
        Story.init({ id: 'test', isModal: true }),
        Story.model(model => {
          expect(model.isModal).toBe(true)
        }),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('accepts nullable option', () =>
      Story.story(
        TestCombobox,
        Story.init({ id: 'test', nullable: true }),
        Story.model(model => {
          expect(model.nullable).toBe(true)
        }),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('defaults nullable to false', () =>
      Story.story(
        TestCombobox,
        Story.init({ id: 'test' }),
        Story.model(model => {
          expect(model.nullable).toBe(false)
        }),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('accepts immediate option', () =>
      Story.story(
        TestCombobox,
        Story.init({ id: 'test', immediate: true }),
        Story.model(model => {
          expect(model.immediate).toBe(true)
        }),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('defaults immediate to false', () =>
      Story.story(
        TestCombobox,
        Story.init({ id: 'test' }),
        Story.model(model => {
          expect(model.immediate).toBe(false)
        }),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('accepts selectInputOnFocus option', () =>
      Story.story(
        TestCombobox,
        Story.init({ id: 'test', selectInputOnFocus: true }),
        Story.model(model => {
          expect(model.selectInputOnFocus).toBe(true)
        }),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('defaults selectInputOnFocus to false', () =>
      Story.story(
        TestCombobox,
        Story.init({ id: 'test' }),
        Story.model(model => {
          expect(model.selectInputOnFocus).toBe(false)
        }),
      ).pipe(Effect.provide(layer)),
    )
  })

  describe('update', () => {
    describe('Opened', () => {
      it.effect('opens with given active item', () =>
        Story.story(
          TestCombobox,
          givenClosed,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(2) }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        ).pipe(Effect.provide(layer)),
      )

      it('resets pointer position on open', ({
        combobox: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(
            modifyFields(init({ id: 'test' }).model, {
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
        )
      })

      it.effect('sets trigger to Keyboard when opened with active item', () =>
        Story.story(
          TestCombobox,
          givenClosed,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          ),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Keyboard')
          }),
        ).pipe(Effect.provide(layer)),
      )

      it.effect('sets trigger to Pointer when opened without active item', () =>
        Story.story(
          TestCombobox,
          givenClosed,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.none() }),
          ),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        ).pipe(Effect.provide(layer)),
      )
    })

    describe('Closed', () => {
      it('closes and restores input to the resting input value', ({
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
            expect(model.inputValue).toBe('Apple')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })

      it('emits ClearedSelection when nullable and input is empty', ({
        combobox: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(
            modifyFields(init({ id: 'test' }).model, {
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
        )
      })

      it.effect('returns focus-input and close commands', () =>
        Story.story(
          TestCombobox,
          givenClosed,
          givenOpen,
          Story.message(
            Message.Closed({ restingInputValue: '', isClearable: true }),
          ),
          Story.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        ).pipe(Effect.provide(layer)),
      )

      it('is a no-op when already closed', ({ combobox: { init, update } }) => {
        const closedModel = modifyFields(init({ id: 'test' }).model, {
          inputValue: () => 'Apple',
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
            expect(model.inputValue).toBe('Apple')
          }),
        )
      })
    })

    describe('BlurredInput', () => {
      it.effect('closes without restoring input focus', () =>
        Story.story(
          TestCombobox,
          givenClosed,
          givenOpen,
          Story.message(
            Message.BlurredInput({ restingInputValue: '', isClearable: true }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        ).pipe(Effect.provide(layer)),
      )

      it('restores input value to the resting input value', ({
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
            Message.BlurredInput({
              restingInputValue: 'Apple',
              isClearable: true,
            }),
          ),
          Story.model(model => {
            expect(model.inputValue).toBe('Apple')
          }),
        )
      })

      it('emits ClearedSelection when nullable and input is empty', ({
        combobox: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(
            modifyFields(init({ id: 'test' }).model, {
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
        )
      })

      it('is a no-op when already closed', ({ combobox: { init, update } }) => {
        const closedModel = modifyFields(init({ id: 'test' }).model, {
          inputValue: () => 'Apple',
        })

        Story.story(
          update,
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
          Story.story(
            TestCombobox,
            Story.init({ id: 'test', nullable: true }),
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
          ).pipe(Effect.provide(layer)),
      )
    })

    describe('ActivatedItem', () => {
      it.effect('sets the active item index', () =>
        Story.story(
          TestCombobox,
          givenClosed,
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
        ).pipe(Effect.provide(layer)),
      )

      it.effect('replaces previous active item', () =>
        Story.story(
          TestCombobox,
          givenClosed,
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
        ).pipe(Effect.provide(layer)),
      )

      it.effect('stores activation trigger', () =>
        Story.story(
          TestCombobox,
          givenClosed,
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
        ).pipe(Effect.provide(layer)),
      )

      it.effect('returns scroll command for keyboard activation', () =>
        Story.story(
          TestCombobox,
          givenClosed,
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
        ).pipe(Effect.provide(layer)),
      )

      it.effect(
        'emits Selected and stays open when maybeImmediateSelection is Some',
        () =>
          Story.story(
            TestCombobox,
            givenClosed,
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
          ).pipe(Effect.provide(layer)),
      )
    })

    describe('DeactivatedItem', () => {
      it.effect('clears active item when pointer-activated', () =>
        Story.story(
          TestCombobox,
          givenClosed,
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
        ).pipe(Effect.provide(layer)),
      )

      it.effect('preserves active item when keyboard-activated', () =>
        Story.story(
          TestCombobox,
          givenClosed,
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
        ).pipe(Effect.provide(layer)),
      )
    })

    describe('MovedPointerOverItem', () => {
      it.effect('activates item on first pointer move', () =>
        Story.story(
          TestCombobox,
          givenClosed,
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
        ).pipe(Effect.provide(layer)),
      )

      it.effect('skips when position is same', () =>
        Story.story(
          TestCombobox,
          givenClosed,
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
        ).pipe(Effect.provide(layer)),
      )

      it.effect('updates position when different', () =>
        Story.story(
          TestCombobox,
          givenClosed,
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
        ).pipe(Effect.provide(layer)),
      )
    })

    describe('SelectedItem', () => {
      it.effect(
        'closes, sets input to the display text, and emits Selected',
        () =>
          Story.story(
            TestCombobox,
            givenClosed,
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
          ).pipe(Effect.provide(layer)),
      )

      it('resets input and emits Selected when nullable and item was selected', ({
        combobox: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(
            modifyFields(init({ id: 'test' }).model, {
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
        )
      })

      it.effect('returns focus-input command', () =>
        Story.story(
          TestCombobox,
          givenClosed,
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
        ).pipe(Effect.provide(layer)),
      )
    })

    describe('RequestedItemClick', () => {
      it.effect('returns click element command', () =>
        Story.story(
          TestCombobox,
          givenClosed,
          givenOpen,
          Story.message(Message.RequestedItemClick({ index: 2 })),
          Story.Command.resolve(ClickItem, Message.CompletedClickItem()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ).pipe(Effect.provide(layer)),
      )
    })

    describe('SuppressedItemCommit', () => {
      it.effect('leaves the model unchanged and emits no OutMessage', () =>
        Story.story(
          TestCombobox,
          givenClosed,
          givenOpen,
          Story.message(Message.SuppressedItemCommit()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(0))
            expect(model.inputValue).toBe('')
          }),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
        ).pipe(Effect.provide(layer)),
      )
    })

    describe('UpdatedInputValue', () => {
      it.effect('sets input value and activates first item when open', () =>
        Story.story(
          TestCombobox,
          givenClosed,
          givenOpen,
          Story.message(Message.UpdatedInputValue({ value: 'app' })),
          Story.model(model => {
            expect(model.inputValue).toBe('app')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(0))
            expect(model.activationTrigger).toBe('Keyboard')
            expect(model.isOpen).toBe(true)
          }),
        ).pipe(Effect.provide(layer)),
      )

      it.effect('opens combobox when closed and typing', () =>
        Story.story(
          TestCombobox,
          givenClosed,
          Story.message(Message.UpdatedInputValue({ value: 'b' })),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.inputValue).toBe('b')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(0))
            expect(model.activationTrigger).toBe('Keyboard')
          }),
        ).pipe(Effect.provide(layer)),
      )
    })

    describe('PressedToggleButton', () => {
      it.effect('opens when closed', () =>
        Story.story(
          TestCombobox,
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
        ).pipe(Effect.provide(layer)),
      )

      it.effect(
        'closes and restores input to the resting input value when open',
        () =>
          Story.story(
            TestCombobox,
            givenClosed,
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
          ).pipe(Effect.provide(layer)),
      )
    })

    describe('CompletedFocusInput', () => {
      it.effect('returns model unchanged', () =>
        Story.story(
          TestCombobox,
          givenClosed,
          givenOpen,
          Story.message(Message.CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ).pipe(Effect.provide(layer)),
      )
    })

    describe('transitions', () => {
      describe('enter flow', () => {
        it.effect(
          'starts enter transition and emits WaitForPaint on Opened',
          () =>
            Story.story(
              TestCombobox,
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
            ).pipe(Effect.provide(layer)),
        )

        it.effect(
          'advances EnterStart to EnterAnimating on CompletedWaitForPaint',
          () =>
            Story.story(
              TestCombobox,
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
            ).pipe(Effect.provide(layer)),
        )

        it.effect('completes EnterAnimating to Idle on EndedAnimation', () =>
          Story.story(
            TestCombobox,
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
          ).pipe(Effect.provide(layer)),
        )
      })

      describe('leave flow', () => {
        it('preserves ClearedSelection when an animated nullable Combobox closes', ({
          combobox: { update, init },
        }) => {
          const opened = update(
            init({ id: 'animated-nullable', isAnimated: true, nullable: true })
              .model,
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          )
          const closed = update(
            opened.model,
            Message.Closed({ restingInputValue: '', isClearable: true }),
          )

          expect(closed.outMessage).toEqual(OutMessage.ClearedSelection())
          expect(closed.model.isOpen).toBe(false)
          expect(closed.model.animation.transitionState).toBe('LeaveStart')
          expect(closed.commands?.map(command => command.name)).toEqual([
            'Combobox/FocusInput',
            'animation/WaitForPaint',
          ])
        })

        it.effect('sets LeaveStart on Closed', () =>
          Story.story(
            TestCombobox,
            givenClosedAnimated,
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
          ).pipe(Effect.provide(layer)),
        )

        it.effect('begins the leave animation when the input blurs', () =>
          Story.story(
            TestCombobox,
            givenClosedAnimated,
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
          ).pipe(Effect.provide(layer)),
        )

        it.effect('sets LeaveStart on SelectedItem', () =>
          Story.story(
            TestCombobox,
            givenClosedAnimated,
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
          ).pipe(Effect.provide(layer)),
        )

        it.effect(
          'advances LeaveStart to LeaveAnimating with DetectMovementOrAnimationEnd',
          () =>
            Story.story(
              TestCombobox,
              givenClosedAnimated,
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
            ).pipe(Effect.provide(layer)),
        )

        it.effect('completes LeaveAnimating to Idle on transition end', () =>
          Story.story(
            TestCombobox,
            givenClosedAnimated,
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
          ).pipe(Effect.provide(layer)),
        )
      })

      describe('non-animated', () => {
        it.effect('keeps transitionState Idle on Opened', () =>
          Story.story(
            TestCombobox,
            givenClosed,
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          ).pipe(Effect.provide(layer)),
        )

        it.effect('keeps transitionState Idle on Closed', () =>
          Story.story(
            TestCombobox,
            givenClosed,
            givenOpen,
            Story.message(
              Message.Closed({ restingInputValue: '', isClearable: true }),
            ),
            Story.Command.resolve(FocusInput, Message.CompletedFocusInput()),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          ).pipe(Effect.provide(layer)),
        )
      })

      describe('stale messages', () => {
        it('ignores GotAnimationMessage with CompletedWaitForPaint when Idle', ({
          combobox: { update, givenOpen, gotAnimationMessage },
        }) => {
          Story.story(
            update,
            givenOpen,
            Story.message(
              gotAnimationMessage({
                message: Animation.Message.CompletedWaitForPaint({
                  generation: 0,
                }),
              }),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it.effect(
          'ignores CompletedDetectMovementOrAnimationEnd when Idle',
          () =>
            Story.story(
              TestCombobox,
              givenClosed,
              givenOpen,
              Story.message(completedDetectMovementOrAnimationEnd(0)),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
                expect(model.animation.transitionState).toBe('Idle')
              }),
            ).pipe(Effect.provide(layer)),
        )
      })

      describe('interruptions', () => {
        it.effect('transitions to LeaveStart when Closed during enter', () =>
          Story.story(
            TestCombobox,
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
          ).pipe(Effect.provide(layer)),
        )
      })
    })
  })

  describe('modal commands', () => {
    it.effect(
      'emits lockScroll and inertOthers commands on Opened when isModal is true',
      () =>
        Story.story(
          TestCombobox,
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
        ).pipe(Effect.provide(layer)),
    )

    it('emits no Commands when requestOpen receives an open modal Model', ({
      combobox: { init, operations, update },
    }) => {
      const openModal = modifyFields(
        init({ id: 'test', isModal: true }).model,
        {
          isOpen: () => true,
          maybeActiveItemIndex: () => Option.some(1),
          activationTrigger: () => 'Keyboard',
          inputValue: () => 'Ap',
        },
      )

      for (const reopened of [
        operations.requestOpen(openModal),
        update(
          openModal,
          Message.Opened({ maybeActiveItemIndex: Option.none() }),
        ),
      ]) {
        expect(reopened.commands ?? []).toEqual([])
        expect(reopened.outMessage).toBeUndefined()
        expect(reopened.model.isOpen).toBe(true)
        expect(reopened.model.maybeActiveItemIndex).toStrictEqual(
          Option.some(1),
        )
        expect(reopened.model.activationTrigger).toBe('Keyboard')
        expect(reopened.model.inputValue).toBe('Ap')
      }
    })

    it.effect(
      'emits no Commands when focus opens a modal combobox the toggle already opened',
      () =>
        Story.story(
          TestCombobox,
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
        ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'emits unlockScroll and restoreInert commands on Closed when isModal is true',
      () =>
        Story.story(
          TestCombobox,
          givenClosedModal,
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
      'emits unlockScroll and restoreInert commands when the input blurs in modal mode',
      () =>
        Story.story(
          TestCombobox,
          givenClosedModal,
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
        ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'emits unlockScroll and restoreInert commands on SelectedItem when isModal is true',
      () =>
        Story.story(
          TestCombobox,
          givenClosedModal,
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
        ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'emits unlockScroll and restoreInert commands when the toggle button closes a modal combobox',
      () =>
        Story.story(
          TestCombobox,
          givenClosedModal,
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
        ).pipe(Effect.provide(layer)),
    )

    it.effect('does not emit cleanup commands for a stale close message', () =>
      Story.story(
        TestCombobox,
        givenClosedModal,
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
      ).pipe(Effect.provide(layer)),
    )

    it.effect('does not emit modal commands when isModal is false', () =>
      Story.story(
        TestCombobox,
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
      ).pipe(Effect.provide(layer)),
    )
  })

  describe('view', () => {
    const toggleButtonContent = ih.span([])

    it.effect('renders input with role="combobox" when closed', () =>
      Scene.scene(
        { block: TestCombobox, viewInputs: sceneViewInputs() },
        Scene.init({ id: 'test' }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'input')).toHaveAttr('role', 'combobox')
        }),
      ).pipe(Effect.provide(layer)),
    )

    it('renders items container with role="listbox" when open', ({
      combobox: { update, sceneView, openModel },
    }) => {
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

    it('shows items when open', ({
      combobox: { update, sceneView, openModel },
    }) => {
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

    it.effect('hides items when closed', () =>
      Scene.scene(
        { block: TestCombobox, viewInputs: sceneViewInputs() },
        Scene.init({ id: 'test' }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-items-container"]')).toBeAbsent()
        }),
      ).pipe(Effect.provide(layer)),
    )

    it('marks selected item with data-selected', ({
      combobox: { update, sceneView, openModel },
    }) => {
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

    it('marks active item with data-active', ({
      combobox: { update, sceneView, openModel },
    }) => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(
          modifyFields(openModel(), {
            maybeActiveItemIndex: () => Option.some(1),
          }),
        ),
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

    it.effect('renders hidden inputs when formName set', () =>
      Scene.scene(
        {
          block: TestCombobox,
          viewInputs: sceneViewInputs({
            formName: 'fruit',
            maybeSelectedValue: Option.some('Apple'),
          }),
        },
        Scene.init({ id: 'test' }),
        Scene.tap(({ html }) => {
          const hiddenInput = Scene.find(html, 'input[type="hidden"]')
          expect(hiddenInput).toExist()
          expect(hiddenInput).toHaveAttr('name', 'fruit')
          expect(hiddenInput).toHaveAttr('value', 'Apple')
        }),
      ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'renders empty hidden input when no selection and formName set',
      () =>
        Scene.scene(
          {
            block: TestCombobox,
            viewInputs: sceneViewInputs({ formName: 'fruit' }),
          },
          Scene.init({ id: 'test' }),
          Scene.tap(({ html }) => {
            const hiddenInput = Scene.find(html, 'input[type="hidden"]')
            expect(hiddenInput).toExist()
            expect(hiddenInput).toHaveAttr('name', 'fruit')
            expect(hiddenInput).not.toHaveAttr('value')
          }),
        ).pipe(Effect.provide(layer)),
    )

    it('items have role="option"', ({
      combobox: { update, sceneView, openModel },
    }) => {
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

    it('selected item has aria-selected="true"', ({
      combobox: { update, sceneView, openModel },
    }) => {
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

    it('non-selected items have aria-selected="false"', ({
      combobox: { update, sceneView, openModel },
    }) => {
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

    it('items container has no aria-multiselectable', ({
      combobox: { update, sceneView, openModel },
    }) => {
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

    it('input has aria-expanded when open', ({
      combobox: { update, sceneView, openModel },
    }) => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(openModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'input')).toHaveAttr('aria-expanded', 'true')
          expect(Scene.find(html, 'input')).toHaveAttr(
            'aria-controls',
            'test-items',
          )
        }),
        acknowledgeAnchor,
        acknowledgeBackdrop,
      )
    })

    it.effect('input has aria-expanded false when closed', () =>
      Scene.scene(
        { block: TestCombobox, viewInputs: sceneViewInputs() },
        Scene.init({ id: 'test' }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'input')).toHaveAttr('aria-expanded', 'false')
          expect(Scene.find(html, 'input')).not.toHaveAttr('aria-controls')
        }),
      ).pipe(Effect.provide(layer)),
    )

    it('keeps the modal backdrop available after filtering removes every item', ({
      combobox: { view, update, init },
    }) => {
      const input = Scene.selector('#test-input')
      const backdrop = Scene.selector('[key="test-backdrop"]')
      const filteredItemsView = (model: Model, h: TestHtmlBuilder) =>
        view(
          model,
          {
            items: model.inputValue === 'zzz' ? [] : ['Apple', 'Banana'],
            itemToConfig: () => ({ content: null }),
            itemToValue: item => item,
            itemToDisplayText: item => item,
            maybeSelectedValue: Option.none(),
            restingInputValue: '',
          },
          h,
        )

      Scene.scene(
        { update, view: filteredItemsView },
        Scene.given(init({ id: 'test', isModal: true }).model),
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
    })

    it.effect(
      'keeps a modal empty combobox dismissible after input opens it',
      () => {
        const input = Scene.selector('#test-input')
        const backdrop = Scene.selector('[key="test-backdrop"]')

        return Scene.scene(
          { block: TestCombobox, viewInputs: emptyItemsViewInputs() },
          Scene.init({ id: 'test', isModal: true }),
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
        ).pipe(Effect.provide(layer))
      },
    )

    it.effect(
      'keeps a modal empty combobox dismissible after focus opens it',
      () => {
        const input = Scene.selector('#test-input')
        const backdrop = Scene.selector('[key="test-backdrop"]')

        return Scene.scene(
          {
            block: TestCombobox,
            viewInputs: emptyItemsViewInputs({ openOnFocus: true }),
          },
          Scene.init({ id: 'test', isModal: true }),
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
        ).pipe(Effect.provide(layer))
      },
    )

    it.effect(
      'keeps a modal empty combobox dismissible after its toggle opens it',
      () => {
        const button = Scene.selector('#test-button')
        const backdrop = Scene.selector('[key="test-backdrop"]')

        return Scene.scene(
          {
            block: TestCombobox,
            viewInputs: emptyItemsViewInputs({
              buttonContent: toggleButtonContent,
            }),
          },
          Scene.init({ id: 'test', isModal: true }),
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
        ).pipe(Effect.provide(layer))
      },
    )

    it('keeps the empty-modal portal active while isolating and restoring the page', async ({
      combobox: { update, init },
    }) => {
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

      const openCombobox = update(
        init({ id: 'modal-empty', isModal: true }).model,
        Message.Opened({ maybeActiveItemIndex: Option.none() }),
      )
      let maybeClose = Option.none<ReturnType<typeof update>>()
      backdrop.addEventListener('click', () => {
        maybeClose = Option.some(
          update(
            openCombobox.model,
            Message.Closed({ restingInputValue: '', isClearable: true }),
          ),
        )
      })

      try {
        await Effect.runPromise(
          LockScroll().effect.pipe(Effect.provide(EffectsLayer)),
        )
        expect(document.documentElement.style.overflow).toBe('hidden')
        await Effect.runPromise(
          InertOthers({ id: 'modal-empty' }).effect.pipe(
            Effect.provide(EffectsLayer),
          ),
        )

        expect(inputWrapper.inert).toBe(false)
        expect(portalRoot.inert).toBe(false)
        expect(portalRoot.getAttribute('aria-hidden')).toBeNull()
        expect(background.inert).toBe(true)
        expect(background.getAttribute('aria-hidden')).toBe('true')
        expect(document.documentElement.style.overflow).toBe('hidden')

        backdrop.click()
        const close = Option.getOrThrow(maybeClose)
        await Effect.runPromise(
          Effect.all(
            Array.map(close.commands ?? [], command => {
              const maybeFocusArgs = Story.Command.argsOf(FocusInput)(command)
              if (Option.isSome(maybeFocusArgs)) {
                return FocusInput(maybeFocusArgs.value).effect
              }
              if (Option.isSome(Story.Command.argsOf(UnlockScroll)(command))) {
                return UnlockScroll().effect
              }
              const maybeRestoreArgs =
                Story.Command.argsOf(RestoreInert)(command)
              if (Option.isSome(maybeRestoreArgs)) {
                return RestoreInert(maybeRestoreArgs.value).effect
              }
              throw new Error('Expected a Combobox close Command')
            }),
          ).pipe(Effect.provide(EffectsLayer)),
        )

        expect(close.model.isOpen).toBe(false)
        expect(background.inert).toBe(false)
        expect(background.getAttribute('aria-hidden')).toBeNull()
        expect(document.documentElement.style.overflow).not.toBe('hidden')
      } finally {
        await Effect.runPromise(
          RestoreInert({ id: 'modal-empty' }).effect.pipe(
            Effect.provide(EffectsLayer),
          ),
        )
        await Effect.runPromise(
          UnlockScroll().effect.pipe(Effect.provide(EffectsLayer)),
        )
        background.remove()
        inputWrapper.remove()
        portalRoot.remove()
        document.documentElement.style.overflow = ''
      }
    })

    it.effect('wrapper has data-disabled when isDisabled is true', () =>
      Scene.scene(
        {
          block: TestCombobox,
          viewInputs: sceneViewInputs({ isDisabled: true }),
        },
        Scene.init({ id: 'test' }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'div')).toHaveAttr('data-disabled', '')
        }),
      ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'wrapper does not have data-disabled when isDisabled is false',
      () =>
        Scene.scene(
          { block: TestCombobox, viewInputs: sceneViewInputs() },
          Scene.init({ id: 'test' }),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, 'div')).not.toHaveAttr('data-disabled')
          }),
        ).pipe(Effect.provide(layer)),
    )

    it.effect('wrapper has data-invalid when isInvalid is true', () =>
      Scene.scene(
        {
          block: TestCombobox,
          viewInputs: sceneViewInputs({ isInvalid: true }),
        },
        Scene.init({ id: 'test' }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'div')).toHaveAttr('data-invalid', '')
        }),
      ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'wrapper does not have data-invalid when isInvalid is false',
      () =>
        Scene.scene(
          { block: TestCombobox, viewInputs: sceneViewInputs() },
          Scene.init({ id: 'test' }),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, 'div')).not.toHaveAttr('data-invalid')
          }),
        ).pipe(Effect.provide(layer)),
    )

    it.effect('no hidden input when formName is not provided', () =>
      Scene.scene(
        { block: TestCombobox, viewInputs: sceneViewInputs() },
        Scene.init({ id: 'test' }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, 'input[type="hidden"]')).toBeAbsent()
        }),
      ).pipe(Effect.provide(layer)),
    )

    describe('anchor', () => {
      it('adds absolute positioning, initial visibility hidden, and hooks when anchor is provided', ({
        combobox: { update, sceneView, openModel },
      }) => {
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

      it('applies anchor positioning by default when anchor is absent', ({
        combobox: { update, sceneView, openModel },
      }) => {
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
      it('itemToConfig receives isSelected: true for selected item', ({
        combobox: { update, sceneView, openModel },
      }) => {
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
              itemToConfig: (_item, context) => {
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

      it('itemToConfig receives isSelected: false for non-selected items', ({
        combobox: { update, sceneView, openModel },
      }) => {
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
              itemToConfig: (_item, context) => {
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

      it('emits readonly, aria-readonly, and data-readonly on the input', ({
        combobox: { update, readOnlyView, openModel },
      }) => {
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

      it('emits aria-readonly and data-readonly on the items panel, and data-readonly on the button and every item', ({
        combobox: { update, readOnlyView, openModel },
      }) => {
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

      it('emits data-readonly on the wrapper', ({
        combobox: { update, readOnlyView, openModel },
      }) => {
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

      it('emits no read-only attributes by default', ({
        combobox: { update, sceneView, openModel },
      }) => {
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

      it('passes isReadOnly to itemToConfig', ({
        combobox: { update, readOnlyView, openModel },
      }) => {
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

      it('emits both read-only and disabled attribute sets when set together', ({
        combobox: { update, readOnlyView, openModel },
      }) => {
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

      it('drops the input handler while keeping keydown, blur, and focus', ({
        combobox: { update, readOnlyView, openModel },
      }) => {
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

      it('keeps the input handler when not read-only', ({
        combobox: { update, sceneView, openModel },
      }) => {
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

      it('emits Selected on item click when not read-only', ({
        combobox: { update, sceneView, openModel },
      }) => {
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
          Scene.expectOutMessage(OutMessage.Selected({ value: 'Banana' })),
          Scene.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Scene.Mount.expectEnded(Anchor, PortalBackdrop),
        )
      })

      it('drops the item click handler while keeping the pointer handlers', ({
        combobox: { update, readOnlyView, openModel },
      }) => {
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

      it('reports Enter on the active item as SuppressedItemCommit', ({
        combobox: { update, readOnlyView, openModel },
      }) => {
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

      it('does not commit while navigating an immediate combobox', ({
        combobox: { update, readOnlyView, openModel },
      }) => {
        Scene.scene(
          {
            update,
            view: readOnlyView(),
          },
          Scene.given(modifyFields(openModel(), { immediate: () => true })),
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

      it('commits while navigating an immediate combobox when not read-only', ({
        combobox: { update, sceneView, openModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({
              maybeSelectedValue: Option.some('Apple'),
              restingInputValue: 'Apple',
            }),
          },
          Scene.given(modifyFields(openModel(), { immediate: () => true })),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'ArrowDown'),
          Scene.expectOutMessage(OutMessage.Selected({ value: 'Banana' })),
          Scene.Command.resolve(
            ScrollItemIntoView,
            Message.CompletedScrollItemIntoView(),
          ),
        )
      })

      it('moves the active item off the selection without changing it', ({
        combobox: { update, readOnlyView, openModel },
      }) => {
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
          Scene.Command.resolve(
            ScrollItemIntoView,
            Message.CompletedScrollItemIntoView(),
          ),
        )
      })

      it('keeps Home and End navigation live', ({
        combobox: { update, readOnlyView, openModel },
      }) => {
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
        )
      })

      it.effect('still opens with ArrowDown and closes on Escape', () =>
        Scene.scene(
          { block: TestCombobox, viewInputs: readOnlyViewInputs() },
          Scene.init({ id: 'test' }),
          Scene.keydown(input, 'ArrowDown'),
          Scene.expect(itemsContainer).toExist(),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'Escape'),
          Scene.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Scene.expect(itemsContainer).toBeAbsent(),
          Scene.Mount.expectEnded(Anchor, PortalBackdrop),
        ).pipe(Effect.provide(layer)),
      )

      it('does not emit ClearedSelection while nullable with a selection present', ({
        combobox: { update, readOnlyView, openModel },
      }) => {
        Scene.scene(
          {
            update,
            view: readOnlyView(),
          },
          Scene.given(
            modifyFields(openModel(), {
              nullable: () => true,
              inputValue: () => 'Apple',
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

      it('does not clear the selection when Escape closes over an unseeded input', ({
        combobox: { update, readOnlyView, openModel },
      }) => {
        Scene.scene(
          {
            update,
            view: readOnlyView(),
          },
          Scene.given(
            modifyFields(openModel(), {
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

      it('does not clear the selection when a blur closes over an unseeded input', ({
        combobox: { update, readOnlyView, openModel },
      }) => {
        Scene.scene(
          {
            update,
            view: readOnlyView(),
          },
          Scene.given(
            modifyFields(openModel(), {
              nullable: () => true,
              inputValue: () => '',
            }),
          ),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.blur(input),
          Scene.expectNoOutMessage(),
          Scene.Mount.expectEnded(Anchor, PortalBackdrop),
        )
      })

      it('clears the selection over an unseeded input when not read-only', ({
        combobox: { update, sceneView, openModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({
              maybeSelectedValue: Option.some('Apple'),
              restingInputValue: 'Apple',
            }),
          },
          Scene.given(
            modifyFields(openModel(), {
              nullable: () => true,
              inputValue: () => '',
            }),
          ),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'Escape'),
          Scene.expectOutMessage(OutMessage.ClearedSelection()),
          Scene.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Scene.Mount.expectEnded(Anchor, PortalBackdrop),
        )
      })

      it('does not report SuppressedItemCommit when no item is active', ({
        combobox: { update, readOnlyView, openModel },
      }) => {
        Scene.scene(
          {
            update,
            view: readOnlyView(),
          },
          Scene.given(
            modifyFields(openModel(), {
              maybeActiveItemIndex: () => Option.none(),
            }),
          ),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(input, 'Enter'),
          Scene.expectIgnored(),
          Scene.expectNoOutMessage(),
        )
      })

      it.effect('still opens from the toggle button', () =>
        Scene.scene(
          {
            block: TestCombobox,
            viewInputs: readOnlyViewInputs({
              buttonContent: toggleButtonContent,
            }),
          },
          Scene.init({ id: 'test' }),
          acknowledgePreventBlur,
          Scene.click(button),
          Scene.Command.resolve(FocusInput, Message.CompletedFocusInput()),
          Scene.expect(itemsContainer).toExist(),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ).pipe(Effect.provide(layer)),
      )

      it('emits RequestedItemClick on Enter when not read-only', ({
        combobox: { update, sceneView, openModel },
      }) => {
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
          Scene.Command.resolve(ClickItem, Message.CompletedClickItem()),
        )
      })
    })
  })
})
