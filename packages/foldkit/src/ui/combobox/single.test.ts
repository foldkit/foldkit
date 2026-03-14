import { describe, it } from '@effect/vitest'
import { Effect, Option, Predicate } from 'effect'
import type { VNode } from 'snabbdom'
import { expect } from 'vitest'

import { Dispatch } from '../../runtime'
import { noOpDispatch } from '../../runtime/errorUI'
import {
  ActivatedItem,
  AdvancedTransitionFrame,
  Closed,
  ClosedByTab,
  CompletedInputFocus,
  DeactivatedItem,
  DetectedInputMovement,
  EndedTransition,
  MovedPointerOverItem,
  Opened,
  PressedToggleButton,
  RequestedItemClick,
  SelectedItem,
  UpdatedInputValue,
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

describe('Combobox', () => {
  describe('init', () => {
    it('defaults to closed with no active item and no selection', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        isModal: false,
        nullable: false,
        immediate: false,
        selectInputOnFocus: false,
        transitionState: 'Idle',
        maybeActiveItemIndex: Option.none(),
        activationTrigger: 'Keyboard',
        inputValue: '',
        maybeLastPointerPosition: Option.none(),
        maybeSelectedItem: Option.none(),
        maybeSelectedDisplayText: Option.none(),
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
      const model = init({
        id: 'test',
        selectedItem: 'apple',
        selectedDisplayText: 'Apple',
      })
      expect(model.maybeSelectedItem).toStrictEqual(Option.some('apple'))
      expect(model.maybeSelectedDisplayText).toStrictEqual(Option.some('Apple'))
    })

    it('defaults maybeSelectedItem to none', () => {
      const model = init({ id: 'test' })
      expect(model.maybeSelectedItem).toStrictEqual(Option.none())
    })

    it('uses selectedItem as selectedDisplayText when selectedDisplayText is omitted', () => {
      const model = init({ id: 'test', selectedItem: 'apple' })
      expect(model.maybeSelectedItem).toStrictEqual(Option.some('apple'))
      expect(model.maybeSelectedDisplayText).toStrictEqual(Option.some('apple'))
    })

    it('accepts nullable option', () => {
      const model = init({ id: 'test', nullable: true })
      expect(model.nullable).toBe(true)
    })

    it('defaults nullable to false', () => {
      const model = init({ id: 'test' })
      expect(model.nullable).toBe(false)
    })

    it('accepts immediate option', () => {
      const model = init({ id: 'test', immediate: true })
      expect(model.immediate).toBe(true)
    })

    it('defaults immediate to false', () => {
      const model = init({ id: 'test' })
      expect(model.immediate).toBe(false)
    })

    it('accepts selectInputOnFocus option', () => {
      const model = init({ id: 'test', selectInputOnFocus: true })
      expect(model.selectInputOnFocus).toBe(true)
    })

    it('defaults selectInputOnFocus to false', () => {
      const model = init({ id: 'test' })
      expect(model.selectInputOnFocus).toBe(false)
    })
  })

  describe('update', () => {
    describe('Opened', () => {
      it('opens with given active item', () => {
        const model = closedModel()
        const [result] = update(
          model,
          Opened({ maybeActiveItemIndex: Option.some(2) }),
        )
        expect(result.isOpen).toBe(true)
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(2))
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
    })

    describe('Closed', () => {
      it('closes and restores input to selected display text', () => {
        const model = {
          ...openModel(),
          inputValue: 'app',
          maybeSelectedItem: Option.some('apple'),
          maybeSelectedDisplayText: Option.some('Apple'),
        }
        const [result] = update(model, Closed())
        expect(result.isOpen).toBe(false)
        expect(result.inputValue).toBe('Apple')
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
        expect(result.maybeLastPointerPosition).toStrictEqual(Option.none())
      })

      it('closes with nullable and empty input clears selection', () => {
        const model = {
          ...openModel(),
          nullable: true,
          inputValue: '',
          maybeSelectedItem: Option.some('apple'),
          maybeSelectedDisplayText: Option.some('Apple'),
        }
        const [result] = update(model, Closed())
        expect(result.isOpen).toBe(false)
        expect(result.inputValue).toBe('')
        expect(result.maybeSelectedItem).toStrictEqual(Option.none())
        expect(result.maybeSelectedDisplayText).toStrictEqual(Option.none())
      })

      it('returns focus-input and close commands', () => {
        const model = openModel()
        const [, commands] = update(model, Closed())
        expect(commands).toHaveLength(1)
      })
    })

    describe('ClosedByTab', () => {
      it('closes without focus command', () => {
        const model = openModel()
        const [result, commands] = update(model, ClosedByTab())
        expect(result.isOpen).toBe(false)
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
        expect(result.maybeLastPointerPosition).toStrictEqual(Option.none())
        expect(commands).toHaveLength(0)
      })

      it('restores input value', () => {
        const model = {
          ...openModel(),
          inputValue: 'app',
          maybeSelectedDisplayText: Option.some('Apple'),
        }
        const [result] = update(model, ClosedByTab())
        expect(result.inputValue).toBe('Apple')
      })
    })

    describe('ActivatedItem', () => {
      it('sets the active item index', () => {
        const model = openModel()
        const [result] = update(
          model,
          ActivatedItem({
            index: 3,
            activationTrigger: 'Keyboard',
            maybeImmediateSelection: Option.none(),
          }),
        )
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(3))
      })

      it('replaces previous active item', () => {
        const model = openModel()
        const [intermediate] = update(
          model,
          ActivatedItem({
            index: 1,
            activationTrigger: 'Keyboard',
            maybeImmediateSelection: Option.none(),
          }),
        )
        const [result] = update(
          intermediate,
          ActivatedItem({
            index: 4,
            activationTrigger: 'Keyboard',
            maybeImmediateSelection: Option.none(),
          }),
        )
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(4))
      })

      it('stores activation trigger', () => {
        const model = openModel()
        const [result] = update(
          model,
          ActivatedItem({
            index: 1,
            activationTrigger: 'Pointer',
            maybeImmediateSelection: Option.none(),
          }),
        )
        expect(result.activationTrigger).toBe('Pointer')
      })

      it('returns scroll command for keyboard activation', () => {
        const model = openModel()
        const [, commands] = update(
          model,
          ActivatedItem({
            index: 2,
            activationTrigger: 'Keyboard',
            maybeImmediateSelection: Option.none(),
          }),
        )
        expect(commands).toHaveLength(1)
      })

      it('returns no commands for pointer activation', () => {
        const model = openModel()
        const [, commands] = update(
          model,
          ActivatedItem({
            index: 2,
            activationTrigger: 'Pointer',
            maybeImmediateSelection: Option.none(),
          }),
        )
        expect(commands).toHaveLength(0)
      })

      it('applies immediate selection when maybeImmediateSelection is Some', () => {
        const model = openModel()
        const [result] = update(
          model,
          ActivatedItem({
            index: 1,
            activationTrigger: 'Keyboard',
            maybeImmediateSelection: Option.some({
              item: 'banana',
              displayText: 'Banana',
            }),
          }),
        )
        expect(result.maybeSelectedItem).toStrictEqual(Option.some('banana'))
        expect(result.maybeSelectedDisplayText).toStrictEqual(
          Option.some('Banana'),
        )
        expect(result.isOpen).toBe(true)
      })
    })

    describe('DeactivatedItem', () => {
      it('clears active item when pointer-activated', () => {
        const model = openModel()
        const [afterPointer] = update(
          model,
          ActivatedItem({
            index: 1,
            activationTrigger: 'Pointer',
            maybeImmediateSelection: Option.none(),
          }),
        )
        const [result, commands] = update(afterPointer, DeactivatedItem())
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
        expect(commands).toHaveLength(0)
      })

      it('preserves active item when keyboard-activated', () => {
        const model = openModel()
        const [afterKeyboard] = update(
          model,
          ActivatedItem({
            index: 2,
            activationTrigger: 'Keyboard',
            maybeImmediateSelection: Option.none(),
          }),
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

      it('skips when position is same', () => {
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

      it('updates position when different', () => {
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
    })

    describe('SelectedItem', () => {
      it('sets selected item and display text, closes', () => {
        const model = openModel()
        const [result] = update(
          model,
          SelectedItem({ item: 'apple', displayText: 'Apple' }),
        )
        expect(result.maybeSelectedItem).toStrictEqual(Option.some('apple'))
        expect(result.maybeSelectedDisplayText).toStrictEqual(
          Option.some('Apple'),
        )
        expect(result.inputValue).toBe('Apple')
        expect(result.isOpen).toBe(false)
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
      })

      it('clears selection when nullable and already selected', () => {
        const model = {
          ...openModel(),
          nullable: true,
          maybeSelectedItem: Option.some('apple'),
          maybeSelectedDisplayText: Option.some('Apple'),
        }
        const [result] = update(
          model,
          SelectedItem({ item: 'apple', displayText: 'Apple' }),
        )
        expect(result.maybeSelectedItem).toStrictEqual(Option.none())
        expect(result.maybeSelectedDisplayText).toStrictEqual(Option.none())
        expect(result.inputValue).toBe('')
        expect(result.isOpen).toBe(false)
      })

      it('returns focus-input command', () => {
        const model = openModel()
        const [, commands] = update(
          model,
          SelectedItem({ item: 'apple', displayText: 'Apple' }),
        )
        expect(commands).toHaveLength(1)
      })
    })

    describe('RequestedItemClick', () => {
      it('returns click element command', () => {
        const model = openModel()
        const [result, commands] = update(
          model,
          RequestedItemClick({ index: 2 }),
        )
        expect(result).toBe(model)
        expect(commands).toHaveLength(1)
      })
    })

    describe('UpdatedInputValue', () => {
      it('sets input value and activates first item when open', () => {
        const model = openModel()
        const [result, commands] = update(
          model,
          UpdatedInputValue({ value: 'app' }),
        )
        expect(result.inputValue).toBe('app')
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(0))
        expect(result.activationTrigger).toBe('Keyboard')
        expect(result.isOpen).toBe(true)
        expect(commands).toHaveLength(0)
      })

      it('opens combobox when closed and typing', () => {
        const model = closedModel()
        const [result] = update(model, UpdatedInputValue({ value: 'b' }))
        expect(result.isOpen).toBe(true)
        expect(result.inputValue).toBe('b')
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(0))
        expect(result.activationTrigger).toBe('Keyboard')
      })
    })

    describe('PressedToggleButton', () => {
      it('opens when closed', () => {
        const model = closedModel()
        const [result, commands] = update(model, PressedToggleButton())
        expect(result.isOpen).toBe(true)
        expect(result.activationTrigger).toBe('Pointer')
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
        expect(commands).toHaveLength(1)
      })

      it('closes when open', () => {
        const model = openModel()
        const [result, commands] = update(model, PressedToggleButton())
        expect(result.isOpen).toBe(false)
        expect(commands).toHaveLength(1)
      })
    })

    describe('CompletedInputFocus', () => {
      it('returns model unchanged', () => {
        const model = openModel()
        const [result, commands] = update(model, CompletedInputFocus())
        expect(result).toBe(model)
        expect(commands).toHaveLength(0)
      })
    })

    describe('transitions', () => {
      describe('enter flow', () => {
        it('sets EnterStart and emits nextFrame on Opened', () => {
          const model = closedAnimatedModel()
          const [result, commands] = update(
            model,
            Opened({ maybeActiveItemIndex: Option.some(0) }),
          )
          expect(result.isOpen).toBe(true)
          expect(result.transitionState).toBe('EnterStart')
          expect(commands).toHaveLength(1)
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
            SelectedItem({ item: 'apple', displayText: 'Apple' }),
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
          const [result] = update(
            model,
            Opened({ maybeActiveItemIndex: Option.some(0) }),
          )
          expect(result.transitionState).toBe('Idle')
        })

        it('keeps transitionState Idle on Closed', () => {
          const model = openModel()
          const [result] = update(model, Closed())
          expect(result.transitionState).toBe('Idle')
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

      describe('DetectedInputMovement', () => {
        it('cancels leave animation by setting transitionState to Idle', () => {
          const model = openAnimatedModel()
          const [closed] = update(model, Closed())
          const [leaveAnimating] = update(closed, AdvancedTransitionFrame())
          expect(leaveAnimating.transitionState).toBe('LeaveAnimating')

          const [result, commands] = update(
            leaveAnimating,
            DetectedInputMovement(),
          )
          expect(result.transitionState).toBe('Idle')
          expect(commands).toHaveLength(0)
        })

        it('is a no-op during Idle', () => {
          const model = openModel()
          expect(model.transitionState).toBe('Idle')

          const [result, commands] = update(model, DetectedInputMovement())
          expect(result).toBe(model)
          expect(commands).toHaveLength(0)
        })

        it('is a no-op during EnterAnimating', () => {
          const model = openAnimatedModel()
          const [enterAnimating] = update(model, AdvancedTransitionFrame())
          expect(enterAnimating.transitionState).toBe('EnterAnimating')

          const [result, commands] = update(
            enterAnimating,
            DetectedInputMovement(),
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
      expect(commands).toHaveLength(2)
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
      const [, commands] = update(
        model,
        SelectedItem({ item: 'apple', displayText: 'Apple' }),
      )
      expect(commands).toHaveLength(3)
    })

    it('does not emit modal commands when isModal is false', () => {
      const model = closedModel()
      const [, openCommands] = update(
        model,
        Opened({ maybeActiveItemIndex: Option.some(0) }),
      )
      expect(openCommands).toHaveLength(0)

      const open = openModel()
      const [, closeCommands] = update(open, Closed())
      expect(closeCommands).toHaveLength(1)

      const [, tabCommands] = update(open, ClosedByTab())
      expect(tabCommands).toHaveLength(0)

      const [, selectCommands] = update(
        open,
        SelectedItem({ item: 'apple', displayText: 'Apple' }),
      )
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
        className: 'item',
        content: Effect.succeed(null),
      }),
      itemToValue: item => item,
      itemToDisplayText: item => item,
      inputClassName: 'input',
      itemsClassName: 'items',
      backdropClassName: 'backdrop',
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

    const findInputElement = (vnode: VNode): VNode | undefined => {
      const inputWrapper = (vnode.children as ReadonlyArray<VNode>)?.[0]
      return (inputWrapper?.children as ReadonlyArray<VNode>)?.find(
        (child): child is VNode =>
          typeof child !== 'string' && child.sel === 'input',
      )
    }

    it('renders input with role="combobox" when closed', () => {
      const model = closedModel()
      const config = baseViewConfig(model)
      const vnode = renderView(config)
      const inputElement = findInputElement(vnode)

      expect(inputElement?.data?.attrs?.['role']).toBe('combobox')
    })

    it('renders items container with role="listbox" when open', () => {
      const model = openModel()
      const config = baseViewConfig(model)
      const vnode = renderView(config)
      const itemsContainer = findChildByKey(vnode, 'test-items-container')

      expect(itemsContainer?.data?.attrs?.['role']).toBe('listbox')
    })

    it('shows items when open', () => {
      const model = openModel()
      const config = baseViewConfig(model)
      const vnode = renderView(config)
      const itemsContainer = findChildByKey(vnode, 'test-items-container')

      expect(itemsContainer).toBeDefined()
      const items = findAllByKey(itemsContainer!, 'test-item-')
      expect(items).toHaveLength(2)
    })

    it('hides items when closed', () => {
      const model = closedModel()
      const config = baseViewConfig(model)
      const vnode = renderView(config)
      const itemsContainer = findChildByKey(vnode, 'test-items-container')

      expect(itemsContainer).toBeUndefined()
    })

    it('marks selected item with data-selected', () => {
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

    it('marks active item with data-active', () => {
      const model = {
        ...openModel(),
        maybeActiveItemIndex: Option.some(1),
      }
      const config = baseViewConfig(model)
      const vnode = renderView(config)
      const itemsContainer = findChildByKey(vnode, 'test-items-container')
      const firstItem = findChildByKey(itemsContainer!, 'test-item-0')
      const secondItem = findChildByKey(itemsContainer!, 'test-item-1')

      expect(firstItem?.data?.attrs?.['data-active']).toBeUndefined()
      expect(secondItem?.data?.attrs?.['data-active']).toBe('')
    })

    it('renders hidden inputs when formName set', () => {
      const model = {
        ...closedModel(),
        maybeSelectedItem: Option.some('Apple'),
      }
      const config = {
        ...baseViewConfig(model),
        formName: 'fruit',
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
      expect(hiddenInput?.data?.props?.['value']).toBe('Apple')
    })

    it('renders empty hidden input when no selection and formName set', () => {
      const model = closedModel()
      const config = {
        ...baseViewConfig(model),
        formName: 'fruit',
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
      expect(hiddenInput?.data?.props?.['value']).toBeUndefined()
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

    it('items container has no aria-multiselectable', () => {
      const model = openModel()
      const config = baseViewConfig(model)
      const vnode = renderView(config)
      const itemsContainer = findChildByKey(vnode, 'test-items-container')

      expect(
        itemsContainer?.data?.attrs?.['aria-multiselectable'],
      ).toBeUndefined()
    })

    it('input has aria-expanded when open', () => {
      const model = openModel()
      const config = baseViewConfig(model)
      const vnode = renderView(config)
      const inputElement = findInputElement(vnode)

      expect(inputElement?.data?.attrs?.['aria-expanded']).toBe('true')
    })

    it('input has aria-expanded false when closed', () => {
      const model = closedModel()
      const config = baseViewConfig(model)
      const vnode = renderView(config)
      const inputElement = findInputElement(vnode)

      expect(inputElement?.data?.attrs?.['aria-expanded']).toBe('false')
    })

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

    it('no hidden input when formName is not provided', () => {
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

      it('does not add positioning styles when anchor is absent', () => {
        const model = openModel()
        const config = baseViewConfig(model)
        const vnode = renderView(config)
        const itemsContainer = findChildByKey(vnode, 'test-items-container')

        expect(itemsContainer?.data?.style).toBeUndefined()
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
              className: 'item',
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
              className: 'item',
              content: Effect.succeed(null),
            }
          },
        }
        renderView(config)

        expect(contexts[1]?.isSelected).toBe(false)
      })
    })
  })
})
