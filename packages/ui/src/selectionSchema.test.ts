import { Layer, Option, Schema, SchemaTransformation } from 'effect'
import { Block, Story } from 'foldkit'
import * as Test from 'foldkit/test'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import * as Menu from './menu/public.js'
import * as RadioGroup from './radioGroup/public.js'
import * as Tabs from './tabs/public.js'

const Fruit = Schema.Literals(['Apple', 'Pear'])
const FruitMenu = Menu.makeBlock(Fruit)
const FruitRadioGroup = RadioGroup.makeBlock(Fruit)
const FruitTabs = Tabs.makeBlock(Fruit)
const EncodedValue = Schema.Number.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transform({
      decode: globalThis.String,
      encode: globalThis.Number,
    }),
  ),
)
const EncodedRadioGroup = RadioGroup.makeBlock(EncodedValue)

const Model = Schema.Struct({
  fruitMenu: FruitMenu.Model,
  fruitRadioGroup: FruitRadioGroup.Model,
  fruitTabs: FruitTabs.Model,
  encodedRadioGroup: EncodedRadioGroup.Model,
  maybeFruit: Schema.Option(Fruit),
  maybeEncodedValue: Schema.Option(Schema.String),
})
const SelectionParentKey = Symbol('SelectionParent')
const SelectionParentBlock = Block.make('SelectionParent', {
  key: SelectionParentKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message: Schema.Never,
})
const {
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
} = SelectionParentBlock

const FruitMenuBinding = makeRequiredFieldBinding(FruitMenu, {
  field: 'fruitMenu',
  init: { contextToArgs: () => [{ id: 'fruit-menu' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(FruitMenu, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({ maybeFruit: () => Option.some(value) })),
    Closed: makeNoopStep,
  }),
})
const FruitRadioGroupBinding = makeRequiredFieldBinding(FruitRadioGroup, {
  field: 'fruitRadioGroup',
  init: { contextToArgs: () => [{ id: 'fruit-radio' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(FruitRadioGroup, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({ maybeFruit: () => Option.some(value) })),
  }),
})
const FruitTabsBinding = makeRequiredFieldBinding(FruitTabs, {
  field: 'fruitTabs',
  init: { contextToArgs: () => [{ id: 'fruit-tabs' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(FruitTabs, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({ maybeFruit: () => Option.some(value) })),
  }),
})
const EncodedRadioGroupBinding = makeRequiredFieldBinding(EncodedRadioGroup, {
  field: 'encodedRadioGroup',
  init: { contextToArgs: () => [{ id: 'encoded-radio' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(EncodedRadioGroup, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({ maybeEncodedValue: () => Option.some(value) })),
  }),
})
const SelectionParentComposition = SelectionParentBlock.makeComposition({
  bindings: [
    FruitMenuBinding,
    FruitRadioGroupBinding,
    FruitTabsBinding,
    EncodedRadioGroupBinding,
  ],
})
const init = SelectionParentComposition.makeInit(() => ({
  model: { maybeFruit: Option.none(), maybeEncodedValue: Option.none() },
}))
const update = SelectionParentComposition.makeUpdate({})
const layer = SelectionParentBlock.makeLayer({
  init,
  update,
}).pipe(Layer.provide(Layer.mergeAll(Menu.layer, RadioGroup.layer, Tabs.layer)))

describe('Schema-backed selection in parent graphs', () => {
  it.effect('rejects invalid values in every generated parent envelope', () =>
    Story.withBlock({ block: SelectionParentBlock, layer }, parent => {
      const toParentMessage = Test.toParentMessageFor(parent)
      const envelopes = [
        {
          valid: toParentMessage(
            FruitMenuBinding,
            FruitMenu.Message.SelectedItem({ index: 0, item: 'Apple' }),
          ),
          invalidMessage: { _tag: 'SelectedItem', index: 0, item: 'Other' },
        },
        {
          valid: toParentMessage(
            FruitRadioGroupBinding,
            FruitRadioGroup.Message.SelectedOption({
              index: 0,
              value: 'Apple',
            }),
          ),
          invalidMessage: { _tag: 'SelectedOption', index: 0, value: 'Other' },
        },
        {
          valid: toParentMessage(
            FruitTabsBinding,
            FruitTabs.Message.SelectedTab({ index: 0, value: 'Apple' }),
          ),
          invalidMessage: { _tag: 'SelectedTab', index: 0, value: 'Other' },
        },
      ]

      for (const envelope of envelopes) {
        expect(
          Schema.decodeUnknownSync(parent.Message)(envelope.valid),
        ).toEqual(envelope.valid)
        expect(() =>
          Schema.decodeUnknownSync(parent.Message)({
            ...envelope.valid,
            message: envelope.invalidMessage,
          }),
        ).toThrow()
      }
    }),
  )

  it.effect(
    'retains transformed encodings through the complete parent Codec',
    () =>
      Story.withBlock({ block: SelectionParentBlock, layer }, parent => {
        const toParentMessage = Test.toParentMessageFor(parent)
        const selected = toParentMessage(
          EncodedRadioGroupBinding,
          EncodedRadioGroup.Message.SelectedOption({ index: 2, value: '42' }),
        )
        const encoded = {
          ...selected,
          message: { _tag: 'SelectedOption', index: 2, value: 42 },
        }

        expect(Schema.encodeSync(parent.Message)(selected)).toEqual(encoded)
        expect(Schema.decodeUnknownSync(parent.Message)(encoded)).toEqual(
          selected,
        )
      }),
  )

  it.effect(
    'delivers selections through independent Schema specializations',
    () =>
      Story.story(
        { block: SelectionParentBlock, layer },
        Story.init(),
        Story.messageIn(
          FruitRadioGroupBinding,
          FruitRadioGroup.Message.SelectedOption({ index: 1, value: 'Pear' }),
        ),
        Story.Command.resolve(
          RadioGroup.test.FocusOption,
          FruitRadioGroup.Message.CompletedFocusOption(),
        ),
        Story.model(model =>
          expect(model.maybeFruit).toEqual(Option.some('Pear')),
        ),
        Story.messageIn(
          FruitTabsBinding,
          FruitTabs.Message.SelectedTab({ index: 0, value: 'Apple' }),
        ),
        Story.Command.resolve(
          Tabs.test.FocusTab,
          FruitTabs.Message.CompletedFocusTab(),
        ),
        Story.model(model =>
          expect(model.maybeFruit).toEqual(Option.some('Apple')),
        ),
        Story.messageIn(
          FruitMenuBinding,
          FruitMenu.Message.SelectedItem({ index: 1, item: 'Pear' }),
        ),
        Story.messageIn(
          EncodedRadioGroupBinding,
          EncodedRadioGroup.Message.SelectedOption({ index: 2, value: '42' }),
        ),
        Story.Command.resolve(
          RadioGroup.test.FocusOption,
          EncodedRadioGroup.Message.CompletedFocusOption(),
        ),
        Story.model(model => {
          expect(model.maybeFruit).toEqual(Option.some('Pear'))
          expect(model.maybeEncodedValue).toEqual(Option.some('42'))
        }),
      ),
  )
})
