import { Option, flow } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/index.js'
import {
  ActivatedItem,
  AnchorListbox,
  BlurredItems,
  ClickItem,
  Closed,
  CompletedAnchorListbox,
  CompletedClickItem,
  CompletedDelayClearSearch,
  CompletedFocusButton,
  CompletedFocusItems,
  CompletedInertOthers,
  CompletedLockScroll,
  CompletedPortalListboxBackdrop,
  CompletedRestoreInert,
  CompletedScrollIntoView,
  CompletedUnlockScroll,
  DeactivatedItem,
  DelayClearSearch,
  DetectMovementOrAnimationEnd,
  FocusButton,
  FocusItems,
  GotAnimationMessage,
  IgnoredMouseClick,
  InertOthers,
  LockScroll,
  type Message,
  MovedPointerOverItem,
  Opened,
  PortalListboxBackdrop,
  PressedPointerOnButton,
  RequestedItemClick,
  RestoreInert,
  ScrollIntoView,
  Searched,
  Selected,
  SelectedItem,
  SuppressedItemCommit,
  SuppressedSpaceScroll,
  UnlockScroll,
  buttonId,
} from './shared.js'
import { create, init, update } from './single.js'
import type { Model, ViewInputs } from './single.js'

const TestListbox = create<string>()
const view = TestListbox.view

const acknowledgeAnchor = Scene.Mount.resolve(
  AnchorListbox,
  CompletedAnchorListbox(),
)
const acknowledgeBackdrop = Scene.Mount.resolve(
  PortalListboxBackdrop,
  CompletedPortalListboxBackdrop(),
)

const animationEndMessage = GotAnimationMessage({
  message: Animation.EndedAnimation(),
})

const STALE_CLEAR_SEARCH_VERSION = 9999

const givenClosed = Story.given(init({ id: 'test' }))

const givenOpen = flow(
  givenClosed,
  Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
  Story.Command.resolve(FocusItems, CompletedFocusItems()),
)

const givenClosedAnimated = Story.given(init({ id: 'test', isAnimated: true }))

const givenOpenAnimated = flow(
  givenClosedAnimated,
  Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
  Story.Command.resolveAll(
    [FocusItems, CompletedFocusItems()],
    [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
    [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
  ),
)

describe('Listbox', () => {
  describe('init', () => {
    it('defaults to closed with no active item', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        isModal: false,
        orientation: 'Vertical',
        animation: Animation.init({ id: 'test-listbox' }),
        maybeActiveItemIndex: Option.none(),
        activationTrigger: 'Keyboard',
        searchQuery: '',
        searchVersion: 0,
        maybeLastPointerPosition: Option.none(),
        maybeLastButtonPointerType: Option.none(),
      })
    })

    it('accepts isAnimated option', () => {
      const model = init({ id: 'test', isAnimated: true })
      expect(model.isAnimated).toBe(true)
      expect(model.animation.transitionState).toBe('Idle')
    })

    it('defaults isModal to false', () => {
      const model = init({ id: 'test' })
      expect(model.isModal).toBe(false)
    })

    it('accepts isModal option', () => {
      const model = init({ id: 'test', isModal: true })
      expect(model.isModal).toBe(true)
    })

    it('defaults orientation to Vertical', () => {
      const model = init({ id: 'test' })
      expect(model.orientation).toBe('Vertical')
    })

    it('accepts orientation option', () => {
      const model = init({ id: 'test', orientation: 'Horizontal' })
      expect(model.orientation).toBe('Horizontal')
    })
  })

  describe('update', () => {
    describe('Opened', () => {
      it('opens the listbox with the given active item', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(Opened({ maybeActiveItemIndex: Option.some(2) })),
          Story.Command.resolve(FocusItems, CompletedFocusItems()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })

      it('resets search state on open', () => {
        Story.story(
          update,
          Story.given({
            ...init({ id: 'test' }),
            searchQuery: 'stale',
            searchVersion: 1,
          }),
          Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Story.Command.resolve(FocusItems, CompletedFocusItems()),
          Story.model(model => {
            expect(model.searchQuery).toBe('')
            expect(model.searchVersion).toBe(0)
          }),
        )
      })

      it('sets trigger to Keyboard when opened with active item', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Story.Command.resolve(FocusItems, CompletedFocusItems()),
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
          Story.Command.resolve(FocusItems, CompletedFocusItems()),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
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
          Story.Command.resolve(FocusItems, CompletedFocusItems()),
          Story.model(model => {
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })
    })

    describe('Closed', () => {
      it('closes the listbox and resets state', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(Closed()),
          Story.Command.resolve(FocusButton, CompletedFocusButton()),
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

      it('returns no Command and no OutMessage when already closed', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(Closed()),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('BlurredItems', () => {
      it('closes the listbox without restoring button focus', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(BlurredItems()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })
    })

    describe('PressedPointerOnButton', () => {
      it('records pointer type for touch without toggling', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(
            PressedPointerOnButton({ pointerType: 'touch', button: 0 }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('touch'),
            )
          }),
        )
      })

      it('records pointer type for pen without toggling', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(
            PressedPointerOnButton({ pointerType: 'pen', button: 0 }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('pen'),
            )
          }),
        )
      })

      it('opens the listbox on mouse left button when closed', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Story.Command.resolve(FocusItems, CompletedFocusItems()),
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

      it('closes the listbox on mouse left button when open and preserves pointer type', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Story.Command.resolve(FocusButton, CompletedFocusButton()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
        )
      })

      it('does not toggle on mouse right button', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 2 }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
        )
      })

      it('always records maybeLastButtonPointerType', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(
            PressedPointerOnButton({ pointerType: 'touch', button: 0 }),
          ),
          Story.model(model => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('touch'),
            )
          }),
          Story.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Story.Command.resolve(FocusItems, CompletedFocusItems()),
          Story.model(model => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
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
            ActivatedItem({ index: 3, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
          }),
        )
      })

      it('replaces the previous active item', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            ActivatedItem({ index: 1, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.message(
            ActivatedItem({ index: 4, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(4))
          }),
        )
      })

      it('stores activation trigger in model', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            ActivatedItem({ index: 1, activationTrigger: 'Pointer' }),
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
            ActivatedItem({ index: 2, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
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
            ActivatedItem({ index: 1, activationTrigger: 'Pointer' }),
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
            ActivatedItem({ index: 2, activationTrigger: 'Keyboard' }),
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

      it('activates when position differs from stored', () => {
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

      it('returns model unchanged when position matches', () => {
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
    })

    describe('SelectedItem', () => {
      it('emits Selected with the item value', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(Selected({ value: 'apple' })),
          Story.Command.resolve(FocusButton, CompletedFocusButton()),
        )
      })

      it('closes the listbox on selection', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(SelectedItem({ item: 'apple' })),
          Story.Command.resolve(FocusButton, CompletedFocusButton()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('returns a focus button command', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(Selected({ value: 'apple' })),
          Story.Command.resolve(FocusButton, CompletedFocusButton()),
        )
      })

      it('emits Selected with the newly chosen value across selections', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Story.Command.resolve(FocusItems, CompletedFocusItems()),
          Story.message(SelectedItem({ item: 'banana' })),
          Story.expectOutMessage(Selected({ value: 'banana' })),
          Story.Command.resolve(FocusButton, CompletedFocusButton()),
        )
      })

      it('returns no Command when an item is selected while already closed', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(Selected({ value: 'apple' })),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('RequestedItemClick', () => {
      it('returns model unchanged with a click command', () => {
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

    describe('Searched', () => {
      it('appends the key to the search query', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Searched({ key: 'a', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            CompletedDelayClearSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.searchQuery).toBe('a')
          }),
          Story.message(
            Searched({ key: 'b', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            CompletedDelayClearSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.searchQuery).toBe('ab')
          }),
        )
      })

      it('bumps the search version', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Searched({ key: 'x', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            CompletedDelayClearSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(1)
          }),
          Story.message(
            Searched({ key: 'y', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            CompletedDelayClearSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(2)
          }),
        )
      })

      it('updates active item when a match is found', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Searched({ key: 'd', maybeTargetIndex: Option.some(3) }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            CompletedDelayClearSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
          }),
        )
      })

      it('keeps existing active item when no match is found', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Searched({ key: 'z', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            CompletedDelayClearSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(0))
          }),
        )
      })

      it('returns a delay command for debounce', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Searched({ key: 'a', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            CompletedDelayClearSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.searchQuery).toBe('a')
          }),
        )
      })
    })

    describe('CompletedDelayClearSearch', () => {
      it('clears search query when version matches', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Searched({ key: 'a', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            CompletedDelayClearSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(1)
          }),
          Story.message(CompletedDelayClearSearch({ version: 1 })),
          Story.model(model => {
            expect(model.searchQuery).toBe('')
          }),
        )
      })

      it('ignores stale version', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Searched({ key: 'a', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            CompletedDelayClearSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.message(
            Searched({ key: 'b', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            CompletedDelayClearSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(2)
          }),
          Story.message(CompletedDelayClearSearch({ version: 1 })),
          Story.model(model => {
            expect(model.searchQuery).toBe('ab')
          }),
        )
      })
    })

    describe('completed and view-dispatched messages', () => {
      it('returns model unchanged for CompletedLockScroll', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(CompletedLockScroll()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('resets maybeLastButtonPointerType for IgnoredMouseClick', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Story.Command.resolve(FocusButton, CompletedFocusButton()),
          Story.model(model => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
          Story.message(IgnoredMouseClick()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.none(),
            )
          }),
        )
      })

      it('returns model unchanged for SuppressedSpaceScroll', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(SuppressedSpaceScroll()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('returns model unchanged for SuppressedItemCommit', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(SuppressedItemCommit()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('transitions', () => {
      describe('enter flow', () => {
        it('sets EnterStart and emits focus + afterPaint on Opened', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.animation.transitionState).toBe('EnterStart')
            }),
            Story.Command.resolveAll(
              [FocusItems, CompletedFocusItems()],
              [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
              [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
            ),
          )
        })

        it('advances EnterStart to EnterAnimating on GotAnimationMessage(CompletedWaitForPaint)', () => {
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
            Story.Command.resolveAll(
              [FocusItems, CompletedFocusItems()],
              [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
            ),
          )
        })

        it('completes EnterAnimating to Idle on GotAnimationMessage(EndedAnimation)', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.Command.resolveAll(
              [FocusItems, CompletedFocusItems()],
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
        it('starts no leave cascade on Closed when already closed', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(Closed()),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('sets LeaveStart on Closed', () => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
              [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('begins the leave animation when the items container blurs', () => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(BlurredItems()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
              [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('sets LeaveStart on SelectedItem', () => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(SelectedItem({ item: 'apple' })),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
              [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('advances LeaveStart to LeaveAnimating on GotAnimationMessage(CompletedWaitForPaint)', () => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Closed()),
            Story.Command.resolve(
              Animation.WaitForPaint,
              Animation.CompletedWaitForPaint(),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('LeaveAnimating')
            }),
            Story.Command.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('completes LeaveAnimating to Idle on GotAnimationMessage(EndedAnimation)', () => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Closed()),
            Story.Command.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
              [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
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
            Story.Command.resolve(FocusItems, CompletedFocusItems()),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('keeps transitionState Idle on Closed', () => {
          Story.story(
            update,
            givenOpen,
            Story.message(Closed()),
            Story.Command.resolve(FocusButton, CompletedFocusButton()),
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
        it('transitions to LeaveStart when Closed during EnterStart', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.Command.resolveAll(
              [FocusItems, CompletedFocusItems()],
              [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
              [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
            ),
            Story.message(Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
              [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('transitions to LeaveStart when Closed during EnterAnimating', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.Command.resolveAll(
              [FocusItems, CompletedFocusItems()],
              [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
              [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
            ),
            Story.message(Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [Animation.WaitForPaint, Animation.CompletedWaitForPaint()],
              [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
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
      Story.Command.resolveAll(
        [FocusItems, CompletedFocusItems()],
        [LockScroll, CompletedLockScroll()],
        [InertOthers, CompletedInertOthers()],
      ),
    )

    it('emits lockScroll and inertOthers commands on Opened when isModal is true', () => {
      Story.story(
        update,
        givenClosedModal,
        Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
        Story.Command.resolveAll(
          [FocusItems, CompletedFocusItems()],
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
        Story.message(Closed()),
        Story.Command.resolveAll(
          [FocusButton, CompletedFocusButton()],
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedRestoreInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits no Commands on Closed when already closed in modal mode', () => {
      Story.story(
        update,
        givenClosedModal,
        Story.message(Closed()),
        Story.expectNoOutMessage(),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands when the items container blurs in modal mode', () => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(BlurredItems()),
        Story.Command.resolveAll(
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedRestoreInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits no Commands when the items container blurs on a closed listbox in modal mode', () => {
      Story.story(
        update,
        givenClosedModal,
        Story.message(BlurredItems()),
        Story.expectNoOutMessage(),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on SelectedItem when isModal is true', () => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(SelectedItem({ item: 'apple' })),
        Story.Command.resolveAll(
          [FocusButton, CompletedFocusButton()],
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedRestoreInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('does not emit modal commands when isModal is false', () => {
      Story.story(
        update,
        givenClosed,
        Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
        Story.Command.resolve(FocusItems, CompletedFocusItems()),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
        Story.message(Closed()),
        Story.Command.resolve(FocusButton, CompletedFocusButton()),
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

    const sceneView =
      (overrides: Omit<Partial<ViewInputs<string>>, 'buttonContent'> = {}) =>
      (model: Model, h: HtmlBuilder<Message>) =>
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
      it('button has aria-haspopup="listbox"', () => {
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

      it('items container has role="listbox"', () => {
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

      it('items have role="option"', () => {
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

      it('data-selected attribute on selected item', () => {
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
    })

    describe('read-only', () => {
      const button = Scene.selector('#test-button')
      const itemsContainer = Scene.selector('#test-items')
      const item = (index: number) => Scene.selector(`#test-item-${index}`)

      it('emits aria-readonly and data-readonly on the items container, and data-readonly on the button and every item', () => {
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

      it('emits data-readonly on the wrapper', () => {
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

      it('emits no read-only attributes by default', () => {
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

      it('passes isReadOnly to itemToConfig', () => {
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

      it('emits both aria-readonly/data-readonly and aria-disabled/data-disabled when set together', () => {
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

      it('drops the item click handler while keeping the keydown handler', () => {
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

      it('does not commit the active item on Enter', () => {
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

      it('does not commit the active item on Space', () => {
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

      it('runs typeahead on Space while a search query is pending', () => {
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
            DelayClearSearch,
            CompletedDelayClearSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Scene.keydown(itemsContainer, ' '),
          Scene.expectNoOutMessage(),
          Scene.expect(item(1)).not.toHaveAttr('data-active'),
          Scene.expect(item(2)).toHaveAttr('data-active', ''),
          Scene.Command.resolve(
            DelayClearSearch,
            CompletedDelayClearSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
        )
      })

      it('keeps arrow, Home, and End navigation live', () => {
        Scene.scene(
          { update, view: sceneView({ isReadOnly: true }) },
          Scene.given(openModel()),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(itemsContainer, 'ArrowDown'),
          Scene.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Scene.expect(item(1)).toHaveAttr('data-active', ''),
          Scene.keydown(itemsContainer, 'Home'),
          Scene.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Scene.expect(item(0)).toHaveAttr('data-active', ''),
          Scene.keydown(itemsContainer, 'End'),
          Scene.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Scene.expect(item(1)).toHaveAttr('data-active', ''),
          Scene.expectNoOutMessage(),
        )
      })

      it('moves the active item off the selection without changing it', () => {
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
          Scene.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
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

      it('consumes Enter on the active item without committing', () => {
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

      it('consumes Space on the active item without committing', () => {
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

      it('still opens from the button and closes on Escape', () => {
        Scene.scene(
          { update, view: sceneView({ isReadOnly: true }) },
          Scene.given(closedModel()),
          Scene.click(button),
          Scene.Command.resolve(FocusItems, CompletedFocusItems()),
          Scene.expect(itemsContainer).toExist(),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(itemsContainer, 'Escape'),
          Scene.Command.resolve(FocusButton, CompletedFocusButton()),
          Scene.Mount.expectEnded(AnchorListbox, PortalListboxBackdrop),
          Scene.expect(itemsContainer).toBeAbsent(),
        )
      })
    })

    describe('form integration', () => {
      it('renders hidden input when name is provided', () => {
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

      it('hidden input value matches selected item', () => {
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

      it('no hidden input when name is not provided', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, 'input[type="hidden"]')).toBeAbsent()
          }),
        )
      })

      it('no value attribute on hidden input when nothing selected', () => {
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
      it('no aria-label or aria-labelledby on the trigger by default', () => {
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

      it('applies aria-label to the trigger when ariaLabel is provided', () => {
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

      it('applies aria-labelledby to the trigger when ariaLabelledBy is provided', () => {
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
      it('itemToConfig receives isSelected: true for selected item', () => {
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

      it('itemToConfig receives isSelected: false for non-selected items', () => {
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

    describe('orientation', () => {
      it('items container has aria-orientation="vertical" by default', () => {
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

      it('items container has aria-orientation="horizontal" when horizontal', () => {
        const model = { ...openModel(), orientation: 'Horizontal' as const }
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
      it('wrapper has data-disabled when isDisabled is true', () => {
        Scene.scene(
          { update, view: sceneView({ isDisabled: true }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            expect(html.data?.attrs?.['data-disabled']).toBe('')
          }),
        )
      })

      it('wrapper does not have data-disabled when isDisabled is false', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            expect(html.data?.attrs?.['data-disabled']).toBeUndefined()
          }),
        )
      })

      it('button has aria-disabled when isDisabled is true', () => {
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

      it('button has no event handlers when isDisabled is true', () => {
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
      it('wrapper has data-invalid when isInvalid is true', () => {
        Scene.scene(
          { update, view: sceneView({ isInvalid: true }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            expect(html.data?.attrs?.['data-invalid']).toBe('')
          }),
        )
      })

      it('wrapper does not have data-invalid when isInvalid is false', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            expect(html.data?.attrs?.['data-invalid']).toBeUndefined()
          }),
        )
      })

      it('button has data-invalid when isInvalid is true', () => {
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
      it('hidden input has form attribute when form is provided', () => {
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

      it('hidden input has no form attribute when form is not provided', () => {
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

      const PersonListbox = create<Person>()

      const personSceneView =
        (
          overrides: Omit<
            Partial<ViewInputs<Person>>,
            'items' | 'itemToValue' | 'itemToConfig' | 'buttonContent'
          > = {},
        ) =>
        (model: Model, h: HtmlBuilder<Message>) =>
          PersonListbox.view(
            model,
            {
              items: people,
              itemToValue: person => person.id,
              itemToConfig: () => ({ content: null }),
              buttonContent: null,
              maybeSelectedValue: Option.none(),
              ...overrides,
            },
            h,
          )

      it('items have click handlers with object items', () => {
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

      it('selected item matches by itemToValue', () => {
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

      it('non-selected item has aria-selected false', () => {
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

      it('hidden input uses itemToValue for value', () => {
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
