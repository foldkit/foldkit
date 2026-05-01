import { describe, it } from '@effect/vitest'
import { Effect, Option, flow } from 'effect'
import { expect } from 'vitest'

import * as Scene from '../../test/scene.js'
import * as Story from '../../test/story.js'
import * as Animation from '../animation/index.js'
import {
  ActivatedItem,
  BlurredItems,
  ClearedSearch,
  ClickItem,
  Closed,
  CompletedClickItem,
  CompletedFocusButton,
  CompletedFocusItems,
  CompletedLockScroll,
  CompletedScrollIntoView,
  CompletedSetupInert,
  CompletedTeardownInert,
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
  MovedPointerOverItem,
  Opened,
  PressedPointerOnButton,
  RequestedItemClick,
  RestoreInert,
  ScrollIntoView,
  Searched,
  SelectedItem,
  SuppressedSpaceScroll,
  UnlockScroll,
} from './shared.js'
import type { Message } from './shared.js'
import { init, update, view } from './single.js'
import type { Model, ViewConfig } from './single.js'

const animationToListboxMessage = (message: Animation.Message) =>
  GotAnimationMessage({ message })

const animationEndMessage = GotAnimationMessage({
  message: Animation.EndedAnimation(),
})

const STALE_CLEAR_SEARCH_VERSION = 9999

const withClosed = Story.with(init({ id: 'test' }))

const withOpen = flow(
  withClosed,
  Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
  Story.resolve(FocusItems, CompletedFocusItems()),
)

const withClosedAnimated = Story.with(init({ id: 'test', isAnimated: true }))

const withOpenAnimated = flow(
  withClosedAnimated,
  Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
  Story.resolveAll(
    [FocusItems, CompletedFocusItems()],
    [
      Animation.RequestFrame,
      Animation.AdvancedAnimationFrame(),
      animationToListboxMessage,
    ],
    [
      Animation.WaitForAnimationSettled,
      Animation.EndedAnimation(),
      animationToListboxMessage,
    ],
  ),
)

describe('Listbox', () => {
  describe('init', () => {
    it('defaults to closed with no active item and no selection', () => {
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
        maybeSelectedItem: Option.none(),
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

    it('accepts selectedItem option', () => {
      const model = init({ id: 'test', selectedItem: 'apple' })
      expect(model.maybeSelectedItem).toStrictEqual(Option.some('apple'))
    })

    it('defaults maybeSelectedItem to none', () => {
      const model = init({ id: 'test' })
      expect(model.maybeSelectedItem).toStrictEqual(Option.none())
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
          withClosed,
          Story.message(Opened({ maybeActiveItemIndex: Option.some(2) })),
          Story.resolve(FocusItems, CompletedFocusItems()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })

      it('resets search state on open', () => {
        Story.story(
          update,
          Story.with({
            ...init({ id: 'test' }),
            searchQuery: 'stale',
            searchVersion: 1,
          }),
          Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Story.resolve(FocusItems, CompletedFocusItems()),
          Story.model(model => {
            expect(model.searchQuery).toBe('')
            expect(model.searchVersion).toBe(0)
          }),
        )
      })

      it('sets trigger to Keyboard when opened with active item', () => {
        Story.story(
          update,
          withClosed,
          Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Story.resolve(FocusItems, CompletedFocusItems()),
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
          Story.resolve(FocusItems, CompletedFocusItems()),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
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
          Story.resolve(FocusItems, CompletedFocusItems()),
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
          withOpen,
          Story.message(Closed()),
          Story.resolve(FocusButton, CompletedFocusButton()),
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
    })

    describe('BlurredItems', () => {
      it('closes the listbox without restoring button focus', () => {
        Story.story(
          update,
          withOpen,
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
          withClosed,
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
          withClosed,
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
          withClosed,
          Story.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Story.resolve(FocusItems, CompletedFocusItems()),
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
          withOpen,
          Story.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Story.resolve(FocusButton, CompletedFocusButton()),
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
          withClosed,
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
          withClosed,
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
          Story.resolve(FocusItems, CompletedFocusItems()),
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
          withOpen,
          Story.message(
            ActivatedItem({ index: 3, activationTrigger: 'Keyboard' }),
          ),
          Story.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
          }),
        )
      })

      it('replaces the previous active item', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            ActivatedItem({ index: 1, activationTrigger: 'Keyboard' }),
          ),
          Story.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.message(
            ActivatedItem({ index: 4, activationTrigger: 'Keyboard' }),
          ),
          Story.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(4))
          }),
        )
      })

      it('stores activation trigger in model', () => {
        Story.story(
          update,
          withOpen,
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
          withOpen,
          Story.message(
            ActivatedItem({ index: 2, activationTrigger: 'Keyboard' }),
          ),
          Story.resolve(ScrollIntoView, CompletedScrollIntoView()),
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
          withOpen,
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
          withOpen,
          Story.message(
            ActivatedItem({ index: 2, activationTrigger: 'Keyboard' }),
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

      it('activates when position differs from stored', () => {
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

      it('returns model unchanged when position matches', () => {
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
    })

    describe('SelectedItem', () => {
      it('stores item value in maybeSelectedItem', () => {
        Story.story(
          update,
          withOpen,
          Story.message(SelectedItem({ item: 'apple' })),
          Story.resolve(FocusButton, CompletedFocusButton()),
          Story.model(model => {
            expect(model.maybeSelectedItem).toStrictEqual(Option.some('apple'))
          }),
        )
      })

      it('closes the listbox on selection', () => {
        Story.story(
          update,
          withOpen,
          Story.message(SelectedItem({ item: 'apple' })),
          Story.resolve(FocusButton, CompletedFocusButton()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('returns a focus button command', () => {
        Story.story(
          update,
          withOpen,
          Story.message(SelectedItem({ item: 'apple' })),
          Story.resolve(FocusButton, CompletedFocusButton()),
          Story.model(model => {
            expect(model.maybeSelectedItem).toStrictEqual(Option.some('apple'))
          }),
        )
      })

      it('selection persists after close', () => {
        Story.story(
          update,
          withOpen,
          Story.message(SelectedItem({ item: 'apple' })),
          Story.resolve(FocusButton, CompletedFocusButton()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeSelectedItem).toStrictEqual(Option.some('apple'))
          }),
        )
      })

      it('selection persists across open/close cycles', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', selectedItem: 'banana' })),
          Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Story.resolve(FocusItems, CompletedFocusItems()),
          Story.model(model => {
            expect(model.maybeSelectedItem).toStrictEqual(Option.some('banana'))
          }),
          Story.message(Closed()),
          Story.resolve(FocusButton, CompletedFocusButton()),
          Story.model(model => {
            expect(model.maybeSelectedItem).toStrictEqual(Option.some('banana'))
          }),
        )
      })

      it('replaces previous selection with new value', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', selectedItem: 'apple' })),
          Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Story.resolve(FocusItems, CompletedFocusItems()),
          Story.message(SelectedItem({ item: 'banana' })),
          Story.resolve(FocusButton, CompletedFocusButton()),
          Story.model(model => {
            expect(model.maybeSelectedItem).toStrictEqual(Option.some('banana'))
          }),
        )
      })
    })

    describe('RequestedItemClick', () => {
      it('returns model unchanged with a click command', () => {
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

    describe('Searched', () => {
      it('appends the key to the search query', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            Searched({ key: 'a', maybeTargetIndex: Option.none() }),
          ),
          Story.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.searchQuery).toBe('a')
          }),
          Story.message(
            Searched({ key: 'b', maybeTargetIndex: Option.none() }),
          ),
          Story.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.searchQuery).toBe('ab')
          }),
        )
      })

      it('bumps the search version', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            Searched({ key: 'x', maybeTargetIndex: Option.none() }),
          ),
          Story.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(1)
          }),
          Story.message(
            Searched({ key: 'y', maybeTargetIndex: Option.none() }),
          ),
          Story.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(2)
          }),
        )
      })

      it('updates active item when a match is found', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            Searched({ key: 'd', maybeTargetIndex: Option.some(3) }),
          ),
          Story.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
          }),
        )
      })

      it('keeps existing active item when no match is found', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            Searched({ key: 'z', maybeTargetIndex: Option.none() }),
          ),
          Story.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(0))
          }),
        )
      })

      it('returns a delay command for debounce', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            Searched({ key: 'a', maybeTargetIndex: Option.none() }),
          ),
          Story.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.searchQuery).toBe('a')
          }),
        )
      })
    })

    describe('ClearedSearch', () => {
      it('clears search query when version matches', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            Searched({ key: 'a', maybeTargetIndex: Option.none() }),
          ),
          Story.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(1)
          }),
          Story.message(ClearedSearch({ version: 1 })),
          Story.model(model => {
            expect(model.searchQuery).toBe('')
          }),
        )
      })

      it('ignores stale version', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            Searched({ key: 'a', maybeTargetIndex: Option.none() }),
          ),
          Story.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.message(
            Searched({ key: 'b', maybeTargetIndex: Option.none() }),
          ),
          Story.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(2)
          }),
          Story.message(ClearedSearch({ version: 1 })),
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
          withOpen,
          Story.message(CompletedLockScroll()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('resets maybeLastButtonPointerType for IgnoredMouseClick', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Story.resolve(FocusButton, CompletedFocusButton()),
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
          withOpen,
          Story.message(SuppressedSpaceScroll()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('transitions', () => {
      describe('enter flow', () => {
        it('sets EnterStart and emits focus + nextFrame on Opened', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.animation.transitionState).toBe('EnterStart')
            }),
            Story.resolveAll(
              [FocusItems, CompletedFocusItems()],
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToListboxMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToListboxMessage,
              ],
            ),
          )
        })

        it('advances EnterStart to EnterAnimating on GotAnimationMessage(AdvancedAnimationFrame)', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.resolve(
              Animation.RequestFrame,
              Animation.AdvancedAnimationFrame(),
              animationToListboxMessage,
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('EnterAnimating')
            }),
            Story.resolveAll(
              [FocusItems, CompletedFocusItems()],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToListboxMessage,
              ],
            ),
          )
        })

        it('completes EnterAnimating to Idle on GotAnimationMessage(EndedAnimation)', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.resolveAll(
              [FocusItems, CompletedFocusItems()],
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToListboxMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToListboxMessage,
              ],
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
            withOpenAnimated,
            Story.message(Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToListboxMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToListboxMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('begins the leave animation when the items container blurs', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(BlurredItems()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.resolveAll(
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToListboxMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToListboxMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('sets LeaveStart on SelectedItem', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(SelectedItem({ item: 'apple' })),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToListboxMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToListboxMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('advances LeaveStart to LeaveAnimating on GotAnimationMessage(AdvancedAnimationFrame)', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(Closed()),
            Story.resolve(
              Animation.RequestFrame,
              Animation.AdvancedAnimationFrame(),
              animationToListboxMessage,
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('LeaveAnimating')
            }),
            Story.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToListboxMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('completes LeaveAnimating to Idle on GotAnimationMessage(EndedAnimation)', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(Closed()),
            Story.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToListboxMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToListboxMessage,
              ],
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
            withClosed,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.resolve(FocusItems, CompletedFocusItems()),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('keeps transitionState Idle on Closed', () => {
          Story.story(
            update,
            withOpen,
            Story.message(Closed()),
            Story.resolve(FocusButton, CompletedFocusButton()),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('stale messages', () => {
        it('ignores GotAnimationMessage with AdvancedAnimationFrame when Idle', () => {
          Story.story(
            update,
            withOpen,
            Story.message(
              GotAnimationMessage({
                message: Animation.AdvancedAnimationFrame(),
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
            withOpen,
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
            withClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.resolveAll(
              [FocusItems, CompletedFocusItems()],
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToListboxMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToListboxMessage,
              ],
            ),
            Story.message(Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToListboxMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToListboxMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('transitions to LeaveStart when Closed during EnterAnimating', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.resolveAll(
              [FocusItems, CompletedFocusItems()],
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToListboxMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToListboxMessage,
              ],
            ),
            Story.message(Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToListboxMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToListboxMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
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
        [FocusItems, CompletedFocusItems()],
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
          [FocusItems, CompletedFocusItems()],
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
          [FocusButton, CompletedFocusButton()],
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedTeardownInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands when the items container blurs in modal mode', () => {
      Story.story(
        update,
        withOpenModal,
        Story.message(BlurredItems()),
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
        Story.message(SelectedItem({ item: 'apple' })),
        Story.resolveAll(
          [FocusButton, CompletedFocusButton()],
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
        Story.resolve(FocusItems, CompletedFocusItems()),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
        Story.message(Closed()),
        Story.resolve(FocusButton, CompletedFocusButton()),
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
          buttonContent: Effect.succeed(null),
          ...overrides,
          model,
          toParentMessage: message => message,
        })

    describe('ARIA', () => {
      it('button has aria-haspopup="listbox"', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.with(openModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-button"]')).toHaveAttr(
              'aria-haspopup',
              'listbox',
            )
          }),
        )
      })

      it('items container has role="listbox"', () => {
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

      it('items have role="option"', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.with(openModel()),
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
        )
      })

      it('selected item has aria-selected="true"', () => {
        const model = {
          ...openModel(),
          maybeSelectedItem: Option.some('Apple'),
        }
        Scene.scene(
          { update, view: sceneView() },
          Scene.with(model),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-item-0"]')).toHaveAttr(
              'aria-selected',
              'true',
            )
          }),
        )
      })

      it('non-selected items have aria-selected="false"', () => {
        const model = {
          ...openModel(),
          maybeSelectedItem: Option.some('Apple'),
        }
        Scene.scene(
          { update, view: sceneView() },
          Scene.with(model),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-item-1"]')).toHaveAttr(
              'aria-selected',
              'false',
            )
          }),
        )
      })

      it('data-selected attribute on selected item', () => {
        const model = {
          ...openModel(),
          maybeSelectedItem: Option.some('Banana'),
        }
        Scene.scene(
          { update, view: sceneView() },
          Scene.with(model),
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
    })

    describe('form integration', () => {
      it('renders hidden input when name is provided', () => {
        Scene.scene(
          { update, view: sceneView({ name: 'fruit' }) },
          Scene.with(closedModel()),
          Scene.tap(({ html }) => {
            const hiddenInput = Scene.find(html, 'input[type="hidden"]')
            expect(hiddenInput).toExist()
            expect(hiddenInput).toHaveAttr('name', 'fruit')
          }),
        )
      })

      it('hidden input value matches selected item', () => {
        const model = {
          ...closedModel(),
          maybeSelectedItem: Option.some('Apple'),
        }
        Scene.scene(
          { update, view: sceneView({ name: 'fruit' }) },
          Scene.with(model),
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
          Scene.with(closedModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, 'input[type="hidden"]')).toBeAbsent()
          }),
        )
      })

      it('no value attribute on hidden input when nothing selected', () => {
        Scene.scene(
          { update, view: sceneView({ name: 'fruit' }) },
          Scene.with(closedModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, 'input[type="hidden"]')).not.toHaveAttr(
              'value',
            )
          }),
        )
      })
    })

    describe('item context', () => {
      it('itemToConfig receives isSelected: true for selected item', () => {
        const model = {
          ...openModel(),
          maybeSelectedItem: Option.some('Apple'),
        }
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
          Scene.with(model),
          Scene.tap(() => {
            expect(contexts[0]?.isSelected).toBe(true)
          }),
        )
      })

      it('itemToConfig receives isSelected: false for non-selected items', () => {
        const model = {
          ...openModel(),
          maybeSelectedItem: Option.some('Apple'),
        }
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
          Scene.with(model),
          Scene.tap(() => {
            expect(contexts[1]?.isSelected).toBe(false)
          }),
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

      it('adds focus insert hook but no positioning styles when anchor is absent', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.with(openModel()),
          Scene.tap(({ html }) => {
            const itemsContainer = Scene.find(
              html,
              '[key="test-items-container"]',
            )
            expect(itemsContainer).not.toHaveStyle('position')
            expect(itemsContainer).toHaveHook('insert')
            expect(itemsContainer).not.toHaveHook('destroy')
          }),
        )
      })
    })

    describe('orientation', () => {
      it('items container has aria-orientation="vertical" by default', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.with(openModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-items-container"]')).toHaveAttr(
              'aria-orientation',
              'vertical',
            )
          }),
        )
      })

      it('items container has aria-orientation="horizontal" when horizontal', () => {
        const model = { ...openModel(), orientation: 'Horizontal' as const }
        Scene.scene(
          { update, view: sceneView() },
          Scene.with(model),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-items-container"]')).toHaveAttr(
              'aria-orientation',
              'horizontal',
            )
          }),
        )
      })
    })

    describe('whole-listbox disabled', () => {
      it('wrapper has data-disabled when isDisabled is true', () => {
        Scene.scene(
          { update, view: sceneView({ isDisabled: true }) },
          Scene.with(closedModel()),
          Scene.tap(({ html }) => {
            expect(html.data?.attrs?.['data-disabled']).toBe('')
          }),
        )
      })

      it('wrapper does not have data-disabled when isDisabled is false', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.with(closedModel()),
          Scene.tap(({ html }) => {
            expect(html.data?.attrs?.['data-disabled']).toBeUndefined()
          }),
        )
      })

      it('button has aria-disabled when isDisabled is true', () => {
        Scene.scene(
          { update, view: sceneView({ isDisabled: true }) },
          Scene.with(closedModel()),
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
          Scene.with(closedModel()),
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
          Scene.with(closedModel()),
          Scene.tap(({ html }) => {
            expect(html.data?.attrs?.['data-invalid']).toBe('')
          }),
        )
      })

      it('wrapper does not have data-invalid when isInvalid is false', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.with(closedModel()),
          Scene.tap(({ html }) => {
            expect(html.data?.attrs?.['data-invalid']).toBeUndefined()
          }),
        )
      })

      it('button has data-invalid when isInvalid is true', () => {
        Scene.scene(
          { update, view: sceneView({ isInvalid: true }) },
          Scene.with(closedModel()),
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
          Scene.with(closedModel()),
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
          Scene.with(closedModel()),
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

      const personSceneView =
        (
          overrides: Omit<
            Partial<ViewConfig<Message, Person>>,
            | 'model'
            | 'toParentMessage'
            | 'items'
            | 'itemToValue'
            | 'itemToConfig'
            | 'buttonContent'
          > = {},
        ) =>
        (model: Model) =>
          view({
            items: people,
            itemToValue: person => person.id,
            itemToConfig: () => ({ content: Effect.succeed(null) }),
            buttonContent: Effect.succeed(null),
            ...overrides,
            model,
            toParentMessage: message => message,
          })

      it('items have click handlers with object items', () => {
        Scene.scene(
          { update, view: personSceneView() },
          Scene.with(openModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-item-0"]')).toHaveHandler(
              'click',
            )
          }),
        )
      })

      it('selected item matches by itemToValue', () => {
        const model = { ...openModel(), maybeSelectedItem: Option.some('2') }
        Scene.scene(
          { update, view: personSceneView() },
          Scene.with(model),
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
        )
      })

      it('non-selected item has aria-selected false', () => {
        const model = { ...openModel(), maybeSelectedItem: Option.some('2') }
        Scene.scene(
          { update, view: personSceneView() },
          Scene.with(model),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-item-0"]')).toHaveAttr(
              'aria-selected',
              'false',
            )
            expect(Scene.find(html, '[key="test-item-0"]')).not.toHaveAttr(
              'data-selected',
            )
          }),
        )
      })

      it('hidden input uses itemToValue for value', () => {
        const model = { ...closedModel(), maybeSelectedItem: Option.some('1') }
        Scene.scene(
          { update, view: personSceneView({ name: 'person' }) },
          Scene.with(model),
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
