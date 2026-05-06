import { describe, it } from '@effect/vitest'
import { Effect, Option, flow } from 'effect'
import { expect } from 'vitest'

import * as Scene from '../../test/scene.js'
import * as Story from '../../test/story.js'
import * as Animation from '../animation/index.js'
import { init, update, view } from './multi.js'
import type { Model, ViewConfig } from './multi.js'
import type { Message } from './shared.js'
import {
  ActivatedItem,
  CompletedFocusItems,
  CompletedPortalListboxBackdrop,
  CompletedScrollIntoView,
  FocusItems,
  Opened,
  PortalListboxBackdrop,
  ScrollIntoView,
  SelectedItem,
} from './shared.js'

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
    it('defaults to closed with no active item and no selection', () => {
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
        Story.story(
          update,
          withOpenMulti,
          Story.message(SelectedItem({ item: 'apple' })),
          Story.model(model => {
            expect(model.selectedItems).toStrictEqual(['apple'])
          }),
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

      it('toggles item off when already selected', () => {
        Story.story(
          update,
          withOpenMulti,
          Story.message(SelectedItem({ item: 'apple' })),
          Story.message(SelectedItem({ item: 'apple' })),
          Story.model(model => {
            expect(model.selectedItems).toStrictEqual([])
          }),
        )
      })

      it('accumulates multiple selections', () => {
        Story.story(
          update,
          withOpenMulti,
          Story.message(SelectedItem({ item: 'apple' })),
          Story.message(SelectedItem({ item: 'banana' })),
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
          buttonContent: Effect.succeed(null),
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
          { update, view: sceneView({ name: 'fruit' }) },
          Scene.with(model),
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
