import { Effect, Option } from 'effect'
import { Scene, Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { it as baseIt, expect } from 'vitest'

import { describe } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import { makeInitialModel } from '../animation/schema.js'
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
  makeView,
} from './shared.js'
import { AnimationBinding, block } from './single.js'
import type { Model, ViewInputs } from './single.js'

const render = makeView<Model>({ ariaMultiSelectable: false })<string, string>()
const view = (
  model: Model,
  { maybeSelectedValue, ...baseInputs }: ViewInputs<string>,
  h: Parameters<typeof render>[2],
) =>
  render(
    model,
    {
      ...baseInputs,
      selectedValues: Option.toArray(maybeSelectedValue),
    },
    h,
  )

type TestHtmlBuilder = Parameters<typeof view>[2]

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

type ListboxOperations = Pick<
  Effect.Success<typeof block.get>,
  'init' | 'update' | 'operations'
>

const makeFixture = (listbox: ListboxOperations) => {
  const { init, update } = listbox
  const { operations } = listbox
  const givenClosed = Story.given(init({ id: 'test' }).model)

  const givenOpen = Story.steps(
    givenClosed,
    Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
    Story.Command.resolve(
      FocusListboxItems,
      Message.CompletedFocusListboxItems(),
    ),
  )

  const givenClosedAnimated = Story.given(
    init({ id: 'test', isAnimated: true }).model,
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

  const givenClosedModal = Story.given(
    init({ id: 'test', isModal: true }).model,
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

  const closedModel = () => init({ id: 'test' }).model
  const openModel = (): Model =>
    update(
      closedModel(),
      Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
    ).model

  return {
    init,
    update,
    operations,
    givenClosed,
    givenOpen,
    givenClosedAnimated,
    givenOpenAnimated,
    givenClosedModal,
    givenOpenModal,
    closedModel,
    openModel,
  }
}

const it = baseIt.extend<{ listbox: ReturnType<typeof makeFixture> }>({
  listbox: async ({}, use) =>
    Effect.runPromise(
      Story.withBlock(block, listbox =>
        Effect.promise(() => use(makeFixture(listbox))),
      ),
    ),
})

describe('Listbox', () => {
  describe('init', () => {
    it('defaults to closed with no active item', ({ listbox: { init } }) => {
      expect(init({ id: 'test' }).model).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        isModal: false,
        orientation: 'Vertical',
        animation: makeInitialModel({ id: 'test-listbox' }),
        maybeActiveItemIndex: Option.none(),
        activationTrigger: 'Keyboard',
        searchQuery: '',
        searchVersion: 0,
        maybeLastPointerPosition: Option.none(),
        maybeLastButtonPointerType: Option.none(),
      })
    })

    it('accepts isAnimated option', ({ listbox: { init } }) => {
      const model = init({ id: 'test', isAnimated: true }).model
      expect(model.isAnimated).toBe(true)
      expect(model.animation.transitionState).toBe('Idle')
    })

    it('defaults isModal to false', ({ listbox: { init } }) => {
      const model = init({ id: 'test' }).model
      expect(model.isModal).toBe(false)
    })

    it('accepts isModal option', ({ listbox: { init } }) => {
      const model = init({ id: 'test', isModal: true }).model
      expect(model.isModal).toBe(true)
    })

    it('defaults orientation to Vertical', ({ listbox: { init } }) => {
      const model = init({ id: 'test' }).model
      expect(model.orientation).toBe('Vertical')
    })

    it('accepts orientation option', ({ listbox: { init } }) => {
      const model = init({ id: 'test', orientation: 'Horizontal' }).model
      expect(model.orientation).toBe('Horizontal')
    })
  })

  describe('update', () => {
    describe('Opened', () => {
      it('opens the listbox with the given active item', ({
        listbox: { update, givenClosed },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('resets search state on open', ({ listbox: { update, init } }) => {
        Story.story(
          update,
          Story.given(
            modifyFields(init({ id: 'test' }).model, {
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
        )
      })

      it('sets trigger to Keyboard when opened with active item', ({
        listbox: { update, givenClosed },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('sets trigger to Pointer when opened without active item', ({
        listbox: { update, givenClosed },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('resets pointer position on open', ({ listbox: { update, init } }) => {
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
          Story.Command.resolve(
            FocusListboxItems,
            Message.CompletedFocusListboxItems(),
          ),
          Story.model(model => {
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })
    })

    describe('Closed', () => {
      it('closes the listbox and resets state', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('returns no Command and no OutMessage when already closed', ({
        listbox: { update, givenClosed },
      }) => {
        Story.story(
          update,
          givenClosed,
          Story.message(Message.Closed()),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('BlurredItems', () => {
      it('closes the listbox without restoring button focus', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(Message.BlurredItems()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })
    })

    describe('PressedPointerOnButton', () => {
      it('records pointer type for touch without toggling', ({
        listbox: { update, givenClosed },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('records pointer type for pen without toggling', ({
        listbox: { update, givenClosed },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('opens the listbox on mouse left button when closed', ({
        listbox: { update, givenClosed },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('closes the listbox on mouse left button when open and preserves pointer type', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
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
        )
      })

      it('does not toggle on mouse right button', ({
        listbox: { update, givenClosed },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('always records maybeLastButtonPointerType', ({
        listbox: { update, givenClosed },
      }) => {
        Story.story(
          update,
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
        )
      })
    })

    describe('ActivatedItem', () => {
      it('sets the active item index', ({ listbox: { update, givenOpen } }) => {
        Story.story(
          update,
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
        )
      })

      it('replaces the previous active item', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('stores activation trigger in model', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 1, activationTrigger: 'Pointer' }),
          ),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Pointer')
          }),
        )
      })

      it('returns scroll command for keyboard activation', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
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
        )
      })
    })

    describe('DeactivatedItem', () => {
      it('clears active item when pointer-activated', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 1, activationTrigger: 'Pointer' }),
          ),
          Story.message(Message.DeactivatedItem()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('preserves active item when keyboard-activated', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
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
        )
      })
    })

    describe('MovedPointerOverItem', () => {
      it('activates item on first pointer move', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('activates when position differs from stored', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('returns model unchanged when position matches', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
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
        )
      })
    })

    describe('SelectedItem', () => {
      it('emits Selected with the item value', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(Message.SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
          Story.Command.resolve(
            FocusListboxButton,
            Message.CompletedFocusListboxButton(),
          ),
        )
      })

      it('closes the listbox on selection', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('returns a focus button command', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(Message.SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
          Story.Command.resolve(
            FocusListboxButton,
            Message.CompletedFocusListboxButton(),
          ),
        )
      })

      it('emits Selected with the newly chosen value across selections', ({
        listbox: { update, givenClosed },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('returns no Command when an item is selected while already closed', ({
        listbox: { update, givenClosed },
      }) => {
        Story.story(
          update,
          givenClosed,
          Story.message(Message.SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('RequestedItemClick', () => {
      it('returns model unchanged with a click command', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(Message.RequestedItemClick({ index: 2 })),
          Story.Command.resolve(
            ClickListboxItem,
            Message.CompletedClickListboxItem(),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('Searched', () => {
      it('appends the key to the search query', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('bumps the search version', ({ listbox: { update, givenOpen } }) => {
        Story.story(
          update,
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
        )
      })

      it('updates active item when a match is found', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('keeps existing active item when no match is found', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('returns a delay command for debounce', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
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
        )
      })
    })

    describe('CompletedDelayClearListboxSearch', () => {
      it('clears search query when version matches', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('ignores stale version', ({ listbox: { update, givenOpen } }) => {
        Story.story(
          update,
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
        )
      })
    })

    describe('completed and view-dispatched messages', () => {
      it('returns model unchanged for CompletedLockListboxScroll', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(Message.CompletedLockListboxScroll()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('resets maybeLastButtonPointerType for IgnoredMouseClick', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('keeps the listbox open after ClickedButton follows a mouse press', ({
        listbox: { update, givenClosed },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('opens on ClickedButton when the click did not follow a mouse press', ({
        listbox: { update, givenClosed },
      }) => {
        Story.story(
          update,
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
        )
      })

      it('closes an open listbox on ClickedButton when the click did not follow a mouse press', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(Message.ClickedButton()),
          Story.Command.resolve(
            FocusListboxButton,
            Message.CompletedFocusListboxButton(),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })

      it('returns model unchanged for SuppressedSpaceScroll', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(Message.SuppressedSpaceScroll()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('returns model unchanged for SuppressedItemCommit', ({
        listbox: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(Message.SuppressedItemCommit()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('transitions', () => {
      describe('enter flow', () => {
        it('sets EnterStart and emits focus + afterPaint on Opened', ({
          listbox: { update, givenClosedAnimated },
        }) => {
          Story.story(
            update,
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
          )
        })

        it('advances EnterStart to EnterAnimating on GotAnimationMessage(CompletedWaitForPaint)', ({
          listbox: { update, givenClosedAnimated },
        }) => {
          Story.story(
            update,
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
          )
        })

        it('completes EnterAnimating to Idle on GotAnimationMessage(EndedAnimation)', ({
          listbox: { update, givenClosedAnimated },
        }) => {
          Story.story(
            update,
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
          )
        })
      })

      describe('leave flow', () => {
        it('starts no leave cascade on Closed when already closed', ({
          listbox: { update, givenClosedAnimated },
        }) => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(Message.Closed()),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('sets LeaveStart on Closed', ({
          listbox: { update, givenOpenAnimated },
        }) => {
          Story.story(
            update,
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
          )
        })

        it('begins the leave animation when the items container blurs', ({
          listbox: { update, givenOpenAnimated },
        }) => {
          Story.story(
            update,
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
          )
        })

        it('sets LeaveStart on SelectedItem', ({
          listbox: { update, givenOpenAnimated },
        }) => {
          Story.story(
            update,
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
          )
        })

        it('advances LeaveStart to LeaveAnimating on GotAnimationMessage(CompletedWaitForPaint)', ({
          listbox: { update, givenOpenAnimated },
        }) => {
          Story.story(
            update,
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
          )
        })

        it('completes LeaveAnimating to Idle on GotAnimationMessage(EndedAnimation)', ({
          listbox: { update, givenOpenAnimated },
        }) => {
          Story.story(
            update,
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
          )
        })
      })

      describe('non-animated', () => {
        it('keeps transitionState Idle on Opened', ({
          listbox: { update, givenClosed },
        }) => {
          Story.story(
            update,
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
          )
        })

        it('keeps transitionState Idle on Closed', ({
          listbox: { update, givenOpen },
        }) => {
          Story.story(
            update,
            givenOpen,
            Story.message(Message.Closed()),
            Story.Command.resolve(
              FocusListboxButton,
              Message.CompletedFocusListboxButton(),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('stale messages', () => {
        it('ignores GotAnimationMessage with CompletedWaitForPaint when Idle', () => {
          return Effect.runPromise(
            Story.story(
              block,
              Story.init({ id: 'test' }),
              Story.message(
                Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
              ),
              Story.Command.resolve(
                FocusListboxItems,
                Message.CompletedFocusListboxItems(),
              ),
              Story.messageFrom(
                AnimationBinding,
                Animation.Message.CompletedWaitForPaint({ generation: 0 }),
              ),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
                expect(model.animation.transitionState).toBe('Idle')
              }),
            ),
          )
        })

        it('ignores CompletedDetectListboxMovementOrAnimationEnd when Idle', ({
          listbox: { update, givenOpen },
        }) => {
          Story.story(
            update,
            givenOpen,
            Story.message(completedDetectListboxMovementOrAnimationEnd(0)),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('interruptions', () => {
        it('transitions to LeaveStart when Closed during EnterStart', ({
          listbox: { update, givenClosedAnimated },
        }) => {
          Story.story(
            update,
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
          )
        })

        it('transitions to LeaveStart when Closed during EnterAnimating', ({
          listbox: { update, givenClosedAnimated },
        }) => {
          Story.story(
            update,
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
          )
        })
      })
    })
  })

  describe('modal commands', () => {
    it('emits lockScroll and inertOthers commands on Opened when isModal is true', ({
      listbox: { update, givenClosedModal },
    }) => {
      Story.story(
        update,
        givenClosedModal,
        Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
        Story.Command.resolveAll(
          [FocusListboxItems, Message.CompletedFocusListboxItems()],
          [LockListboxScroll, Message.CompletedLockListboxScroll()],
          [InertListboxOthers, Message.CompletedInertListboxOthers()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on Closed when isModal is true', ({
      listbox: { update, givenOpenModal },
    }) => {
      Story.story(
        update,
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
      )
    })

    it('emits no Commands on Closed when already closed in modal mode', ({
      listbox: { update, givenClosedModal },
    }) => {
      Story.story(
        update,
        givenClosedModal,
        Story.message(Message.Closed()),
        Story.expectNoOutMessage(),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits no Commands when requestOpen receives an open modal Model', ({
      listbox: { init, operations, update },
    }) => {
      const openModal = modifyFields(
        init({ id: 'test', isModal: true }).model,
        {
          isOpen: () => true,
          maybeActiveItemIndex: () => Option.some(1),
          searchQuery: () => 'ap',
          searchVersion: () => 2,
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
        expect(reopened.model.searchQuery).toBe('ap')
        expect(reopened.model.searchVersion).toBe(2)
      }
    })

    it('emits unlockScroll and restoreInert commands when the items container blurs in modal mode', ({
      listbox: { update, givenOpenModal },
    }) => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(Message.BlurredItems()),
        Story.Command.resolveAll(
          [UnlockListboxScroll, Message.CompletedUnlockListboxScroll()],
          [RestoreListboxInert, Message.CompletedRestoreListboxInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits no Commands when the items container blurs on a closed listbox in modal mode', ({
      listbox: { update, givenClosedModal },
    }) => {
      Story.story(
        update,
        givenClosedModal,
        Story.message(Message.BlurredItems()),
        Story.expectNoOutMessage(),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on SelectedItem when isModal is true', ({
      listbox: { update, givenOpenModal },
    }) => {
      Story.story(
        update,
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
      )
    })

    it('does not emit modal commands when isModal is false', ({
      listbox: { update, givenClosed },
    }) => {
      Story.story(
        update,
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
      )
    })
  })

  describe('view', () => {
    const sceneView =
      (overrides: Omit<Partial<ViewInputs<string>>, 'buttonContent'> = {}) =>
      (model: Model, h: TestHtmlBuilder) =>
        view(
          model,
          {
            items: ['Apple', 'Banana'],
            itemToConfig: () => ({ content: null }),
            buttonContent: null,
            maybeSelectedValue: Option.none(),
            ...overrides,
          },
          h,
        )

    describe('ARIA', () => {
      it('only points at the items panel while it is rendered', ({
        listbox: { update, closedModel, openModel },
      }) => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(closedModel()),
          Scene.expect(Scene.selector('[key="test-button"]')).not.toHaveAttr(
            'aria-controls',
          ),
          Scene.given(openModel()),
          Scene.expect(Scene.selector('[key="test-button"]')).toHaveAttr(
            'aria-controls',
            'test-items',
          ),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('keeps the items panel out of the Tab order', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(openModel()),
          Scene.expect(Scene.selector('#test-items')).toHaveAttr(
            'tabIndex',
            '-1',
          ),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('button has aria-haspopup="listbox"', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(openModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-button"]')).toHaveAttr(
              'aria-haspopup',
              'listbox',
            )
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('items container has role="listbox"', ({
        listbox: { update, openModel },
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

      it('items have role="option"', ({ listbox: { update, openModel } }) => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(openModel()),
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
        )
      })

      it('selected item has aria-selected="true"', ({
        listbox: { update, openModel },
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
        listbox: { update, openModel },
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

      it('data-selected attribute on selected item', ({
        listbox: { update, openModel },
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

      it('items container has no aria-multiselectable', ({
        listbox: { update, openModel },
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
    })

    describe('read-only', () => {
      const button = Scene.selector('#test-button')
      const itemsContainer = Scene.selector('#test-items')
      const item = (index: number) => Scene.selector(`#test-item-${index}`)

      it('emits aria-readonly and data-readonly on the items container, and data-readonly on the button and every item', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ isReadOnly: true }) },
          Scene.given(openModel()),
          Scene.expect(itemsContainer).toHaveAttr('aria-readonly', 'true'),
          Scene.expect(itemsContainer).toHaveAttr('data-readonly', ''),
          Scene.expect(button).toHaveAttr('data-readonly', ''),
          Scene.expect(item(0)).toHaveAttr('data-readonly', ''),
          Scene.expect(item(1)).toHaveAttr('data-readonly', ''),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('emits data-readonly on the wrapper', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({ isReadOnly: true, className: 'test-wrapper' }),
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
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(openModel()),
          Scene.expect(itemsContainer).not.toHaveAttr('aria-readonly'),
          Scene.expect(itemsContainer).not.toHaveAttr('data-readonly'),
          Scene.expect(button).not.toHaveAttr('data-readonly'),
          Scene.expect(item(0)).not.toHaveAttr('data-readonly'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('passes isReadOnly to itemToConfig', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({
              isReadOnly: true,
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

      it('emits both aria-readonly/data-readonly and aria-disabled/data-disabled when set together', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({ isReadOnly: true, isDisabled: true }),
          },
          Scene.given(openModel()),
          Scene.expect(itemsContainer).toHaveAttr('aria-readonly', 'true'),
          Scene.expect(button).toHaveAttr('data-readonly', ''),
          Scene.expect(button).toHaveAttr('data-disabled', ''),
          Scene.expect(button).toHaveAttr('aria-disabled', 'true'),
          Scene.expect(button).not.toHaveHandler('click'),
          Scene.expect(button).not.toHaveHandler('keydown'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('drops the item click handler while keeping the keydown handler', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ isReadOnly: true }) },
          Scene.given(openModel()),
          Scene.expect(item(0)).not.toHaveHandler('click'),
          Scene.expect(item(0)).toHaveHandler('pointerleave'),
          Scene.expect(item(1)).not.toHaveHandler('click'),
          Scene.expect(item(1)).toHaveHandler('pointermove'),
          Scene.expect(itemsContainer).toHaveHandler('keydown'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('does not commit the active item on Enter', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ isReadOnly: true }) },
          Scene.given(openModel()),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(itemsContainer, 'Enter'),
          Scene.expectNoOutMessage(),
          Scene.Command.expectNone(),
          Scene.expect(itemsContainer).toExist(),
        )
      })

      it('does not commit the active item on Space', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ isReadOnly: true }) },
          Scene.given(openModel()),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(itemsContainer, ' '),
          Scene.expectNoOutMessage(),
          Scene.Command.expectNone(),
          Scene.expect(itemsContainer).toExist(),
        )
      })

      it('runs typeahead on Space while a search query is pending', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({
              isReadOnly: true,
              items: ['Apple', 'Banana', 'B Team'],
            }),
          },
          Scene.given(openModel()),
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
        )
      })

      it('keeps arrow, Home, and End navigation live', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ isReadOnly: true }) },
          Scene.given(openModel()),
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
        )
      })

      it('moves the active item off the selection without changing it', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({
              isReadOnly: true,
              maybeSelectedValue: Option.some('Apple'),
            }),
          },
          Scene.given(openModel()),
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
        )
      })

      it('consumes Enter on the active item without committing', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({ isReadOnly: true }),
          },
          Scene.given(openModel()),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(itemsContainer, 'Enter'),
          Scene.expectHandled(),
          Scene.expectNoOutMessage(),
          Scene.Command.expectNone(),
        )
      })

      it('consumes Space on the active item without committing', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({ isReadOnly: true }),
          },
          Scene.given(openModel()),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(itemsContainer, ' '),
          Scene.expectHandled(),
          Scene.expectNoOutMessage(),
          Scene.Command.expectNone(),
        )
      })

      it('still opens from the button and closes on Escape', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ isReadOnly: true }) },
          Scene.given(closedModel()),
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
        )
      })
    })

    describe('form integration', () => {
      it('renders hidden input when name is provided', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ name: 'fruit' }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const hiddenInput = Scene.find(html, 'input[type="hidden"]')
            expect(hiddenInput).toExist()
            expect(hiddenInput).toHaveAttr('name', 'fruit')
          }),
        )
      })

      it('hidden input value matches selected item', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({
              name: 'fruit',
              maybeSelectedValue: Option.some('Apple'),
            }),
          },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, 'input[type="hidden"]')).toHaveAttr(
              'value',
              'Apple',
            )
          }),
        )
      })

      it('no hidden input when name is not provided', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, 'input[type="hidden"]')).toBeAbsent()
          }),
        )
      })

      it('no value attribute on hidden input when nothing selected', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ name: 'fruit' }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, 'input[type="hidden"]')).not.toHaveAttr(
              'value',
            )
          }),
        )
      })
    })

    describe('button labeling', () => {
      it('no aria-label or aria-labelledby on the trigger by default', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const button = Scene.find(html, '[key="test-button"]')
            expect(button).not.toHaveAttr('aria-label')
            expect(button).not.toHaveAttr('aria-labelledby')
          }),
        )
      })

      it('applies aria-label to the trigger when ariaLabel is provided', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ ariaLabel: 'Fruit' }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const button = Scene.find(html, '[key="test-button"]')
            expect(button).toHaveAttr('aria-label', 'Fruit')
            expect(button).not.toHaveAttr('aria-labelledby')
          }),
        )
      })

      it('applies aria-labelledby to the trigger when ariaLabelledBy is provided', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ ariaLabelledBy: 'fruit-label' }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const button = Scene.find(html, '[key="test-button"]')
            expect(button).toHaveAttr('aria-labelledby', 'fruit-label')
            expect(button).not.toHaveAttr('aria-label')
          }),
        )
      })

      it('prefers aria-label over aria-labelledby when both are provided', ({
        listbox: { update, closedModel },
      }) => {
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
            const button = Scene.find(html, '[key="test-button"]')
            expect(button).toHaveAttr('aria-label', 'Fruit')
            expect(button).not.toHaveAttr('aria-labelledby')
          }),
        )
      })

      it('buttonId derives the trigger id from the base id', () => {
        expect(buttonId('test')).toBe('test-button')
      })
    })

    describe('item context', () => {
      it('itemToConfig receives isSelected: true for selected item', ({
        listbox: { update, openModel },
      }) => {
        const contexts: Array<
          Parameters<ViewInputs<string>['itemToConfig']>[1]
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
        listbox: { update, openModel },
      }) => {
        const contexts: Array<
          Parameters<ViewInputs<string>['itemToConfig']>[1]
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

    describe('anchor', () => {
      it('adds absolute positioning, initial visibility hidden, and hooks when anchor is provided', ({
        listbox: { update, openModel },
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
        listbox: { update, openModel },
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

    describe('orientation', () => {
      it('items container has aria-orientation="vertical" by default', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(openModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-items-container"]')).toHaveAttr(
              'aria-orientation',
              'vertical',
            )
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('items container has aria-orientation="horizontal" when horizontal', ({
        listbox: { openModel, update },
      }) => {
        const model = modifyFields(openModel(), {
          orientation: () => 'Horizontal',
        })
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(model),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-items-container"]')).toHaveAttr(
              'aria-orientation',
              'horizontal',
            )
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })
    })

    describe('whole-listbox disabled', () => {
      it('wrapper has data-disabled when isDisabled is true', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ isDisabled: true }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            expect(html.data?.attrs?.['data-disabled']).toBe('')
          }),
        )
      })

      it('wrapper does not have data-disabled when isDisabled is false', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            expect(html.data?.attrs?.['data-disabled']).toBeUndefined()
          }),
        )
      })

      it('button has aria-disabled when isDisabled is true', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ isDisabled: true }) },
          Scene.given(closedModel()),
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
        )
      })

      it('button has no event handlers when isDisabled is true', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ isDisabled: true }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const button = Scene.find(html, '[key="test-button"]')
            expect(button).not.toHaveHandler('pointerdown')
            expect(button).not.toHaveHandler('click')
          }),
        )
      })
    })

    describe('invalid state', () => {
      it('wrapper has data-invalid when isInvalid is true', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ isInvalid: true }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            expect(html.data?.attrs?.['data-invalid']).toBe('')
          }),
        )
      })

      it('wrapper does not have data-invalid when isInvalid is false', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            expect(html.data?.attrs?.['data-invalid']).toBeUndefined()
          }),
        )
      })

      it('button has data-invalid when isInvalid is true', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ isInvalid: true }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-button"]')).toHaveAttr(
              'data-invalid',
              '',
            )
          }),
        )
      })
    })

    describe('form prop', () => {
      it('hidden input has form attribute when form is provided', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({ name: 'fruit', form: 'my-form' }),
          },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, 'input[type="hidden"]')).toHaveAttr(
              'form',
              'my-form',
            )
          }),
        )
      })

      it('hidden input has no form attribute when form is not provided', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ name: 'fruit' }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, 'input[type="hidden"]')).not.toHaveAttr(
              'form',
            )
          }),
        )
      })
    })

    describe('typed items', () => {
      type Person = Readonly<{ id: string; name: string }>
      const people: ReadonlyArray<Person> = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Charlie' },
      ]

      const renderPersonListbox = makeView<Model>({
        ariaMultiSelectable: false,
      })<Person, string>()

      const personSceneView =
        (
          overrides: Omit<
            Partial<ViewInputs<Person>>,
            'items' | 'itemToValue' | 'itemToConfig' | 'buttonContent'
          > = {},
        ) =>
        (model: Model, h: TestHtmlBuilder) => {
          const { maybeSelectedValue, ...baseInputs } = {
            maybeSelectedValue: Option.none<string>(),
            ...overrides,
          }

          return renderPersonListbox(
            model,
            {
              items: people,
              itemToValue: person => person.id,
              itemToConfig: () => ({ content: null }),
              buttonContent: null,
              ...baseInputs,
              selectedValues: Option.toArray(maybeSelectedValue),
            },
            h,
          )
        }

      it('items have click handlers with object items', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          { update, view: personSceneView() },
          Scene.given(openModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-item-0"]')).toHaveHandler(
              'click',
            )
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('selected item matches by itemToValue', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          {
            update,
            view: personSceneView({ maybeSelectedValue: Option.some('2') }),
          },
          Scene.given(openModel()),
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
        )
      })

      it('non-selected item has aria-selected false', ({
        listbox: { update, openModel },
      }) => {
        Scene.scene(
          {
            update,
            view: personSceneView({ maybeSelectedValue: Option.some('2') }),
          },
          Scene.given(openModel()),
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
        )
      })

      it('hidden input uses itemToValue for value', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          {
            update,
            view: personSceneView({
              name: 'person',
              maybeSelectedValue: Option.some('1'),
            }),
          },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, 'input[type="hidden"]')).toHaveAttr(
              'value',
              '1',
            )
          }),
        )
      })
    })
  })
})
