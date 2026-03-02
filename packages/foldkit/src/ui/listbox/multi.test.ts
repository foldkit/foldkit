import { describe, it } from '@effect/vitest'
import { Effect, Option, Predicate } from 'effect'
import type { VNode } from 'snabbdom'
import { expect } from 'vitest'

import { Dispatch } from '../../runtime'
import { noOpDispatch } from '../../runtime/errorUI'
import { init, update, view } from './multi'
import type { Model, ViewConfig } from './multi'
import { ActivatedItem, Opened, SelectedItem } from './shared'

const closedModel = () => init({ id: 'test' })

const openMultiModel = () => {
  const model = init({ id: 'test' })
  const [result] = update(
    model,
    Opened({ maybeActiveItemIndex: Option.some(0) }),
  )
  return result
}

describe('Listbox.Multi', () => {
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
        selectedItems: [],
        maybeLastPointerPosition: Option.none(),
        maybeLastButtonPointerType: Option.none(),
      })
    })

    it('accepts selectedItems option', () => {
      const model = init({
        id: 'test',
        selectedItems: ['apple', 'banana'],
      })
      expect(model.selectedItems).toStrictEqual(['apple', 'banana'])
    })

    it('defaults selectedItems to empty', () => {
      const model = init({ id: 'test' })
      expect(model.selectedItems).toStrictEqual([])
    })
  })

  describe('update', () => {
    describe('SelectedItem (multiple)', () => {
      it('adds item to selectedItems', () => {
        const model = openMultiModel()
        const [result] = update(model, SelectedItem({ item: 'apple' }))
        expect(result.selectedItems).toStrictEqual(['apple'])
      })

      it('stays open after selection', () => {
        const model = openMultiModel()
        const [result] = update(model, SelectedItem({ item: 'apple' }))
        expect(result.isOpen).toBe(true)
      })

      it('returns no commands', () => {
        const model = openMultiModel()
        const [, commands] = update(model, SelectedItem({ item: 'apple' }))
        expect(commands).toHaveLength(0)
      })

      it('toggles item off when already selected', () => {
        const model = openMultiModel()
        const [afterFirst] = update(model, SelectedItem({ item: 'apple' }))
        const [afterSecond] = update(
          afterFirst,
          SelectedItem({ item: 'apple' }),
        )
        expect(afterSecond.selectedItems).toStrictEqual([])
      })

      it('accumulates multiple selections', () => {
        const model = openMultiModel()
        const [afterFirst] = update(model, SelectedItem({ item: 'apple' }))
        const [afterSecond] = update(
          afterFirst,
          SelectedItem({ item: 'banana' }),
        )
        expect(afterSecond.selectedItems).toStrictEqual(['apple', 'banana'])
      })

      it('preserves active item after selection', () => {
        const model = openMultiModel()
        const [afterActivate] = update(
          model,
          ActivatedItem({ index: 2, activationTrigger: 'Keyboard' }),
        )
        const [afterSelect] = update(
          afterActivate,
          SelectedItem({ item: 'apple' }),
        )
        expect(afterSelect.maybeActiveItemIndex).toStrictEqual(Option.some(2))
      })
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
      buttonContent: Effect.succeed(null),
      buttonClassName: 'button',
      itemsClassName: 'items',
      backdropClassName: 'backdrop',
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

    describe('aria-multiselectable', () => {
      it('items container has aria-multiselectable', () => {
        const model = openMultiModel()
        const config = baseViewConfig(model)
        const vnode = renderView(config)
        const itemsContainer = findChildByKey(vnode, 'test-items-container')

        expect(itemsContainer?.data?.attrs?.['aria-multiselectable']).toBe(
          'true',
        )
      })
    })

    describe('multiple data-selected', () => {
      it('multiple items have data-selected', () => {
        const model = {
          ...openMultiModel(),
          selectedItems: ['Apple', 'Banana'],
        }
        const config = baseViewConfig(model)
        const vnode = renderView(config)
        const itemsContainer = findChildByKey(vnode, 'test-items-container')
        const firstItem = findChildByKey(itemsContainer!, 'test-item-0')
        const secondItem = findChildByKey(itemsContainer!, 'test-item-1')

        expect(firstItem?.data?.attrs?.['data-selected']).toBe('')
        expect(secondItem?.data?.attrs?.['data-selected']).toBe('')
      })
    })

    describe('form integration', () => {
      it('renders multiple hidden inputs for multi-select', () => {
        const model = {
          ...closedModel(),
          selectedItems: ['Apple', 'Banana'],
        }
        const config = {
          ...baseViewConfig(model),
          name: 'fruit',
        }
        const vnode = renderView(config)
        const children = vnode.children as ReadonlyArray<VNode>
        const inputs = children.filter(
          (child): child is VNode =>
            typeof child !== 'string' && child.sel === 'input',
        )

        expect(inputs).toHaveLength(2)
        expect(inputs[0]?.data?.props?.['value']).toBe('Apple')
        expect(inputs[1]?.data?.props?.['value']).toBe('Banana')
      })

      it('renders empty hidden input when no items selected', () => {
        const model = closedModel()
        const config = {
          ...baseViewConfig(model),
          name: 'fruit',
        }
        const vnode = renderView(config)
        const children = vnode.children as ReadonlyArray<VNode>
        const inputs = children.filter(
          (child): child is VNode =>
            typeof child !== 'string' && child.sel === 'input',
        )

        expect(inputs).toHaveLength(1)
        expect(inputs[0]?.data?.props?.['value']).toBeUndefined()
      })
    })
  })
})
