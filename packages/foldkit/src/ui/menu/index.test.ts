import { describe, it } from '@effect/vitest'
import { Effect, Option, Predicate } from 'effect'
import type { VNode } from 'snabbdom'
import { expect } from 'vitest'

import { Dispatch } from '../../runtime'
import { noOpDispatch } from '../../runtime/errorUI'
import {
  ActivatedItem,
  AdvancedTransitionFrame,
  ClearedSearch,
  Closed,
  ClosedByTab,
  CompletedItemsFocus,
  DeactivatedItem,
  DetectedButtonMovement,
  EndedTransition,
  MovedPointerOverItem,
  Opened,
  PressedPointerOnButton,
  ReleasedPointerOnItems,
  RequestedItemClick,
  Searched,
  SelectedItem,
  groupContiguous,
  init,
  resolveTypeaheadMatch,
  update,
  view,
} from './index'
import type { Model, ViewConfig } from './index'

const closedModel = () => init({ id: 'test' })

const openModel = () => {
  const model = init({ id: 'test' })
  const [result] = update(
    model,
    Opened({ maybeActiveItemIndex: Option.some(0) }),
  )
  return result
}

const closedAnimatedModel = () => init({ id: 'test', isAnimated: true })

const openAnimatedModel = () => {
  const model = closedAnimatedModel()
  const [result] = update(
    model,
    Opened({ maybeActiveItemIndex: Option.some(0) }),
  )
  return result
}

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
        const model = closedModel()
        const [result, commands] = update(
          model,
          Opened({ maybeActiveItemIndex: Option.some(2) }),
        )
        expect(result.isOpen).toBe(true)
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(2))
        expect(commands).toHaveLength(1)
      })

      it('resets search state on open', () => {
        const model = {
          ...closedModel(),
          searchQuery: 'stale',
          searchVersion: 1,
        }
        const [result] = update(
          model,
          Opened({ maybeActiveItemIndex: Option.some(0) }),
        )
        expect(result.searchQuery).toBe('')
        expect(result.searchVersion).toBe(0)
      })

      it('sets trigger to Keyboard when opened with active item', () => {
        const model = closedModel()
        const [result] = update(
          model,
          Opened({ maybeActiveItemIndex: Option.some(0) }),
        )
        expect(result.activationTrigger).toBe('Keyboard')
      })

      it('sets trigger to Pointer when opened without active item', () => {
        const model = closedModel()
        const [result] = update(
          model,
          Opened({ maybeActiveItemIndex: Option.none() }),
        )
        expect(result.activationTrigger).toBe('Pointer')
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
      })

      it('resets pointer position on open', () => {
        const model = {
          ...closedModel(),
          maybeLastPointerPosition: Option.some({
            screenX: 100,
            screenY: 200,
          }),
        }
        const [result] = update(
          model,
          Opened({ maybeActiveItemIndex: Option.some(0) }),
        )
        expect(result.maybeLastPointerPosition).toStrictEqual(Option.none())
      })
    })

    describe('Closed', () => {
      it('closes the menu and resets state', () => {
        const model = openModel()
        const [result, commands] = update(model, Closed())
        expect(result.isOpen).toBe(false)
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
        expect(result.activationTrigger).toBe('Keyboard')
        expect(result.searchQuery).toBe('')
        expect(result.searchVersion).toBe(0)
        expect(result.maybeLastPointerPosition).toStrictEqual(Option.none())
        expect(result.maybeLastButtonPointerType).toStrictEqual(Option.none())
        expect(result.maybePointerOrigin).toStrictEqual(Option.none())
        expect(commands).toHaveLength(1)
      })
    })

    describe('ClosedByTab', () => {
      it('closes the menu without a focus command', () => {
        const model = openModel()
        const [result, commands] = update(model, ClosedByTab())
        expect(result.isOpen).toBe(false)
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
        expect(result.maybeLastPointerPosition).toStrictEqual(Option.none())
        expect(commands).toHaveLength(0)
      })
    })

    describe('PressedPointerOnButton', () => {
      it('records pointer type for touch without toggling', () => {
        const model = closedModel()
        const [result, commands] = update(
          model,
          PressedPointerOnButton({
            pointerType: 'touch',
            button: 0,
            screenX: 100,
            screenY: 200,
            timeStamp: 1000,
          }),
        )
        expect(result.isOpen).toBe(false)
        expect(result.maybeLastButtonPointerType).toStrictEqual(
          Option.some('touch'),
        )
        expect(commands).toHaveLength(0)
      })

      it('records pointer type for pen without toggling', () => {
        const model = closedModel()
        const [result, commands] = update(
          model,
          PressedPointerOnButton({
            pointerType: 'pen',
            button: 0,
            screenX: 100,
            screenY: 200,
            timeStamp: 1000,
          }),
        )
        expect(result.isOpen).toBe(false)
        expect(result.maybeLastButtonPointerType).toStrictEqual(
          Option.some('pen'),
        )
        expect(commands).toHaveLength(0)
      })

      it('opens the menu on mouse left button when closed', () => {
        const model = closedModel()
        const [result, commands] = update(
          model,
          PressedPointerOnButton({
            pointerType: 'mouse',
            button: 0,
            screenX: 100,
            screenY: 200,
            timeStamp: 1000,
          }),
        )
        expect(result.isOpen).toBe(true)
        expect(result.activationTrigger).toBe('Pointer')
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
        expect(result.maybeLastButtonPointerType).toStrictEqual(
          Option.some('mouse'),
        )
        expect(result.maybePointerOrigin).toStrictEqual(
          Option.some({ screenX: 100, screenY: 200, timeStamp: 1000 }),
        )
        expect(commands).toHaveLength(1)
      })

      it('closes the menu on mouse left button when open', () => {
        const model = openModel()
        const [result, commands] = update(
          model,
          PressedPointerOnButton({
            pointerType: 'mouse',
            button: 0,
            screenX: 100,
            screenY: 200,
            timeStamp: 1000,
          }),
        )
        expect(result.isOpen).toBe(false)
        expect(result.maybeLastButtonPointerType).toStrictEqual(Option.none())
        expect(result.maybePointerOrigin).toStrictEqual(Option.none())
        expect(commands).toHaveLength(1)
      })

      it('does not toggle on mouse right button', () => {
        const model = closedModel()
        const [result, commands] = update(
          model,
          PressedPointerOnButton({
            pointerType: 'mouse',
            button: 2,
            screenX: 100,
            screenY: 200,
            timeStamp: 1000,
          }),
        )
        expect(result.isOpen).toBe(false)
        expect(result.maybeLastButtonPointerType).toStrictEqual(
          Option.some('mouse'),
        )
        expect(commands).toHaveLength(0)
      })

      it('always records maybeLastButtonPointerType', () => {
        const model = closedModel()
        const [afterTouch] = update(
          model,
          PressedPointerOnButton({
            pointerType: 'touch',
            button: 0,
            screenX: 0,
            screenY: 0,
            timeStamp: 0,
          }),
        )
        expect(afterTouch.maybeLastButtonPointerType).toStrictEqual(
          Option.some('touch'),
        )

        const [afterMouse] = update(
          afterTouch,
          PressedPointerOnButton({
            pointerType: 'mouse',
            button: 0,
            screenX: 0,
            screenY: 0,
            timeStamp: 0,
          }),
        )
        expect(afterMouse.maybeLastButtonPointerType).toStrictEqual(
          Option.some('mouse'),
        )
      })
    })

    describe('ReleasedPointerOnItems', () => {
      const openWithOrigin = () => {
        const model = closedModel()
        const [result] = update(
          model,
          PressedPointerOnButton({
            pointerType: 'mouse',
            button: 0,
            screenX: 100,
            screenY: 200,
            timeStamp: 1000,
          }),
        )
        return result
      }

      it('no-ops when no pointer origin', () => {
        const model = openModel()
        const [result, commands] = update(
          model,
          ReleasedPointerOnItems({
            screenX: 200,
            screenY: 300,
            timeStamp: 2000,
          }),
        )
        expect(result).toBe(model)
        expect(commands).toHaveLength(0)
      })

      it('no-ops when movement is below threshold', () => {
        const model = openWithOrigin()
        const [result, commands] = update(
          model,
          ReleasedPointerOnItems({
            screenX: 103,
            screenY: 203,
            timeStamp: 2000,
          }),
        )
        expect(result).toBe(model)
        expect(commands).toHaveLength(0)
      })

      it('no-ops when hold time is below threshold', () => {
        const model = openWithOrigin()
        const [result, commands] = update(
          model,
          ReleasedPointerOnItems({
            screenX: 200,
            screenY: 300,
            timeStamp: 1100,
          }),
        )
        expect(result).toBe(model)
        expect(commands).toHaveLength(0)
      })

      it('no-ops when no active item', () => {
        const model = openWithOrigin()
        expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
        const [result, commands] = update(
          model,
          ReleasedPointerOnItems({
            screenX: 200,
            screenY: 300,
            timeStamp: 2000,
          }),
        )
        expect(result).toBe(model)
        expect(commands).toHaveLength(0)
      })

      it('issues click command when all thresholds met', () => {
        const model = openWithOrigin()
        const [withActiveItem] = update(
          model,
          ActivatedItem({ index: 2, activationTrigger: 'Pointer' }),
        )
        const [result, commands] = update(
          withActiveItem,
          ReleasedPointerOnItems({
            screenX: 200,
            screenY: 300,
            timeStamp: 2000,
          }),
        )
        expect(result).toBe(withActiveItem)
        expect(commands).toHaveLength(1)
      })
    })

    describe('ActivatedItem', () => {
      it('sets the active item index', () => {
        const model = openModel()
        const [result] = update(
          model,
          ActivatedItem({ index: 3, activationTrigger: 'Keyboard' }),
        )
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(3))
      })

      it('replaces the previous active item', () => {
        const model = openModel()
        const [intermediate] = update(
          model,
          ActivatedItem({ index: 1, activationTrigger: 'Keyboard' }),
        )
        const [result] = update(
          intermediate,
          ActivatedItem({ index: 4, activationTrigger: 'Keyboard' }),
        )
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(4))
      })

      it('stores activation trigger in model', () => {
        const model = openModel()
        const [result] = update(
          model,
          ActivatedItem({ index: 1, activationTrigger: 'Pointer' }),
        )
        expect(result.activationTrigger).toBe('Pointer')
      })

      it('returns scroll command for keyboard activation', () => {
        const model = openModel()
        const [, commands] = update(
          model,
          ActivatedItem({ index: 2, activationTrigger: 'Keyboard' }),
        )
        expect(commands).toHaveLength(1)
      })

      it('returns no commands for pointer activation', () => {
        const model = openModel()
        const [, commands] = update(
          model,
          ActivatedItem({ index: 2, activationTrigger: 'Pointer' }),
        )
        expect(commands).toHaveLength(0)
      })
    })

    describe('DeactivatedItem', () => {
      it('clears active item when pointer-activated', () => {
        const model = openModel()
        const [afterPointer] = update(
          model,
          ActivatedItem({ index: 1, activationTrigger: 'Pointer' }),
        )
        const [result, commands] = update(afterPointer, DeactivatedItem())
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
        expect(commands).toHaveLength(0)
      })

      it('preserves active item when keyboard-activated', () => {
        const model = openModel()
        const [afterKeyboard] = update(
          model,
          ActivatedItem({ index: 2, activationTrigger: 'Keyboard' }),
        )
        const [result, commands] = update(afterKeyboard, DeactivatedItem())
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(2))
        expect(result).toBe(afterKeyboard)
        expect(commands).toHaveLength(0)
      })
    })

    describe('MovedPointerOverItem', () => {
      it('activates item on first pointer move', () => {
        const model = openModel()
        const [result, commands] = update(
          model,
          MovedPointerOverItem({
            index: 2,
            screenX: 100,
            screenY: 200,
          }),
        )
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(2))
        expect(result.activationTrigger).toBe('Pointer')
        expect(result.maybeLastPointerPosition).toStrictEqual(
          Option.some({ screenX: 100, screenY: 200 }),
        )
        expect(commands).toHaveLength(0)
      })

      it('activates when position differs from stored', () => {
        const model = openModel()
        const [afterFirst] = update(
          model,
          MovedPointerOverItem({
            index: 1,
            screenX: 100,
            screenY: 200,
          }),
        )
        const [result] = update(
          afterFirst,
          MovedPointerOverItem({
            index: 3,
            screenX: 150,
            screenY: 250,
          }),
        )
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(3))
        expect(result.maybeLastPointerPosition).toStrictEqual(
          Option.some({ screenX: 150, screenY: 250 }),
        )
      })

      it('returns model unchanged when position matches', () => {
        const model = openModel()
        const [afterFirst] = update(
          model,
          MovedPointerOverItem({
            index: 1,
            screenX: 100,
            screenY: 200,
          }),
        )
        const [result, commands] = update(
          afterFirst,
          MovedPointerOverItem({
            index: 2,
            screenX: 100,
            screenY: 200,
          }),
        )
        expect(result).toBe(afterFirst)
        expect(commands).toHaveLength(0)
      })

      it('does not return scroll commands', () => {
        const model = openModel()
        const [, commands] = update(
          model,
          MovedPointerOverItem({
            index: 2,
            screenX: 100,
            screenY: 200,
          }),
        )
        expect(commands).toHaveLength(0)
      })
    })

    describe('SelectedItem', () => {
      it('closes the menu and returns a focus command', () => {
        const model = openModel()
        const [result, commands] = update(model, SelectedItem({ index: 2 }))
        expect(result.isOpen).toBe(false)
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
        expect(commands).toHaveLength(1)
      })
    })

    describe('RequestedItemClick', () => {
      it('returns model unchanged with a click command', () => {
        const model = openModel()
        const [result, commands] = update(
          model,
          RequestedItemClick({ index: 2 }),
        )
        expect(result).toBe(model)
        expect(commands).toHaveLength(1)
      })
    })

    describe('Searched', () => {
      it('appends the key to the search query', () => {
        const model = openModel()
        const [result] = update(
          model,
          Searched({ key: 'a', maybeTargetIndex: Option.none() }),
        )
        expect(result.searchQuery).toBe('a')

        const [result2] = update(
          result,
          Searched({ key: 'b', maybeTargetIndex: Option.none() }),
        )
        expect(result2.searchQuery).toBe('ab')
      })

      it('bumps the search version', () => {
        const model = openModel()
        const [result] = update(
          model,
          Searched({ key: 'x', maybeTargetIndex: Option.none() }),
        )
        expect(result.searchVersion).toBe(1)

        const [result2] = update(
          result,
          Searched({ key: 'y', maybeTargetIndex: Option.none() }),
        )
        expect(result2.searchVersion).toBe(2)
      })

      it('updates active item when a match is found', () => {
        const model = openModel()
        const [result] = update(
          model,
          Searched({ key: 'd', maybeTargetIndex: Option.some(3) }),
        )
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(3))
      })

      it('keeps existing active item when no match is found', () => {
        const model = openModel()
        const [result] = update(
          model,
          Searched({ key: 'z', maybeTargetIndex: Option.none() }),
        )
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(0))
      })

      it('returns a delay command for debounce', () => {
        const model = openModel()
        const [, commands] = update(
          model,
          Searched({ key: 'a', maybeTargetIndex: Option.none() }),
        )
        expect(commands).toHaveLength(1)
      })
    })

    describe('ClearedSearch', () => {
      it('clears search query when version matches', () => {
        const model = openModel()
        const [afterSearch] = update(
          model,
          Searched({ key: 'a', maybeTargetIndex: Option.none() }),
        )
        expect(afterSearch.searchVersion).toBe(1)

        const [result, commands] = update(
          afterSearch,
          ClearedSearch({ version: 1 }),
        )
        expect(result.searchQuery).toBe('')
        expect(commands).toHaveLength(0)
      })

      it('ignores stale version', () => {
        const model = openModel()
        const [afterFirstSearch] = update(
          model,
          Searched({ key: 'a', maybeTargetIndex: Option.none() }),
        )
        const [afterSecondSearch] = update(
          afterFirstSearch,
          Searched({ key: 'b', maybeTargetIndex: Option.none() }),
        )
        expect(afterSecondSearch.searchVersion).toBe(2)

        const [result] = update(
          afterSecondSearch,
          ClearedSearch({ version: 1 }),
        )
        expect(result.searchQuery).toBe('ab')
      })
    })

    describe('CompletedItemsFocus', () => {
      it('returns model unchanged', () => {
        const model = openModel()
        const [result, commands] = update(model, CompletedItemsFocus())
        expect(result).toBe(model)
        expect(commands).toHaveLength(0)
      })
    })

    describe('transitions', () => {
      describe('enter flow', () => {
        it('sets EnterStart and emits focus + nextFrame on Opened', () => {
          const model = closedAnimatedModel()
          const [result, commands] = update(
            model,
            Opened({ maybeActiveItemIndex: Option.some(0) }),
          )
          expect(result.isOpen).toBe(true)
          expect(result.transitionState).toBe('EnterStart')
          expect(commands).toHaveLength(2)
        })

        it('advances EnterStart to EnterAnimating on AdvancedTransitionFrame', () => {
          const model = openAnimatedModel()
          expect(model.transitionState).toBe('EnterStart')

          const [result, commands] = update(model, AdvancedTransitionFrame())
          expect(result.transitionState).toBe('EnterAnimating')
          expect(commands).toHaveLength(1)
        })

        it('completes EnterAnimating to Idle on EndedTransition', () => {
          const model = openAnimatedModel()
          const [enterAnimating] = update(model, AdvancedTransitionFrame())
          expect(enterAnimating.transitionState).toBe('EnterAnimating')

          const [result, commands] = update(enterAnimating, EndedTransition())
          expect(result.transitionState).toBe('Idle')
          expect(commands).toHaveLength(0)
        })
      })

      describe('leave flow', () => {
        it('sets LeaveStart on Closed', () => {
          const model = openAnimatedModel()
          const [result, commands] = update(model, Closed())
          expect(result.isOpen).toBe(false)
          expect(result.transitionState).toBe('LeaveStart')
          expect(commands).toHaveLength(2)
        })

        it('sets LeaveStart on ClosedByTab', () => {
          const model = openAnimatedModel()
          const [result, commands] = update(model, ClosedByTab())
          expect(result.isOpen).toBe(false)
          expect(result.transitionState).toBe('LeaveStart')
          expect(commands).toHaveLength(1)
        })

        it('sets LeaveStart on SelectedItem', () => {
          const model = openAnimatedModel()
          const [result, commands] = update(model, SelectedItem({ index: 0 }))
          expect(result.isOpen).toBe(false)
          expect(result.transitionState).toBe('LeaveStart')
          expect(commands).toHaveLength(2)
        })

        it('advances LeaveStart to LeaveAnimating on AdvancedTransitionFrame', () => {
          const model = openAnimatedModel()
          const [closed] = update(model, Closed())
          expect(closed.transitionState).toBe('LeaveStart')

          const [result, commands] = update(closed, AdvancedTransitionFrame())
          expect(result.transitionState).toBe('LeaveAnimating')
          expect(commands).toHaveLength(1)
        })

        it('completes LeaveAnimating to Idle on EndedTransition', () => {
          const model = openAnimatedModel()
          const [closed] = update(model, Closed())
          const [leaveAnimating] = update(closed, AdvancedTransitionFrame())
          expect(leaveAnimating.transitionState).toBe('LeaveAnimating')

          const [result, commands] = update(leaveAnimating, EndedTransition())
          expect(result.transitionState).toBe('Idle')
          expect(commands).toHaveLength(0)
        })
      })

      describe('non-animated', () => {
        it('keeps transitionState Idle on Opened', () => {
          const model = closedModel()
          const [result, commands] = update(
            model,
            Opened({ maybeActiveItemIndex: Option.some(0) }),
          )
          expect(result.transitionState).toBe('Idle')
          expect(commands).toHaveLength(1)
        })

        it('keeps transitionState Idle on Closed', () => {
          const model = openModel()
          const [result, commands] = update(model, Closed())
          expect(result.transitionState).toBe('Idle')
          expect(commands).toHaveLength(1)
        })
      })

      describe('stale messages', () => {
        it('ignores AdvancedTransitionFrame when Idle', () => {
          const model = openModel()
          const [result, commands] = update(model, AdvancedTransitionFrame())
          expect(result).toBe(model)
          expect(commands).toHaveLength(0)
        })

        it('ignores EndedTransition when Idle', () => {
          const model = openModel()
          const [result, commands] = update(model, EndedTransition())
          expect(result).toBe(model)
          expect(commands).toHaveLength(0)
        })
      })

      describe('interruptions', () => {
        it('transitions to LeaveStart when Closed during EnterStart', () => {
          const model = openAnimatedModel()
          expect(model.transitionState).toBe('EnterStart')

          const [result] = update(model, Closed())
          expect(result.isOpen).toBe(false)
          expect(result.transitionState).toBe('LeaveStart')
        })

        it('transitions to LeaveStart when Closed during EnterAnimating', () => {
          const model = openAnimatedModel()
          const [enterAnimating] = update(model, AdvancedTransitionFrame())
          expect(enterAnimating.transitionState).toBe('EnterAnimating')

          const [result] = update(enterAnimating, Closed())
          expect(result.isOpen).toBe(false)
          expect(result.transitionState).toBe('LeaveStart')
        })
      })

      describe('DetectedButtonMovement', () => {
        it('cancels leave animation by setting transitionState to Idle', () => {
          const model = openAnimatedModel()
          const [closed] = update(model, Closed())
          const [leaveAnimating] = update(closed, AdvancedTransitionFrame())
          expect(leaveAnimating.transitionState).toBe('LeaveAnimating')

          const [result, commands] = update(
            leaveAnimating,
            DetectedButtonMovement(),
          )
          expect(result.transitionState).toBe('Idle')
          expect(commands).toHaveLength(0)
        })

        it('is a no-op during Idle', () => {
          const model = openModel()
          expect(model.transitionState).toBe('Idle')

          const [result, commands] = update(model, DetectedButtonMovement())
          expect(result).toBe(model)
          expect(commands).toHaveLength(0)
        })

        it('is a no-op during EnterAnimating', () => {
          const model = openAnimatedModel()
          const [enterAnimating] = update(model, AdvancedTransitionFrame())
          expect(enterAnimating.transitionState).toBe('EnterAnimating')

          const [result, commands] = update(
            enterAnimating,
            DetectedButtonMovement(),
          )
          expect(result).toBe(enterAnimating)
          expect(commands).toHaveLength(0)
        })
      })
    })
  })

  describe('modal commands', () => {
    const closedModalModel = () => init({ id: 'test', isModal: true })

    const openModalModel = () => {
      const model = closedModalModel()
      const [result] = update(
        model,
        Opened({ maybeActiveItemIndex: Option.some(0) }),
      )
      return result
    }

    it('emits lockScroll and inertOthers commands on Opened when isModal is true', () => {
      const model = closedModalModel()
      const [, commands] = update(
        model,
        Opened({ maybeActiveItemIndex: Option.some(0) }),
      )
      expect(commands).toHaveLength(3)
    })

    it('emits unlockScroll and restoreInert commands on Closed when isModal is true', () => {
      const model = openModalModel()
      const [, commands] = update(model, Closed())
      expect(commands).toHaveLength(3)
    })

    it('emits unlockScroll and restoreInert commands on ClosedByTab when isModal is true', () => {
      const model = openModalModel()
      const [, commands] = update(model, ClosedByTab())
      expect(commands).toHaveLength(2)
    })

    it('emits unlockScroll and restoreInert commands on SelectedItem when isModal is true', () => {
      const model = openModalModel()
      const [, commands] = update(model, SelectedItem({ index: 0 }))
      expect(commands).toHaveLength(3)
    })

    it('does not emit modal commands when isModal is false', () => {
      const model = closedModel()
      const [, openCommands] = update(
        model,
        Opened({ maybeActiveItemIndex: Option.some(0) }),
      )
      expect(openCommands).toHaveLength(1)

      const open = openModel()
      const [, closeCommands] = update(open, Closed())
      expect(closeCommands).toHaveLength(1)

      const [, tabCommands] = update(open, ClosedByTab())
      expect(tabCommands).toHaveLength(0)

      const [, selectCommands] = update(open, SelectedItem({ index: 0 }))
      expect(selectCommands).toHaveLength(1)
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
