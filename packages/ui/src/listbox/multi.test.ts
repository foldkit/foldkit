import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type * as BlockTypes from 'foldkit/block'
import * as Scene from 'foldkit/scene'
import { scene } from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { story } from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { makeBlock } from './multi.js'
import type { InitConfig, Model as ListboxModel, ViewInputs } from './multi.js'
import {
  AnchorListbox,
  FocusListboxItems,
  Message,
  OutMessage,
  PortalListboxBackdrop,
  ScrollListboxItemIntoView,
  buttonId,
} from './shared.js'

type Model = BlockTypes.Resolved<ListboxModel>

const TestListbox = makeBlock()
const testConfig: InitConfig = { id: 'test' }

const initialModel = (config: InitConfig): Model => {
  let model!: Model
  Effect.runSync(
    story(
      TestListbox.Live,
      config,
      Story.model(constructedModel => {
        model = constructedModel
      }),
    ),
  )
  return model
}

class ListboxScene extends Block<ListboxScene, ViewInputs<string>>()(
  'ListboxScene',
  { Model: Schema.Struct({ listbox: TestListbox }), OutMessage },
) {}

const ListboxSceneLive = ListboxScene.make(
  Effect.fn(function* (_id, viewInputs) {
    const listbox = yield* new TestListbox('listbox', testConfig)

    return {
      model: { listbox },
      update: {
        ...listbox.on({
          Selected: (model, outMessage) => ({ model, outMessage }),
        }),
      },
      view: model => model.listbox.view(viewInputs),
    }
  }),
).pipe(Layer.provide(TestListbox.Live))

const acknowledgeAnchor = Scene.Mount.resolve(
  AnchorListbox,
  Message.CompletedAnchorListbox(),
)
const acknowledgeBackdrop = Scene.Mount.resolve(
  PortalListboxBackdrop,
  Message.CompletedPortalListboxBackdrop(),
)

const givenClosed = Story.given(initialModel({ id: 'test' }))

const givenOpenMulti = Story.steps(
  givenClosed,
  Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
  Story.Command.resolve(
    FocusListboxItems,
    Message.CompletedFocusListboxItems(),
  ),
)

describe('Listbox.Multi', () => {
  describe('init', () => {
    it('defaults to closed with no active item', () => {
      expect(initialModel({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        isModal: false,
        orientation: 'Vertical',
        animation: {
          id: 'test-listbox',
          isShowing: false,
          transitionState: 'Idle',
          transitionGeneration: 0,
        },
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
      it.effect('emits Selected with the item value', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpenMulti,
          Story.message(Message.SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
        ),
      )

      it.effect('stays open after selection', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpenMulti,
          Story.message(Message.SelectedItem({ item: 'apple' })),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
      )

      it.effect(
        'emits Selected again when the same item is activated (parent toggles off)',
        () =>
          story(
            TestListbox.Live,
            testConfig,
            givenOpenMulti,
            Story.message(Message.SelectedItem({ item: 'apple' })),
            Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
            Story.message(Message.SelectedItem({ item: 'apple' })),
            Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
          ),
      )

      it.effect('emits Selected for each activated item', () =>
        story(
          TestListbox.Live,
          testConfig,
          givenOpenMulti,
          Story.message(Message.SelectedItem({ item: 'apple' })),
          Story.expectOutMessage(OutMessage.Selected({ value: 'apple' })),
          Story.message(Message.SelectedItem({ item: 'banana' })),
          Story.expectOutMessage(OutMessage.Selected({ value: 'banana' })),
        ),
      )

      it.effect('preserves active item after selection', () =>
        story(
          TestListbox.Live,
          testConfig,
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
        ),
      )
    })
  })

  describe('view', () => {
    const closedModel = () => initialModel({ id: 'test' })

    const openMultiModel = (): Model => {
      let model!: Model
      Effect.runSync(
        story(
          TestListbox.Live,
          testConfig,
          givenOpenMulti,
          Story.model(extractedModel => {
            model = extractedModel
          }),
        ),
      )
      return model
    }

    const sceneView = (
      overrides: Omit<
        Partial<ViewInputs<string>>,
        'items' | 'itemToConfig' | 'buttonContent'
      > = {},
    ): ViewInputs<string> => ({
      items: ['Apple', 'Banana'],
      itemToConfig: () => ({
        content: null,
      }),
      buttonContent: null,
      selectedValues: [],
      ...overrides,
    })

    describe('aria-multiselectable', () => {
      it.effect('items container has aria-multiselectable', () =>
        scene(
          ListboxSceneLive,
          sceneView(),
          Scene.given({ listbox: openMultiModel() }),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-items-container"]')).toHaveAttr(
              'aria-multiselectable',
              'true',
            )
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )
    })

    describe('read-only', () => {
      const itemsContainer = Scene.selector('#test-items')
      const item = (index: number) => Scene.selector(`#test-item-${index}`)

      it.effect('emits aria-readonly alongside aria-multiselectable', () =>
        scene(
          ListboxSceneLive,
          sceneView({ isReadOnly: true }),
          Scene.given({ listbox: openMultiModel() }),
          Scene.expect(itemsContainer).toHaveAttr(
            'aria-multiselectable',
            'true',
          ),
          Scene.expect(itemsContainer).toHaveAttr('aria-readonly', 'true'),
          Scene.expect(itemsContainer).toHaveAttr('data-readonly', ''),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        ),
      )

      it.effect(
        'drops the item click handler so membership cannot be toggled',
        () =>
          scene(
            ListboxSceneLive,
            sceneView({ isReadOnly: true, selectedValues: ['Apple'] }),
            Scene.given({ listbox: openMultiModel() }),
            Scene.expect(item(0)).not.toHaveHandler('click'),
            Scene.expect(item(1)).not.toHaveHandler('click'),
            Scene.expect(item(0)).toHaveAttr('aria-selected', 'true'),
            Scene.expect(item(1)).toHaveAttr('aria-selected', 'false'),
            acknowledgeAnchor,
            acknowledgeBackdrop,
          ),
      )

      it.effect('does not commit the active item on Enter', () =>
        scene(
          ListboxSceneLive,
          sceneView({ isReadOnly: true }),
          Scene.given({ listbox: openMultiModel() }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
          Scene.keydown(itemsContainer, 'Enter'),
          Scene.expectNoOutMessage(),
          Scene.Command.expectNone(),
          Scene.expect(itemsContainer).toExist(),
        ),
      )
    })

    describe('button labeling', () => {
      it.effect(
        'no aria-label or aria-labelledby on the trigger by default',
        () =>
          scene(
            ListboxSceneLive,
            sceneView(),
            Scene.given({ listbox: closedModel() }),
            Scene.tap(({ html }) => {
              const button = Scene.find(html, '[key="test-button"]')
              expect(button).not.toHaveAttr('aria-label')
              expect(button).not.toHaveAttr('aria-labelledby')
            }),
          ),
      )

      it.effect(
        'applies aria-label to the trigger when ariaLabel is provided',
        () =>
          scene(
            ListboxSceneLive,
            sceneView({ ariaLabel: 'Fruit' }),
            Scene.given({ listbox: closedModel() }),
            Scene.tap(({ html }) => {
              const button = Scene.find(html, '[key="test-button"]')
              expect(button).toHaveAttr('aria-label', 'Fruit')
              expect(button).not.toHaveAttr('aria-labelledby')
            }),
          ),
      )

      it.effect(
        'applies aria-labelledby to the trigger when ariaLabelledBy is provided',
        () =>
          scene(
            ListboxSceneLive,
            sceneView({ ariaLabelledBy: 'fruit-label' }),
            Scene.given({ listbox: closedModel() }),
            Scene.tap(({ html }) => {
              const button = Scene.find(html, '[key="test-button"]')
              expect(button).toHaveAttr('aria-labelledby', 'fruit-label')
              expect(button).not.toHaveAttr('aria-label')
            }),
          ),
      )

      it.effect(
        'prefers aria-label over aria-labelledby when both are provided',
        () =>
          scene(
            ListboxSceneLive,
            sceneView({
              ariaLabel: 'Fruit',
              ariaLabelledBy: 'fruit-label',
            }),
            Scene.given({ listbox: closedModel() }),
            Scene.tap(({ html }) => {
              const button = Scene.find(html, '[key="test-button"]')
              expect(button).toHaveAttr('aria-label', 'Fruit')
              expect(button).not.toHaveAttr('aria-labelledby')
            }),
          ),
      )

      it('buttonId derives the trigger id from the base id', () => {
        expect(buttonId('test')).toBe('test-button')
      })
    })

    describe('multiple data-selected', () => {
      it.effect('multiple items have data-selected', () =>
        scene(
          ListboxSceneLive,
          sceneView({ selectedValues: ['Apple', 'Banana'] }),
          Scene.given({ listbox: openMultiModel() }),
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
        ),
      )
    })

    describe('form integration', () => {
      it.effect('renders multiple hidden inputs for multi-select', () =>
        scene(
          ListboxSceneLive,
          sceneView({
            name: 'fruit',
            selectedValues: ['Apple', 'Banana'],
          }),
          Scene.given({ listbox: closedModel() }),
          Scene.tap(({ html }) => {
            const inputs = Scene.findAll(html, 'input[type="hidden"]')
            expect(inputs).toHaveLength(2)
            expect(Scene.find(html, 'input[value="Apple"]')).toExist()
            expect(Scene.find(html, 'input[value="Banana"]')).toExist()
          }),
        ),
      )

      it.effect('renders empty hidden input when no items selected', () =>
        scene(
          ListboxSceneLive,
          sceneView({ name: 'fruit' }),
          Scene.given({ listbox: closedModel() }),
          Scene.tap(({ html }) => {
            const inputs = Scene.findAll(html, 'input[type="hidden"]')
            expect(inputs).toHaveLength(1)
            expect(Scene.find(html, 'input[type="hidden"]')).not.toHaveAttr(
              'value',
            )
          }),
        ),
      )
    })
  })
})
