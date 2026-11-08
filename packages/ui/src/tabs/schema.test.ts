import { Effect, Schema, SchemaTransformation } from 'effect'
import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import * as Tabs from './public.js'

const Fruit = Schema.Literals(['Apple', 'Pear'])
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
const EncodedTabs = Tabs.makeBlock(EncodedValue)

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
const PassiveTabs = Tabs.makeBlock(PassiveValue)

describe('Tabs selection Schemas', () => {
  it('rejects values outside the declared selection contract', () => {
    expect(
      Schema.decodeUnknownOption(FruitTabs.Message)({
        _tag: 'SelectedTab',
        index: 1,
        value: 'Other',
      })._tag,
    ).toBe('None')
    expect(
      Schema.decodeUnknownOption(FruitTabs.OutMessage)({
        _tag: 'Selected',
        index: 1,
        value: 'Other',
      })._tag,
    ).toBe('None')
  })

  it('retains the selected value encoding and index in both channels', () => {
    const selected = EncodedTabs.Message.SelectedTab({
      index: 2,
      value: '42',
    })
    const outMessage = EncodedTabs.OutMessage.Selected({
      index: 2,
      value: '42',
    })

    expect(Schema.encodeSync(EncodedTabs.Message)(selected)).toEqual({
      _tag: 'SelectedTab',
      index: 2,
      value: 42,
    })
    expect(Schema.encodeSync(EncodedTabs.OutMessage)(outMessage)).toEqual({
      _tag: 'Selected',
      index: 2,
      value: 42,
    })
  })

  it.effect(
    'does not evaluate selection Codecs while constructing or initializing',
    () =>
      Story.withBlock({ block: PassiveTabs, layer: Tabs.layer }, executable => {
        expect(executable.init({ id: 'passive-tabs' }).model.id).toBe(
          'passive-tabs',
        )
      }),
  )
})
