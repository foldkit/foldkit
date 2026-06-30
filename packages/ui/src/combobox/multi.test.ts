import { Option, flow } from 'effect'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/index.js'
import { create, init, update } from './multi.js'
import type { Model, ViewInputs } from './multi.js'
import {
  ActivatedItem,
  AnchorCombobox,
  Closed,
  CompletedAnchorCombobox,
  CompletedFocusInput,
  CompletedPortalComboboxBackdrop,
  CompletedScrollIntoView,
  FocusInput,
  Opened,
  PortalComboboxBackdrop,
  ScrollIntoView,
  SelectedItem,
  inputId,
} from './shared.js'

const TestCombobox = create<string>()
const view = TestCombobox.view

const acknowledgeAnchor = Scene.Mount.resolve(
  AnchorCombobox,
  CompletedAnchorCombobox(),
)
const acknowledgeBackdrop = Scene.Mount.resolve(
  PortalComboboxBackdrop,
  CompletedPortalComboboxBackdrop(),
)

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
        animation: Animation.init({ id: 'test-items' }),
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
          Story.model(model => {
            expect(model.selectedItems).toStrictEqual(['apple'])
          }),
        )
      })

      it('stays open after selection', () => {
        Story.story(
          update,
          withOpenMulti,
          Story.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Story.model(model => {
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
          Story.model(model => {
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
          Story.model(model => {
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
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.message(SelectedItem({ item: 'apple', displayText: 'Apple' })),
          Story.model(model => {
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
          Story.Command.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
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
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.model(model => {
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
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.model(model => {
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
        Story.model(extractedModel => {
          model = extractedModel
        }),
      )
      return model
    }

    const sceneView =
      (
        overrides: Omit<
          Partial<ViewInputs<string>>,
          'items' | 'itemToConfig' | 'itemToValue' | 'itemToDisplayText'
        > = {},
      ) =>
      (model: Model) =>
        view(model, {
          items: ['Apple', 'Banana'],
          itemToConfig: () => ({
            content: null,
          }),
          itemToValue: item => item,
          itemToDisplayText: item => item,
          ...overrides,
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
          acknowledgeAnchor,
          acknowledgeBackdrop,
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
          acknowledgeAnchor,
          acknowledgeBackdrop,
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

    describe('input labeling', () => {
      it('no aria-label or aria-labelledby on the input by default', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.with(closedModel()),
          Scene.tap(({ html }) => {
            const input = Scene.find(html, 'input[role="combobox"]')
            expect(input).not.toHaveAttr('aria-label')
            expect(input).not.toHaveAttr('aria-labelledby')
          }),
        )
      })

      it('applies aria-label to the input when ariaLabel is provided', () => {
        Scene.scene(
          { update, view: sceneView({ ariaLabel: 'Fruit' }) },
          Scene.with(closedModel()),
          Scene.tap(({ html }) => {
            const input = Scene.find(html, 'input[role="combobox"]')
            expect(input).toHaveAttr('aria-label', 'Fruit')
            expect(input).not.toHaveAttr('aria-labelledby')
          }),
        )
      })

      it('applies aria-labelledby to the input when ariaLabelledBy is provided', () => {
        Scene.scene(
          { update, view: sceneView({ ariaLabelledBy: 'fruit-label' }) },
          Scene.with(closedModel()),
          Scene.tap(({ html }) => {
            const input = Scene.find(html, 'input[role="combobox"]')
            expect(input).toHaveAttr('aria-labelledby', 'fruit-label')
            expect(input).not.toHaveAttr('aria-label')
          }),
        )
      })

      it('prefers aria-label over aria-labelledby when both are provided', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              ariaLabel: 'Fruit',
              ariaLabelledBy: 'fruit-label',
            }),
          },
          Scene.with(closedModel()),
          Scene.tap(({ html }) => {
            const input = Scene.find(html, 'input[role="combobox"]')
            expect(input).toHaveAttr('aria-label', 'Fruit')
            expect(input).not.toHaveAttr('aria-labelledby')
          }),
        )
      })

      it('inputId derives the input id from the base id', () => {
        expect(inputId('test')).toBe('test-input')
      })
    })
  })

  describe('reflectSelectedItems', () => {
    it('reflects a selection set onto the model without emitting', () => {
      const next = TestCombobox.reflectSelectedItems(init({ id: 'test' }), [
        'a',
        'b',
      ])
      expect(next.selectedItems).toStrictEqual(['a', 'b'])
    })
  })
})
