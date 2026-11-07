import { Effect, Schema, SchemaTransformation } from 'effect'
import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import * as RadioGroup from './public.js'

const Fruit = Schema.Literals(['Apple', 'Pear'])
const FruitRadioGroup = RadioGroup.makeBlock(Fruit)

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

const PassiveValue = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformEffect({
      decode: value =>
        Effect.as(Effect.die('Unexpected construction-time decode'), value),
      encode: value =>
        Effect.as(Effect.die('Unexpected construction-time encode'), value),
    }),
  ),
)
const PassiveRadioGroup = RadioGroup.makeBlock(PassiveValue)

describe('RadioGroup selection Schemas', () => {
  it('rejects values outside the declared selection contract', () => {
    expect(
      Schema.decodeUnknownOption(FruitRadioGroup.Message)({
        _tag: 'SelectedOption',
        index: 1,
        value: 'Other',
      })._tag,
    ).toBe('None')
    expect(
      Schema.decodeUnknownOption(FruitRadioGroup.OutMessage)({
        _tag: 'Selected',
        index: 1,
        value: 'Other',
      })._tag,
    ).toBe('None')
  })

  it('retains the selected value encoding and index in both channels', () => {
    const selected = EncodedRadioGroup.Message.SelectedOption({
      index: 2,
      value: '42',
    })
    const outMessage = EncodedRadioGroup.OutMessage.Selected({
      index: 2,
      value: '42',
    })

    expect(Schema.encodeSync(EncodedRadioGroup.Message)(selected)).toEqual({
      _tag: 'SelectedOption',
      index: 2,
      value: 42,
    })
    expect(Schema.encodeSync(EncodedRadioGroup.OutMessage)(outMessage)).toEqual(
      {
        _tag: 'Selected',
        index: 2,
        value: 42,
      },
    )
  })

  it.effect(
    'does not evaluate selection Codecs while constructing or initializing',
    () =>
      Story.withBlock(
        { block: PassiveRadioGroup, layer: RadioGroup.layer },
        executable => {
          expect(executable.init({ id: 'passive-radio' }).model.id).toBe(
            'passive-radio',
          )
        },
      ),
  )
})
