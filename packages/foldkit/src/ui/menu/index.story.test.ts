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
  CompletedAnchorMount,
  CompletedBackdropPortal,
  CompletedClickItem,
  CompletedFocusButton,
  CompletedFocusItems,
  CompletedFocusItemsOnMount,
  CompletedLockScroll,
  CompletedScrollIntoView,
  CompletedSetupInert,
  CompletedTeardownInert,
  CompletedUnlockScroll,
  DeactivatedItem,
  DelayClearSearch,
  DetectMovementOrAnimationEnd,
  FocusButton,
  GotAnimationMessage,
  IgnoredMouseClick,
  InertOthers,
  LockScroll,
  MenuAnchor,
  MenuBackdropPortal,
  MenuFocusItemsOnMount,
  MovedPointerOverItem,
  Opened,
  PressedPointerOnButton,
  ReleasedPointerOnItems,
  RequestedItemClick,
  RestoreInert,
  ScrollIntoView,
  Searched,
  SelectedItem,
  UnlockScroll,
  groupContiguous,
  init,
  resolveTypeaheadMatch,
  update,
  view,
} from './index.js'
import type { Message, Model, ViewConfig } from './index.js'

const animationToMenuMessage = (message: Animation.Message) =>
  GotAnimationMessage({ message })

const acknowledgeAnchor = Scene.Mount.resolve(
  MenuAnchor,
  CompletedAnchorMount(),
)
const acknowledgeFocus = Scene.Mount.resolve(
  MenuFocusItemsOnMount,
  CompletedFocusItemsOnMount(),
)
const acknowledgeBackdrop = Scene.Mount.resolve(
  MenuBackdropPortal,
  CompletedBackdropPortal(),
)

const animationEndMessage = GotAnimationMessage({
  message: Animation.EndedAnimation(),
})

const STALE_CLEAR_SEARCH_VERSION = 9999

const withClosed = Story.with(init({ id: 'test' }))

const withOpen = flow(
  withClosed,
  Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
)

const withClosedAnimated = Story.with(init({ id: 'test', isAnimated: true }))

const withOpenAnimated = flow(
  withClosedAnimated,
  Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
  Story.Command.resolveAll(
    [
      Animation.RequestFrame,
      Animation.AdvancedAnimationFrame(),
      animationToMenuMessage,
    ],
    [
      Animation.WaitForAnimationSettled,
      Animation.EndedAnimation(),
      animationToMenuMessage,
    ],
  ),
)

describe('Menu', () => {
  describe('init', () => {
    it('defaults to closed with no active item', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        isModal: false,
        animation: Animation.init({ id: 'test-items' }),
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
  })

  describe('update', () => {
    describe('Opened', () => {
      it('opens the menu with the given active item', () => {
        Story.story(
          update,
          withClosed,
          Story.message(Opened({ maybeActiveItemIndex: Option.some(2) })),
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
          Story.model(model => {
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })
    })

    describe('Closed', () => {
      it('closes the menu and resets state', () => {
        Story.story(
          update,
          withOpen,
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
            expect(model.maybePointerOrigin).toStrictEqual(Option.none())
          }),
        )
      })
    })

    describe('BlurredItems', () => {
      it('closes the menu without restoring button focus', () => {
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
            PressedPointerOnButton({
              pointerType: 'touch',
              button: 0,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
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
            PressedPointerOnButton({
              pointerType: 'pen',
              button: 0,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('pen'),
            )
          }),
        )
      })

      it('opens the menu on mouse left button when closed', () => {
        Story.story(
          update,
          withClosed,
          Story.message(
            PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
          ),
          Story.model(model => {
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

      it('closes the menu on mouse left button when open and preserves pointer type', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
          ),
          Story.Command.resolve(FocusButton, CompletedFocusButton()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
            expect(model.maybePointerOrigin).toStrictEqual(Option.none())
          }),
        )
      })

      it('does not toggle on mouse right button', () => {
        Story.story(
          update,
          withClosed,
          Story.message(
            PressedPointerOnButton({
              pointerType: 'mouse',
              button: 2,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
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
            PressedPointerOnButton({
              pointerType: 'touch',
              button: 0,
              screenX: 0,
              screenY: 0,
              timeStamp: 0,
            }),
          ),
          Story.model(model => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('touch'),
            )
          }),
          Story.message(
            PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
              screenX: 0,
              screenY: 0,
              timeStamp: 0,
            }),
          ),
          Story.model(model => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
        )
      })
    })

    describe('IgnoredMouseClick', () => {
      it('resets maybeLastButtonPointerType', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
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
    })

    describe('ReleasedPointerOnItems', () => {
      const withOpenAndOrigin = flow(
        withClosed,
        Story.message(
          PressedPointerOnButton({
            pointerType: 'mouse',
            button: 0,
            screenX: 100,
            screenY: 200,
            timeStamp: 1000,
          }),
        ),
      )

      it('no-ops when no pointer origin', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            ReleasedPointerOnItems({
              screenX: 200,
              screenY: 300,
              timeStamp: 2000,
            }),
          ),
        )
      })

      it('no-ops when movement is below threshold', () => {
        Story.story(
          update,
          withOpenAndOrigin,
          Story.message(
            ReleasedPointerOnItems({
              screenX: 103,
              screenY: 203,
              timeStamp: 2000,
            }),
          ),
        )
      })

      it('no-ops when hold time is below threshold', () => {
        Story.story(
          update,
          withOpenAndOrigin,
          Story.message(
            ReleasedPointerOnItems({
              screenX: 200,
              screenY: 300,
              timeStamp: 1100,
            }),
          ),
        )
      })

      it('no-ops when no active item', () => {
        Story.story(
          update,
          withOpenAndOrigin,
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
          Story.message(
            ReleasedPointerOnItems({
              screenX: 200,
              screenY: 300,
              timeStamp: 2000,
            }),
          ),
        )
      })

      it('issues click command when all thresholds met', () => {
        Story.story(
          update,
          withOpenAndOrigin,
          Story.message(
            ActivatedItem({ index: 2, activationTrigger: 'Pointer' }),
          ),
          Story.message(
            ReleasedPointerOnItems({
              screenX: 200,
              screenY: 300,
              timeStamp: 2000,
            }),
          ),
          Story.Command.resolve(ClickItem, CompletedClickItem()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
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
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
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
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })

      it('returns no commands for pointer activation', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            ActivatedItem({ index: 2, activationTrigger: 'Pointer' }),
          ),
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
          withOpen,
          Story.message(
            MovedPointerOverItem({
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

      it('activates when position differs from stored', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            MovedPointerOverItem({
              index: 1,
              screenX: 100,
              screenY: 200,
            }),
          ),
          Story.message(
            MovedPointerOverItem({
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

      it('returns model unchanged when position matches', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            MovedPointerOverItem({
              index: 1,
              screenX: 100,
              screenY: 200,
            }),
          ),
          Story.message(
            MovedPointerOverItem({
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

      it('does not return scroll commands', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
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
        Story.story(
          update,
          withOpen,
          Story.message(SelectedItem({ index: 2 })),
          Story.Command.resolve(FocusButton, CompletedFocusButton()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
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
          withOpen,
          Story.message(
            Searched({ key: 'a', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.searchQuery).toBe('a')
          }),
          Story.message(
            Searched({ key: 'b', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
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
          Story.Command.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(1)
          }),
          Story.message(
            Searched({ key: 'y', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
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
          Story.Command.resolve(
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
          Story.Command.resolve(
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
          Story.Command.resolve(
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
          Story.Command.resolve(
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
          Story.Command.resolve(
            DelayClearSearch,
            ClearedSearch({ version: STALE_CLEAR_SEARCH_VERSION }),
          ),
          Story.message(
            Searched({ key: 'b', maybeTargetIndex: Option.none() }),
          ),
          Story.Command.resolve(
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

    describe('CompletedFocusItems', () => {
      it('returns model unchanged', () => {
        Story.story(
          update,
          withOpen,
          Story.message(CompletedFocusItems()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('animation', () => {
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
            Story.Command.resolveAll(
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToMenuMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToMenuMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('advances EnterStart to EnterAnimating on AdvancedAnimationFrame', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.Command.resolve(
              Animation.RequestFrame,
              Animation.AdvancedAnimationFrame(),
              animationToMenuMessage,
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('EnterAnimating')
            }),
            Story.Command.resolveAll(
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToMenuMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('completes EnterAnimating to Idle on EndedAnimation', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
            Story.Command.resolveAll(
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToMenuMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToMenuMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
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
            Story.Command.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToMenuMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToMenuMessage,
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
            Story.Command.resolveAll(
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToMenuMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToMenuMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('sets LeaveStart on SelectedItem', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(SelectedItem({ index: 0 })),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToMenuMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToMenuMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('advances LeaveStart to LeaveAnimating on AdvancedAnimationFrame', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(Closed()),
            Story.Command.resolve(
              Animation.RequestFrame,
              Animation.AdvancedAnimationFrame(),
              animationToMenuMessage,
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('LeaveAnimating')
            }),
            Story.Command.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToMenuMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('completes LeaveAnimating to Idle on EndedAnimation', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(Closed()),
            Story.Command.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToMenuMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToMenuMessage,
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
            Story.Command.resolve(FocusButton, CompletedFocusButton()),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('stale messages', () => {
        it('ignores AdvancedAnimationFrame when Idle', () => {
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

        it('ignores EndedAnimation when Idle', () => {
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
            Story.Command.resolveAll(
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToMenuMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToMenuMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
            Story.message(Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToMenuMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToMenuMessage,
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
            Story.Command.resolveAll(
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToMenuMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToMenuMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
            Story.message(Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToMenuMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToMenuMessage,
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
      Story.Command.resolveAll(
        [LockScroll, CompletedLockScroll()],
        [InertOthers, CompletedSetupInert()],
      ),
    )

    it('emits lockScroll and inertOthers commands on Opened when isModal is true', () => {
      Story.story(
        update,
        withClosedModal,
        Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
        Story.Command.resolveAll(
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
        Story.Command.resolveAll(
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
        Story.Command.resolveAll(
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
        Story.message(SelectedItem({ index: 0 })),
        Story.Command.resolveAll(
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
          items: ['Edit', 'Delete'],
          itemToConfig: () => ({
            content: Effect.succeed(null),
          }),
          buttonContent: Effect.succeed(null),
          ...overrides,
          model,
          toParentMessage: message => message,
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
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('adds focus mount hook but no positioning styles when anchor is absent', () => {
        Scene.scene(
          {
            update,
            view: sceneView(),
          },
          Scene.with(openModel()),
          Scene.tap(({ html }) => {
            const itemsContainer = Scene.find(
              html,
              '[key="test-items-container"]',
            )
            expect(itemsContainer).not.toHaveStyle('position')
            expect(itemsContainer).toHaveHook('insert')
            expect(itemsContainer).toHaveHook('destroy')
          }),
          acknowledgeFocus,
          acknowledgeBackdrop,
        )
      })

      it('adds hooks when portal is true', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              anchor: { placement: 'bottom-start' as const, portal: true },
            }),
          },
          Scene.with(openModel()),
          Scene.tap(({ html }) => {
            const itemsContainer = Scene.find(
              html,
              '[key="test-items-container"]',
            )
            expect(itemsContainer).toHaveStyle('position', 'absolute')
            expect(itemsContainer).toHaveStyle('visibility', 'hidden')
            expect(itemsContainer).toHaveHook('insert')
            expect(itemsContainer).toHaveHook('destroy')
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('does not affect button attributes when anchor is provided', () => {
        const model = openModel()

        let buttonWithAnchor: ReturnType<typeof Option.getOrThrow>
        let buttonWithoutAnchor: ReturnType<typeof Option.getOrThrow>

        Scene.scene(
          {
            update,
            view: sceneView({
              anchor: { placement: 'bottom-start' as const },
            }),
          },
          Scene.with(model),
          Scene.tap(({ html }) => {
            buttonWithAnchor = Option.getOrThrow(
              Scene.find(html, '[key="test-button"]'),
            )
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )

        Scene.scene(
          {
            update,
            view: sceneView(),
          },
          Scene.with(model),
          Scene.tap(({ html }) => {
            buttonWithoutAnchor = Option.getOrThrow(
              Scene.find(html, '[key="test-button"]'),
            )
          }),
          acknowledgeFocus,
          acknowledgeBackdrop,
        )

        expect(buttonWithAnchor!.data?.attrs).toStrictEqual(
          buttonWithoutAnchor!.data?.attrs,
        )
        expect(buttonWithAnchor!.data?.props).toStrictEqual(
          buttonWithoutAnchor!.data?.props,
        )
      })
    })
  })
})
