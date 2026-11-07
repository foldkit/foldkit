import {
  Context,
  Effect,
  Layer,
  Option,
  Schema,
  SchemaTransformation,
} from 'effect'
import { Block, Scene, Story } from 'foldkit'
import { inertHtml as ih } from 'foldkit/html'
import * as Test from 'foldkit/test'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import * as Listbox from './public.js'

const Fruit = Schema.Literals(['Apple', 'Pear'])
const Color = Schema.Literals(['Red', 'Blue'])

const FruitListbox = Listbox.makeBlock(Fruit)
const FruitMultiListbox = Listbox.Multi.makeBlock(Fruit)
const ColorListbox = Listbox.makeBlock(Color)
const FruitOption = Schema.Struct({ value: Fruit, label: Schema.String })
const FruitOptionListbox = Listbox.makeBlock(FruitOption, Fruit)

const EncodedValue = Schema.Number.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transform({
      decode: globalThis.String,
      encode: globalThis.Number,
    }),
  ),
)
const EncodedListbox = Listbox.makeBlock(EncodedValue)

const ConstructionPassiveValue = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformEffect({
      decode: value =>
        Effect.as(
          Effect.die(
            new Error('Value decode must not execute during construction'),
          ),
          value,
        ),
      encode: value =>
        Effect.as(
          Effect.die(
            new Error('Value encode must not execute during construction'),
          ),
          value,
        ),
    }),
  ),
)
const ConstructionPassiveListbox = Listbox.makeBlock(ConstructionPassiveValue)
const ConstructionPassiveMultiListbox = Listbox.Multi.makeBlock(
  ConstructionPassiveValue,
)

class ItemLabels extends Context.Service<
  ItemLabels,
  Readonly<{ prefix: string }>
>()('ListboxSchemaTest/ItemLabels') {}

const ServicefulLabel = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformEffect({
      decode: label => Effect.map(ItemLabels, ({ prefix }) => prefix + label),
      encode: label =>
        Effect.map(ItemLabels, ({ prefix }) => label.slice(prefix.length)),
    }),
  ),
)
const ServicefulItem = Schema.Struct({
  value: Fruit,
  label: ServicefulLabel,
})
const ItemWitnessListbox = Listbox.makeBlock(ServicefulItem, Fruit)

const ParentModel = Schema.Struct({
  fruitListbox: FruitListbox.Model,
  colorListbox: ColorListbox.Model,
  maybeFruit: Schema.Option(Fruit),
  maybeColor: Schema.Option(Color),
})
const ParentKey = Symbol('ListboxSchemaParent')
const ListboxSchemaParentBlock = Block.make('ListboxSchemaParent', {
  key: ParentKey,
  InitArgs: Schema.Tuple([]),
  Model: ParentModel,
  Message: Schema.Never,
})

const FruitBinding = ListboxSchemaParentBlock.makeRequiredFieldBinding(
  FruitListbox,
  {
    field: 'fruitListbox',
    init: { contextToArgs: () => [{ id: 'fruit' }] },
  },
).withOutMessagePolicy({
  fold: ListboxSchemaParentBlock.makeOutMessageFold(FruitListbox, {
    Selected: ({ value }) =>
      ListboxSchemaParentBlock.makeFieldsStep(() => ({
        maybeFruit: () => Option.some(value),
      })),
  }),
})

const ColorBinding = ListboxSchemaParentBlock.makeRequiredFieldBinding(
  ColorListbox,
  {
    field: 'colorListbox',
    init: { contextToArgs: () => [{ id: 'color' }] },
  },
).withOutMessagePolicy({
  fold: ListboxSchemaParentBlock.makeOutMessageFold(ColorListbox, {
    Selected: ({ value }) =>
      ListboxSchemaParentBlock.makeFieldsStep(() => ({
        maybeColor: () => Option.some(value),
      })),
  }),
})

const ListboxSchemaParentComposition = ListboxSchemaParentBlock.makeComposition(
  {
    bindings: [FruitBinding, ColorBinding],
  },
)
const parentInit = ListboxSchemaParentComposition.makeInit(() => ({
  model: {
    maybeFruit: Option.none(),
    maybeColor: Option.none(),
  },
}))
const parentUpdate = ListboxSchemaParentComposition.makeUpdate({})
const parentLayer = ListboxSchemaParentBlock.makeLayer({
  init: parentInit,
  update: parentUpdate,
}).pipe(Layer.provide(Listbox.layer))

describe('Listbox Value Schemas', () => {
  it('uses a literal Value Codec for every selection channel', () => {
    for (const block of [FruitListbox, FruitMultiListbox]) {
      const requested = block.Message.RequestedSelectItem({ item: 'Apple' })
      const selected = block.Message.SelectedItem({ item: 'Pear' })
      const outMessage = block.OutMessage.Selected({ value: 'Apple' })

      expect(
        Schema.decodeSync(block.Message.RequestedSelectItem)({
          _tag: 'RequestedSelectItem',
          item: 'Apple',
        }),
      ).toEqual(requested)
      expect(
        Schema.encodeSync(block.Message.RequestedSelectItem)(requested),
      ).toEqual({ _tag: 'RequestedSelectItem', item: 'Apple' })

      expect(
        Schema.decodeSync(block.Message.SelectedItem)({
          _tag: 'SelectedItem',
          item: 'Pear',
        }),
      ).toEqual(selected)
      expect(Schema.encodeSync(block.Message.SelectedItem)(selected)).toEqual({
        _tag: 'SelectedItem',
        item: 'Pear',
      })

      expect(
        Schema.decodeSync(block.OutMessage.Selected)({
          _tag: 'Selected',
          value: 'Apple',
        }),
      ).toEqual(outMessage)
      expect(Schema.encodeSync(block.OutMessage.Selected)(outMessage)).toEqual({
        _tag: 'Selected',
        value: 'Apple',
      })

      expect(() =>
        Schema.decodeUnknownSync(block.Message.RequestedSelectItem)({
          _tag: 'RequestedSelectItem',
          item: 'Orange',
        }),
      ).toThrow()
      expect(() =>
        Schema.decodeUnknownSync(block.Message.SelectedItem)({
          _tag: 'SelectedItem',
          item: 'Orange',
        }),
      ).toThrow()
      expect(() =>
        Schema.decodeUnknownSync(block.OutMessage.Selected)({
          _tag: 'Selected',
          value: 'Orange',
        }),
      ).toThrow()
    }
  })

  it('retains the transformed Value encoding in Messages and OutMessages', () => {
    const requested = EncodedListbox.Message.RequestedSelectItem({ item: '42' })
    const selected = EncodedListbox.Message.SelectedItem({ item: '43' })
    const outMessage = EncodedListbox.OutMessage.Selected({ value: '44' })

    expect(
      Schema.encodeSync(EncodedListbox.Message.RequestedSelectItem)(requested),
    ).toEqual({ _tag: 'RequestedSelectItem', item: 42 })
    expect(
      Schema.decodeSync(EncodedListbox.Message.RequestedSelectItem)({
        _tag: 'RequestedSelectItem',
        item: 42,
      }),
    ).toEqual(requested)

    expect(
      Schema.encodeSync(EncodedListbox.Message.SelectedItem)(selected),
    ).toEqual({
      _tag: 'SelectedItem',
      item: 43,
    })
    expect(
      Schema.decodeSync(EncodedListbox.Message.SelectedItem)({
        _tag: 'SelectedItem',
        item: 43,
      }),
    ).toEqual(selected)

    expect(
      Schema.encodeSync(EncodedListbox.OutMessage.Selected)(outMessage),
    ).toEqual({
      _tag: 'Selected',
      value: 44,
    })
    expect(
      Schema.decodeSync(EncodedListbox.OutMessage.Selected)({
        _tag: 'Selected',
        value: 44,
      }),
    ).toEqual(outMessage)
  })

  it.effect(
    'validates generated dispatch while keeping two specializations isolated',
    () =>
      Story.withBlock(
        { block: ListboxSchemaParentBlock, layer: parentLayer },
        parent => {
          const decode = Schema.decodeUnknownSync(parent.Message)
          const toParentMessage = Test.toParentMessageFor(parent)
          const selectedFruit = toParentMessage(
            FruitBinding,
            FruitListbox.Message.SelectedItem({ item: 'Pear' }),
          )
          const selectedColor = toParentMessage(
            ColorBinding,
            ColorListbox.Message.SelectedItem({ item: 'Blue' }),
          )

          expect(
            decode({
              _tag: 'GotFruitListboxMessage',
              placement: 'fruitListbox',
              generation: 0,
              message: { _tag: 'SelectedItem', item: 'Pear' },
            }),
          ).toEqual(selectedFruit)
          expect(() =>
            decode({
              _tag: 'GotFruitListboxMessage',
              placement: 'fruitListbox',
              generation: 0,
              message: { _tag: 'SelectedItem', item: 'Red' },
            }),
          ).toThrow()

          return Story.story(
            parent.update,
            Story.given(parent.init().model),
            Story.message(selectedFruit),
            Story.message(selectedColor),
            Story.model(model => {
              expect(model.maybeFruit).toEqual(Option.some('Pear'))
              expect(model.maybeColor).toEqual(Option.some('Blue'))
            }),
          )
        },
      ),
  )

  it.effect(
    'keeps the Item Schema out of construction and serialized selection channels',
    () =>
      Story.withBlock(ItemWitnessListbox, executable => {
        const initial = executable.init({ id: 'serviceful-item' })
        const selected = executable.operations.requestSelectItem(
          initial.model,
          'Apple',
        )

        expect(selected.outMessage).toEqual(
          ItemWitnessListbox.OutMessage.Selected({ value: 'Apple' }),
        )
        expect(
          Schema.encodeSync(ItemWitnessListbox.Message.SelectedItem)(
            ItemWitnessListbox.Message.SelectedItem({ item: 'Pear' }),
          ),
        ).toEqual({ _tag: 'SelectedItem', item: 'Pear' })
      }).pipe(Effect.provide(Listbox.layer)),
  )

  it.effect('keeps Value transforms passive through acquisition and init', () =>
    Effect.gen(function* () {
      yield* Story.withBlock(ConstructionPassiveListbox, executable => {
        expect(executable.init({ id: 'passive-single' }).model.id).toBe(
          'passive-single',
        )
      }).pipe(Effect.provide(Listbox.layer))

      yield* Story.withBlock(ConstructionPassiveMultiListbox, executable => {
        expect(executable.init({ id: 'passive-multi' }).model.id).toBe(
          'passive-multi',
        )
      }).pipe(Effect.provide(Listbox.Multi.layer))
    }),
  )

  it.effect('emits the exact Value when an object item is clicked', () =>
    Scene.scene(
      {
        block: FruitOptionListbox,
        viewInputs: {
          items: [
            FruitOption.make({ value: 'Apple', label: 'Apple' }),
            FruitOption.make({ value: 'Pear', label: 'Pear' }),
          ],
          itemToValue: option => option.value,
          itemToConfig: option => ({
            content: ih.span([], [option.label]),
          }),
          maybeSelectedValue: Option.none(),
          buttonContent: null,
        },
      },
      Scene.init({ id: 'fruit-option' }),
      Scene.click(Scene.role('button')),
      Scene.Command.resolve(
        Listbox.test.FocusListboxItems,
        FruitOptionListbox.Message.CompletedFocusListboxItems(),
      ),
      Scene.Mount.resolve(
        Listbox.test.AnchorListbox,
        FruitOptionListbox.Message.CompletedAnchorListbox(),
      ),
      Scene.Mount.resolve(
        Listbox.test.PortalListboxBackdrop,
        FruitOptionListbox.Message.CompletedPortalListboxBackdrop(),
      ),
      Scene.click(Scene.role('option', { name: 'Pear' })),
      Scene.expectOutMessage(
        FruitOptionListbox.OutMessage.Selected({ value: 'Pear' }),
      ),
      Scene.Command.resolve(
        Listbox.test.FocusListboxButton,
        FruitOptionListbox.Message.CompletedFocusListboxButton(),
      ),
      Scene.Mount.expectEnded(
        Listbox.test.AnchorListbox,
        Listbox.test.PortalListboxBackdrop,
      ),
    ).pipe(Effect.provide(Listbox.layer)),
  )
})
