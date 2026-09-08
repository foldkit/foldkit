import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { preferCallableMessageConstructor } from '../../src/rules/prefer-callable-message-constructor.ts'

const messageTypeAnnotation = {
  type: 'TSTypeAnnotation',
  typeAnnotation: {
    type: 'TSTypeReference',
    typeName: Testing.id('Message'),
  },
}

const typedMessageVariableDeclarator = (name: string, init: unknown) => ({
  type: 'VariableDeclarator',
  id: {
    ...Testing.id(name),
    typeAnnotation: messageTypeAnnotation,
  },
  init,
})

const tsAsExpression = (expression: unknown) => ({
  type: 'TSAsExpression',
  expression,
})

describe('prefer-callable-message-constructor', () => {
  it('flags object literal casts that look like Message construction', () => {
    const result = Testing.runRule(
      preferCallableMessageConstructor,
      'TSAsExpression',
      tsAsExpression(
        Testing.objectExpr([
          { key: '_tag', value: Testing.strLiteral('ClickedSave') },
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('callable Schema')
  })

  it('flags typed object literals that look like Message construction', () => {
    const result = Testing.runRule(
      preferCallableMessageConstructor,
      'VariableDeclarator',
      typedMessageVariableDeclarator(
        'badMessage',
        Testing.objectExpr([
          { key: '_tag', value: Testing.strLiteral('ClickedSave') },
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('callable Schema')
  })

  it('allows typed Messages constructed with callable constructors', () => {
    const result = Testing.runRule(
      preferCallableMessageConstructor,
      'VariableDeclarator',
      typedMessageVariableDeclarator(
        'message',
        Testing.callExpr('ClickedSave'),
      ),
    )

    expect(result).toHaveLength(0)
  })
})
