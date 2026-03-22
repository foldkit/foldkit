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
  InertOthers,
  LockScroll,
  MovedPointerOverItem,
  Opened,
  PressedPointerOnButton,
  ReleasedPointerOnItems,
  RequestFrame,
  RequestedItemClick,
  RestoreInert,
  ScrollIntoView,
  Searched,
  SelectedItem,
  UnlockScroll,
  WaitForTransitions,
  groupContiguous,
  init,
  resolveTypeaheadMatch,
  update,
  view,
} from './index'
import type { Model, ViewConfig } from './index'

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

describe('Menu', () => {
  describe('init', () => {
    it('defaults to closed with no active item', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        isModal: false,
        transitionState: 'Idle',
        maybeActiveItemIndex: Option.none(),
        activationTrigger: 'Keyboard',
        searchQuery: '',
        searchVersion: 0,
        maybeLastPointerPosition: Option.none(),
        maybeLastButtonPointerType: Option.none(),
        maybePointerOrigin: Option.none(),
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
  })

  describe('update', () => {
    describe('Opened', () => {
      it('opens the menu with the given active item', () => {
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
      it('closes the menu and resets state', () => {
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
            expect(model.maybePointerOrigin).toStrictEqual(Option.none())
          }),
        )
      })
    })

    describe('ClosedByTab', () => {
      it('closes the menu without a focus command', () => {
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
            PressedPointerOnButton({
              pointerType: 'touch',
              button: 0,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
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
            PressedPointerOnButton({
              pointerType: 'pen',
              button: 0,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
          ),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('pen'),
            )
          }),
        )
      })

      it('opens the menu on mouse left button when closed', () => {
        Test.story(
          update,
          withClosed,
          Test.message(
            PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
          ),
          Test.resolve(FocusItems, CompletedFocusItems()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
            expect(model.maybePointerOrigin).toStrictEqual(
              Option.some({ screenX: 100, screenY: 200, timeStamp: 1000 }),
            )
          }),
        )
      })

      it('closes the menu on mouse left button when open', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
          ),
          Test.resolve(FocusButton, CompletedFocusButton()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.none(),
            )
            expect(model.maybePointerOrigin).toStrictEqual(Option.none())
          }),
        )
      })

      it('does not toggle on mouse right button', () => {
        Test.story(
          update,
          withClosed,
          Test.message(
            PressedPointerOnButton({
              pointerType: 'mouse',
              button: 2,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
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
            PressedPointerOnButton({
              pointerType: 'touch',
              button: 0,
              screenX: 0,
              screenY: 0,
              timeStamp: 0,
            }),
          ),
          Test.tap(({ model }) => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('touch'),
            )
          }),
          Test.message(
            PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
              screenX: 0,
              screenY: 0,
              timeStamp: 0,
            }),
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

    describe('ReleasedPointerOnItems', () => {
      const withOpenAndOrigin = flow(
        withClosed,
        Test.message(
          PressedPointerOnButton({
            pointerType: 'mouse',
            button: 0,
            screenX: 100,
            screenY: 200,
            timeStamp: 1000,
          }),
        ),
        Test.resolve(FocusItems, CompletedFocusItems()),
      )

      it('no-ops when no pointer origin', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            ReleasedPointerOnItems({
              screenX: 200,
              screenY: 300,
              timeStamp: 2000,
            }),
          ),
        )
      })

      it('no-ops when movement is below threshold', () => {
        Test.story(
          update,
          withOpenAndOrigin,
          Test.message(
            ReleasedPointerOnItems({
              screenX: 103,
              screenY: 203,
              timeStamp: 2000,
            }),
          ),
        )
      })

      it('no-ops when hold time is below threshold', () => {
        Test.story(
          update,
          withOpenAndOrigin,
          Test.message(
            ReleasedPointerOnItems({
              screenX: 200,
              screenY: 300,
              timeStamp: 1100,
            }),
          ),
        )
      })

      it('no-ops when no active item', () => {
        Test.story(
          update,
          withOpenAndOrigin,
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
          Test.message(
            ReleasedPointerOnItems({
              screenX: 200,
              screenY: 300,
              timeStamp: 2000,
            }),
          ),
        )
      })

      it('issues click command when all thresholds met', () => {
        Test.story(
          update,
          withOpenAndOrigin,
          Test.message(
            ActivatedItem({ index: 2, activationTrigger: 'Pointer' }),
          ),
          Test.message(
            ReleasedPointerOnItems({
              screenX: 200,
              screenY: 300,
              timeStamp: 2000,
            }),
          ),
          Test.resolve(ClickItem, CompletedClickItem()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
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

      it('returns no commands for pointer activation', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            ActivatedItem({ index: 2, activationTrigger: 'Pointer' }),
          ),
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
            MovedPointerOverItem({
              index: 2,
              screenX: 100,
              screenY: 200,
            }),
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
            MovedPointerOverItem({
              index: 1,
              screenX: 100,
              screenY: 200,
            }),
          ),
          Test.message(
            MovedPointerOverItem({
              index: 3,
              screenX: 150,
              screenY: 250,
            }),
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
            MovedPointerOverItem({
              index: 1,
              screenX: 100,
              screenY: 200,
            }),
          ),
          Test.message(
            MovedPointerOverItem({
              index: 2,
              screenX: 100,
              screenY: 200,
            }),
          ),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(1))
          }),
        )
      })

      it('does not return scroll commands', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            MovedPointerOverItem({
              index: 2,
              screenX: 100,
              screenY: 200,
            }),
          ),
        )
      })
    })

    describe('SelectedItem', () => {
      it('closes the menu and returns a focus command', () => {
        Test.story(
          update,
          withOpen,
          Test.message(SelectedItem({ index: 2 })),
          Test.resolve(FocusButton, CompletedFocusButton()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
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

    describe('CompletedFocusItems', () => {
      it('returns model unchanged', () => {
        Test.story(
          update,
          withOpen,
          Test.message(CompletedFocusItems()),
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
            Test.message(SelectedItem({ index: 0 })),
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
        Test.message(SelectedItem({ index: 0 })),
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

  describe('resolveTypeaheadMatch', () => {
    const items: ReadonlyArray<string> = [
      'Edit',
      'Duplicate',
      'Archive',
      'Move',
      'Delete',
    ]
    const noneDisabled = () => false
    const identity = (item: string) => item

    it('finds item matching the query', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'a',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(2))
    })

    it('matches case-insensitively', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'A',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(2))
    })

    it('starts searching after the active item on fresh search', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'd',
          Option.some(1),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(4))
    })

    it('wraps around when no match after active item', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'e',
          Option.some(3),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(0))
    })

    it('returns none when no item matches', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'z',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.none())
    })

    it('skips disabled items', () => {
      const archiveDisabled = (index: number) => index === 2
      expect(
        resolveTypeaheadMatch(
          items,
          'a',
          Option.none(),
          archiveDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.none())
    })

    it('matches multi-character queries', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'de',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(4))
    })

    it('uses the itemToSearchText function', () => {
      const withLabels = (item: string) => `Action: ${item}`
      expect(
        resolveTypeaheadMatch(
          items,
          'action: m',
          Option.none(),
          noneDisabled,
          withLabels,
          false,
        ),
      ).toStrictEqual(Option.some(3))
    })

    it('starts from index 0 when no active item', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'e',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(0))
    })

    it('finds the next match when wrapping on fresh search', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'du',
          Option.some(0),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(1))
    })

    it('includes the active item on refinement', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'del',
          Option.some(4),
          noneDisabled,
          identity,
          true,
        ),
      ).toStrictEqual(Option.some(4))
    })

    it('skips the active item on fresh search', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'd',
          Option.some(1),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(4))
    })

    it('finds next match on refinement when active item no longer matches', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'du',
          Option.some(4),
          noneDisabled,
          identity,
          true,
        ),
      ).toStrictEqual(Option.some(1))
    })

    it('matches queries containing spaces', () => {
      const multiWordItems: ReadonlyArray<string> = [
        'Copy Link',
        'Danger Zone',
        'Dark Mode',
        'Delete All',
      ]
      expect(
        resolveTypeaheadMatch(
          multiWordItems,
          'danger z',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(1))
    })

    it('distinguishes multi-word items by space in query', () => {
      const multiWordItems: ReadonlyArray<string> = [
        'Copy Link',
        'Danger Zone',
        'Dark Mode',
        'Delete All',
      ]
      expect(
        resolveTypeaheadMatch(
          multiWordItems,
          'da',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(1))

      expect(
        resolveTypeaheadMatch(
          multiWordItems,
          'danger ',
          Option.none(),
          noneDisabled,
          identity,
          true,
        ),
      ).toStrictEqual(Option.some(1))

      expect(
        resolveTypeaheadMatch(
          multiWordItems,
          'dark',
          Option.none(),
          noneDisabled,
          identity,
          true,
        ),
      ).toStrictEqual(Option.some(2))
    })
  })

  describe('groupContiguous', () => {
    const identity = (item: string) => item

    it('returns empty for empty input', () => {
      expect(groupContiguous([], identity)).toStrictEqual([])
    })

    it('groups a single item', () => {
      expect(groupContiguous(['a'], identity)).toStrictEqual([
        { key: 'a', items: ['a'] },
      ])
    })

    it('groups contiguous items with the same key', () => {
      expect(groupContiguous(['a', 'a', 'a'], identity)).toStrictEqual([
        { key: 'a', items: ['a', 'a', 'a'] },
      ])
    })

    it('separates items with different keys', () => {
      expect(groupContiguous(['a', 'b'], identity)).toStrictEqual([
        { key: 'a', items: ['a'] },
        { key: 'b', items: ['b'] },
      ])
    })

    it('keeps non-contiguous runs as separate segments', () => {
      expect(groupContiguous(['a', 'b', 'a'], identity)).toStrictEqual([
        { key: 'a', items: ['a'] },
        { key: 'b', items: ['b'] },
        { key: 'a', items: ['a'] },
      ])
    })

    it('uses the key function to determine grouping', () => {
      const items = ['Edit', 'Duplicate', 'Archive', 'Move', 'Delete']
      const toGroup = (item: string) =>
        item === 'Delete' ? 'Danger' : 'Actions'

      expect(groupContiguous(items, toGroup)).toStrictEqual([
        { key: 'Actions', items: ['Edit', 'Duplicate', 'Archive', 'Move'] },
        { key: 'Danger', items: ['Delete'] },
      ])
    })

    it('passes index to the key function', () => {
      const items = ['a', 'b', 'c', 'd']
      const byHalf = (_item: string, index: number) =>
        index < 2 ? 'first' : 'second'

      expect(groupContiguous(items, byHalf)).toStrictEqual([
        { key: 'first', items: ['a', 'b'] },
        { key: 'second', items: ['c', 'd'] },
      ])
    })
  })

  describe('view', () => {
    type TestMessage = string

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
      toMessage: message => message._tag,
      items: ['Edit', 'Delete'],
      itemToConfig: () => ({
        content: Effect.succeed(null),
      }),
      buttonContent: Effect.succeed(null),
    })

    const renderView = (config: ViewConfig<TestMessage, string>): VNode => {
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

    describe('anchor', () => {
      it('adds absolute positioning, initial visibility hidden, and hooks when anchor is provided', () => {
        const model = openModel()
        const config = {
          ...baseViewConfig(model),
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

      it('does not add hooks or positioning styles when anchor is absent', () => {
        const model = openModel()
        const config = baseViewConfig(model)
        const vnode = renderView(config)
        const itemsContainer = findChildByKey(vnode, 'test-items-container')

        expect(itemsContainer?.data?.style).toBeUndefined()
        expect(itemsContainer?.data?.hook?.insert).toBeUndefined()
        expect(itemsContainer?.data?.hook?.destroy).toBeUndefined()
      })

      it('adds hooks when portal is true', () => {
        const model = openModel()
        const config = {
          ...baseViewConfig(model),
          anchor: { placement: 'bottom-start' as const, portal: true },
        }
        const vnode = renderView(config)
        const itemsContainer = findChildByKey(vnode, 'test-items-container')

        expect(itemsContainer?.data?.style?.position).toBe('absolute')
        expect(itemsContainer?.data?.style?.visibility).toBe('hidden')
        expect(itemsContainer?.data?.hook?.insert).toBeTypeOf('function')
        expect(itemsContainer?.data?.hook?.destroy).toBeTypeOf('function')
      })

      it('does not affect button attributes when anchor is provided', () => {
        const model = openModel()
        const configWithAnchor = {
          ...baseViewConfig(model),
          anchor: { placement: 'bottom-start' as const },
        }
        const configWithout = baseViewConfig(model)

        const buttonWith = findChildByKey(
          renderView(configWithAnchor),
          'test-button',
        )
        const buttonWithout = findChildByKey(
          renderView(configWithout),
          'test-button',
        )

        expect(buttonWith?.data?.attrs).toStrictEqual(
          buttonWithout?.data?.attrs,
        )
        expect(buttonWith?.data?.props).toStrictEqual(
          buttonWithout?.data?.props,
        )
      })
    })
  })
})
