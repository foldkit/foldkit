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

  it('flags empty object calls through a Message namespace', () => {
    const result = Testing.runRule(
      noEmptyObjectTaggedCall,
      'CallExpression',
      Testing.callOfMember('Message', 'ClickedSave', [Testing.objectExpr([])]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Message.ClickedSave()')
  })

  it('flags empty object calls through a Route union namespace', () => {
    const result = Testing.runRule(
      noEmptyObjectTaggedCall,
      'CallExpression',
      Testing.callOfMember('AppRoute', 'Home', [Testing.objectExpr([])]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('AppRoute.Home()')
  })

  it('flags empty object calls through a domain union namespace', () => {
    const result = Testing.runRule(
      noEmptyObjectTaggedCall,
      'CallExpression',
      Testing.callOfMember('ConnectionState', 'Connected', [
        Testing.objectExpr([]),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'ConnectionState.Connected()',
    )
  })

  it('does not flag member calls that happen to receive empty objects', () => {
    const result = Testing.runRule(
      noEmptyObjectTaggedCall,
      'CallExpression',
      Testing.callOfMember('S', 'Struct', [Testing.objectExpr([])]),
    )

    expect(result).toHaveLength(0)
  })

  it('does not flag Effect namespace combinators spelled in full', () => {
    const result = Testing.runRule(
      noEmptyObjectTaggedCall,
      'CallExpression',
      Testing.callOfMember('Schema', 'Struct', [Testing.objectExpr([])]),
    )

    expect(result).toHaveLength(0)
  })

  it('does not guess that every PascalCase namespace is a union', () => {
    const result = Testing.runRule(
      noEmptyObjectTaggedCall,
      'CallExpression',
      Testing.callOfMember('Library', 'Configure', [Testing.objectExpr([])]),
    )

    expect(result).toHaveLength(0)
  })
})
