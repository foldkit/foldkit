import { Schema } from 'effect'
import { expect, it } from 'vitest'

import {
  makeChildEnvelopeSchema,
  registerGeneratedDelivery,
} from '../block/childEnvelope.js'
import { defineMessageUnion } from '../message/index.js'
import { commandResultMapper, liftChildMessage } from './childOrigin.js'

const Message = defineMessageUnion({ ChangedValue: { value: Schema.Number } })
type Message = typeof Message.Type
const ParentBinding = {}
const EntriesBinding = {}
const LegacyBinding = {}

registerGeneratedDelivery(
  ParentBinding,
  makeChildEnvelopeSchema('parent', Message),
)
registerGeneratedDelivery(
  EntriesBinding,
  makeChildEnvelopeSchema('entries', Message, Schema.Number),
)

it('stamps view and lifecycle emissions from the captured occurrence', () => {
  const occurrence = {
    binding: EntriesBinding,
    generation: 12,
    isActive: true,
    key: 4,
  }

  expect(
    liftChildMessage(
      occurrence,
      Message.ChangedValue({ value: 2 }),
      message => ({ _tag: 'Legacy', message }),
    ),
  ).toEqual({
    _tag: 'GotEntriesMessage',
    placement: 'entries',
    generation: 12,
    key: 4,
    message: Message.ChangedValue({ value: 2 }),
  })

  occurrence.isActive = false
  expect(
    liftChildMessage(
      occurrence,
      Message.ChangedValue({ value: 3 }),
      message => ({ _tag: 'Legacy', message }),
    ),
  ).toMatchObject({ generation: 12, key: 4 })
})

it('keeps historical generations out of live data and reserves zero for replay', () => {
  const historical = {
    binding: ParentBinding,
    generation: -1,
    isActive: false,
  }

  expect(() =>
    liftChildMessage(
      historical,
      Message.ChangedValue({ value: 1 }),
      value => value,
    ),
  ).toThrow('historical child occurrence cannot emit a live Message')
  expect(
    liftChildMessage(
      historical,
      Message.ChangedValue({ value: 1 }),
      value => value,
      0,
    ),
  ).toMatchObject({ generation: 0 })
})

it('replaces every synthetic generation in a nested generated Command result', () => {
  const mapResult = commandResultMapper([
    {
      binding: ParentBinding,
      generation: 7,
      isActive: true,
    },
    {
      binding: EntriesBinding,
      generation: 19,
      isActive: true,
      key: 4,
    },
  ])
  const result = mapResult!({
    _tag: 'GotParentMessage',
    placement: 'parent',
    generation: 0,
    message: {
      _tag: 'GotEntriesMessage',
      placement: 'entries',
      generation: 0,
      key: 4,
      message: Message.ChangedValue({ value: 8 }),
    },
  })

  expect(result).toEqual({
    _tag: 'GotParentMessage',
    placement: 'parent',
    generation: 7,
    message: {
      _tag: 'GotEntriesMessage',
      placement: 'entries',
      generation: 19,
      key: 4,
      message: Message.ChangedValue({ value: 8 }),
    },
  })
})

it('rejects mixed generated and authored Command boundary chains', () => {
  expect(() =>
    commandResultMapper([
      { binding: ParentBinding, generation: 1, isActive: true },
      { binding: LegacyBinding, generation: 2, isActive: true },
    ]),
  ).toThrow('crosses both generated and authored child Message boundaries')
})

it('rejects a generated Command result that bypasses the synthetic origin', () => {
  const mapResult = commandResultMapper([
    { binding: ParentBinding, generation: 7, isActive: true },
  ])!

  expect(() =>
    mapResult({
      _tag: 'GotParentMessage',
      placement: 'parent',
      generation: 6,
      message: Message.ChangedValue({ value: 8 }),
    }),
  ).toThrow('did not contain its expected child Message envelope')
})
