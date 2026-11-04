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
  it('requires the public Block suffix for a unified declaration', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'SearchDefinition',
        Testing.callOfMember('Block', 'make', [Testing.strLiteral('Search')]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      '"SearchDefinition" must be "SearchBlock"',
    )
  })

  it('allows a unified declaration named after the public Block', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'SearchBlock',
        Testing.callOfMember('Block', 'make', [Testing.strLiteral('Search')]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('flags a declaration identifier that does not match the Block name', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'PeopleDefinition',
        Testing.callOfMember('Block', 'makeDefinition', [
          Testing.strLiteral('PeopleDirectory'),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      '"PeopleDefinition" must be "PeopleDirectoryDefinition"',
    )
  })

  it('allows a declaration identifier that matches the Block name', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'PeopleDefinition',
        Testing.callOfMember('Block', 'makeDefinition', [
          Testing.strLiteral('People'),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('requires a Namespace suffix for makeNamespace', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'PeopleDefinition',
        Testing.callOfMember('Block', 'makeNamespace', [
          Testing.strLiteral('People'),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      '"PeopleDefinition" must be "PeopleNamespace"',
    )
  })

  it('allows the Block name with a Namespace suffix', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'PeopleNamespace',
        Testing.callOfMember('Block', 'makeNamespace', [
          Testing.strLiteral('People'),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('checks the outer variable of a Composition', () => {
    const defineCall = Testing.callOfMember('Block', 'makeDefinition', [
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

  it('allows the Block name with a Definition suffix', () => {
    const defineCall = Testing.callOfMember('Block', 'makeDefinition', [
      Testing.strLiteral('PeopleDirectory'),
    ])
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator('PeopleDirectoryDefinition', defineCall),
    )

    expect(result).toHaveLength(0)
  })

  it('allows the Block name with a Composition suffix', () => {
    const defineCall = Testing.callOfMember('Block', 'makeDefinition', [
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

  it('unwraps a Namespace-authored Definition', () => {
    const namespace = Testing.callOfMember('Block', 'makeNamespace', [
      Testing.strLiteral('PeopleDirectory'),
    ])
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'PeopleDirectoryDefinition',
        callMethod(namespace, 'makeDefinition'),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('unwraps a Namespace-authored Composition', () => {
    const namespace = Testing.callOfMember('Block', 'makeNamespace', [
      Testing.strLiteral('PeopleDirectory'),
    ])
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'PeopleDirectoryComposition',
        callMethod(callMethod(namespace, 'makeDefinition'), 'makeComposition'),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('requires ApplicationDefinition for the Application Block', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'Application',
        Testing.callOfMember('Block', 'makeDefinition', [
          Testing.strLiteral('Application'),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      '"Application" must be "ApplicationDefinition"',
    )
  })

  it('requires ApplicationComposition after inline makeComposition', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'Application',
        callMethod(
          Testing.callOfMember('Block', 'makeDefinition', [
            Testing.strLiteral('Application'),
          ]),
          'makeComposition',
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      '"Application" must be "ApplicationComposition"',
    )
  })

  it('allows ApplicationDefinition for the Application Block', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'ApplicationDefinition',
        Testing.callOfMember('Block', 'makeDefinition', [
          Testing.strLiteral('Application'),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('does not give ApplicationDefinition special treatment for another Block', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'ApplicationDefinition',
        Testing.callOfMember('Block', 'makeDefinition', [
          Testing.strLiteral('Root'),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      '"ApplicationDefinition" must be "RootDefinition"',
    )
  })

  it('ignores dynamic Block names', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'People',
        Testing.callOfMember('Block', 'makeNamespace', [
          Testing.id('blockName'),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores unrelated makeDefinition methods', () => {
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'People',
        Testing.callOfMember('Registry', 'makeDefinition', [
          Testing.strLiteral('PeopleDirectory'),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores chains rooted in unrelated makeNamespace methods', () => {
    const unrelatedNamespace = Testing.callOfMember(
      'Registry',
      'makeNamespace',
      [Testing.strLiteral('PeopleDirectory')],
    )
    const result = Testing.runRule(
      blockNameMatchesVariable,
      'VariableDeclarator',
      variableDeclarator(
        'People',
        callMethod(unrelatedNamespace, 'makeDefinition'),
      ),
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
