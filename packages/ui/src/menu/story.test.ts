import { Array, Option } from 'effect'
import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/index.js'
import type { Model } from './index.js'
import {
  ClickItem,
  DelayClearSearch,
  DelayOpenSubmenu,
  DetectMovementOrAnimationEnd,
  FocusButton,
  FocusItems,
  InertOthers,
  LockScroll,
  Message,
  OutMessage,
  RestoreInert,
  ScrollIntoView,
  UnlockScroll,
  groupContiguous,
  init,
  resolveTypeaheadMatch,
  update,
} from './index.js'

const acknowledgeFocusItems = Story.Command.resolve(
  FocusItems,
  Message.CompletedFocusItems(),
)

const animationEndMessage = (generation: number) =>
  Message.GotAnimationMessage({
    message: Animation.Message.EndedAnimation({ generation }),
  })

const STALE_CLEAR_SEARCH_VERSION = 9999

const STALE_ANIMATION_GENERATION = -1

const openModel = (): Model =>
  update(
    init({ id: 'test' }),
    Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
  ).model

const givenClosed = Story.given(init({ id: 'test' }))

const givenOpen = Story.steps(
  givenClosed,
  Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
  acknowledgeFocusItems,
)

const givenClosedAnimated = Story.given(init({ id: 'test', isAnimated: true }))

const givenOpenAnimated = Story.steps(
  givenClosedAnimated,
  Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
  acknowledgeFocusItems,
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

describe('Menu', () => {
  it('constructs a Selected OutMessage without nested paths', () => {
    expect(OutMessage.Selected({ value: 'Edit', index: 0 })).toStrictEqual({
      _tag: 'Selected',
      value: 'Edit',
      index: 0,
    })
  })

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
        openSubmenuIndexPath: [],
        openSubmenuPath: [],
        submenuLevels: [],
        pathSearchVersion: 0,
        maybePendingSubmenuIndexPath: Option.none(),
        maybePendingSubmenuCloseDepth: Option.none(),
        submenuRequestVersion: 0,
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
    describe('nested submenus', () => {
      it('opens child levels with independent active and typeahead state', () => {
        const root = openModel()
        const child = update(
          root,
          Message.OpenedSubmenu({
            indexPath: [1],
            submenuPath: ['export'],
            maybeActiveItemIndex: Option.some(2),
          }),
        ).model
        const searched = update(
          child,
          Message.SearchedPath({
            depth: 1,
            key: 'e',
            maybeTargetIndex: Option.some(3),
          }),
        ).model

        expect(searched.openSubmenuIndexPath).toStrictEqual([1])
        expect(searched.openSubmenuPath).toStrictEqual(['export'])
        expect(searched.maybeActiveItemIndex).toStrictEqual(Option.some(1))
        expect(searched.searchQuery).toBe('')
        expect(searched.submenuLevels).toStrictEqual([
          {
            maybeActiveItemIndex: Option.some(3),
            searchQuery: 'e',
            searchVersion: 1,
          },
        ])
      })

      it('closes one child level while preserving its parent cursor', () => {
        const root = openModel()
        const child = update(
          root,
          Message.OpenedSubmenu({
            indexPath: [1],
            submenuPath: ['export'],
            maybeActiveItemIndex: Option.some(2),
          }),
        ).model
        const grandchild = update(
          child,
          Message.OpenedSubmenu({
            indexPath: [1, 2],
            submenuPath: ['export', 'document'],
            maybeActiveItemIndex: Option.some(0),
          }),
        ).model
        const result = update(grandchild, Message.ClosedSubmenu({ depth: 2 }))

        expect(result.model.openSubmenuIndexPath).toStrictEqual([1])
        expect(result.model.submenuLevels).toHaveLength(1)
        expect(
          Option.map(
            Array.head(result.model.submenuLevels),
            level => level.maybeActiveItemIndex,
          ),
        ).toStrictEqual(Option.some(Option.some(2)))
      })

      it('replaces an open sibling in one update', () => {
        const firstSibling = update(
          openModel(),
          Message.OpenedSubmenu({
            indexPath: [2],
            submenuPath: ['organize'],
            maybeActiveItemIndex: Option.some(0),
          }),
        ).model
        const siblingSwitch = update(
          firstSibling,
          Message.OpenedSubmenu({
            indexPath: [3],
            submenuPath: ['move'],
            maybeActiveItemIndex: Option.some(0),
          }),
        )

        expect(siblingSwitch.model.openSubmenuIndexPath).toStrictEqual([3])
        expect(siblingSwitch.model.openSubmenuPath).toStrictEqual(['move'])
        expect(siblingSwitch.model.maybePendingSubmenuIndexPath).toStrictEqual(
          Option.none(),
        )
        expect(siblingSwitch.commands).toBeUndefined()
      })

      it('ignores a stale delayed sibling open', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.RequestedSubmenuOpen({
              indexPath: [1],
              submenuPath: ['export'],
              maybeActiveItemIndex: Option.some(0),
            }),
          ),
          Story.Command.resolve(
            DelayOpenSubmenu,
            Message.CompletedDelayOpenSubmenu({
              version: 0,
              indexPath: [1],
              submenuPath: ['export'],
              maybeActiveItemIndex: Option.some(0),
            }),
          ),
          Story.model(model => {
            expect(model.openSubmenuIndexPath).toStrictEqual([])
          }),
        )
      })

      it('cancels a pending submenu open when a leaf becomes active', () => {
        const requested = update(
          openModel(),
          Message.RequestedSubmenuOpen({
            indexPath: [1],
            submenuPath: ['export'],
            maybeActiveItemIndex: Option.some(0),
          }),
        )
        const activatedLeaf = update(
          requested.model,
          Message.ActivatedPathItem({
            indexPath: [2],
            activationTrigger: 'Pointer',
          }),
        )
        const delayed = update(
          activatedLeaf.model,
          Message.CompletedDelayOpenSubmenu({
            version: requested.model.submenuRequestVersion,
            indexPath: [1],
            submenuPath: ['export'],
            maybeActiveItemIndex: Option.some(0),
          }),
        )

        expect(activatedLeaf.model.maybePendingSubmenuIndexPath).toStrictEqual(
          Option.none(),
        )
        expect(delayed.model.openSubmenuIndexPath).toStrictEqual([])
      })

      it('does not let an old child search timer clear a sibling query', () => {
        const firstChild = update(
          openModel(),
          Message.OpenedSubmenu({
            indexPath: [0],
            submenuPath: ['first'],
            maybeActiveItemIndex: Option.some(0),
          }),
        ).model
        const firstSearch = update(
          firstChild,
          Message.SearchedPath({
            depth: 1,
            key: 'a',
            maybeTargetIndex: Option.some(0),
          }),
        ).model
        const switchingSibling = update(
          firstSearch,
          Message.OpenedSubmenu({
            indexPath: [1],
            submenuPath: ['second'],
            maybeActiveItemIndex: Option.some(0),
          }),
        )
        const sibling = switchingSibling.model
        const siblingSearch = update(
          sibling,
          Message.SearchedPath({
            depth: 1,
            key: 'b',
            maybeTargetIndex: Option.some(0),
          }),
        ).model
        const oldTimer = update(
          siblingSearch,
          Message.CompletedDelayClearPathSearch({ depth: 1, version: 1 }),
        )

        expect(
          Option.map(
            Array.head(oldTimer.model.submenuLevels),
            level => level.searchQuery,
          ),
        ).toStrictEqual(Option.some('b'))
      })

      it('keeps a submenu open when its pointer gap close is cancelled', () => {
        const nestedOpen = update(
          openModel(),
          Message.OpenedSubmenu({
            indexPath: [1],
            submenuPath: ['export'],
            maybeActiveItemIndex: Option.some(0),
          }),
        ).model

        const requestedClose = update(
          nestedOpen,
          Message.RequestedSubmenuClose({ depth: 1 }),
        )
        const cancelledClose = update(
          requestedClose.model,
          Message.CancelledSubmenuClose(),
        )
        const delayedClose = update(
          cancelledClose.model,
          Message.CompletedDelayCloseSubmenu({
            depth: 1,
            version: requestedClose.model.submenuRequestVersion,
          }),
        )

        expect(delayedClose.model.openSubmenuIndexPath).toStrictEqual([1])
        expect(delayedClose.model.openSubmenuPath).toStrictEqual(['export'])
      })

      it('does not invalidate an open request when no close is pending', () => {
        const model = openModel()
        const result = update(model, Message.CancelledSubmenuClose())

        expect(result.model).toBe(model)
        expect(result.model.submenuRequestVersion).toBe(
          model.submenuRequestVersion,
        )
      })

      it('selects a leaf with value and index paths and closes the tree', () => {
        const nestedOpen = update(
          openModel(),
          Message.OpenedSubmenu({
            indexPath: [1],
            submenuPath: ['export'],
            maybeActiveItemIndex: Option.some(2),
          }),
        ).model

        Story.story(
          update,
          Story.given(nestedOpen),
          Story.message(
            Message.SelectedPathItem({
              index: 2,
              item: 'ExportPdf',
              path: ['export', 'ExportPdf'],
              indexPath: [1, 2],
            }),
          ),
          Story.expectOutMessage(
            OutMessage.Selected({
              value: 'ExportPdf',
              index: 2,
              path: ['export', 'ExportPdf'],
              indexPath: [1, 2],
            }),
          ),
          Story.Command.resolve(FocusButton, Message.CompletedFocusButton()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.openSubmenuIndexPath).toStrictEqual([])
          }),
        )
      })

      it('selects a dragged leaf after a sustained pointer gesture', () => {
        const pressed = update(
          init({ id: 'test' }),
          Message.PressedPointerOnButton({
            pointerType: 'mouse',
            button: 0,
            screenX: 10,
            screenY: 10,
            timeStamp: 100,
          }),
        ).model

        const result = update(
          pressed,
          Message.ReleasedPointerOnPathItem({
            screenX: 30,
            screenY: 30,
            timeStamp: 400,
            index: 1,
            item: 'Share',
            path: ['organize', 'Share'],
            indexPath: [0, 1],
          }),
        )

        expect(result.outMessage).toStrictEqual(
          OutMessage.Selected({
            value: 'Share',
            index: 1,
            path: ['organize', 'Share'],
            indexPath: [0, 1],
          }),
        )
      })
    })

    describe('Opened', () => {
      it('opens the menu with the given active item', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(2) }),
          ),
          acknowledgeFocusItems,
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })

      it('resets search state on open', () => {
        Story.story(
          update,
          Story.given(
            modifyFields(init({ id: 'test' }), {
              searchQuery: () => 'stale',
              searchVersion: () => 1,
            }),
          ),
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          ),
          acknowledgeFocusItems,
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
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          ),
          acknowledgeFocusItems,
          Story.model(model => {
            expect(model.activationTrigger).toBe('Keyboard')
          }),
        )
      })

      it('sets trigger to Pointer when opened without active item', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.none() }),
          ),
          acknowledgeFocusItems,
          Story.model(model => {
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('resets pointer position on open', () => {
        Story.story(
          update,
          Story.given(
            modifyFields(init({ id: 'test' }), {
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
          acknowledgeFocusItems,
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
          givenOpen,
          Story.message(Message.Closed()),
          Story.Command.resolve(FocusButton, Message.CompletedFocusButton()),
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

      it('returns no Command and no OutMessage when already closed', () => {
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
      it('closes the menu without restoring button focus', () => {
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
      it('records pointer type for touch without toggling', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({
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
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({
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
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
          ),
          acknowledgeFocusItems,
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
          givenOpen,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
          ),
          Story.Command.resolve(FocusButton, Message.CompletedFocusButton()),
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
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({
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
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({
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
            Message.PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
              screenX: 0,
              screenY: 0,
              timeStamp: 0,
            }),
          ),
          acknowledgeFocusItems,
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
          givenOpen,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
          ),
          Story.Command.resolve(FocusButton, Message.CompletedFocusButton()),
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
    })

    describe('ReleasedPointerOnItems', () => {
      const givenOpenAndOrigin = Story.steps(
        givenClosed,
        Story.message(
          Message.PressedPointerOnButton({
            pointerType: 'mouse',
            button: 0,
            screenX: 100,
            screenY: 200,
            timeStamp: 1000,
          }),
        ),
        acknowledgeFocusItems,
      )

      it('no-ops when no pointer origin', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.ReleasedPointerOnItems({
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
          givenOpenAndOrigin,
          Story.message(
            Message.ReleasedPointerOnItems({
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
          givenOpenAndOrigin,
          Story.message(
            Message.ReleasedPointerOnItems({
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
          givenOpenAndOrigin,
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
          Story.message(
            Message.ReleasedPointerOnItems({
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
          givenOpenAndOrigin,
          Story.message(
            Message.ActivatedItem({ index: 2, activationTrigger: 'Pointer' }),
          ),
          Story.message(
            Message.ReleasedPointerOnItems({
              screenX: 200,
              screenY: 300,
              timeStamp: 2000,
            }),
          ),
          Story.Command.resolve(ClickItem, Message.CompletedClickItem()),
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
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 3, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(
            ScrollIntoView,
            Message.CompletedScrollIntoView(),
          ),
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
            Message.ActivatedItem({ index: 1, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(
            ScrollIntoView,
            Message.CompletedScrollIntoView(),
          ),
          Story.message(
            Message.ActivatedItem({ index: 4, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(
            ScrollIntoView,
            Message.CompletedScrollIntoView(),
          ),
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
            Message.ActivatedItem({ index: 1, activationTrigger: 'Pointer' }),
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
            Message.ActivatedItem({ index: 2, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(
            ScrollIntoView,
            Message.CompletedScrollIntoView(),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })

      it('returns no commands for pointer activation', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 2, activationTrigger: 'Pointer' }),
          ),
        )
      })
    })

    describe('DeactivatedItem', () => {
      it('clears active item when pointer-activated', () => {
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

      it('preserves active item when keyboard-activated', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 2, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(
            ScrollIntoView,
            Message.CompletedScrollIntoView(),
          ),
          Story.message(Message.DeactivatedItem()),
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

      it('activates when position differs from stored', () => {
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

      it('returns model unchanged when position matches', () => {
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

      it('does not return scroll commands', () => {
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
        )
      })
    })

    describe('SelectedItem', () => {
      it('closes the menu and returns a focus command', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(Message.SelectedItem({ index: 2, item: 'item-2' })),
          Story.Command.resolve(FocusButton, Message.CompletedFocusButton()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('returns no Command when an item is selected while already closed', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(Message.SelectedItem({ index: 2, item: 'item-2' })),
          Story.expectOutMessage(
            OutMessage.Selected({
              value: 'item-2',
              index: 2,
              path: ['item-2'],
              indexPath: [2],
            }),
          ),
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
          Story.message(Message.RequestedItemClick({ index: 2 })),
          Story.Command.resolve(ClickItem, Message.CompletedClickItem()),
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
            Message.Searched({
              key: 'a',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            Message.CompletedDelayClearSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchQuery).toBe('a')
          }),
          Story.message(
            Message.Searched({
              key: 'b',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            Message.CompletedDelayClearSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
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
            Message.Searched({
              key: 'x',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            Message.CompletedDelayClearSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(1)
          }),
          Story.message(
            Message.Searched({
              key: 'y',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            Message.CompletedDelayClearSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
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
            Message.Searched({
              key: 'd',
              maybeTargetIndex: Option.some(3),
            }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            Message.CompletedDelayClearSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
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
            Message.Searched({
              key: 'z',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            Message.CompletedDelayClearSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
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
            Message.Searched({
              key: 'a',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            Message.CompletedDelayClearSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
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
            Message.Searched({
              key: 'a',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            Message.CompletedDelayClearSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(1)
          }),
          Story.message(Message.CompletedDelayClearSearch({ version: 1 })),
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
            Message.Searched({
              key: 'a',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            Message.CompletedDelayClearSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.message(
            Message.Searched({
              key: 'b',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearSearch,
            Message.CompletedDelayClearSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(2)
          }),
          Story.message(Message.CompletedDelayClearSearch({ version: 1 })),
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
          givenOpen,
          Story.message(Message.CompletedFocusItems()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('animation', () => {
      describe('enter flow', () => {
        it('sets EnterStart and emits focus + afterPaint on Opened', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            acknowledgeFocusItems,
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.animation.transitionState).toBe('EnterStart')
            }),
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
          )
        })

        it('advances EnterStart to EnterAnimating on CompletedWaitForPaint', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            acknowledgeFocusItems,
            Story.Command.resolve(
              Animation.WaitForPaint,
              Animation.Message.CompletedWaitForPaint({ generation: 1 }),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('EnterAnimating')
            }),
            Story.Command.resolve(
              Animation.WaitForAnimationSettled,
              Animation.Message.EndedAnimation({ generation: 1 }),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('completes EnterAnimating to Idle on EndedAnimation', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            Story.Command.resolveAll(
              [FocusItems, Message.CompletedFocusItems()],
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
        it('starts no leave cascade on Closed when already closed', () => {
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

        it('sets LeaveStart on Closed', () => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Message.Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusButton, Message.CompletedFocusButton()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage(2)],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('begins the leave animation when the items container blurs', () => {
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
              [DetectMovementOrAnimationEnd, animationEndMessage(2)],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('sets LeaveStart on SelectedItem', () => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Message.SelectedItem({ index: 0, item: 'item-0' })),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusButton, Message.CompletedFocusButton()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage(2)],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('advances LeaveStart to LeaveAnimating on CompletedWaitForPaint', () => {
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
              DetectMovementOrAnimationEnd({ id: 'test', generation: 2 }),
            ),
            Story.Command.resolveAll(
              [FocusButton, Message.CompletedFocusButton()],
              [DetectMovementOrAnimationEnd, animationEndMessage(2)],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('completes LeaveAnimating to Idle on EndedAnimation', () => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Message.Closed()),
            Story.Command.resolveAll(
              [FocusButton, Message.CompletedFocusButton()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage(2)],
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
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            acknowledgeFocusItems,
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('keeps transitionState Idle on Closed', () => {
          Story.story(
            update,
            givenOpen,
            Story.message(Message.Closed()),
            Story.Command.resolve(FocusButton, Message.CompletedFocusButton()),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('stale messages', () => {
        it('ignores CompletedWaitForPaint when Idle', () => {
          Story.story(
            update,
            givenOpen,
            Story.message(
              Message.GotAnimationMessage({
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

        it('ignores EndedAnimation when Idle', () => {
          Story.story(
            update,
            givenOpen,
            Story.message(animationEndMessage(0)),
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
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            acknowledgeFocusItems,
            Story.Command.resolve(
              Animation.WaitForPaint,
              Animation.Message.CompletedWaitForPaint({
                generation: STALE_ANIMATION_GENERATION,
              }),
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
              [FocusButton, Message.CompletedFocusButton()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage(2)],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('transitions to LeaveStart when Closed during EnterAnimating', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            acknowledgeFocusItems,
            Story.Command.resolve(
              Animation.WaitForPaint,
              Animation.Message.CompletedWaitForPaint({ generation: 1 }),
            ),
            Story.Command.resolve(
              Animation.WaitForAnimationSettled,
              Animation.Message.EndedAnimation({
                generation: STALE_ANIMATION_GENERATION,
              }),
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
              [FocusButton, Message.CompletedFocusButton()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage(2)],
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
    const givenClosedModal = Story.given(init({ id: 'test', isModal: true }))

    const givenOpenModal = Story.steps(
      givenClosedModal,
      Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
      Story.Command.resolveAll(
        [LockScroll, Message.CompletedLockScroll()],
        [FocusItems, Message.CompletedFocusItems()],
      ),
      Story.message(Message.CompletedAnchorMenu()),
      Story.Command.resolve(InertOthers, Message.CompletedInertOthers()),
    )

    it('locks on open and inerts after the root panel is portaled', () => {
      Story.story(
        update,
        givenClosedModal,
        Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
        Story.Command.resolveAll(
          [LockScroll, Message.CompletedLockScroll()],
          [FocusItems, Message.CompletedFocusItems()],
        ),
        Story.message(Message.CompletedAnchorMenu()),
        Story.Command.resolve(InertOthers, Message.CompletedInertOthers()),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on Closed when isModal is true', () => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(Message.Closed()),
        Story.Command.resolveAll(
          [FocusButton, Message.CompletedFocusButton()],
          [UnlockScroll, Message.CompletedUnlockScroll()],
          [RestoreInert, Message.CompletedRestoreInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('does not inert after a modal closes before its root panel mounts', () => {
      Story.story(
        update,
        givenClosedModal,
        Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
        Story.Command.resolveAll(
          [LockScroll, Message.CompletedLockScroll()],
          [FocusItems, Message.CompletedFocusItems()],
        ),
        Story.message(Message.Closed()),
        Story.Command.resolveAll(
          [FocusButton, Message.CompletedFocusButton()],
          [UnlockScroll, Message.CompletedUnlockScroll()],
          [RestoreInert, Message.CompletedRestoreInert()],
        ),
        Story.message(Message.CompletedAnchorMenu()),
        Story.Command.expectNone(),
      )
    })

    it('emits no Commands on Closed when already closed in modal mode', () => {
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

    it('emits unlockScroll and restoreInert commands when the items container blurs in modal mode', () => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(Message.BlurredItems()),
        Story.Command.resolveAll(
          [UnlockScroll, Message.CompletedUnlockScroll()],
          [RestoreInert, Message.CompletedRestoreInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits no Commands when the items container blurs on a closed menu in modal mode', () => {
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

    it('emits unlockScroll and restoreInert commands on SelectedItem when isModal is true', () => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(Message.SelectedItem({ index: 0, item: 'item-0' })),
        Story.Command.resolveAll(
          [FocusButton, Message.CompletedFocusButton()],
          [UnlockScroll, Message.CompletedUnlockScroll()],
          [RestoreInert, Message.CompletedRestoreInert()],
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
        Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
        acknowledgeFocusItems,
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
        Story.message(Message.Closed()),
        Story.Command.resolve(FocusButton, Message.CompletedFocusButton()),
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
})
