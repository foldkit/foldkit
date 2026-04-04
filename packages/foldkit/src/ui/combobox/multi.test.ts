import { describe, it } from '@effect/vitest'
import { Effect, Option, flow } from 'effect'
import { expect } from 'vitest'

import * as Scene from '../../test/scene'
import * as Story from '../../test/story'
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
import type { Message } from './shared'

const withClosed = Story.with(init({ id: 'test' }))

const withOpenMulti = flow(
  withClosed,
  Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
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
        Story.story(
          update,
          withOpenMulti,
          Story.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Story.tap(({ model }) => {
            expect(model.selectedItems).toStrictEqual(['apple'])
          }),
        )
      })

      it('stays open after selection', () => {
        Story.story(
          update,
          withOpenMulti,
          Story.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Story.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('toggles item off when already selected', () => {
        Story.story(
          update,
          withOpenMulti,
          Story.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Story.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Story.tap(({ model }) => {
            expect(model.selectedItems).toStrictEqual([])
          }),
        )
      })

      it('accumulates multiple selections', () => {
        Story.story(
          update,
          withOpenMulti,
          Story.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Story.message(
            SelectedItem({ item: 'banana', displayText: 'Banana' }),
          ),
          Story.tap(({ model }) => {
            expect(model.selectedItems).toStrictEqual(['apple', 'banana'])
          }),
        )
      })

      it('preserves active item after selection', () => {
        Story.story(
          update,
          withOpenMulti,
          Story.message(
            ActivatedItem({
              index: 2,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Story.tap(({ model }) => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })
    })

    describe('handleClose with nullable', () => {
      it('clears selectedItems when nullable and input empty', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', nullable: true })),
          Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Story.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Story.message(Closed()),
          Story.resolve(FocusInput, CompletedFocusInput()),
          Story.tap(({ model }) => {
            expect(model.selectedItems).toStrictEqual([])
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('handleImmediateActivation', () => {
      it('toggles item in selectedItems', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', immediate: true })),
          Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Story.message(
            ActivatedItem({
              index: 0,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.some({
                item: 'apple',
                displayText: 'Apple',
              }),
            }),
          ),
          Story.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.tap(({ model }) => {
            expect(model.selectedItems).toStrictEqual(['apple'])
          }),
          Story.message(
            ActivatedItem({
              index: 0,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.some({
                item: 'apple',
                displayText: 'Apple',
              }),
            }),
          ),
          Story.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.tap(({ model }) => {
            expect(model.selectedItems).toStrictEqual([])
          }),
        )
      })
    })
  })

  describe('view', () => {
    const closedModel = () => init({ id: 'test' })

    const openMultiModel = (): Model => {
      let model!: Model
      Story.story(
        update,
        withOpenMulti,
        Story.tap(simulation => {
          model = simulation.model
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
          itemToConfig: () => ({
            content: Effect.succeed(null),
          }),
          itemToValue: item => item,
          itemToDisplayText: item => item,
          ...overrides,
          model,
          toParentMessage: message => message,
        })

    describe('aria-multiselectable', () => {
      it('items container has aria-multiselectable', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.with(openMultiModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-items-container"]')).toHaveAttr(
              'aria-multiselectable',
              'true',
            )
          }),
        )
      })
    })

    describe('multiple data-selected', () => {
      it('multiple items have data-selected', () => {
        const model = {
          ...openMultiModel(),
          selectedItems: ['Apple', 'Banana'],
        }
        Scene.scene(
          { update, view: sceneView() },
          Scene.with(model),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-item-0"]')).toHaveAttr(
              'data-selected',
              '',
            )
            expect(Scene.find(html, '[key="test-item-1"]')).toHaveAttr(
              'data-selected',
              '',
            )
          }),
        )
      })
    })

    describe('form integration', () => {
      it('renders multiple hidden inputs for multi-select', () => {
        const model = {
          ...closedModel(),
          selectedItems: ['Apple', 'Banana'],
        }
        Scene.scene(
          { update, view: sceneView({ formName: 'fruit' }) },
          Scene.with(model),
          Scene.tap(({ html }) => {
            const inputs = Scene.findAll(html, 'input[type="hidden"]')
            expect(inputs).toHaveLength(2)
            expect(Option.some(inputs[0]!)).toHaveAttr('value', 'Apple')
            expect(Option.some(inputs[1]!)).toHaveAttr('value', 'Banana')
          }),
        )
      })

      it('renders empty hidden input when no items selected', () => {
        const model = closedModel()
        Scene.scene(
          { update, view: sceneView({ formName: 'fruit' }) },
          Scene.with(model),
          Scene.tap(({ html }) => {
            const inputs = Scene.findAll(html, 'input[type="hidden"]')
            expect(inputs).toHaveLength(1)
            expect(Scene.find(html, 'input[type="hidden"]')).not.toHaveAttr(
              'value',
            )
          }),
        )
      })
    })
  })
})
