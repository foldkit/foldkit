import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { blockNameMatchesVariable } from '../../src/rules/block-name-matches-variable.ts'

const blockClass = (
  className: string,
  blockId: unknown,
  selfTypeName: string = className,
) => ({
  type: 'ClassDeclaration',
  id: Testing.id(className),
  superClass: {
    type: 'CallExpression',
    callee: {
      type: 'CallExpression',
      callee: Testing.id('Block'),
      typeArguments: {
        type: 'TSTypeParameterInstantiation',
        params: [
          { type: 'TSTypeReference', typeName: Testing.id(selfTypeName) },
        ],
      },
      arguments: [],
    },
    arguments: [blockId, Testing.objectExpr([])],
  },
  body: { type: 'ClassBody', body: [] },
})

const runOnClass = (node: unknown) =>
  Testing.runRule(blockNameMatchesVariable, 'ClassDeclaration', node)

describe('block-name-matches-variable', () => {
  it('allows a Block class named after its Block id', () => {
    expect(
      runOnClass(blockClass('Counter', Testing.strLiteral('Counter'))),
    ).toHaveLength(0)
  })

  it('flags a Block class whose name differs from its Block id', () => {
    const result = runOnClass(
      blockClass('CounterBlock', Testing.strLiteral('Counter'), 'CounterBlock'),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'Block class "CounterBlock" must be named "Counter"',
    )
  })

  it('flags a Self type that names another class', () => {
    const result = runOnClass(
      blockClass('Badge', Testing.strLiteral('Badge'), 'Panel'),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Write Block<Badge, ...>()')
  })

  it('ignores a dynamic Block id', () => {
    expect(
      runOnClass(blockClass('Dynamic', Testing.id('blockName'))),
    ).toHaveLength(0)
  })

  it('ignores classes that do not extend a Block declaration', () => {
    const result = runOnClass({
      type: 'ClassDeclaration',
      id: Testing.id('Store'),
      superClass: Testing.callExpr('Base', [Testing.strLiteral('Other')]),
      body: { type: 'ClassBody', body: [] },
    })

    expect(result).toHaveLength(0)
  })
})
