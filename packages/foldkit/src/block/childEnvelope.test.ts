import { Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/public.js'
import {
  type ChildEnvelope,
  type KeyedChildEnvelope,
  childMessageTag,
  makeChildEnvelopeSchema,
  makeDispatchSchema,
} from './childEnvelope.js'

const LocalMessage = defineMessageUnion({ ClickedRefresh: {} })
type LocalMessage = typeof LocalMessage.Type
const ChildMessage = defineMessageUnion({
  ChangedCount: { count: Schema.Number },
})
type ChildMessage = typeof ChildMessage.Type
const PrimaryEnvelope = makeChildEnvelopeSchema('primary', ChildMessage)
type PrimaryEnvelope = typeof PrimaryEnvelope.Type
const SecondaryEnvelope = makeChildEnvelopeSchema('secondary', ChildMessage)
type SecondaryEnvelope = typeof SecondaryEnvelope.Type
const KeyedEnvelope = makeChildEnvelopeSchema(
  'counters',
  ChildMessage,
  Schema.String,
)
type KeyedEnvelope = typeof KeyedEnvelope.Type
const NestedEnvelope = makeChildEnvelopeSchema(
  'home',
  makeDispatchSchema(LocalMessage, [PrimaryEnvelope, SecondaryEnvelope]),
)
type NestedEnvelope = typeof NestedEnvelope.Type
const Dispatch = makeDispatchSchema(LocalMessage, [
  PrimaryEnvelope,
  SecondaryEnvelope,
  KeyedEnvelope,
  NestedEnvelope,
])
type Dispatch = typeof Dispatch.Type

expectTypeOf<typeof PrimaryEnvelope.Type>().toEqualTypeOf<
  ChildEnvelope<'primary', typeof ChildMessage.Type>
>()
expectTypeOf<typeof KeyedEnvelope.Type>().toEqualTypeOf<
  KeyedChildEnvelope<'counters', string, typeof ChildMessage.Type>
>()
expectTypeOf<typeof Dispatch.Type>().toEqualTypeOf<
  | typeof LocalMessage.Type
  | typeof PrimaryEnvelope.Type
  | typeof SecondaryEnvelope.Type
  | typeof KeyedEnvelope.Type
  | typeof NestedEnvelope.Type
>()

it('keeps a graphless dispatch Schema identical to the local contract', () => {
  expect(makeDispatchSchema(LocalMessage, [])).toBe(LocalMessage)
})

it('preserves exact local constructors without copying local-only union helpers', () => {
  const Message = defineMessageUnion({ ChangedQuery: { query: Schema.String } })
  type Message = typeof Message.Type
  const dispatch = makeDispatchSchema(Message, [PrimaryEnvelope])

  expect(dispatch.ChangedQuery).toBe(Message.ChangedQuery)
  expect(dispatch.ChangedQuery({ query: 'Effect' })).toEqual(
    Message.ChangedQuery({ query: 'Effect' }),
  )
  expectTypeOf(dispatch.ChangedQuery).toEqualTypeOf<
    typeof Message.ChangedQuery
  >()
  expectTypeOf<typeof dispatch.Type>().toEqualTypeOf<
    typeof Message.Type | typeof PrimaryEnvelope.Type
  >()
  expect(Object.hasOwn(dispatch, 'match')).toBe(false)
  expect(Object.hasOwn(dispatch, 'subset')).toBe(false)
  expect(Object.hasOwn(dispatch, 'GotPrimaryMessage')).toBe(false)
  if (false) {
    // @ts-expect-error Generated delivery has no author-facing Message constructor.
    dispatch.GotPrimaryMessage
    // @ts-expect-error The local-only matcher does not describe the full dispatch union.
    dispatch.match
    // @ts-expect-error Preserved constructors retain exact payloads.
    dispatch.ChangedQuery({ query: 1 })
  }
})

it('rejects a local constructor that would overwrite a derived Schema member', () => {
  const Message = defineMessageUnion({ mapMembers: {} })
  type Message = typeof Message.Type

  expect(() => makeDispatchSchema(Message, [PrimaryEnvelope])).toThrow(
    'Local Message constructor "mapMembers" conflicts with the generated dispatch Schema surface',
  )
  expect(makeDispatchSchema(Message, [])).toBe(Message)
})

it('derives readable child Message names and rejects formatting collisions', () => {
  expectTypeOf(childMessageTag('search')).toEqualTypeOf<'GotSearchMessage'>()
  expectTypeOf(
    childMessageTag('headerSearch'),
  ).toEqualTypeOf<'GotHeaderSearchMessage'>()
  expectTypeOf(
    childMessageTag('PrimarySearch'),
  ).toEqualTypeOf<'GotPrimarySearchMessage'>()
  expectTypeOf(
    childMessageTag('header-search'),
  ).toEqualTypeOf<'GotHeaderSearchMessage'>()

  expect(childMessageTag('search')).toBe('GotSearchMessage')
  expect(childMessageTag('headerSearch')).toBe('GotHeaderSearchMessage')
  expect(childMessageTag('PrimarySearch')).toBe('GotPrimarySearchMessage')
  expect(childMessageTag('header-search')).toBe('GotHeaderSearchMessage')
  expect(() => childMessageTag('---')).toThrow(
    'cannot produce a readable child Message name',
  )
  expect(() =>
    makeDispatchSchema(LocalMessage, [
      makeChildEnvelopeSchema('header-search', ChildMessage),
      makeChildEnvelopeSchema('headerSearch', ChildMessage),
    ]),
  ).toThrow('both generate child Message "GotHeaderSearchMessage"')
  expect(() =>
    makeDispatchSchema(
      defineMessageUnion({ GotPrimaryMessage: { message: ChildMessage } }),
      [PrimaryEnvelope],
    ),
  ).toThrow('conflicts with a local Message')
})

it('decodes local facts and exact repeated-placement child envelopes', () => {
  const decode = Schema.decodeUnknownSync(Dispatch)
  const primary = {
    _tag: 'GotPrimaryMessage',
    placement: 'primary',
    generation: 3,
    message: ChildMessage.ChangedCount({ count: 2 }),
  }

  expect(decode(LocalMessage.ClickedRefresh())).toEqual(
    LocalMessage.ClickedRefresh(),
  )
  expect(decode(primary)).toEqual(primary)
  expect(() => decode({ ...primary, placement: 'unregistered' })).toThrow()
  expect(() => decode({ ...primary, generation: -1 })).toThrow()
  expect(() => decode({ ...primary, generation: 0.5 })).toThrow()
  expect(() =>
    decode({ ...primary, message: { _tag: 'ChangedCount', count: 'wrong' } }),
  ).toThrow()
})

it('preserves exact keys and nested delivery through JSON encoding', () => {
  const message = {
    _tag: 'GotHomeMessage',
    placement: 'home',
    generation: 2,
    message: {
      _tag: 'GotSecondaryMessage',
      placement: 'secondary',
      generation: 5,
      message: ChildMessage.ChangedCount({ count: 4 }),
    },
  }
  const encode = Schema.encodeUnknownSync(Dispatch)
  const decode = Schema.decodeUnknownSync(Dispatch)

  expect(decode(JSON.parse(JSON.stringify(encode(message))))).toEqual(message)
  expect(() =>
    decode({
      _tag: 'GotCountersMessage',
      placement: 'counters',
      generation: 1,
      key: 123,
      message: ChildMessage.ChangedCount({ count: 1 }),
    }),
  ).toThrow()
})

if (false) {
  // @ts-expect-error A child occurrence key must be a string or number.
  makeChildEnvelopeSchema('invalid', ChildMessage, Schema.Boolean)

  const receivePrimary = (_message: PrimaryEnvelope) => undefined
  // @ts-expect-error Another placement cannot satisfy this Binding's envelope.
  receivePrimary(Schema.decodeUnknownSync(SecondaryEnvelope)({}))

  const assertCodecChannels = (
    message: Schema.Codec<
      Readonly<{ _tag: 'ChangedValue'; value: number }>,
      Readonly<{ _tag: 'ChangedValue'; value: string }>,
      'MessageDecode',
      'MessageEncode'
    >,
    key: Schema.Codec<`room-${string}`, string, 'KeyDecode', 'KeyEncode'>,
  ) => {
    const envelope = makeChildEnvelopeSchema('room', message, key)
    const dispatch = makeDispatchSchema(LocalMessage, [envelope])

    expectTypeOf<typeof envelope.Encoded>().toEqualTypeOf<
      KeyedChildEnvelope<
        'room',
        string,
        Readonly<{ _tag: 'ChangedValue'; value: string }>
      >
    >()
    expectTypeOf<typeof dispatch.DecodingServices>().toEqualTypeOf<
      'MessageDecode' | 'KeyDecode'
    >()
    expectTypeOf<typeof dispatch.EncodingServices>().toEqualTypeOf<
      'MessageEncode' | 'KeyEncode'
    >()
    expectTypeOf<typeof envelope.Type.key>().toEqualTypeOf<`room-${string}`>()
  }

  void assertCodecChannels
}
