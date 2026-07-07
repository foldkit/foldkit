import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noEmptyObjectTaggedCall } from '../../src/rules/no-empty-object-tagged-call.ts'

describe('no-empty-object-tagged-call', () => {
  it('flags empty object calls to tagged constructors', () => {
    const result = Testing.runRule(
      noEmptyObjectTaggedCall,
      'CallExpression',
      Testing.callExpr('ClickedSave', [Testing.objectExpr([])]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('ClickedSave()')
  })

  it('does not flag member calls that happen to receive empty objects', () => {
    const result = Testing.runRule(
      noEmptyObjectTaggedCall,
      'CallExpression',
      Testing.callOfMember('S', 'Struct', [Testing.objectExpr([])]),
    )

    expect(result).toHaveLength(0)
  })
})
