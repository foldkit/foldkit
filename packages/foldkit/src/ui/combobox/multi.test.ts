import { describe, it } from '@effect/vitest'
import { Effect, Option, Predicate, flow } from 'effect'
import type { VNode } from 'snabbdom'
import { expect } from 'vitest'

import { Dispatch } from '../../runtime'
import { noOpDispatch } from '../../runtime/crashUI'
import * as Test from '../../test'
import { init, update, view } from './multi'
import type { Model, ViewConfig } from './multi'
import {
  ActivatedItem,
  Closed,
  CompletedFocusInput,
  CompletedScrollIntoView,
  FocusInput,
  Opened,
  ScrollIntoView,
  SelectedItem,
} from './shared'

const withClosed = Test.with(init({ id: 'test' }))

const withOpenMulti = flow(
  withClosed,
  Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
)

describe('Combobox.Multi', () => {
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
        selectedItems: [],
        maybeLastPointerPosition: Option.none(),
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
        Test.story(
          update,
          withOpenMulti,
          Test.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Test.tap(({ model }) => {
            expect(model.selectedItems).toStrictEqual(['apple'])
          }),
        )
      })

      it('stays open after selection', () => {
        Test.story(
          update,
          withOpenMulti,
          Test.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('toggles item off when already selected', () => {
        Test.story(
          update,
          withOpenMulti,
          Test.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Test.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Test.tap(({ model }) => {
            expect(model.selectedItems).toStrictEqual([])
          }),
        )
      })

      it('accumulates multiple selections', () => {
        Test.story(
          update,
          withOpenMulti,
          Test.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Test.message(SelectedItem({ item: 'banana', displayText: 'Banana' })),
          Test.tap(({ model }) => {
            expect(model.selectedItems).toStrictEqual(['apple', 'banana'])
          }),
        )
      })

      it('preserves active item after selection', () => {
        Test.story(
          update,
          withOpenMulti,
          Test.message(
            ActivatedItem({
              index: 2,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Test.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Test.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Test.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })
    })

    describe('handleClose with nullable', () => {
      it('clears selectedItems when nullable and input empty', () => {
        Test.story(
          update,
          Test.with(init({ id: 'test', nullable: true })),
          Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Test.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Test.message(Closed()),
          Test.resolve(FocusInput, CompletedFocusInput()),
          Test.tap(({ model }) => {
            expect(model.selectedItems).toStrictEqual([])
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('handleImmediateActivation', () => {
      it('toggles item in selectedItems', () => {
        Test.story(
          update,
          Test.with(init({ id: 'test', immediate: true })),
          Test.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Test.message(
            ActivatedItem({
              index: 0,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.some({
                item: 'apple',
                displayText: 'Apple',
              }),
            }),
          ),
          Test.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Test.tap(({ model }) => {
            expect(model.selectedItems).toStrictEqual(['apple'])
          }),
          Test.message(
            ActivatedItem({
              index: 0,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.some({
                item: 'apple',
                displayText: 'Apple',
              }),
            }),
          ),
          Test.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Test.tap(({ model }) => {
            expect(model.selectedItems).toStrictEqual([])
          }),
        )
      })
    })
  })

  describe('view', () => {
    type TestMessage = string

    const closedModel = () => init({ id: 'test' })

    const openMultiModel = (): Model => {
      let model!: Model
      Test.story(
        update,
        withOpenMulti,
        Test.tap(simulation => {
          model = simulation.model
        }),
      )
      return model
    }

    const baseViewConfig = (model: Model): ViewConfig<TestMessage, string> => ({
      model,
      toMessage: message => message._tag,
      items: ['Apple', 'Banana'],
      itemToConfig: () => ({
        content: Effect.succeed(null),
      }),
      itemToValue: item => item,
      itemToDisplayText: item => item,
    })

    const renderView = <Item extends string>(
      config: ViewConfig<TestMessage, Item>,
    ): VNode => {
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
        const vnode = renderView(baseViewConfig(openMultiModel()))
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
        const vnode = renderView(baseViewConfig(model))
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
          formName: 'fruit',
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
          formName: 'fruit',
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
