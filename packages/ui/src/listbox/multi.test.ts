import { Effect, Option } from 'effect'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { it as baseIt, expect } from 'vitest'

import { describe } from '@effect/vitest'

import { makeInitialModel } from '../animation/schema.js'
import { block } from './multi.js'
import type { Model, ViewInputs } from './multi.js'
import {
  AnchorListbox,
  FocusListboxItems,
  Message,
  OutMessage,
  PortalListboxBackdrop,
  ScrollListboxItemIntoView,
  buttonId,
  makeView,
} from './shared.js'

const view = makeView<Model>({ ariaMultiSelectable: true })<string, string>()

type TestHtmlBuilder = Parameters<typeof view>[2]

const acknowledgeAnchor = Scene.Mount.resolve(
  AnchorListbox,
  Message.CompletedAnchorListbox(),
)
const acknowledgeBackdrop = Scene.Mount.resolve(
  PortalListboxBackdrop,
  Message.CompletedPortalListboxBackdrop(),
)

type ListboxOperations = Pick<
  Effect.Success<typeof block.get>,
  'init' | 'update' | 'operations'
>

const makeFixture = (listbox: ListboxOperations) => {
  const { init, update } = listbox
  const givenClosed = Story.given(init({ id: 'test' }).model)

  const givenOpenMulti = Story.steps(
    givenClosed,
    Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
    Story.Command.resolve(
      FocusListboxItems,
      Message.CompletedFocusListboxItems(),
    ),
  )

  const closedModel = () => init({ id: 'test' }).model

  const openMultiModel = (): Model =>
    update(
      closedModel(),
      Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
    ).model

  return {
    init,
    update,
    givenClosed,
    givenOpenMulti,
    closedModel,
    openMultiModel,
  }
}

const it = baseIt.extend<{ listbox: ReturnType<typeof makeFixture> }>({
  listbox: async ({}, use) =>
    Effect.runPromise(
      Story.withBlock(block, listbox =>
        Effect.promise(() => use(makeFixture(listbox))),
      ),
    ),
})

describe('Listbox.Multi', () => {
  describe('init', () => {
    it('defaults to closed with no active item', ({ listbox: { init } }) => {
      expect(init({ id: 'test' }).model).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        isModal: false,
        orientation: 'Vertical',
        animation: makeInitialModel({ id: 'test-listbox' }),
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
      it('emits Selected with the item value', ({
        listbox: { update, givenOpenMulti },
      }) => {
        Story.story(
          update,
          givenOpenMulti,
          Story.message(Message.SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
        )
      })

      it('stays open after selection', ({
        listbox: { update, givenOpenMulti },
      }) => {
        Story.story(
          update,
          givenOpenMulti,
          Story.message(Message.SelectedItem({ item: 'apple' })),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('emits Selected again when the same item is activated (parent toggles off)', ({
        listbox: { update, givenOpenMulti },
      }) => {
        Story.story(
          update,
          givenOpenMulti,
          Story.message(Message.SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
          Story.message(Message.SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
        )
      })

      it('emits Selected for each activated item', ({
        listbox: { update, givenOpenMulti },
      }) => {
        Story.story(
          update,
          givenOpenMulti,
          Story.message(Message.SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
          Story.message(Message.SelectedItem({ item: 'banana' })),
          Story.expectOutMessage(OutMessage.Selected({ value: 'banana' })),
        )
      })

      it('preserves active item after selection', ({
        listbox: { update, givenOpenMulti },
      }) => {
        Story.story(
          update,
          givenOpenMulti,
          Story.message(
            Message.ActivatedItem({ index: 2, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(
            ScrollListboxItemIntoView,
            Message.CompletedScrollListboxItemIntoView(),
          ),
          Story.message(Message.SelectedItem({ item: 'apple' })),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })
    })
  })

  describe('view', () => {
    const sceneView =
      (
        overrides: Omit<
          Partial<ViewInputs<string>>,
          'items' | 'itemToConfig' | 'buttonContent'
        > = {},
      ) =>
      (model: Model, h: TestHtmlBuilder) =>
        view(
          model,
          {
            items: ['Apple', 'Banana'],
            itemToConfig: () => ({
              content: null,
            }),
            buttonContent: null,
            selectedValues: [],
            ...overrides,
          },
          h,
        )

    describe('aria-multiselectable', () => {
      it('items container has aria-multiselectable', ({
        listbox: { update, openMultiModel },
      }) => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(openMultiModel()),
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

    describe('read-only', () => {
      const itemsContainer = Scene.selector('#test-items')
      const item = (index: number) => Scene.selector(`#test-item-${index}`)

      it('emits aria-readonly alongside aria-multiselectable', ({
        listbox: { update, openMultiModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ isReadOnly: true }) },
          Scene.given(openMultiModel()),
          Scene.expect(itemsContainer).toHaveAttr(
            'aria-multiselectable',
            'true',
          ),
          Scene.expect(itemsContainer).toHaveAttr('aria-readonly', 'true'),
          Scene.expect(itemsContainer).toHaveAttr('data-readonly', ''),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('drops the item click handler so membership cannot be toggled', ({
        listbox: { update, openMultiModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({ isReadOnly: true, selectedValues: ['Apple'] }),
          },
          Scene.given(openMultiModel()),
          Scene.expect(item(0)).not.toHaveHandler('click'),
          Scene.expect(item(1)).not.toHaveHandler('click'),
          Scene.expect(item(0)).toHaveAttr('aria-selected', 'true'),
          Scene.expect(item(1)).toHaveAttr('aria-selected', 'false'),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })

      it('does not commit the active item on Enter', ({
        listbox: { update, openMultiModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ isReadOnly: true }) },
          Scene.given(openMultiModel()),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(itemsContainer, 'Enter'),
          Scene.expectNoOutMessage(),
          Scene.Command.expectNone(),
          Scene.expect(itemsContainer).toExist(),
        )
      })
    })

    describe('button labeling', () => {
      it('no aria-label or aria-labelledby on the trigger by default', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const button = Scene.find(html, '[key="test-button"]')
            expect(button).not.toHaveAttr('aria-label')
            expect(button).not.toHaveAttr('aria-labelledby')
          }),
        )
      })

      it('applies aria-label to the trigger when ariaLabel is provided', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ ariaLabel: 'Fruit' }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const button = Scene.find(html, '[key="test-button"]')
            expect(button).toHaveAttr('aria-label', 'Fruit')
            expect(button).not.toHaveAttr('aria-labelledby')
          }),
        )
      })

      it('applies aria-labelledby to the trigger when ariaLabelledBy is provided', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ ariaLabelledBy: 'fruit-label' }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const button = Scene.find(html, '[key="test-button"]')
            expect(button).toHaveAttr('aria-labelledby', 'fruit-label')
            expect(button).not.toHaveAttr('aria-label')
          }),
        )
      })

      it('prefers aria-label over aria-labelledby when both are provided', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({
              ariaLabel: 'Fruit',
              ariaLabelledBy: 'fruit-label',
            }),
          },
          Scene.given(closedModel()),
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
      it('multiple items have data-selected', ({
        listbox: { update, openMultiModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({ selectedValues: ['Apple', 'Banana'] }),
          },
          Scene.given(openMultiModel()),
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
      it('renders multiple hidden inputs for multi-select', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          {
            update,
            view: sceneView({
              name: 'fruit',
              selectedValues: ['Apple', 'Banana'],
            }),
          },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const inputs = Scene.findAll(html, 'input[type="hidden"]')
            expect(inputs).toHaveLength(2)
            expect(Scene.find(html, 'input[value="Apple"]')).toExist()
            expect(Scene.find(html, 'input[value="Banana"]')).toExist()
          }),
        )
      })

      it('renders empty hidden input when no items selected', ({
        listbox: { update, closedModel },
      }) => {
        Scene.scene(
          { update, view: sceneView({ name: 'fruit' }) },
          Scene.given(closedModel()),
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
