import { describe, it } from '@effect/vitest'
import { Effect, Option, Predicate, flow } from 'effect'
import type { VNode } from 'snabbdom'
import { expect } from 'vitest'

import { Dispatch } from '../../runtime'
import { noOpDispatch } from '../../runtime/crashUI'
import * as Test from '../../test'
import {
  ActivatedItem,
  AdvancedTransitionFrame,
  ClearedSearch,
  ClickItem,
  Closed,
  ClosedByTab,
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
  DetectMovementOrTransitionEnd,
  DetectedButtonMovement,
  EndedTransition,
  FocusButton,
  FocusItems,
  IgnoredMouseClick,
  InertOthers,
  LockScroll,
  MovedPointerOverItem,
  Opened,
  PressedPointerOnButton,
  RequestFrame,
  RequestedItemClick,
  RestoreInert,
  ScrollIntoView,
  Searched,
  SelectedItem,
  SuppressedSpaceScroll,
  UnlockScroll,
  WaitForTransitions,
} from './shared'
import { init, update, view } from './single'
import type { Model, ViewConfig } from './single'

const STALE_CLEAR_SEARCH_VERSION = 9999

const withClosed = Test.with(init({ id: 'test' }))

const withOpen = flow(
  withClosed,
  Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
  Test.resolve(FocusItems, CompletedFocusItems()),
)

const withClosedAnimated = Test.with(init({ id: 'test', isAnimated: true }))

const withOpenAnimated = flow(
  withClosedAnimated,
  Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
  Test.resolveAll([
    [FocusItems, CompletedFocusItems()],
    [RequestFrame, AdvancedTransitionFrame()],
    [WaitForTransitions, EndedTransition()],
    [DetectMovementOrTransitionEnd, EndedTransition()],
  ]),
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
        transitionState: 'Idle',
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
      expect(model.transitionState).toBe('Idle')
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
        Test.story(
          update,
          withClosed,
          Test.message(Opened({ maybeActiveItemIndex: Option.some(2) })),
          Test.resolve(FocusItems, CompletedFocusItems()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })

      it('resets search state on open', () => {
        Test.story(
          update,
          Test.with({
            ...init({ id: 'test' }),
            searchQuery: 'stale',
            searchVersion: 1,
          }),
          Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Test.resolve(FocusItems, CompletedFocusItems()),
          Test.tap(({ model }) => {
            expect(model.searchQuery).toBe('')
            expect(model.searchVersion).toBe(0)
          }),
        )
      })

      it('sets trigger to Keyboard when opened with active item', () => {
        Test.story(
          update,
          withClosed,
          Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Test.resolve(FocusItems, CompletedFocusItems()),
          Test.tap(({ model }) => {
            expect(model.activationTrigger).toBe('Keyboard')
          }),
        )
      })

      it('sets trigger to Pointer when opened without active item', () => {
        Test.story(
          update,
          withClosed,
          Test.message(Opened({ maybeActiveItemIndex: Option.none() })),
          Test.resolve(FocusItems, CompletedFocusItems()),
          Test.tap(({ model }) => {
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('resets pointer position on open', () => {
        Test.story(
          update,
          Test.with({
            ...init({ id: 'test' }),
            maybeLastPointerPosition: Option.some({
              screenX: 100,
              screenY: 200,
            }),
          }),
          Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Test.resolve(FocusItems, CompletedFocusItems()),
          Test.tap(({ model }) => {
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })
    })

    describe('Closed', () => {
      it('closes the listbox and resets state', () => {
        Test.story(
          update,
          withOpen,
          Test.message(Closed()),
          Test.resolve(FocusButton, CompletedFocusButton()),
          Test.tap(({ model }) => {
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

    describe('ClosedByTab', () => {
      it('closes the listbox without a focus command', () => {
        Test.story(
          update,
          withOpen,
          Test.message(ClosedByTab()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })
    })

    describe('PressedPointerOnButton', () => {
      it('records pointer type for touch without toggling', () => {
        Test.story(
          update,
          withClosed,
          Test.message(
            PressedPointerOnButton({ pointerType: 'touch', button: 0 }),
          ),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('touch'),
            )
          }),
        )
      })

      it('records pointer type for pen without toggling', () => {
        Test.story(
          update,
          withClosed,
          Test.message(
            PressedPointerOnButton({ pointerType: 'pen', button: 0 }),
          ),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('pen'),
            )
          }),
        )
      })

      it('opens the listbox on mouse left button when closed', () => {
        Test.story(
          update,
          withClosed,
          Test.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Test.resolve(FocusItems, CompletedFocusItems()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
        )
      })

      it('closes the listbox on mouse left button when open', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Test.resolve(FocusButton, CompletedFocusButton()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.none(),
            )
          }),
        )
      })

      it('does not toggle on mouse right button', () => {
        Test.story(
          update,
          withClosed,
          Test.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 2 }),
          ),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
        )
      })

      it('always records maybeLastButtonPointerType', () => {
        Test.story(
          update,
          withClosed,
          Test.message(
            PressedPointerOnButton({ pointerType: 'touch', button: 0 }),
          ),
          Test.tap(({ model }) => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('touch'),
            )
          }),
          Test.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Test.resolve(FocusItems, CompletedFocusItems()),
          Test.tap(({ model }) => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
        )
      })
    })

    describe('ActivatedItem', () => {
      it('sets the active item index', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            ActivatedItem({ index: 3, activationTrigger: 'Keyboard' }),
          ),
          Test.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
          }),
        )
      })

      it('replaces the previous active item', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            ActivatedItem({ index: 1, activationTrigger: 'Keyboard' }),
          ),
          Test.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Test.message(
            ActivatedItem({ index: 4, activationTrigger: 'Keyboard' }),
          ),
          Test.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(4))
          }),
        )
      })

      it('stores activation trigger in model', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            ActivatedItem({ index: 1, activationTrigger: 'Pointer' }),
          ),
          Test.tap(({ model }) => {
            expect(model.activationTrigger).toBe('Pointer')
          }),
        )
      })

      it('returns scroll command for keyboard activation', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            ActivatedItem({ index: 2, activationTrigger: 'Keyboard' }),
          ),
          Test.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })
    })

    describe('DeactivatedItem', () => {
      it('clears active item when pointer-activated', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            ActivatedItem({ index: 1, activationTrigger: 'Pointer' }),
          ),
          Test.message(DeactivatedItem()),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('preserves active item when keyboard-activated', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            ActivatedItem({ index: 2, activationTrigger: 'Keyboard' }),
          ),
          Test.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Test.message(DeactivatedItem()),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })
    })

    describe('MovedPointerOverItem', () => {
      it('activates item on first pointer move', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            MovedPointerOverItem({ index: 2, screenX: 100, screenY: 200 }),
          ),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeLastPointerPosition).toStrictEqual(
              Option.some({ screenX: 100, screenY: 200 }),
            )
          }),
        )
      })

      it('activates when position differs from stored', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            MovedPointerOverItem({ index: 1, screenX: 100, screenY: 200 }),
          ),
          Test.message(
            MovedPointerOverItem({ index: 3, screenX: 150, screenY: 250 }),
          ),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
            expect(model.maybeLastPointerPosition).toStrictEqual(
              Option.some({ screenX: 150, screenY: 250 }),
            )
          }),
        )
      })

      it('returns model unchanged when position matches', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            MovedPointerOverItem({ index: 1, screenX: 100, screenY: 200 }),
          ),
          Test.message(
            MovedPointerOverItem({ index: 2, screenX: 100, screenY: 200 }),
          ),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(1))
          }),
        )
      })
    })

    describe('SelectedItem', () => {
      it('stores item value in maybeSelectedItem', () => {
        Test.story(
          update,
          withOpen,
          Test.message(SelectedItem({ item: 'apple' })),
          Test.resolve(FocusButton, CompletedFocusButton()),
          Test.tap(({ model }) => {
            expect(model.maybeSelectedItem).toStrictEqual(Option.some('apple'))
          }),
        )
      })

      it('closes the listbox on selection', () => {
        Test.story(
          update,
          withOpen,
          Test.message(SelectedItem({ item: 'apple' })),
          Test.resolve(FocusButton, CompletedFocusButton()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('returns a focus button command', () => {
        Test.story(
          update,
          withOpen,
          Test.message(SelectedItem({ item: 'apple' })),
          Test.resolve(FocusButton, CompletedFocusButton()),
          Test.tap(({ model }) => {
            expect(model.maybeSelectedItem).toStrictEqual(Option.some('apple'))
          }),
        )
      })

      it('selection persists after close', () => {
        Test.story(
          update,
          withOpen,
          Test.message(SelectedItem({ item: 'apple' })),
          Test.resolve(FocusButton, CompletedFocusButton()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeSelectedItem).toStrictEqual(Option.some('apple'))
          }),
        )
      })

      it('selection persists across open/close cycles', () => {
        Test.story(
          update,
          Test.with(init({ id: 'test', selectedItem: 'banana' })),
          Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Test.resolve(FocusItems, CompletedFocusItems()),
          Test.tap(({ model }) => {
            expect(model.maybeSelectedItem).toStrictEqual(Option.some('banana'))
          }),
          Test.message(Closed()),
          Test.resolve(FocusButton, CompletedFocusButton()),
          Test.tap(({ model }) => {
            expect(model.maybeSelectedItem).toStrictEqual(Option.some('banana'))
          }),
        )
      })

      it('replaces previous selection with new value', () => {
        Test.story(
          update,
          Test.with(init({ id: 'test', selectedItem: 'apple' })),
          Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Test.resolve(FocusItems, CompletedFocusItems()),
          Test.message(SelectedItem({ item: 'banana' })),
          Test.resolve(FocusButton, CompletedFocusButton()),
          Test.tap(({ model }) => {
            expect(model.maybeSelectedItem).toStrictEqual(Option.some('banana'))
          }),
        )
      })
    })

    describe('RequestedItemClick', () => {
      it('returns model unchanged with a click command', () => {
        Test.story(
          update,
          withOpen,
          Test.message(RequestedItemClick({ index: 2 })),
          Test.resolve(ClickItem, CompletedClickItem()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('Searched', () => {
      it('appends the key to the search query', () => {
        Test.story(
          update,
          withOpen,
          Test.message(Searched({ key: 'a', maybeTargetIndex: Option.none() })),
          Test.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Test.tap(({ model }) => {
            expect(model.searchQuery).toBe('a')
          }),
          Test.message(Searched({ key: 'b', maybeTargetIndex: Option.none() })),
          Test.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Test.tap(({ model }) => {
            expect(model.searchQuery).toBe('ab')
          }),
        )
      })

      it('bumps the search version', () => {
        Test.story(
          update,
          withOpen,
          Test.message(Searched({ key: 'x', maybeTargetIndex: Option.none() })),
          Test.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Test.tap(({ model }) => {
            expect(model.searchVersion).toBe(1)
          }),
          Test.message(Searched({ key: 'y', maybeTargetIndex: Option.none() })),
          Test.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Test.tap(({ model }) => {
            expect(model.searchVersion).toBe(2)
          }),
        )
      })

      it('updates active item when a match is found', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            Searched({ key: 'd', maybeTargetIndex: Option.some(3) }),
          ),
          Test.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
          }),
        )
      })

      it('keeps existing active item when no match is found', () => {
        Test.story(
          update,
          withOpen,
          Test.message(Searched({ key: 'z', maybeTargetIndex: Option.none() })),
          Test.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(0))
          }),
        )
      })

      it('returns a delay command for debounce', () => {
        Test.story(
          update,
          withOpen,
          Test.message(Searched({ key: 'a', maybeTargetIndex: Option.none() })),
          Test.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Test.tap(({ model }) => {
            expect(model.searchQuery).toBe('a')
          }),
        )
      })
    })

    describe('ClearedSearch', () => {
      it('clears search query when version matches', () => {
        Test.story(
          update,
          withOpen,
          Test.message(Searched({ key: 'a', maybeTargetIndex: Option.none() })),
          Test.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Test.tap(({ model }) => {
            expect(model.searchVersion).toBe(1)
          }),
          Test.message(ClearedSearch({ version: 1 })),
          Test.tap(({ model }) => {
            expect(model.searchQuery).toBe('')
          }),
        )
      })

      it('ignores stale version', () => {
        Test.story(
          update,
          withOpen,
          Test.message(Searched({ key: 'a', maybeTargetIndex: Option.none() })),
          Test.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Test.message(Searched({ key: 'b', maybeTargetIndex: Option.none() })),
          Test.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Test.tap(({ model }) => {
            expect(model.searchVersion).toBe(2)
          }),
          Test.message(ClearedSearch({ version: 1 })),
          Test.tap(({ model }) => {
            expect(model.searchQuery).toBe('ab')
          }),
        )
      })
    })

    describe('completed and view-dispatched messages', () => {
      it('returns model unchanged for CompletedLockScroll', () => {
        Test.story(
          update,
          withOpen,
          Test.message(CompletedLockScroll()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('returns model unchanged for IgnoredMouseClick', () => {
        Test.story(
          update,
          withOpen,
          Test.message(IgnoredMouseClick()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('returns model unchanged for SuppressedSpaceScroll', () => {
        Test.story(
          update,
          withOpen,
          Test.message(SuppressedSpaceScroll()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('transitions', () => {
      describe('enter flow', () => {
        it('sets EnterStart and emits focus + nextFrame on Opened', () => {
          Test.story(
            update,
            withClosedAnimated,
            Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('EnterStart')
            }),
            Test.resolveAll([
              [FocusItems, CompletedFocusItems()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('advances EnterStart to EnterAnimating on AdvancedTransitionFrame', () => {
          Test.story(
            update,
            withClosedAnimated,
            Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Test.resolve(RequestFrame, AdvancedTransitionFrame()),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('EnterAnimating')
            }),
            Test.resolveAll([
              [FocusItems, CompletedFocusItems()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('completes EnterAnimating to Idle on EndedTransition', () => {
          Test.story(
            update,
            withClosedAnimated,
            Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Test.resolveAll([
              [FocusItems, CompletedFocusItems()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('leave flow', () => {
        it('sets LeaveStart on Closed', () => {
          Test.story(
            update,
            withOpenAnimated,
            Test.message(Closed()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Test.resolveAll([
              [FocusButton, CompletedFocusButton()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('sets LeaveStart on ClosedByTab', () => {
          Test.story(
            update,
            withOpenAnimated,
            Test.message(ClosedByTab()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Test.resolveAll([
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('sets LeaveStart on SelectedItem', () => {
          Test.story(
            update,
            withOpenAnimated,
            Test.message(SelectedItem({ item: 'apple' })),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Test.resolveAll([
              [FocusButton, CompletedFocusButton()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('advances LeaveStart to LeaveAnimating on AdvancedTransitionFrame', () => {
          Test.story(
            update,
            withOpenAnimated,
            Test.message(Closed()),
            Test.resolve(RequestFrame, AdvancedTransitionFrame()),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('LeaveAnimating')
            }),
            Test.resolveAll([
              [FocusButton, CompletedFocusButton()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('completes LeaveAnimating to Idle on EndedTransition', () => {
          Test.story(
            update,
            withOpenAnimated,
            Test.message(Closed()),
            Test.resolveAll([
              [FocusButton, CompletedFocusButton()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('non-animated', () => {
        it('keeps transitionState Idle on Opened', () => {
          Test.story(
            update,
            withClosed,
            Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Test.resolve(FocusItems, CompletedFocusItems()),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('keeps transitionState Idle on Closed', () => {
          Test.story(
            update,
            withOpen,
            Test.message(Closed()),
            Test.resolve(FocusButton, CompletedFocusButton()),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('stale messages', () => {
        it('ignores AdvancedTransitionFrame when Idle', () => {
          Test.story(
            update,
            withOpen,
            Test.message(AdvancedTransitionFrame()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('ignores EndedTransition when Idle', () => {
          Test.story(
            update,
            withOpen,
            Test.message(EndedTransition()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('interruptions', () => {
        it('transitions to LeaveStart when Closed during EnterStart', () => {
          Test.story(
            update,
            withClosedAnimated,
            Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Test.resolveAll([
              [FocusItems, CompletedFocusItems()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
            Test.message(Closed()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Test.resolveAll([
              [FocusButton, CompletedFocusButton()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('transitions to LeaveStart when Closed during EnterAnimating', () => {
          Test.story(
            update,
            withClosedAnimated,
            Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Test.resolveAll([
              [FocusItems, CompletedFocusItems()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
            Test.message(Closed()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Test.resolveAll([
              [FocusButton, CompletedFocusButton()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })
      })

      describe('DetectedButtonMovement', () => {
        it('cancels leave animation by setting transitionState to Idle', () => {
          Test.story(
            update,
            Test.with({
              ...init({ id: 'test', isAnimated: true }),
              isOpen: false,
              transitionState: 'LeaveAnimating' as const,
            }),
            Test.message(DetectedButtonMovement()),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('is a no-op during Idle', () => {
          Test.story(
            update,
            withOpen,
            Test.message(DetectedButtonMovement()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('is a no-op during EnterAnimating', () => {
          Test.story(
            update,
            Test.with({
              ...init({ id: 'test', isAnimated: true }),
              isOpen: true,
              transitionState: 'EnterAnimating' as const,
            }),
            Test.message(DetectedButtonMovement()),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('EnterAnimating')
            }),
          )
        })
      })
    })
  })

  describe('modal commands', () => {
    const withClosedModal = Test.with(init({ id: 'test', isModal: true }))

    const withOpenModal = flow(
      withClosedModal,
      Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
      Test.resolveAll([
        [FocusItems, CompletedFocusItems()],
        [LockScroll, CompletedLockScroll()],
        [InertOthers, CompletedSetupInert()],
      ]),
    )

    it('emits lockScroll and inertOthers commands on Opened when isModal is true', () => {
      Test.story(
        update,
        withClosedModal,
        Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
        Test.resolveAll([
          [FocusItems, CompletedFocusItems()],
          [LockScroll, CompletedLockScroll()],
          [InertOthers, CompletedSetupInert()],
        ]),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(true)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on Closed when isModal is true', () => {
      Test.story(
        update,
        withOpenModal,
        Test.message(Closed()),
        Test.resolveAll([
          [FocusButton, CompletedFocusButton()],
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedTeardownInert()],
        ]),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on ClosedByTab when isModal is true', () => {
      Test.story(
        update,
        withOpenModal,
        Test.message(ClosedByTab()),
        Test.resolveAll([
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedTeardownInert()],
        ]),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on SelectedItem when isModal is true', () => {
      Test.story(
        update,
        withOpenModal,
        Test.message(SelectedItem({ item: 'apple' })),
        Test.resolveAll([
          [FocusButton, CompletedFocusButton()],
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedTeardownInert()],
        ]),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('does not emit modal commands when isModal is false', () => {
      Test.story(
        update,
        withClosed,
        Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
        Test.resolve(FocusItems, CompletedFocusItems()),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(true)
        }),
        Test.message(Closed()),
        Test.resolve(FocusButton, CompletedFocusButton()),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })
  })

  describe('view', () => {
    type TestMessage = string

    const closedModel = () => init({ id: 'test' })
    const openModel = (): Model => {
      let model!: Model
      Test.story(
        update,
        withOpen,
        Test.tap(simulation => {
          model = simulation.model
        }),
      )
      return model
    }

    const baseViewConfig = (model: Model): ViewConfig<TestMessage, string> => ({
      model,
      toParentMessage: message => message._tag,
      items: ['Apple', 'Banana'],
      itemToConfig: () => ({ content: Effect.succeed(null) }),
      buttonContent: Effect.succeed(null),
    })

    const renderView = <Item>(config: ViewConfig<TestMessage, Item>): VNode => {
      const vnode = Effect.runSync(
        Effect.provideService(view(config), Dispatch, noOpDispatch),
      )
      if (Predicate.isNull(vnode)) {
        throw new Error('Expected vnode, got null')
      }
      return vnode
    }

    const findChildByKey = (vnode: VNode, key: string): VNode | undefined =>
      vnode.children?.find(
        (child): child is VNode =>
          typeof child !== 'string' && child.key === key,
      )

    const findAllByKey = (
      vnode: VNode,
      keyPrefix: string,
    ): ReadonlyArray<VNode> =>
      (vnode.children?.filter(
        (child): child is VNode =>
          typeof child !== 'string' &&
          typeof child.key === 'string' &&
          child.key.startsWith(keyPrefix),
      ) ?? []) as ReadonlyArray<VNode>

    describe('ARIA', () => {
      it('button has aria-haspopup="listbox"', () => {
        const vnode = renderView(baseViewConfig(openModel()))
        const button = findChildByKey(vnode, 'test-button')
        expect(button?.data?.attrs?.['aria-haspopup']).toBe('listbox')
      })

      it('items container has role="listbox"', () => {
        const vnode = renderView(baseViewConfig(openModel()))
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        expect(itemsContainer?.data?.attrs?.['role']).toBe('listbox')
      })

      it('items have role="option"', () => {
        const vnode = renderView(baseViewConfig(openModel()))
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        const items = findAllByKey(itemsContainer!, 'test-item-')
        items.forEach(item => {
          expect(item.data?.attrs?.['role']).toBe('option')
        })
      })

      it('selected item has aria-selected="true"', () => {
        const model = {
          ...openModel(),
          maybeSelectedItem: Option.some('Apple'),
        }
        const vnode = renderView(baseViewConfig(model))
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        const firstItem = findChildByKey(itemsContainer!, 'test-item-0')
        expect(firstItem?.data?.attrs?.['aria-selected']).toBe('true')
      })

      it('non-selected items have aria-selected="false"', () => {
        const model = {
          ...openModel(),
          maybeSelectedItem: Option.some('Apple'),
        }
        const vnode = renderView(baseViewConfig(model))
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        const secondItem = findChildByKey(itemsContainer!, 'test-item-1')
        expect(secondItem?.data?.attrs?.['aria-selected']).toBe('false')
      })

      it('data-selected attribute on selected item', () => {
        const model = {
          ...openModel(),
          maybeSelectedItem: Option.some('Banana'),
        }
        const vnode = renderView(baseViewConfig(model))
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        const firstItem = findChildByKey(itemsContainer!, 'test-item-0')
        const secondItem = findChildByKey(itemsContainer!, 'test-item-1')
        expect(firstItem?.data?.attrs?.['data-selected']).toBeUndefined()
        expect(secondItem?.data?.attrs?.['data-selected']).toBe('')
      })

      it('items container has no aria-multiselectable', () => {
        const vnode = renderView(baseViewConfig(openModel()))
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        expect(
          itemsContainer?.data?.attrs?.['aria-multiselectable'],
        ).toBeUndefined()
      })
    })

    describe('form integration', () => {
      it('renders hidden input when name is provided', () => {
        const config = { ...baseViewConfig(closedModel()), name: 'fruit' }
        const vnode = renderView(config)
        const children = vnode.children as ReadonlyArray<VNode>
        const hiddenInput = children.find(
          (child): child is VNode =>
            typeof child !== 'string' && child.sel === 'input',
        )
        expect(hiddenInput).toBeDefined()
        expect(hiddenInput?.data?.props?.['type']).toBe('hidden')
        expect(hiddenInput?.data?.props?.['name']).toBe('fruit')
      })

      it('hidden input value matches selected item', () => {
        const model = {
          ...closedModel(),
          maybeSelectedItem: Option.some('Apple'),
        }
        const config = { ...baseViewConfig(model), name: 'fruit' }
        const vnode = renderView(config)
        const children = vnode.children as ReadonlyArray<VNode>
        const hiddenInput = children.find(
          (child): child is VNode =>
            typeof child !== 'string' && child.sel === 'input',
        )
        expect(hiddenInput?.data?.props?.['value']).toBe('Apple')
      })

      it('no hidden input when name is not provided', () => {
        const vnode = renderView(baseViewConfig(closedModel()))
        const children = vnode.children as ReadonlyArray<VNode>
        const hiddenInput = children.find(
          (child): child is VNode =>
            typeof child !== 'string' && child.sel === 'input',
        )
        expect(hiddenInput).toBeUndefined()
      })

      it('no value attribute on hidden input when nothing selected', () => {
        const config = { ...baseViewConfig(closedModel()), name: 'fruit' }
        const vnode = renderView(config)
        const children = vnode.children as ReadonlyArray<VNode>
        const hiddenInput = children.find(
          (child): child is VNode =>
            typeof child !== 'string' && child.sel === 'input',
        )
        expect(hiddenInput?.data?.props?.['value']).toBeUndefined()
      })
    })

    describe('item context', () => {
      it('itemToConfig receives isSelected: true for selected item', () => {
        const model = {
          ...openModel(),
          maybeSelectedItem: Option.some('Apple'),
        }
        const contexts: Array<{
          isActive: boolean
          isDisabled: boolean
          isSelected: boolean
        }> = []
        const config = {
          ...baseViewConfig(model),
          itemToConfig: (
            _item: string,
            context: {
              isActive: boolean
              isDisabled: boolean
              isSelected: boolean
            },
          ) => {
            contexts.push(context)
            return { content: Effect.succeed(null) }
          },
        }
        renderView(config)
        expect(contexts[0]?.isSelected).toBe(true)
      })

      it('itemToConfig receives isSelected: false for non-selected items', () => {
        const model = {
          ...openModel(),
          maybeSelectedItem: Option.some('Apple'),
        }
        const contexts: Array<{
          isActive: boolean
          isDisabled: boolean
          isSelected: boolean
        }> = []
        const config = {
          ...baseViewConfig(model),
          itemToConfig: (
            _item: string,
            context: {
              isActive: boolean
              isDisabled: boolean
              isSelected: boolean
            },
          ) => {
            contexts.push(context)
            return { content: Effect.succeed(null) }
          },
        }
        renderView(config)
        expect(contexts[1]?.isSelected).toBe(false)
      })
    })

    describe('anchor', () => {
      it('adds absolute positioning, initial visibility hidden, and hooks when anchor is provided', () => {
        const config = {
          ...baseViewConfig(openModel()),
          anchor: { placement: 'bottom-start' as const },
        }
        const vnode = renderView(config)
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        expect(itemsContainer?.data?.style?.position).toBe('absolute')
        expect(itemsContainer?.data?.style?.margin).toBe('0')
        expect(itemsContainer?.data?.style?.visibility).toBe('hidden')
        expect(itemsContainer?.data?.hook?.insert).toBeTypeOf('function')
        expect(itemsContainer?.data?.hook?.destroy).toBeTypeOf('function')
      })

      it('adds focus insert hook but no positioning styles when anchor is absent', () => {
        const vnode = renderView(baseViewConfig(openModel()))
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        expect(itemsContainer?.data?.style).toBeUndefined()
        expect(itemsContainer?.data?.hook?.insert).toBeTypeOf('function')
        expect(itemsContainer?.data?.hook?.destroy).toBeUndefined()
      })
    })

    describe('orientation', () => {
      it('items container has aria-orientation="vertical" by default', () => {
        const vnode = renderView(baseViewConfig(openModel()))
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        expect(itemsContainer?.data?.attrs?.['aria-orientation']).toBe(
          'vertical',
        )
      })

      it('items container has aria-orientation="horizontal" when horizontal', () => {
        const model = { ...openModel(), orientation: 'Horizontal' as const }
        const vnode = renderView(baseViewConfig(model))
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        expect(itemsContainer?.data?.attrs?.['aria-orientation']).toBe(
          'horizontal',
        )
      })
    })

    describe('whole-listbox disabled', () => {
      it('wrapper has data-disabled when isDisabled is true', () => {
        const vnode = renderView({
          ...baseViewConfig(closedModel()),
          isDisabled: true,
        })
        expect(vnode.data?.attrs?.['data-disabled']).toBe('')
      })

      it('wrapper does not have data-disabled when isDisabled is false', () => {
        const vnode = renderView(baseViewConfig(closedModel()))
        expect(vnode.data?.attrs?.['data-disabled']).toBeUndefined()
      })

      it('button has aria-disabled when isDisabled is true', () => {
        const vnode = renderView({
          ...baseViewConfig(closedModel()),
          isDisabled: true,
        })
        const button = findChildByKey(vnode, 'test-button')
        expect(button?.data?.attrs?.['aria-disabled']).toBe('true')
        expect(button?.data?.attrs?.['data-disabled']).toBe('')
      })

      it('button has no event handlers when isDisabled is true', () => {
        const vnode = renderView({
          ...baseViewConfig(closedModel()),
          isDisabled: true,
        })
        const button = findChildByKey(vnode, 'test-button')
        expect(button?.data?.on?.pointerdown).toBeUndefined()
        expect(button?.data?.on?.click).toBeUndefined()
      })
    })

    describe('invalid state', () => {
      it('wrapper has data-invalid when isInvalid is true', () => {
        const vnode = renderView({
          ...baseViewConfig(closedModel()),
          isInvalid: true,
        })
        expect(vnode.data?.attrs?.['data-invalid']).toBe('')
      })

      it('wrapper does not have data-invalid when isInvalid is false', () => {
        const vnode = renderView(baseViewConfig(closedModel()))
        expect(vnode.data?.attrs?.['data-invalid']).toBeUndefined()
      })

      it('button has data-invalid when isInvalid is true', () => {
        const vnode = renderView({
          ...baseViewConfig(closedModel()),
          isInvalid: true,
        })
        const button = findChildByKey(vnode, 'test-button')
        expect(button?.data?.attrs?.['data-invalid']).toBe('')
      })
    })

    describe('form prop', () => {
      it('hidden input has form attribute when form is provided', () => {
        const config = {
          ...baseViewConfig(closedModel()),
          name: 'fruit',
          form: 'my-form',
        }
        const vnode = renderView(config)
        const children = vnode.children as ReadonlyArray<VNode>
        const hiddenInput = children.find(
          (child): child is VNode =>
            typeof child !== 'string' && child.sel === 'input',
        )
        expect(hiddenInput?.data?.attrs?.['form']).toBe('my-form')
      })

      it('hidden input has no form attribute when form is not provided', () => {
        const config = { ...baseViewConfig(closedModel()), name: 'fruit' }
        const vnode = renderView(config)
        const children = vnode.children as ReadonlyArray<VNode>
        const hiddenInput = children.find(
          (child): child is VNode =>
            typeof child !== 'string' && child.sel === 'input',
        )
        expect(hiddenInput?.data?.attrs?.['form']).toBeUndefined()
      })
    })

    describe('typed items', () => {
      type Person = Readonly<{ id: string; name: string }>
      const people: ReadonlyArray<Person> = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Charlie' },
      ]

      const personViewConfig = (
        model: Model,
      ): ViewConfig<TestMessage, Person> => ({
        model,
        toParentMessage: message => message._tag,
        items: people,
        itemToValue: person => person.id,
        itemToConfig: () => ({ content: Effect.succeed(null) }),
        buttonContent: Effect.succeed(null),
      })

      it('items have click handlers with object items', () => {
        const vnode = renderView(personViewConfig(openModel()))
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        const firstItem = findChildByKey(itemsContainer!, 'test-item-0')
        expect(firstItem?.data?.on?.click).toBeDefined()
      })

      it('selected item matches by itemToValue', () => {
        const model = { ...openModel(), maybeSelectedItem: Option.some('2') }
        const vnode = renderView(personViewConfig(model))
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        const secondItem = findChildByKey(itemsContainer!, 'test-item-1')
        expect(secondItem?.data?.attrs?.['aria-selected']).toBe('true')
        expect(secondItem?.data?.attrs?.['data-selected']).toBe('')
      })

      it('non-selected item has aria-selected false', () => {
        const model = { ...openModel(), maybeSelectedItem: Option.some('2') }
        const vnode = renderView(personViewConfig(model))
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        const firstItem = findChildByKey(itemsContainer!, 'test-item-0')
        expect(firstItem?.data?.attrs?.['aria-selected']).toBe('false')
        expect(firstItem?.data?.attrs?.['data-selected']).toBeUndefined()
      })

      it('hidden input uses itemToValue for value', () => {
        const model = { ...closedModel(), maybeSelectedItem: Option.some('1') }
        const config = { ...personViewConfig(model), name: 'person' }
        const vnode = renderView(config)
        const children = vnode.children as ReadonlyArray<VNode>
        const hiddenInput = children.find(
          (child): child is VNode =>
            typeof child !== 'string' && child.sel === 'input',
        )
        expect(hiddenInput?.data?.props?.['value']).toBe('1')
      })
    })
  })
})
