import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/no-array-shorthand-type.ts'

describe('no-array-shorthand-type', () => {
  it('flags TSArrayType (`T[]`)', () => {
    const result = Testing.runRule(rule, 'TSArrayType', {
      type: 'TSArrayType',
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Array<T>')
    expect(result[0]?.diagnostic.message).toContain('ReadonlyArray<T>')
  })

  it('does not flag TSTypeReference (`Array<T>`)', () => {
    const result = Testing.runRule(
      rule,
      'TSTypeReference',
      Testing.tsTypeRef('Array'),
    )
    expect(result).toHaveLength(0)
  })
})
