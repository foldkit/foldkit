import { Exit, Schema } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { PreserveModelMessage, RestoreModelMessage } from './hmrProtocol.js'

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
  it('decodes a payload that omits isHmrReload (older runtime / debounced preserve)', () => {
    const wire = { id: 'app', model: { count: 7 } }
    const decoded = Schema.decodeUnknownExit(PreserveModelMessage)(wire)

    expect(Exit.isSuccess(decoded)).toBe(true)
  })

  it('round-trips through JSON when isHmrReload is set', () => {
    const encoded = Schema.encodeUnknownSync(PreserveModelMessage)(
      PreserveModelMessage.make({
        id: 'app',
        model: { count: 7 },
        isHmrReload: true,
      }),
    )
    const wire = JSON.parse(JSON.stringify(encoded))
    const decoded = Schema.decodeUnknownExit(PreserveModelMessage)(wire)

    expect(decoded).toEqual(
      Exit.succeed({ id: 'app', model: { count: 7 }, isHmrReload: true }),
    )
  })
})
