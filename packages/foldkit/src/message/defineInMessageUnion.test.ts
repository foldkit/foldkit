import { Schema } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { defineInMessageUnion } from './index.js'

const InMessage = defineInMessageUnion({
  RequestedReset: {},
  RequestedSetCount: { count: Schema.Number },
  InformedOfLabel: { label: Schema.String },
})
type InMessage = typeof InMessage.Type

describe('defineInMessageUnion', () => {
  it('delegates constructors, Schema validation, and matching to Message unions', () => {
    expect(InMessage.RequestedReset()).toStrictEqual({
      _tag: 'RequestedReset',
    })
    expect(InMessage.RequestedSetCount({ count: 2 })).toStrictEqual({
      _tag: 'RequestedSetCount',
      count: 2,
    })
    expect(
      Schema.decodeSync(InMessage)({
        _tag: 'InformedOfLabel',
        label: 'Ready',
      }),
    ).toStrictEqual({ _tag: 'InformedOfLabel', label: 'Ready' })

    const describe = InMessage.match<string>({
      RequestedReset: () => 'reset',
      RequestedSetCount: ({ count }) => `count ${count}`,
      InformedOfLabel: ({ label }) => label,
    })

    expect(describe(InMessage.InformedOfLabel({ label: 'Ready' }))).toBe(
      'Ready',
    )
  })

  it('preserves literal variants from an extracted cases record', () => {
    const cases = {
      RequestedOpen: { id: Schema.String },
      InformedOfSelection: { id: Schema.String },
    }
    const ExtractedInMessage = defineInMessageUnion(cases)

    expectTypeOf<typeof ExtractedInMessage.Type>().toEqualTypeOf<
      | Readonly<{ _tag: 'RequestedOpen'; id: string }>
      | Readonly<{ _tag: 'InformedOfSelection'; id: string }>
    >()
    expectTypeOf(ExtractedInMessage.RequestedOpen).toBeCallableWith({
      id: 'first',
    })
    expect(ExtractedInMessage.RequestedOpen({ id: 'first' })).toStrictEqual({
      _tag: 'RequestedOpen',
      id: 'first',
    })
  })

  it('preserves decoding and encoding requirements from payload Schemas', () => {
    const assertRequirements = (
      Value: Schema.Codec<number, string, 'DecodeValue', 'EncodeValue'>,
    ) => {
      const RequiredInMessage = defineInMessageUnion({
        RequestedSet: { value: Value },
      })

      expectTypeOf<
        typeof RequiredInMessage.DecodingServices
      >().toEqualTypeOf<'DecodeValue'>()
      expectTypeOf<
        typeof RequiredInMessage.EncodingServices
      >().toEqualTypeOf<'EncodeValue'>()
    }

    void assertRequirements
  })

  it('rejects invalid InMessage tags at runtime', () => {
    expect(() =>
      Reflect.apply(defineInMessageUnion, undefined, [{ ClickedSave: {} }]),
    ).toThrowError(
      '[foldkit] InMessage variants must use Requested... or InformedOf... with a nonempty operation name.',
    )
    expect(() =>
      Reflect.apply(defineInMessageUnion, undefined, [{ Requested: {} }]),
    ).toThrowError(
      '[foldkit] InMessage variants must use Requested... or InformedOf... with a nonempty operation name.',
    )
    expect(() =>
      Reflect.apply(defineInMessageUnion, undefined, [{ InformedOf: {} }]),
    ).toThrowError(
      '[foldkit] InMessage variants must use Requested... or InformedOf... with a nonempty operation name.',
    )
  })

  if (false) {
    defineInMessageUnion({
      RequestedSave: {},
      // @ts-expect-error An invalid request tag is rejected at its property.
      ClickedSave: {},
      InformedOfStatus: {},
    })

    defineInMessageUnion({
      // @ts-expect-error A request tag needs a nonempty operation name.
      Requested: {},
    })

    defineInMessageUnion({
      // @ts-expect-error An inform tag needs a nonempty operation name.
      InformedOf: {},
    })

    const invalidExtractedCases = {
      RequestedSave: {},
      ClickedSave: {},
    }
    // @ts-expect-error Extracted records retain validation of each literal key.
    defineInMessageUnion(invalidExtractedCases)

    const receiveInMessage = (_message: InMessage) => undefined

    // @ts-expect-error Payload constructors preserve their exact fields.
    receiveInMessage(InMessage.RequestedSetCount({ count: '2' }))
    // @ts-expect-error The helper does not expose partial Message matching.
    InMessage.matchOrElse
  }
})
