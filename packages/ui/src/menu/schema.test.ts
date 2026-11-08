import { Effect, Schema, SchemaTransformation } from 'effect'
import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import * as Menu from './public.js'

const Fruit = Schema.Literals(['Apple', 'Pear'])
const FruitMenu = Menu.makeBlock(Fruit)

const EncodedValue = Schema.Number.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transform({
      decode: globalThis.String,
      encode: globalThis.Number,
    }),
  ),
)
const EncodedMenu = Menu.makeBlock(EncodedValue)

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
const PassiveMenu = Menu.makeBlock(PassiveValue)

describe('Menu selection Schemas', () => {
  it('rejects values outside the declared selection contract', () => {
    expect(
      Schema.decodeUnknownOption(FruitMenu.Message)({
        _tag: 'SelectedItem',
        index: 1,
        item: 'Other',
      })._tag,
    ).toBe('None')
    expect(
      Schema.decodeUnknownOption(FruitMenu.OutMessage)({
        _tag: 'Selected',
        index: 1,
        value: 'Other',
      })._tag,
    ).toBe('None')
  })

  it('retains the selected value encoding and index in both channels', () => {
    const selected = EncodedMenu.Message.SelectedItem({
      index: 2,
      item: '42',
    })
    const outMessage = EncodedMenu.OutMessage.Selected({
      index: 2,
      value: '42',
    })

    expect(Schema.encodeSync(EncodedMenu.Message)(selected)).toEqual({
      _tag: 'SelectedItem',
      index: 2,
      item: 42,
    })
    expect(Schema.encodeSync(EncodedMenu.OutMessage)(outMessage)).toEqual({
      _tag: 'Selected',
      index: 2,
      value: 42,
    })
  })

  it.effect(
    'does not evaluate selection Codecs while constructing or initializing',
    () =>
      Story.withBlock({ block: PassiveMenu, layer: Menu.layer }, executable => {
        expect(executable.init({ id: 'passive-menu' }).model.id).toBe(
          'passive-menu',
        )
      }),
  )
})
