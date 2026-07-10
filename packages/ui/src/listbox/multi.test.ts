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
  AnchorListbox,
  CompletedAnchorListbox,
  CompletedFocusItems,
  CompletedPortalListboxBackdrop,
  CompletedScrollIntoView,
  FocusItems,
  Opened,
  PortalListboxBackdrop,
  ScrollIntoView,
  Selected,
  SelectedItem,
  buttonId,
} from './shared.js'

const TestListbox = create<string>()
const view = TestListbox.view

const acknowledgeAnchor = Scene.Mount.resolve(
  AnchorListbox,
  CompletedAnchorListbox(),
)
const acknowledgeBackdrop = Scene.Mount.resolve(
  PortalListboxBackdrop,
  CompletedPortalListboxBackdrop(),
)

const withClosed = Story.with(init({ id: 'test' }))

const withOpenMulti = flow(
  withClosed,
  Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
  Story.Command.resolve(FocusItems, CompletedFocusItems()),
)

describe('Listbox.Multi', () => {
  describe('init', () => {
    it('defaults to closed with no active item', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        isModal: false,
        orientation: 'Vertical',
        animation: Animation.init({ id: 'test-listbox' }),
        maybeActiveItemIndex: Option.none(),
        activationTrigger: 'Keyboard',
        searchQuery: '',
        searchVersion: 0,
        maybeLastPointerPosition: Option.none(),
        maybeLastButtonPointerType: Option.none(),
      })
    })
  })

  describe('update', () => {
    describe('SelectedItem (multiple)', () => {
      it('emits Selected with the item value', () => {
        Story.story(
          update,
          withOpenMulti,
          Story.message(SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(Selected({ value: 'apple' })),
        )
      })

      it('stays open after selection', () => {
        Story.story(
          update,
          withOpenMulti,
          Story.message(SelectedItem({ item: 'apple' })),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('emits Selected again when the same item is activated (parent toggles off)', () => {
        Story.story(
          update,
          withOpenMulti,
          Story.message(SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(Selected({ value: 'apple' })),
          Story.message(SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(Selected({ value: 'apple' })),
        )
      })

      it('emits Selected for each activated item', () => {
        Story.story(
          update,
          withOpenMulti,
          Story.message(SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(Selected({ value: 'apple' })),
          Story.message(SelectedItem({ item: 'banana' })),
          Story.expectOutMessage(Selected({ value: 'banana' })),
        )
      })

      it('preserves active item after selection', () => {
        Story.story(
          update,
          withOpenMulti,
          Story.message(
            ActivatedItem({ index: 2, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.message(SelectedItem({ item: 'apple' })),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
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
          'items' | 'itemToConfig' | 'buttonContent'
        > = {},
      ) =>
      (model: Model) =>
        view(model, {
          items: ['Apple', 'Banana'],
          itemToConfig: () => ({
            content: null,
          }),
          buttonContent: null,
          selectedValues: [],
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

    describe('button labeling', () => {
      it('no aria-label or aria-labelledby on the trigger by default', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.with(closedModel()),
          Scene.tap(({ html }) => {
            const button = Scene.find(html, '[key="test-button"]')
            expect(button).not.toHaveAttr('aria-label')
            expect(button).not.toHaveAttr('aria-labelledby')
          }),
        )
      })

      it('applies aria-label to the trigger when ariaLabel is provided', () => {
        Scene.scene(
          { update, view: sceneView({ ariaLabel: 'Fruit' }) },
          Scene.with(closedModel()),
          Scene.tap(({ html }) => {
            const button = Scene.find(html, '[key="test-button"]')
            expect(button).toHaveAttr('aria-label', 'Fruit')
            expect(button).not.toHaveAttr('aria-labelledby')
          }),
        )
      })

      it('applies aria-labelledby to the trigger when ariaLabelledBy is provided', () => {
        Scene.scene(
          { update, view: sceneView({ ariaLabelledBy: 'fruit-label' }) },
          Scene.with(closedModel()),
          Scene.tap(({ html }) => {
            const button = Scene.find(html, '[key="test-button"]')
            expect(button).toHaveAttr('aria-labelledby', 'fruit-label')
            expect(button).not.toHaveAttr('aria-label')
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
            const button = Scene.find(html, '[key="test-button"]')
            expect(button).toHaveAttr('aria-label', 'Fruit')
            expect(button).not.toHaveAttr('aria-labelledby')
          }),
        )
      })

      it('buttonId derives the trigger id from the base id', () => {
        expect(buttonId('test')).toBe('test-button')
      })
    })

    describe('multiple data-selected', () => {
      it('multiple items have data-selected', () => {
        Scene.scene(
          {
            update,
            view: sceneView({ selectedValues: ['Apple', 'Banana'] }),
          },
          Scene.with(openMultiModel()),
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
        Scene.scene(
          {
            update,
            view: sceneView({
              name: 'fruit',
              selectedValues: ['Apple', 'Banana'],
            }),
          },
          Scene.with(closedModel()),
          Scene.tap(({ html }) => {
            const inputs = Scene.findAll(html, 'input[type="hidden"]')
            expect(inputs).toHaveLength(2)
            expect(Scene.find(html, 'input[value="Apple"]')).toExist()
            expect(Scene.find(html, 'input[value="Banana"]')).toExist()
          }),
        )
      })

      it('renders empty hidden input when no items selected', () => {
        Scene.scene(
          { update, view: sceneView({ name: 'fruit' }) },
          Scene.with(closedModel()),
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
