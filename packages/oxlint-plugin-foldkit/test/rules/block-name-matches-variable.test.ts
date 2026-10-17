import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { blockNameMatchesVariable } from '../../src/rules/block-name-matches-variable.ts'

const variableDeclarator = (name: string, init: unknown) => ({
  type: 'VariableDeclarator',
  id: Testing.id(name),
  init,
})

const callMethod = (object: unknown, methodName: string) => ({
  type: 'CallExpression',
  callee: {
    type: 'MemberExpression',
    computed: false,
    object,
    property: Testing.id(methodName),
  },
  arguments: [],
})

describe('block-name-matches-variable', () => {
  it('flags a declaration identifier that does not match the Block name', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'People',
        Testing.callOfMember('Block', 'define', [
          Testing.strLiteral('PeopleDirectory'),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      '"People" must be "PeopleDirectory"',
    )
  })

  it('allows a declaration identifier that matches the Block name', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'People',
        Testing.callOfMember('Block', 'define', [Testing.strLiteral('People')]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('checks the outer variable of a Composition', () => {
    const defineCall = Testing.callOfMember('Block', 'define', [
      Testing.strLiteral('PeopleDirectory'),
    ])
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator('People', {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          computed: false,
          object: defineCall,
          property: Testing.id('makeComposition'),
        },
        arguments: [],
      }),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      '"People" must be "PeopleDirectoryComposition"',
    )
  })

  it('allows the Block name with a Composition suffix', () => {
    const defineCall = Testing.callOfMember('Block', 'define', [
      Testing.strLiteral('PeopleDirectory'),
    ])
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator('PeopleDirectoryComposition', {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          computed: false,
          object: defineCall,
          property: Testing.id('makeComposition'),
        },
        arguments: [],
      }),
    )

    expect(result).toHaveLength(0)
  })

  it('unwraps an identity-first typed definition', () => {
    const identity = Testing.callOfMember('Block', 'define', [
      Testing.strLiteral('PeopleDirectory'),
    ])
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator('PeopleDirectory', callMethod(identity, 'define')),
    )

    expect(result).toHaveLength(0)
  })

  it('unwraps an identity-first Composition', () => {
    const identity = Testing.callOfMember('Block', 'define', [
      Testing.strLiteral('PeopleDirectory'),
    ])
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'PeopleDirectoryComposition',
        callMethod(callMethod(identity, 'define'), 'makeComposition'),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('requires Application at the authoring stage', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'ApplicationDefinition',
        Testing.callOfMember('Application', 'define', []),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      '"ApplicationDefinition" must be "Application"',
    )
  })

  it('requires ApplicationComposition after inline makeComposition', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'Application',
        callMethod(
          Testing.callOfMember('Application', 'define', []),
          'makeComposition',
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      '"Application" must be "ApplicationComposition"',
    )
  })

  it('ignores dynamic Block names', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'People',
        Testing.callOfMember('Block', 'define', [Testing.id('blockName')]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores unrelated define methods', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'People',
        Testing.callOfMember('Registry', 'define', [
          Testing.strLiteral('PeopleDirectory'),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores chains rooted in unrelated define methods', () => {
    const unrelatedDefine = Testing.callOfMember('Registry', 'define', [
      Testing.strLiteral('PeopleDirectory'),
    ])
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator('People', callMethod(unrelatedDefine, 'define')),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores unrelated makeComposition methods', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'People',
        Testing.callOfMember('Registry', 'makeComposition', []),
      ),
    )

    expect(result).toHaveLength(0)
  })
})
