import { describe, it } from '@effect/vitest'
import { Effect, Option, Predicate } from 'effect'
import type { VNode } from 'snabbdom'
import { expect } from 'vitest'

import { Dispatch } from '../../runtime'
import { noOpDispatch } from '../../runtime/crashUI'
import {
  ActivatedItem,
  AdvancedTransitionFrame,
  ClearedSearch,
  Closed,
  ClosedByTab,
  CompletedLockScroll,
  DeactivatedItem,
  DetectedButtonMovement,
  EndedTransition,
  IgnoredMouseClick,
  MovedPointerOverItem,
  Opened,
  PressedPointerOnButton,
  RequestedItemClick,
  Searched,
  SelectedItem,
  SuppressedSpaceScroll,
} from './shared'
import { init, update, view } from './single'
import type { Model, ViewConfig } from './single'

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
      it('closes the listbox and resets state', () => {
        const model = openModel()
        const [result, commands] = update(model, Closed())
        expect(result.isOpen).toBe(false)
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
        expect(result.activationTrigger).toBe('Keyboard')
        expect(result.searchQuery).toBe('')
        expect(result.searchVersion).toBe(0)
        expect(result.maybeLastPointerPosition).toStrictEqual(Option.none())
        expect(result.maybeLastButtonPointerType).toStrictEqual(Option.none())
        expect(commands).toHaveLength(1)
      })
    })

    describe('ClosedByTab', () => {
      it('closes the listbox without a focus command', () => {
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
          }),
        )
        expect(result.isOpen).toBe(false)
        expect(result.maybeLastButtonPointerType).toStrictEqual(
          Option.some('pen'),
        )
        expect(commands).toHaveLength(0)
      })

      it('opens the listbox on mouse left button when closed', () => {
        const model = closedModel()
        const [result, commands] = update(
          model,
          PressedPointerOnButton({
            pointerType: 'mouse',
            button: 0,
          }),
        )
        expect(result.isOpen).toBe(true)
        expect(result.activationTrigger).toBe('Pointer')
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
        expect(result.maybeLastButtonPointerType).toStrictEqual(
          Option.some('mouse'),
        )
        expect(commands).toHaveLength(1)
      })

      it('closes the listbox on mouse left button when open', () => {
        const model = openModel()
        const [result, commands] = update(
          model,
          PressedPointerOnButton({
            pointerType: 'mouse',
            button: 0,
          }),
        )
        expect(result.isOpen).toBe(false)
        expect(result.maybeLastButtonPointerType).toStrictEqual(Option.none())
        expect(commands).toHaveLength(1)
      })

      it('does not toggle on mouse right button', () => {
        const model = closedModel()
        const [result, commands] = update(
          model,
          PressedPointerOnButton({
            pointerType: 'mouse',
            button: 2,
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
          }),
        )
        expect(afterMouse.maybeLastButtonPointerType).toStrictEqual(
          Option.some('mouse'),
        )
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
      it('stores item value in maybeSelectedItem', () => {
        const model = openModel()
        const [result] = update(model, SelectedItem({ item: 'apple' }))
        expect(result.maybeSelectedItem).toStrictEqual(Option.some('apple'))
      })

      it('closes the listbox on selection', () => {
        const model = openModel()
        const [result] = update(model, SelectedItem({ item: 'apple' }))
        expect(result.isOpen).toBe(false)
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
      })

      it('returns a focus button command', () => {
        const model = openModel()
        const [, commands] = update(model, SelectedItem({ item: 'apple' }))
        expect(commands).toHaveLength(1)
      })

      it('selection persists after close', () => {
        const model = openModel()
        const [afterSelect] = update(model, SelectedItem({ item: 'apple' }))
        expect(afterSelect.isOpen).toBe(false)
        expect(afterSelect.maybeSelectedItem).toStrictEqual(
          Option.some('apple'),
        )
      })

      it('selection persists across open/close cycles', () => {
        const model = init({ id: 'test', selectedItem: 'banana' })
        const [afterOpen] = update(
          model,
          Opened({ maybeActiveItemIndex: Option.some(0) }),
        )
        expect(afterOpen.maybeSelectedItem).toStrictEqual(Option.some('banana'))

        const [afterClose] = update(afterOpen, Closed())
        expect(afterClose.maybeSelectedItem).toStrictEqual(
          Option.some('banana'),
        )
      })

      it('replaces previous selection with new value', () => {
        const model = init({ id: 'test', selectedItem: 'apple' })
        const [afterOpen] = update(
          model,
          Opened({ maybeActiveItemIndex: Option.some(0) }),
        )
        const [afterSelect] = update(
          afterOpen,
          SelectedItem({ item: 'banana' }),
        )
        expect(afterSelect.maybeSelectedItem).toStrictEqual(
          Option.some('banana'),
        )
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

    describe('completed and view-dispatched messages', () => {
      it('returns model unchanged for CompletedLockScroll', () => {
        const model = openModel()
        const [result, commands] = update(model, CompletedLockScroll())
        expect(result).toBe(model)
        expect(commands).toHaveLength(0)
      })

      it('returns model unchanged for IgnoredMouseClick', () => {
        const model = openModel()
        const [result, commands] = update(model, IgnoredMouseClick())
        expect(result).toBe(model)
        expect(commands).toHaveLength(0)
      })

      it('returns model unchanged for SuppressedSpaceScroll', () => {
        const model = openModel()
        const [result, commands] = update(model, SuppressedSpaceScroll())
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
          const [result, commands] = update(
            model,
            SelectedItem({ item: 'apple' }),
          )
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
      const [, commands] = update(model, SelectedItem({ item: 'apple' }))
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

      const [, selectCommands] = update(open, SelectedItem({ item: 'apple' }))
      expect(selectCommands).toHaveLength(1)
    })
  })

  describe('view', () => {
    type TestMessage = string

    const baseViewConfig = (model: Model): ViewConfig<TestMessage, string> => ({
      model,
      toMessage: message => message._tag,
      items: ['Apple', 'Banana'],
      itemToConfig: () => ({
        content: Effect.succeed(null),
      }),
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
        const model = openModel()
        const config = baseViewConfig(model)
        const vnode = renderView(config)
        const button = findChildByKey(vnode, 'test-button')

        expect(button?.data?.attrs?.['aria-haspopup']).toBe('listbox')
      })

      it('items container has role="listbox"', () => {
        const model = openModel()
        const config = baseViewConfig(model)
        const vnode = renderView(config)
        const itemsContainer = findChildByKey(vnode, 'test-items-container')

        expect(itemsContainer?.data?.attrs?.['role']).toBe('listbox')
      })

      it('items have role="option"', () => {
        const model = openModel()
        const config = baseViewConfig(model)
        const vnode = renderView(config)
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
        const config = baseViewConfig(model)
        const vnode = renderView(config)
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        const firstItem = findChildByKey(itemsContainer!, 'test-item-0')

        expect(firstItem?.data?.attrs?.['aria-selected']).toBe('true')
      })

      it('non-selected items have aria-selected="false"', () => {
        const model = {
          ...openModel(),
          maybeSelectedItem: Option.some('Apple'),
        }
        const config = baseViewConfig(model)
        const vnode = renderView(config)
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        const secondItem = findChildByKey(itemsContainer!, 'test-item-1')

        expect(secondItem?.data?.attrs?.['aria-selected']).toBe('false')
      })

      it('data-selected attribute on selected item', () => {
        const model = {
          ...openModel(),
          maybeSelectedItem: Option.some('Banana'),
        }
        const config = baseViewConfig(model)
        const vnode = renderView(config)
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        const firstItem = findChildByKey(itemsContainer!, 'test-item-0')
        const secondItem = findChildByKey(itemsContainer!, 'test-item-1')

        expect(firstItem?.data?.attrs?.['data-selected']).toBeUndefined()
        expect(secondItem?.data?.attrs?.['data-selected']).toBe('')
      })

      it('items container has no aria-multiselectable', () => {
        const model = openModel()
        const config = baseViewConfig(model)
        const vnode = renderView(config)
        const itemsContainer = findChildByKey(vnode, 'test-items-container')

        expect(
          itemsContainer?.data?.attrs?.['aria-multiselectable'],
        ).toBeUndefined()
      })
    })

    describe('form integration', () => {
      it('renders hidden input when name is provided', () => {
        const model = closedModel()
        const config = {
          ...baseViewConfig(model),
          name: 'fruit',
        }
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
        const config = {
          ...baseViewConfig(model),
          name: 'fruit',
        }
        const vnode = renderView(config)
        const children = vnode.children as ReadonlyArray<VNode>
        const hiddenInput = children.find(
          (child): child is VNode =>
            typeof child !== 'string' && child.sel === 'input',
        )

        expect(hiddenInput?.data?.props?.['value']).toBe('Apple')
      })

      it('no hidden input when name is not provided', () => {
        const model = closedModel()
        const config = baseViewConfig(model)
        const vnode = renderView(config)
        const children = vnode.children as ReadonlyArray<VNode>
        const hiddenInput = children.find(
          (child): child is VNode =>
            typeof child !== 'string' && child.sel === 'input',
        )

        expect(hiddenInput).toBeUndefined()
      })

      it('no value attribute on hidden input when nothing selected', () => {
        const model = closedModel()
        const config = {
          ...baseViewConfig(model),
          name: 'fruit',
        }
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
            return {
              content: Effect.succeed(null),
            }
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
            return {
              content: Effect.succeed(null),
            }
          },
        }
        renderView(config)

        expect(contexts[1]?.isSelected).toBe(false)
      })
    })

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
    })

    describe('orientation', () => {
      it('items container has aria-orientation="vertical" by default', () => {
        const model = openModel()
        const config = baseViewConfig(model)
        const vnode = renderView(config)
        const itemsContainer = findChildByKey(vnode, 'test-items-container')

        expect(itemsContainer?.data?.attrs?.['aria-orientation']).toBe(
          'vertical',
        )
      })

      it('items container has aria-orientation="horizontal" when horizontal', () => {
        const model = {
          ...openModel(),
          orientation: 'Horizontal' as const,
        }
        const config = baseViewConfig(model)
        const vnode = renderView(config)
        const itemsContainer = findChildByKey(vnode, 'test-items-container')

        expect(itemsContainer?.data?.attrs?.['aria-orientation']).toBe(
          'horizontal',
        )
      })
    })

    describe('whole-listbox disabled', () => {
      it('wrapper has data-disabled when isDisabled is true', () => {
        const model = closedModel()
        const config = {
          ...baseViewConfig(model),
          isDisabled: true,
        }
        const vnode = renderView(config)

        expect(vnode.data?.attrs?.['data-disabled']).toBe('')
      })

      it('wrapper does not have data-disabled when isDisabled is false', () => {
        const model = closedModel()
        const config = baseViewConfig(model)
        const vnode = renderView(config)

        expect(vnode.data?.attrs?.['data-disabled']).toBeUndefined()
      })

      it('button has aria-disabled when isDisabled is true', () => {
        const model = closedModel()
        const config = {
          ...baseViewConfig(model),
          isDisabled: true,
        }
        const vnode = renderView(config)
        const button = findChildByKey(vnode, 'test-button')

        expect(button?.data?.attrs?.['aria-disabled']).toBe('true')
        expect(button?.data?.attrs?.['data-disabled']).toBe('')
      })

      it('button has no event handlers when isDisabled is true', () => {
        const model = closedModel()
        const config = {
          ...baseViewConfig(model),
          isDisabled: true,
        }
        const vnode = renderView(config)
        const button = findChildByKey(vnode, 'test-button')

        expect(button?.data?.on?.pointerdown).toBeUndefined()
        expect(button?.data?.on?.click).toBeUndefined()
      })
    })

    describe('invalid state', () => {
      it('wrapper has data-invalid when isInvalid is true', () => {
        const model = closedModel()
        const config = {
          ...baseViewConfig(model),
          isInvalid: true,
        }
        const vnode = renderView(config)

        expect(vnode.data?.attrs?.['data-invalid']).toBe('')
      })

      it('wrapper does not have data-invalid when isInvalid is false', () => {
        const model = closedModel()
        const config = baseViewConfig(model)
        const vnode = renderView(config)

        expect(vnode.data?.attrs?.['data-invalid']).toBeUndefined()
      })

      it('button has data-invalid when isInvalid is true', () => {
        const model = closedModel()
        const config = {
          ...baseViewConfig(model),
          isInvalid: true,
        }
        const vnode = renderView(config)
        const button = findChildByKey(vnode, 'test-button')

        expect(button?.data?.attrs?.['data-invalid']).toBe('')
      })
    })

    describe('form prop', () => {
      it('hidden input has form attribute when form is provided', () => {
        const model = closedModel()
        const config = {
          ...baseViewConfig(model),
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
        const model = closedModel()
        const config = {
          ...baseViewConfig(model),
          name: 'fruit',
        }
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
        toMessage: message => message._tag,
        items: people,
        itemToValue: person => person.id,
        itemToConfig: () => ({
          content: Effect.succeed(null),
        }),
        buttonContent: Effect.succeed(null),
      })

      it('items have click handlers with object items', () => {
        const model = openModel()
        const config = personViewConfig(model)
        const vnode = renderView(config)
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        const firstItem = findChildByKey(itemsContainer!, 'test-item-0')

        expect(firstItem?.data?.on?.click).toBeDefined()
      })

      it('selected item matches by itemToValue', () => {
        const model = {
          ...openModel(),
          maybeSelectedItem: Option.some('2'),
        }
        const config = personViewConfig(model)
        const vnode = renderView(config)
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        const secondItem = findChildByKey(itemsContainer!, 'test-item-1')

        expect(secondItem?.data?.attrs?.['aria-selected']).toBe('true')
        expect(secondItem?.data?.attrs?.['data-selected']).toBe('')
      })

      it('non-selected item has aria-selected false', () => {
        const model = {
          ...openModel(),
          maybeSelectedItem: Option.some('2'),
        }
        const config = personViewConfig(model)
        const vnode = renderView(config)
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        const firstItem = findChildByKey(itemsContainer!, 'test-item-0')

        expect(firstItem?.data?.attrs?.['aria-selected']).toBe('false')
        expect(firstItem?.data?.attrs?.['data-selected']).toBeUndefined()
      })

      it('hidden input uses itemToValue for value', () => {
        const model = {
          ...closedModel(),
          maybeSelectedItem: Option.some('1'),
        }
        const config = {
          ...personViewConfig(model),
          name: 'person',
        }
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
