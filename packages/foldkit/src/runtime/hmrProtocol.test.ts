import { describe, it } from '@effect/vitest'
import { Exit, Schema as S } from 'effect'
import { expect } from 'vitest'

import { RestoreModelMessage } from './hmrProtocol.js'

describe('RestoreModelMessage', () => {
  it('round-trips through JSON when no model is preserved (cold start)', () => {
    const encoded = S.encodeUnknownSync(RestoreModelMessage)(
      RestoreModelMessage.make({ id: 'app', model: undefined }),
    )
    const wire = JSON.parse(JSON.stringify(encoded))
    const decoded = S.decodeUnknownExit(RestoreModelMessage)(wire)

    expect(Exit.isSuccess(decoded)).toBe(true)
  })

  it('round-trips through JSON when a model is preserved', () => {
    const preservedModel = { count: 7 }
    const encoded = S.encodeUnknownSync(RestoreModelMessage)(
      RestoreModelMessage.make({ id: 'app', model: preservedModel }),
    )
    const wire = JSON.parse(JSON.stringify(encoded))
    const decoded = S.decodeUnknownExit(RestoreModelMessage)(wire)

    expect(decoded).toEqual(Exit.succeed({ id: 'app', model: preservedModel }))
  })
})
