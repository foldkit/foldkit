import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { m, withConstructorProbe } from './index.js'

const Leaf = m('Leaf', { value: S.String })
const GotLeafMessage = m('GotLeafMessage', { message: S.Union([Leaf]) })

// Builds a `GotLeafMessage` from an arbitrary payload. Outside a probe the
// constructor validates `message` against the strict union and rejects an
// invalid payload; the single assertion feeds it a structurally-invalid value
// on purpose to exercise that boundary.
const buildGotLeaf = (message: unknown): unknown =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  GotLeafMessage({ message: message as never })

describe('withConstructorProbe', () => {
  it('lets a validating constructor stamp its tag over an invalid payload', () => {
    const wrapped = withConstructorProbe(() => buildGotLeaf({ not: 'valid' }))
    expect(wrapped).toEqual({
      _tag: 'GotLeafMessage',
      message: { not: 'valid' },
    })
  })

  it('restores validation after the probe returns', () => {
    withConstructorProbe(() => buildGotLeaf({}))
    expect(() => buildGotLeaf({})).toThrow()
  })

  it('validates normally outside a probe', () => {
    expect(buildGotLeaf(Leaf({ value: 'ok' }))).toEqual({
      _tag: 'GotLeafMessage',
      message: { _tag: 'Leaf', value: 'ok' },
    })
  })
})
