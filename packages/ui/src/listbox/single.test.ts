import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type * as BlockTypes from 'foldkit/block'
import * as Scene from 'foldkit/scene'
import { scene } from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import {
  AnchorListbox,
  ClickListboxItem,
  DelayClearListboxSearch,
  DetectListboxMovementOrAnimationEnd,
  FocusListboxButton,
  FocusListboxItems,
  InertListboxOthers,
  LockListboxScroll,
  Message,
  OutMessage,
  PortalListboxBackdrop,
  RestoreListboxInert,
  ScrollListboxItemIntoView,
  UnlockListboxScroll,
  buttonId,
} from './shared.js'
import { type ListboxClass, makeBlock } from './single.js'
import type { InitConfig, Model as ListboxModel, ViewInputs } from './single.js'

type Model = BlockTypes.Resolved<ListboxModel>

const TestListbox = makeBlock()
const testConfig: InitConfig = { id: 'test' }

const initialModel = (config: InitConfig): Model => {
  let model!: Model
  Effect.runSync(
    story(
      TestListbox.Live,
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

const makeListboxScene = <Item, Value extends string>(
  SceneListbox: ListboxClass<Item, Value>,
) => {
  class ListboxScene extends Block<ListboxScene, ViewInputs<Item, Value>>()(
    'ListboxScene',
    { Model: Schema.Struct({ listbox: SceneListbox }), OutMessage },
  ) {}

  return ListboxScene.make(
    Effect.fn(function* (_id, viewInputs) {
      const listbox = yield* new SceneListbox('listbox', testConfig)

      return {
        model: { listbox },
        update: {
          ...listbox.on({
            Selected: (model, outMessage) => ({ model, outMessage }),
          }),
        },
        view: model => model.listbox.view(viewInputs),
      }
    }),
  ).pipe(Layer.provide(SceneListbox.Live))
}

const ListboxSceneLive = makeListboxScene(TestListbox)

const acknowledgeAnchor = Scene.Mount.resolve(
  AnchorListbox,
  Message.CompletedAnchorListbox(),
)
const acknowledgeBackdrop = Scene.Mount.resolve(
  PortalListboxBackdrop,
  Message.CompletedPortalListboxBackdrop(),
)

const completedDetectListboxMovementOrAnimationEnd = (generation: number) =>
  Message.CompletedDetectListboxMovementOrAnimationEnd({ generation })

const STALE_CLEAR_SEARCH_VERSION = 9999

const STALE_ANIMATION_GENERATION = -1

const givenClosed = Story.given(initialModel({ id: 'test' }))

const givenOpen = Story.steps(
  givenClosed,
  Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
  Story.Command.resolve(
    FocusListboxItems,
    Message.CompletedFocusListboxItems(),
  ),
)

const givenClosedAnimated = Story.given(
  initialModel({ id: 'test', isAnimated: true }),
)

const givenOpenAnimated = Story.steps(
  givenClosedAnimated,
  Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
  Story.Command.resolveAll(
    [FocusListboxItems, Message.CompletedFocusListboxItems()],
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

describe('Listbox', () => {
  describe('makeBlock', () => {
    it('refines the selected item in Messages and OutMessages to Value', () => {
      const FruitListbox = makeBlock<'Apple' | 'Pear'>()

      FruitListbox.Message.RequestedSelectItem({ item: 'Apple' })
      FruitListbox.Message.SelectedItem({ item: 'Pear' })
      FruitListbox.OutMessage.Selected({ value: 'Apple' })
      // @ts-expect-error The factory refines the item a parent sends.
      FruitListbox.Message.RequestedSelectItem({ item: 'Banana' })
      // @ts-expect-error The factory refines the selected OutMessage value.
      FruitListbox.OutMessage.Selected({ value: 'Banana' })
      expect(FruitListbox.Mount).toEqual(TestListbox.Mount)
    })
  })

  describe('init', () => {
    it('defaults to closed with no active item', () => {
      expect(initialModel({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        isModal: false,
        orientation: 'Vertical',
        animation: {
          id: 'test-listbox',
          isShowing: false,
          transitionState: 'Idle',
          transitionGeneration: 0,
        },
        maybeActiveItemIndex: Option.none(),
        activationTrigger: 'Keyboard',
        searchQuery: '',
        searchVersion: 0,
        maybeLastPointerPosition: Option.none(),
        maybeLastButtonPointerType: Option.none(),
      })
    })

    it('accepts isAnimated option', () => {
      const model = initialModel({ id: 'test', isAnimated: true })
      expect(model.isAnimated).toBe(true)
      expect(model.animation.transitionState).toBe('Idle')
    })

    it('defaults isModal to false', () => {
      const model = initialModel({ id: 'test' })
      expect(model.isModal).toBe(false)
    })

    it('accepts isModal option', () => {
      const model = initialModel({ id: 'test', isModal: true })
      expect(model.isModal).toBe(true)
    })

    it('defaults orientation to Vertical', () => {
      const model = initialModel({ id: 'test' })
      expect(model.orientation).toBe('Vertical')
    })

    it('accepts orientation option', () => {
      const model = initialModel({ id: 'test', orientation: 'Horizontal' })
      expect(model.orientation).toBe('Horizontal')
    })
  })

  describe('update', () => {
    describe('Opened', () => {
      it.effect('opens the listbox with the given active item', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenClosed,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(2) }),
          ),
          Story.Command.resolve(
            FocusListboxItems,
            Message.CompletedFocusListboxItems(),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        ),
      )

      it.effect('resets search state on open', () =>
        story(
          TestListbox.Live,
          testConfig,
          Story.given(
            modifyFields(initialModel({ id: 'test' }), {
              searchQuery: () => 'stale',
              searchVersion: () => 1,
            }),
          ),
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          ),
          Story.Command.resolve(
            FocusListboxItems,
            Message.CompletedFocusListboxItems(),
          ),
          Story.model(model => {
            expect(model.searchQuery).toBe('')
            expect(model.searchVersion).toBe(0)
          }),
        ),
      )

      it.effect('sets trigger to Keyboard when opened with active item', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenClosed,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          ),
          Story.Command.resolve(
            FocusListboxItems,
            Message.CompletedFocusListboxItems(),
          ),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Keyboard')
          }),
        ),
      )

      it.effect('sets trigger to Pointer when opened without active item', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenClosed,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.none() }),
          ),
          Story.Command.resolve(
            FocusListboxItems,
            Message.CompletedFocusListboxItems(),
          ),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        ),
      )

      it.effect('resets pointer position on open', () =>
        story(
          TestListbox.Live,
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
          Story.Command.resolve(
            FocusListboxItems,
            Message.CompletedFocusListboxItems(),
          ),
          Story.model(model => {
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        ),
      )
    })

    describe('Closed', () => {
      it.effect('closes the listbox and resets state', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(Message.Closed()),
          Story.Command.resolve(
            FocusListboxButton,
            Message.CompletedFocusListboxButton(),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.activationTrigger).toBe('Keyboard')
            expect(model.searchQuery).toBe('')
            expect(model.searchVersion).toBe(0)
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.none(),
            )
          }),
        ),
      )

      it.effect(
        'returns no Command and no OutMessage when already closed',
        () =>
          story(
            TestListbox.Live,
            testConfig,
            givenClosed,
            Story.message(Message.Closed()),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
      )
    })

    describe('BlurredItems', () => {
      it.effect('closes the listbox without restoring button focus', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(Message.BlurredItems()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        ),
      )
    })

    describe('PressedPointerOnButton', () => {
      it.effect('records pointer type for touch without toggling', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({ pointerType: 'touch', button: 0 }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('touch'),
            )
          }),
        ),
      )

      it.effect('records pointer type for pen without toggling', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({ pointerType: 'pen', button: 0 }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('pen'),
            )
          }),
        ),
      )

      it.effect('opens the listbox on mouse left button when closed', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Story.Command.resolve(
            FocusListboxItems,
            Message.CompletedFocusListboxItems(),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
        ),
      )

      it.effect(
        'closes the listbox on mouse left button when open and preserves pointer type',
        () =>
          story(
            TestListbox.Live,
            testConfig,
            givenOpen,
            Story.message(
              Message.PressedPointerOnButton({
                pointerType: 'mouse',
                button: 0,
              }),
            ),
            Story.Command.resolve(
              FocusListboxButton,
              Message.CompletedFocusListboxButton(),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.maybeLastButtonPointerType).toStrictEqual(
                Option.some('mouse'),
              )
            }),
          ),
      )

      it.effect('does not toggle on mouse right button', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({ pointerType: 'mouse', button: 2 }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
        ),
      )

      it.effect('always records maybeLastButtonPointerType', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({ pointerType: 'touch', button: 0 }),
          ),
          Story.model(model => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('touch'),
            )
          }),
          Story.message(
            Message.PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Story.Command.resolve(
            FocusListboxItems,
            Message.CompletedFocusListboxItems(),
          ),
          Story.model(model => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
        ),
      )
    })

    describe('ActivatedItem', () => {
      it.effect('sets the active item index', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 3, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(
            ScrollListboxItemIntoView,
            Message.CompletedScrollListboxItemIntoView(),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
          }),
        ),
      )

      it.effect('replaces the previous active item', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 1, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(
            ScrollListboxItemIntoView,
            Message.CompletedScrollListboxItemIntoView(),
          ),
          Story.message(
            Message.ActivatedItem({ index: 4, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(
            ScrollListboxItemIntoView,
            Message.CompletedScrollListboxItemIntoView(),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(4))
          }),
        ),
      )

      it.effect('stores activation trigger in model', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 1, activationTrigger: 'Pointer' }),
          ),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Pointer')
          }),
        ),
      )

      it.effect('returns scroll command for keyboard activation', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 2, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(
            ScrollListboxItemIntoView,
            Message.CompletedScrollListboxItemIntoView(),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        ),
      )
    })

    describe('DeactivatedItem', () => {
      it.effect('clears active item when pointer-activated', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 1, activationTrigger: 'Pointer' }),
          ),
          Story.message(Message.DeactivatedItem()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        ),
      )

      it.effect('preserves active item when keyboard-activated', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 2, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(
            ScrollListboxItemIntoView,
            Message.CompletedScrollListboxItemIntoView(),
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
          TestListbox.Live,
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

      it.effect('activates when position differs from stored', () =>
        story(
          TestListbox.Live,
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

      it.effect('returns model unchanged when position matches', () =>
        story(
          TestListbox.Live,
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
    })

    describe('SelectedItem', () => {
      it.effect('emits Selected with the item value', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(Message.SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
          Story.Command.resolve(
            FocusListboxButton,
            Message.CompletedFocusListboxButton(),
          ),
        ),
      )

      it.effect('closes the listbox on selection', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(Message.SelectedItem({ item: 'apple' })),
          Story.Command.resolve(
            FocusListboxButton,
            Message.CompletedFocusListboxButton(),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        ),
      )

      it.effect('returns a focus button command', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(Message.SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
          Story.Command.resolve(
            FocusListboxButton,
            Message.CompletedFocusListboxButton(),
          ),
        ),
      )

      it.effect(
        'emits Selected with the newly chosen value across selections',
        () =>
          story(
            TestListbox.Live,
            testConfig,
            givenClosed,
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            Story.Command.resolve(
              FocusListboxItems,
              Message.CompletedFocusListboxItems(),
            ),
            Story.message(Message.SelectedItem({ item: 'banana' })),
            Story.expectOutMessage(OutMessage.Selected({ value: 'banana' })),
            Story.Command.resolve(
              FocusListboxButton,
              Message.CompletedFocusListboxButton(),
            ),
          ),
      )

      it.effect(
        'returns no Command when an item is selected while already closed',
        () =>
          story(
            TestListbox.Live,
            testConfig,
            givenClosed,
            Story.message(Message.SelectedItem({ item: 'apple' })),
            Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
      )
    })

    describe('RequestedItemClick', () => {
      it.effect('returns model unchanged with a click command', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(Message.RequestedItemClick({ index: 2 })),
          Story.Command.resolve(
            ClickListboxItem,
            Message.CompletedClickListboxItem(),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
      )
    })

    describe('Searched', () => {
      it.effect('appends the key to the search query', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.Searched({ key: 'a', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearListboxSearch,
            Message.CompletedDelayClearListboxSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchQuery).toBe('a')
          }),
          Story.message(
            Message.Searched({ key: 'b', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearListboxSearch,
            Message.CompletedDelayClearListboxSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchQuery).toBe('ab')
          }),
        ),
      )

      it.effect('bumps the search version', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.Searched({ key: 'x', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearListboxSearch,
            Message.CompletedDelayClearListboxSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(1)
          }),
          Story.message(
            Message.Searched({ key: 'y', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearListboxSearch,
            Message.CompletedDelayClearListboxSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(2)
          }),
        ),
      )

      it.effect('updates active item when a match is found', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.Searched({ key: 'd', maybeTargetIndex: Option.some(3) }),
          ),
          Story.Command.resolve(
            DelayClearListboxSearch,
            Message.CompletedDelayClearListboxSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
          }),
        ),
      )

      it.effect('keeps existing active item when no match is found', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.Searched({ key: 'z', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearListboxSearch,
            Message.CompletedDelayClearListboxSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(0))
          }),
        ),
      )

      it.effect('returns a delay command for debounce', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.Searched({ key: 'a', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearListboxSearch,
            Message.CompletedDelayClearListboxSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchQuery).toBe('a')
          }),
        ),
      )
    })

    describe('CompletedDelayClearListboxSearch', () => {
      it.effect('clears search query when version matches', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.Searched({ key: 'a', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearListboxSearch,
            Message.CompletedDelayClearListboxSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(1)
          }),
          Story.message(
            Message.CompletedDelayClearListboxSearch({ version: 1 }),
          ),
          Story.model(model => {
            expect(model.searchQuery).toBe('')
          }),
        ),
      )

      it.effect('ignores stale version', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.Searched({ key: 'a', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearListboxSearch,
            Message.CompletedDelayClearListboxSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.message(
            Message.Searched({ key: 'b', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearListboxSearch,
            Message.CompletedDelayClearListboxSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(2)
          }),
          Story.message(
            Message.CompletedDelayClearListboxSearch({ version: 1 }),
          ),
          Story.model(model => {
            expect(model.searchQuery).toBe('ab')
          }),
        ),
      )
    })

    describe('completed and view-dispatched messages', () => {
      it.effect('returns model unchanged for CompletedLockListboxScroll', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(Message.CompletedLockListboxScroll()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
      )

      it.effect('resets maybeLastButtonPointerType for IgnoredMouseClick', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(
            Message.PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Story.Command.resolve(
            FocusListboxButton,
            Message.CompletedFocusListboxButton(),
          ),
          Story.model(model => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
          Story.message(Message.IgnoredMouseClick()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.none(),
            )
          }),
        ),
      )

      it.effect(
        'keeps the listbox open after ClickedButton follows a mouse press',
        () =>
          story(
            TestListbox.Live,
            testConfig,
            givenClosed,
            Story.message(
              Message.PressedPointerOnButton({
                pointerType: 'mouse',
                button: 0,
              }),
            ),
            Story.Command.resolve(
              FocusListboxItems,
              Message.CompletedFocusListboxItems(),
            ),
            Story.message(Message.ClickedButton()),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.maybeLastButtonPointerType).toStrictEqual(
                Option.none(),
              )
            }),
          ),
      )

      it.effect(
        'opens on ClickedButton when the click did not follow a mouse press',
        () =>
          story(
            TestListbox.Live,
            testConfig,
            givenClosed,
            Story.message(Message.ClickedButton()),
            Story.Command.resolve(
              FocusListboxItems,
              Message.CompletedFocusListboxItems(),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.activationTrigger).toBe('Pointer')
            }),
          ),
      )

      it.effect(
        'closes an open listbox on ClickedButton when the click did not follow a mouse press',
        () =>
          story(
            TestListbox.Live,
            testConfig,
            givenOpen,
            Story.message(Message.ClickedButton()),
            Story.Command.resolve(
              FocusListboxButton,
              Message.CompletedFocusListboxButton(),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
      )

      it.effect('returns model unchanged for SuppressedSpaceScroll', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(Message.SuppressedSpaceScroll()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
      )

      it.effect('returns model unchanged for SuppressedItemCommit', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.message(Message.SuppressedItemCommit()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
      )
    })

    describe('transitions', () => {
      describe('enter flow', () => {
        it.effect(
          'sets EnterStart and emits focus + afterPaint on Opened',
          () =>
            story(
              TestListbox.Live,
              testConfig,
              givenClosedAnimated,
              Story.message(
                Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
              ),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
                expect(model.animation.transitionState).toBe('EnterStart')
              }),
              Story.Command.resolveAll(
                [FocusListboxItems, Message.CompletedFocusListboxItems()],
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
          'advances EnterStart to EnterAnimating on GotAnimationMessage(CompletedWaitForPaint)',
          () =>
            story(
              TestListbox.Live,
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
              Story.Command.resolveAll(
                [FocusListboxItems, Message.CompletedFocusListboxItems()],
                [
                  Animation.WaitForAnimationSettled,
                  Animation.Message.EndedAnimation({ generation: 1 }),
                ],
              ),
            ),
        )

        it.effect(
          'completes EnterAnimating to Idle on GotAnimationMessage(EndedAnimation)',
          () =>
            story(
              TestListbox.Live,
              testConfig,
              givenClosedAnimated,
              Story.message(
                Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
              ),
              Story.Command.resolveAll(
                [FocusListboxItems, Message.CompletedFocusListboxItems()],
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
        it.effect('starts no leave cascade on Closed when already closed', () =>
          story(
            TestListbox.Live,
            testConfig,
            givenClosedAnimated,
            Story.message(Message.Closed()),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('Idle')
            }),
          ),
        )

        it.effect('sets LeaveStart on Closed', () =>
          story(
            TestListbox.Live,
            testConfig,
            givenOpenAnimated,
            Story.message(Message.Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusListboxButton, Message.CompletedFocusListboxButton()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [
                DetectListboxMovementOrAnimationEnd,
                completedDetectListboxMovementOrAnimationEnd(2),
              ],
            ),
          ),
        )

        it.effect(
          'begins the leave animation when the items container blurs',
          () =>
            story(
              TestListbox.Live,
              testConfig,
              givenOpenAnimated,
              Story.message(Message.BlurredItems()),
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
                  DetectListboxMovementOrAnimationEnd,
                  completedDetectListboxMovementOrAnimationEnd(2),
                ],
              ),
            ),
        )

        it.effect('sets LeaveStart on SelectedItem', () =>
          story(
            TestListbox.Live,
            testConfig,
            givenOpenAnimated,
            Story.message(Message.SelectedItem({ item: 'apple' })),
            Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusListboxButton, Message.CompletedFocusListboxButton()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [
                DetectListboxMovementOrAnimationEnd,
                completedDetectListboxMovementOrAnimationEnd(2),
              ],
            ),
          ),
        )

        it.effect(
          'advances LeaveStart to LeaveAnimating on GotAnimationMessage(CompletedWaitForPaint)',
          () =>
            story(
              TestListbox.Live,
              testConfig,
              givenOpenAnimated,
              Story.message(Message.Closed()),
              Story.Command.resolve(
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ),
              Story.model(model => {
                expect(model.animation.transitionState).toBe('LeaveAnimating')
              }),
              Story.Command.expectHas(
                DetectListboxMovementOrAnimationEnd({
                  id: 'test',
                  generation: 2,
                }),
              ),
              Story.Command.resolveAll(
                [FocusListboxButton, Message.CompletedFocusListboxButton()],
                [
                  DetectListboxMovementOrAnimationEnd,
                  completedDetectListboxMovementOrAnimationEnd(2),
                ],
              ),
            ),
        )

        it.effect(
          'completes LeaveAnimating to Idle on GotAnimationMessage(EndedAnimation)',
          () =>
            story(
              TestListbox.Live,
              testConfig,
              givenOpenAnimated,
              Story.message(Message.Closed()),
              Story.Command.resolveAll(
                [FocusListboxButton, Message.CompletedFocusListboxButton()],
                [
                  Animation.WaitForPaint,
                  Animation.Message.CompletedWaitForPaint({ generation: 2 }),
                ],
                [
                  DetectListboxMovementOrAnimationEnd,
                  completedDetectListboxMovementOrAnimationEnd(2),
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
            TestListbox.Live,
            testConfig,
            givenClosed,
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            Story.Command.resolve(
              FocusListboxItems,
              Message.CompletedFocusListboxItems(),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          ),
        )

        it.effect('keeps transitionState Idle on Closed', () =>
          story(
            TestListbox.Live,
            testConfig,
            givenOpen,
            Story.message(Message.Closed()),
            Story.Command.resolve(
              FocusListboxButton,
              Message.CompletedFocusListboxButton(),
            ),
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
              TestListbox.Live,
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
          'ignores CompletedDetectListboxMovementOrAnimationEnd when Idle',
          () =>
            story(
              TestListbox.Live,
              testConfig,
              givenOpen,
              Story.message(completedDetectListboxMovementOrAnimationEnd(0)),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
                expect(model.animation.transitionState).toBe('Idle')
              }),
            ),
        )
      })

      describe('interruptions', () => {
        it.effect(
          'transitions to LeaveStart when Closed during EnterStart',
          () =>
            story(
              TestListbox.Live,
              testConfig,
              givenClosedAnimated,
              Story.message(
                Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
              ),
              Story.Command.resolveAll(
                [FocusListboxItems, Message.CompletedFocusListboxItems()],
                [
                  Animation.WaitForPaint,
                  Animation.Message.CompletedWaitForPaint({
                    generation: STALE_ANIMATION_GENERATION,
                  }),
                ],
              ),
              Story.model(model => {
                expect(model.animation.transitionState).toBe('EnterStart')
              }),
              Story.message(Message.Closed()),
              Story.model(model => {
                expect(model.isOpen).toBe(false)
                expect(model.animation.transitionState).toBe('LeaveStart')
              }),
              Story.Command.resolveAll(
                [FocusListboxButton, Message.CompletedFocusListboxButton()],
                [
                  Animation.WaitForPaint,
                  Animation.Message.CompletedWaitForPaint({ generation: 2 }),
                ],
                [
                  DetectListboxMovementOrAnimationEnd,
                  completedDetectListboxMovementOrAnimationEnd(2),
                ],
              ),
              Story.model(model => {
                expect(model.animation.transitionState).toBe('Idle')
              }),
            ),
        )

        it.effect(
          'transitions to LeaveStart when Closed during EnterAnimating',
          () =>
            story(
              TestListbox.Live,
              testConfig,
              givenClosedAnimated,
              Story.message(
                Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
              ),
              Story.Command.resolveAll(
                [FocusListboxItems, Message.CompletedFocusListboxItems()],
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
              Story.message(Message.Closed()),
              Story.model(model => {
                expect(model.isOpen).toBe(false)
                expect(model.animation.transitionState).toBe('LeaveStart')
              }),
              Story.Command.resolveAll(
                [FocusListboxButton, Message.CompletedFocusListboxButton()],
                [
                  Animation.WaitForPaint,
                  Animation.Message.CompletedWaitForPaint({ generation: 2 }),
                ],
                [
                  DetectListboxMovementOrAnimationEnd,
                  completedDetectListboxMovementOrAnimationEnd(2),
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
      Story.Command.resolveAll(
        [FocusListboxItems, Message.CompletedFocusListboxItems()],
        [LockListboxScroll, Message.CompletedLockListboxScroll()],
        [InertListboxOthers, Message.CompletedInertListboxOthers()],
      ),
    )

    it.effect(
      'emits lockScroll and inertOthers commands on Opened when isModal is true',
      () =>
        story(
          TestListbox.Live,
          testConfig,
          givenClosedModal,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          ),
          Story.Command.resolveAll(
            [FocusListboxItems, Message.CompletedFocusListboxItems()],
            [LockListboxScroll, Message.CompletedLockListboxScroll()],
            [InertListboxOthers, Message.CompletedInertListboxOthers()],
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
    )

    it.effect(
      'emits unlockScroll and restoreInert commands on Closed when isModal is true',
      () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpenModal,
          Story.message(Message.Closed()),
          Story.Command.resolveAll(
            [FocusListboxButton, Message.CompletedFocusListboxButton()],
            [UnlockListboxScroll, Message.CompletedUnlockListboxScroll()],
            [RestoreListboxInert, Message.CompletedRestoreListboxInert()],
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        ),
    )

    it.effect(
      'emits no Commands on Closed when already closed in modal mode',
      () =>
        story(
          TestListbox.Live,
          testConfig,
          givenClosedModal,
          Story.message(Message.Closed()),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
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
            searchQuery: () => 'ap',
            searchVersion: () => 2,
          },
        )

        return Effect.forEach(
          [
            Message.RequestedOpen(),
            Message.Opened({ maybeActiveItemIndex: Option.none() }),
          ],
          reopen =>
            story(
              TestListbox.Live,
              testConfig,
              Story.given(openModal),
              Story.message(reopen),
              Story.Command.expectNone(),
              Story.expectNoOutMessage(),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
                expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(1))
                expect(model.searchQuery).toBe('ap')
                expect(model.searchVersion).toBe(2)
              }),
            ),
          { discard: true },
        )
      },
    )

    it.effect(
      'emits unlockScroll and restoreInert commands when the items container blurs in modal mode',
      () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpenModal,
          Story.message(Message.BlurredItems()),
          Story.Command.resolveAll(
            [UnlockListboxScroll, Message.CompletedUnlockListboxScroll()],
            [RestoreListboxInert, Message.CompletedRestoreListboxInert()],
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        ),
    )

    it.effect(
      'emits no Commands when the items container blurs on a closed listbox in modal mode',
      () =>
        story(
          TestListbox.Live,
          testConfig,
          givenClosedModal,
          Story.message(Message.BlurredItems()),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        ),
    )

    it.effect(
      'emits unlockScroll and restoreInert commands on SelectedItem when isModal is true',
      () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpenModal,
          Story.message(Message.SelectedItem({ item: 'apple' })),
          Story.Command.resolveAll(
            [FocusListboxButton, Message.CompletedFocusListboxButton()],
            [UnlockListboxScroll, Message.CompletedUnlockListboxScroll()],
            [RestoreListboxInert, Message.CompletedRestoreListboxInert()],
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        ),
    )

    it.effect('does not emit modal commands when isModal is false', () =>
      story(
        TestListbox.Live,
        testConfig,
        givenClosed,
        Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
        Story.Command.resolve(
          FocusListboxItems,
          Message.CompletedFocusListboxItems(),
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
        Story.message(Message.Closed()),
        Story.Command.resolve(
          FocusListboxButton,
          Message.CompletedFocusListboxButton(),
        ),
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
          TestListbox.Live,
          testConfig,
          givenOpen,
          Story.model(extractedModel => {
            model = extractedModel
          }),
        ),
      )
      return model
    }

    const sceneView = (
      overrides: Omit<Partial<ViewInputs<string>>, 'buttonContent'> = {},
    ): ViewInputs<string> => ({
      items: ['Apple', 'Banana'],
      itemToConfig: () => ({ content: null }),
      buttonContent: null,
      maybeSelectedValue: Option.none(),
      ...overrides,
    })

    describe('ARIA', () => {
      it.effect('only points at the items panel while it is rendered', () =>
        scene(
          ListboxSceneLive,
          sceneView(),
          Scene.given({ listbox: closedModel() }),
          Scene.expect(Scene.selector('[key="test-button"]')).not.toHaveAttr(
            'aria-controls',
          ),
          Scene.given({ listbox: openModel() }),
          Scene.expect(Scene.selector('[key="test-button"]')).toHaveAttr(
            'aria-controls',
            'test-items',
          ),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )

      it.effect('keeps the items panel out of the Tab order', () =>
        scene(
          ListboxSceneLive,
          sceneView(),
          Scene.given({ listbox: openModel() }),
          Scene.expect(Scene.selector('#test-items')).toHaveAttr(
            'tabIndex',
            '-1',
          ),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )

      it.effect('button has aria-haspopup="listbox"', () =>
        scene(
          ListboxSceneLive,
          sceneView(),
          Scene.given({ listbox: openModel() }),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-button"]')).toHaveAttr(
              'aria-haspopup',
              'listbox',
            )
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )

      it.effect('items container has role="listbox"', () =>
        scene(
          ListboxSceneLive,
          sceneView(),
          Scene.given({ listbox: openModel() }),
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

      it.effect('items have role="option"', () =>
        scene(
          ListboxSceneLive,
          sceneView(),
          Scene.given({ listbox: openModel() }),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-item-0"]')).toHaveAttr(
              'role',
              'option',
            )
            expect(Scene.find(html, '[key="test-item-1"]')).toHaveAttr(
              'role',
              'option',
            )
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )

      it.effect('selected item has aria-selected="true"', () =>
        scene(
          ListboxSceneLive,
          sceneView({ maybeSelectedValue: Option.some('Apple') }),
          Scene.given({ listbox: openModel() }),
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
          ListboxSceneLive,
          sceneView({ maybeSelectedValue: Option.some('Apple') }),
          Scene.given({ listbox: openModel() }),
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

      it.effect('data-selected attribute on selected item', () =>
        scene(
          ListboxSceneLive,
          sceneView({ maybeSelectedValue: Option.some('Banana') }),
          Scene.given({ listbox: openModel() }),
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

      it.effect('items container has no aria-multiselectable', () =>
        scene(
          ListboxSceneLive,
          sceneView(),
          Scene.given({ listbox: openModel() }),
          Scene.tap(({ html }) => {
            expect(
              Scene.find(html, '[key="test-items-container"]'),
            ).not.toHaveAttr('aria-multiselectable')
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )
    })

    describe('read-only', () => {
      const button = Scene.selector('#test-button')
      const itemsContainer = Scene.selector('#test-items')
      const item = (index: number) => Scene.selector(`#test-item-${index}`)

      it.effect(
        'emits aria-readonly and data-readonly on the items container, and data-readonly on the button and every item',
        () =>
          scene(
            ListboxSceneLive,
            sceneView({ isReadOnly: true }),
            Scene.given({ listbox: openModel() }),
            Scene.expect(itemsContainer).toHaveAttr('aria-readonly', 'true'),
            Scene.expect(itemsContainer).toHaveAttr('data-readonly', ''),
            Scene.expect(button).toHaveAttr('data-readonly', ''),
            Scene.expect(item(0)).toHaveAttr('data-readonly', ''),
            Scene.expect(item(1)).toHaveAttr('data-readonly', ''),
            acknowledgeAnchor,
            acknowledgeBackdrop,
          ),
      )

      it.effect('emits data-readonly on the wrapper', () =>
        scene(
          ListboxSceneLive,
          sceneView({ isReadOnly: true, className: 'test-wrapper' }),
          Scene.given({ listbox: openModel() }),
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
          ListboxSceneLive,
          sceneView(),
          Scene.given({ listbox: openModel() }),
          Scene.expect(itemsContainer).not.toHaveAttr('aria-readonly'),
          Scene.expect(itemsContainer).not.toHaveAttr('data-readonly'),
          Scene.expect(button).not.toHaveAttr('data-readonly'),
          Scene.expect(item(0)).not.toHaveAttr('data-readonly'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )

      it.effect('passes isReadOnly to itemToConfig', () =>
        scene(
          ListboxSceneLive,
          sceneView({
            isReadOnly: true,
            itemToConfig: (_item, context) => ({
              content: null,
              className: context.isReadOnly ? 'is-read-only' : 'is-editable',
            }),
          }),
          Scene.given({ listbox: openModel() }),
          Scene.expect(item(0)).toHaveClass('is-read-only'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )

      it.effect(
        'emits both aria-readonly/data-readonly and aria-disabled/data-disabled when set together',
        () =>
          scene(
            ListboxSceneLive,
            sceneView({ isReadOnly: true, isDisabled: true }),
            Scene.given({ listbox: openModel() }),
            Scene.expect(itemsContainer).toHaveAttr('aria-readonly', 'true'),
            Scene.expect(button).toHaveAttr('data-readonly', ''),
            Scene.expect(button).toHaveAttr('data-disabled', ''),
            Scene.expect(button).toHaveAttr('aria-disabled', 'true'),
            Scene.expect(button).not.toHaveHandler('click'),
            Scene.expect(button).not.toHaveHandler('keydown'),
            acknowledgeAnchor,
            acknowledgeBackdrop,
          ),
      )

      it.effect(
        'drops the item click handler while keeping the keydown handler',
        () =>
          scene(
            ListboxSceneLive,
            sceneView({ isReadOnly: true }),
            Scene.given({ listbox: openModel() }),
            Scene.expect(item(0)).not.toHaveHandler('click'),
            Scene.expect(item(0)).toHaveHandler('pointerleave'),
            Scene.expect(item(1)).not.toHaveHandler('click'),
            Scene.expect(item(1)).toHaveHandler('pointermove'),
            Scene.expect(itemsContainer).toHaveHandler('keydown'),
            acknowledgeAnchor,
            acknowledgeBackdrop,
          ),
      )

      it.effect('does not commit the active item on Enter', () =>
        scene(
          ListboxSceneLive,
          sceneView({ isReadOnly: true }),
          Scene.given({ listbox: openModel() }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(itemsContainer, 'Enter'),
          Scene.expectNoOutMessage(),
          Scene.Command.expectNone(),
          Scene.expect(itemsContainer).toExist(),
        ),
      )

      it.effect('does not commit the active item on Space', () =>
        scene(
          ListboxSceneLive,
          sceneView({ isReadOnly: true }),
          Scene.given({ listbox: openModel() }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(itemsContainer, ' '),
          Scene.expectNoOutMessage(),
          Scene.Command.expectNone(),
          Scene.expect(itemsContainer).toExist(),
        ),
      )

      it.effect('runs typeahead on Space while a search query is pending', () =>
        scene(
          ListboxSceneLive,
          sceneView({
            isReadOnly: true,
            items: ['Apple', 'Banana', 'B Team'],
          }),
          Scene.given({ listbox: openModel() }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(itemsContainer, 'B'),
          Scene.expect(item(1)).toHaveAttr('data-active', ''),
          Scene.Command.resolve(
            DelayClearListboxSearch,
            Message.CompletedDelayClearListboxSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Scene.keydown(itemsContainer, ' '),
          Scene.expectNoOutMessage(),
          Scene.expect(item(1)).not.toHaveAttr('data-active'),
          Scene.expect(item(2)).toHaveAttr('data-active', ''),
          Scene.Command.resolve(
            DelayClearListboxSearch,
            Message.CompletedDelayClearListboxSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
        ),
      )

      it.effect('keeps arrow, Home, and End navigation live', () =>
        scene(
          ListboxSceneLive,
          sceneView({ isReadOnly: true }),
          Scene.given({ listbox: openModel() }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(itemsContainer, 'ArrowDown'),
          Scene.Command.resolve(
            ScrollListboxItemIntoView,
            Message.CompletedScrollListboxItemIntoView(),
          ),
          Scene.expect(item(1)).toHaveAttr('data-active', ''),
          Scene.keydown(itemsContainer, 'Home'),
          Scene.Command.resolve(
            ScrollListboxItemIntoView,
            Message.CompletedScrollListboxItemIntoView(),
          ),
          Scene.expect(item(0)).toHaveAttr('data-active', ''),
          Scene.keydown(itemsContainer, 'End'),
          Scene.Command.resolve(
            ScrollListboxItemIntoView,
            Message.CompletedScrollListboxItemIntoView(),
          ),
          Scene.expect(item(1)).toHaveAttr('data-active', ''),
          Scene.expectNoOutMessage(),
        ),
      )

      it.effect(
        'moves the active item off the selection without changing it',
        () =>
          scene(
            ListboxSceneLive,
            sceneView({
              isReadOnly: true,
              maybeSelectedValue: Option.some('Apple'),
            }),
            Scene.given({ listbox: openModel() }),
            acknowledgeAnchor,
            acknowledgeBackdrop,
            Scene.expect(item(0)).toHaveAttr('data-selected', ''),
            Scene.expect(item(0)).toHaveAttr('data-active', ''),
            Scene.keydown(itemsContainer, 'ArrowDown'),
            Scene.Command.resolve(
              ScrollListboxItemIntoView,
              Message.CompletedScrollListboxItemIntoView(),
            ),
            Scene.expect(item(1)).toHaveAttr('data-active', ''),
            Scene.expect(item(0)).not.toHaveAttr('data-active'),
            Scene.expect(item(0)).toHaveAttr('data-selected', ''),
            Scene.expect(item(1)).not.toHaveAttr('data-selected'),
            Scene.expect(itemsContainer).toHaveAttr(
              'aria-activedescendant',
              'test-item-1',
            ),
            Scene.expectNoOutMessage(),
          ),
      )

      it.effect('consumes Enter on the active item without committing', () =>
        scene(
          ListboxSceneLive,
          sceneView({ isReadOnly: true }),
          Scene.given({ listbox: openModel() }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(itemsContainer, 'Enter'),
          Scene.expectHandled(),
          Scene.expectNoOutMessage(),
          Scene.Command.expectNone(),
        ),
      )

      it.effect('consumes Space on the active item without committing', () =>
        scene(
          ListboxSceneLive,
          sceneView({ isReadOnly: true }),
          Scene.given({ listbox: openModel() }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(itemsContainer, ' '),
          Scene.expectHandled(),
          Scene.expectNoOutMessage(),
          Scene.Command.expectNone(),
        ),
      )

      it.effect('still opens from the button and closes on Escape', () =>
        scene(
          ListboxSceneLive,
          sceneView({ isReadOnly: true }),
          Scene.given({ listbox: closedModel() }),
          Scene.click(button),
          Scene.Command.resolve(
            FocusListboxItems,
            Message.CompletedFocusListboxItems(),
          ),
          Scene.expect(itemsContainer).toExist(),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(itemsContainer, 'Escape'),
          Scene.Command.resolve(
            FocusListboxButton,
            Message.CompletedFocusListboxButton(),
          ),
          Scene.Mount.expectEnded(AnchorListbox, PortalListboxBackdrop),
          Scene.expect(itemsContainer).toBeAbsent(),
        ),
      )
    })

    describe('form integration', () => {
      it.effect('renders hidden input when name is provided', () =>
        scene(
          ListboxSceneLive,
          sceneView({ name: 'fruit' }),
          Scene.given({ listbox: closedModel() }),
          Scene.tap(({ html }) => {
            const hiddenInput = Scene.find(html, 'input[type="hidden"]')
            expect(hiddenInput).toExist()
            expect(hiddenInput).toHaveAttr('name', 'fruit')
          }),
        ),
      )

      it.effect('hidden input value matches selected item', () =>
        scene(
          ListboxSceneLive,
          sceneView({
            name: 'fruit',
            maybeSelectedValue: Option.some('Apple'),
          }),
          Scene.given({ listbox: closedModel() }),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, 'input[type="hidden"]')).toHaveAttr(
              'value',
              'Apple',
            )
          }),
        ),
      )

      it.effect('no hidden input when name is not provided', () =>
        scene(
          ListboxSceneLive,
          sceneView(),
          Scene.given({ listbox: closedModel() }),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, 'input[type="hidden"]')).toBeAbsent()
          }),
        ),
      )

      it.effect(
        'no value attribute on hidden input when nothing selected',
        () =>
          scene(
            ListboxSceneLive,
            sceneView({ name: 'fruit' }),
            Scene.given({ listbox: closedModel() }),
            Scene.tap(({ html }) => {
              expect(Scene.find(html, 'input[type="hidden"]')).not.toHaveAttr(
                'value',
              )
            }),
          ),
      )
    })

    describe('button labeling', () => {
      it.effect(
        'no aria-label or aria-labelledby on the trigger by default',
        () =>
          scene(
            ListboxSceneLive,
            sceneView(),
            Scene.given({ listbox: closedModel() }),
            Scene.tap(({ html }) => {
              const button = Scene.find(html, '[key="test-button"]')
              expect(button).not.toHaveAttr('aria-label')
              expect(button).not.toHaveAttr('aria-labelledby')
            }),
          ),
      )

      it.effect(
        'applies aria-label to the trigger when ariaLabel is provided',
        () =>
          scene(
            ListboxSceneLive,
            sceneView({ ariaLabel: 'Fruit' }),
            Scene.given({ listbox: closedModel() }),
            Scene.tap(({ html }) => {
              const button = Scene.find(html, '[key="test-button"]')
              expect(button).toHaveAttr('aria-label', 'Fruit')
              expect(button).not.toHaveAttr('aria-labelledby')
            }),
          ),
      )

      it.effect(
        'applies aria-labelledby to the trigger when ariaLabelledBy is provided',
        () =>
          scene(
            ListboxSceneLive,
            sceneView({ ariaLabelledBy: 'fruit-label' }),
            Scene.given({ listbox: closedModel() }),
            Scene.tap(({ html }) => {
              const button = Scene.find(html, '[key="test-button"]')
              expect(button).toHaveAttr('aria-labelledby', 'fruit-label')
              expect(button).not.toHaveAttr('aria-label')
            }),
          ),
      )

      it.effect(
        'prefers aria-label over aria-labelledby when both are provided',
        () =>
          scene(
            ListboxSceneLive,
            sceneView({
              ariaLabel: 'Fruit',
              ariaLabelledBy: 'fruit-label',
            }),
            Scene.given({ listbox: closedModel() }),
            Scene.tap(({ html }) => {
              const button = Scene.find(html, '[key="test-button"]')
              expect(button).toHaveAttr('aria-label', 'Fruit')
              expect(button).not.toHaveAttr('aria-labelledby')
            }),
          ),
      )

      it('buttonId derives the trigger id from the base id', () => {
        expect(buttonId('test')).toBe('test-button')
      })
    })

    describe('item context', () => {
      it.effect(
        'itemToConfig receives isSelected: true for selected item',
        () => {
          const contexts: Array<
            Parameters<ViewInputs<string>['itemToConfig']>[1]
          > = []
          return scene(
            ListboxSceneLive,
            sceneView({
              maybeSelectedValue: Option.some('Apple'),
              itemToConfig: (_item, context) => {
                contexts.push(context)
                return { content: null }
              },
            }),
            Scene.given({ listbox: openModel() }),
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
            Parameters<ViewInputs<string>['itemToConfig']>[1]
          > = []
          return scene(
            ListboxSceneLive,
            sceneView({
              maybeSelectedValue: Option.some('Apple'),
              itemToConfig: (_item, context) => {
                contexts.push(context)
                return { content: null }
              },
            }),
            Scene.given({ listbox: openModel() }),
            Scene.tap(() => {
              expect(contexts[1]?.isSelected).toBe(false)
            }),
            acknowledgeAnchor,
            acknowledgeBackdrop,
          )
        },
      )
    })

    describe('anchor', () => {
      it.effect(
        'adds absolute positioning, initial visibility hidden, and hooks when anchor is provided',
        () =>
          scene(
            ListboxSceneLive,
            sceneView({
              anchor: { placement: 'bottom-start' as const },
            }),
            Scene.given({ listbox: openModel() }),
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
            ListboxSceneLive,
            sceneView(),
            Scene.given({ listbox: openModel() }),
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

    describe('orientation', () => {
      it.effect(
        'items container has aria-orientation="vertical" by default',
        () =>
          scene(
            ListboxSceneLive,
            sceneView(),
            Scene.given({ listbox: openModel() }),
            Scene.tap(({ html }) => {
              expect(
                Scene.find(html, '[key="test-items-container"]'),
              ).toHaveAttr('aria-orientation', 'vertical')
            }),
            acknowledgeAnchor,
            acknowledgeBackdrop,
          ),
      )

      it.effect(
        'items container has aria-orientation="horizontal" when horizontal',
        () => {
          const model = modifyFields(openModel(), {
            orientation: () => 'Horizontal',
          })
          return scene(
            ListboxSceneLive,
            sceneView(),
            Scene.given({ listbox: model }),
            Scene.tap(({ html }) => {
              expect(
                Scene.find(html, '[key="test-items-container"]'),
              ).toHaveAttr('aria-orientation', 'horizontal')
            }),
            acknowledgeAnchor,
            acknowledgeBackdrop,
          )
        },
      )
    })

    describe('whole-listbox disabled', () => {
      it.effect('wrapper has data-disabled when isDisabled is true', () =>
        scene(
          ListboxSceneLive,
          sceneView({ isDisabled: true }),
          Scene.given({ listbox: closedModel() }),
          Scene.tap(({ html }) => {
            expect(html.data?.attrs?.['data-disabled']).toBe('')
          }),
        ),
      )

      it.effect(
        'wrapper does not have data-disabled when isDisabled is false',
        () =>
          scene(
            ListboxSceneLive,
            sceneView(),
            Scene.given({ listbox: closedModel() }),
            Scene.tap(({ html }) => {
              expect(html.data?.attrs?.['data-disabled']).toBeUndefined()
            }),
          ),
      )

      it.effect('button has aria-disabled when isDisabled is true', () =>
        scene(
          ListboxSceneLive,
          sceneView({ isDisabled: true }),
          Scene.given({ listbox: closedModel() }),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-button"]')).toHaveAttr(
              'aria-disabled',
              'true',
            )
            expect(Scene.find(html, '[key="test-button"]')).toHaveAttr(
              'data-disabled',
              '',
            )
          }),
        ),
      )

      it.effect('button has no event handlers when isDisabled is true', () =>
        scene(
          ListboxSceneLive,
          sceneView({ isDisabled: true }),
          Scene.given({ listbox: closedModel() }),
          Scene.tap(({ html }) => {
            const button = Scene.find(html, '[key="test-button"]')
            expect(button).not.toHaveHandler('pointerdown')
            expect(button).not.toHaveHandler('click')
          }),
        ),
      )
    })

    describe('invalid state', () => {
      it.effect('wrapper has data-invalid when isInvalid is true', () =>
        scene(
          ListboxSceneLive,
          sceneView({ isInvalid: true }),
          Scene.given({ listbox: closedModel() }),
          Scene.tap(({ html }) => {
            expect(html.data?.attrs?.['data-invalid']).toBe('')
          }),
        ),
      )

      it.effect(
        'wrapper does not have data-invalid when isInvalid is false',
        () =>
          scene(
            ListboxSceneLive,
            sceneView(),
            Scene.given({ listbox: closedModel() }),
            Scene.tap(({ html }) => {
              expect(html.data?.attrs?.['data-invalid']).toBeUndefined()
            }),
          ),
      )

      it.effect('button has data-invalid when isInvalid is true', () =>
        scene(
          ListboxSceneLive,
          sceneView({ isInvalid: true }),
          Scene.given({ listbox: closedModel() }),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-button"]')).toHaveAttr(
              'data-invalid',
              '',
            )
          }),
        ),
      )
    })

    describe('form prop', () => {
      it.effect('hidden input has form attribute when form is provided', () =>
        scene(
          ListboxSceneLive,
          sceneView({ name: 'fruit', form: 'my-form' }),
          Scene.given({ listbox: closedModel() }),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, 'input[type="hidden"]')).toHaveAttr(
              'form',
              'my-form',
            )
          }),
        ),
      )

      it.effect(
        'hidden input has no form attribute when form is not provided',
        () =>
          scene(
            ListboxSceneLive,
            sceneView({ name: 'fruit' }),
            Scene.given({ listbox: closedModel() }),
            Scene.tap(({ html }) => {
              expect(Scene.find(html, 'input[type="hidden"]')).not.toHaveAttr(
                'form',
              )
            }),
          ),
      )
    })

    describe('typed items', () => {
      type Person = Readonly<{ id: string; name: string }>
      const people: ReadonlyArray<Person> = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Charlie' },
      ]

      const PersonListboxSceneLive =
        makeListboxScene(makeBlock<Person, string>())

      const personSceneView = (
        overrides: Omit<
          Partial<ViewInputs<Person, string>>,
          'items' | 'itemToValue' | 'itemToConfig' | 'buttonContent'
        > = {},
      ): ViewInputs<Person, string> => ({
        items: people,
        itemToValue: person => person.id,
        itemToConfig: () => ({ content: null }),
        buttonContent: null,
        maybeSelectedValue: Option.none(),
        ...overrides,
      })

      it.effect('items have click handlers with object items', () =>
        scene(
          PersonListboxSceneLive,
          personSceneView(),
          Scene.given({ listbox: openModel() }),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-item-0"]')).toHaveHandler(
              'click',
            )
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )

      it.effect('selected item matches by itemToValue', () =>
        scene(
          PersonListboxSceneLive,
          personSceneView({ maybeSelectedValue: Option.some('2') }),
          Scene.given({ listbox: openModel() }),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-item-1"]')).toHaveAttr(
              'aria-selected',
              'true',
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

      it.effect('non-selected item has aria-selected false', () =>
        scene(
          PersonListboxSceneLive,
          personSceneView({ maybeSelectedValue: Option.some('2') }),
          Scene.given({ listbox: openModel() }),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-item-0"]')).toHaveAttr(
              'aria-selected',
              'false',
            )
            expect(Scene.find(html, '[key="test-item-0"]')).not.toHaveAttr(
              'data-selected',
            )
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )

      it.effect('hidden input uses itemToValue for value', () =>
        scene(
          PersonListboxSceneLive,
          personSceneView({
            name: 'person',
            maybeSelectedValue: Option.some('1'),
          }),
          Scene.given({ listbox: closedModel() }),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, 'input[type="hidden"]')).toHaveAttr(
              'value',
              '1',
            )
          }),
        ),
      )
    })
  })
})
