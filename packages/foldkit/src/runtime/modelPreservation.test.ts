import { Exit, Schema } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  PreserveModelMessage,
  RestoreModelMessage,
} from './modelPreservation.js'

describe('RestoreModelMessage', () => {
  it('round-trips through JSON when no model is preserved (cold start)', () => {
    const encoded = Schema.encodeUnknownSync(RestoreModelMessage)(
      RestoreModelMessage.make({ id: 'app', model: undefined }),
    )
    const wire = JSON.parse(JSON.stringify(encoded))
    const decoded = Schema.decodeUnknownExit(RestoreModelMessage)(wire)

    expect(Exit.isSuccess(decoded)).toBe(true)
  })

  it('round-trips through JSON when a model is preserved', () => {
    const preservedModel = { count: 7 }
    const encoded = Schema.encodeUnknownSync(RestoreModelMessage)(
      RestoreModelMessage.make({ id: 'app', model: preservedModel }),
    )
    const wire = JSON.parse(JSON.stringify(encoded))
    const decoded = Schema.decodeUnknownExit(RestoreModelMessage)(wire)

    expect(decoded).toEqual(Exit.succeed({ id: 'app', model: preservedModel }))
  })
})

describe('PreserveModelMessage', () => {
  it('round-trips an explicit cache invalidation without a Model', () => {
    expect(PreserveModelMessage.make({ id: 'app' })).toEqual({ id: 'app' })
    const encoded = Schema.encodeUnknownSync(PreserveModelMessage)(
      PreserveModelMessage.make({
        id: 'app',
        model: undefined,
        isReloadFlush: true,
      }),
    )
    const wire = JSON.parse(JSON.stringify(encoded))
    expect(wire).toEqual({ id: 'app', isReloadFlush: true })
    expect(
      Exit.isSuccess(Schema.decodeUnknownExit(PreserveModelMessage)(wire)),
    ).toBe(true)
  })

  it('retains null as a present Model and rejects malformed runtime ids', () => {
    expect(
      Schema.decodeUnknownSync(PreserveModelMessage)({
        id: 'app',
        model: null,
      }),
    ).toEqual({ id: 'app', model: null })
    expect(
      Exit.isFailure(Schema.decodeUnknownExit(PreserveModelMessage)({ id: 1 })),
    ).toBe(true)
    expect(
      Exit.isFailure(
        Schema.decodeUnknownExit(PreserveModelMessage)({
          id: 'app',
          isReloadFlush: 'yes',
        }),
      ),
    ).toBe(true)
  })

  it('decodes a debounced preserve that omits isReloadFlush', () => {
    const wire = { id: 'app', model: { count: 7 } }
    const decoded = Schema.decodeUnknownExit(PreserveModelMessage)(wire)

    expect(Exit.isSuccess(decoded)).toBe(true)
  })

  it('round-trips through JSON when isReloadFlush is set', () => {
    const encoded = Schema.encodeUnknownSync(PreserveModelMessage)(
      PreserveModelMessage.make({
        id: 'app',
        model: { count: 7 },
        isReloadFlush: true,
      }),
    )
    const wire = JSON.parse(JSON.stringify(encoded))
    const decoded = Schema.decodeUnknownExit(PreserveModelMessage)(wire)

    expect(decoded).toEqual(
      Exit.succeed({ id: 'app', model: { count: 7 }, isReloadFlush: true }),
    )
  })
})
