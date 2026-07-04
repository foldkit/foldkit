import type { ESTree } from 'effect-oxlint'
import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { preferDomHelpersForElementOps } from '../../src/rules/prefer-dom-helpers-for-element-ops.ts'

type MockNode = { type: string } & Record<string, unknown>

const identifier = (name: string): MockNode => ({ type: 'Identifier', name })

const documentQueryCall = (queryMethod: string): MockNode => ({
  type: 'CallExpression',
  callee: {
    type: 'MemberExpression',
    object: identifier('document'),
    property: identifier(queryMethod),
    computed: false,
    optional: false,
  },
  arguments: [{ type: 'Literal', value: 'target' }],
})

const directChainCall = (
  queryExpression: MockNode,
  targetMethod: string,
  isOptionalMember = false,
): MockNode => ({
  type: 'CallExpression',
  callee: {
    type: 'MemberExpression',
    object: queryExpression,
    property: identifier(targetMethod),
    computed: false,
    optional: isOptionalMember,
  },
  arguments: [],
})

const queryDeclarator = (
  variableName: string,
  queryMethod: string,
  declarationKind: 'const' | 'let' = 'const',
): MockNode => {
  const declarator: MockNode = {
    type: 'VariableDeclarator',
    id: identifier(variableName),
    init: documentQueryCall(queryMethod),
  }
  declarator.parent = {
    type: 'VariableDeclaration',
    kind: declarationKind,
    declarations: [declarator],
  }
  return declarator
}

const targetUseIdentifier = (
  variableName: string,
  methodName: string,
): MockNode => {
  const useIdentifier = identifier(variableName)
  const member: MockNode = {
    type: 'MemberExpression',
    object: useIdentifier,
    property: identifier(methodName),
    computed: false,
    optional: false,
  }
  const call: MockNode = {
    type: 'CallExpression',
    callee: member,
    arguments: [],
  }
  useIdentifier.parent = member
  member.parent = call
  return useIdentifier
}

const chainedTargetUseIdentifier = (
  variableName: string,
  methodName: string,
): MockNode => {
  const useIdentifier = identifier(variableName)
  const member: MockNode = {
    type: 'MemberExpression',
    object: useIdentifier,
    property: identifier(methodName),
    computed: false,
    optional: true,
  }
  const chain: MockNode = { type: 'ChainExpression', expression: member }
  const call: MockNode = {
    type: 'CallExpression',
    callee: chain,
    arguments: [],
  }
  useIdentifier.parent = member
  member.parent = chain
  chain.parent = call
  return useIdentifier
}

const guardUseIdentifier = (variableName: string): MockNode => {
  const useIdentifier = identifier(variableName)
  const ifStatement: MockNode = {
    type: 'IfStatement',
    test: useIdentifier,
    consequent: { type: 'BlockStatement', body: [] },
    alternate: null,
  }
  useIdentifier.parent = ifStatement
  return useIdentifier
}

const callArgumentUseIdentifier = (variableName: string): MockNode => {
  const useIdentifier = identifier(variableName)
  const call: MockNode = {
    type: 'CallExpression',
    callee: identifier('doSomething'),
    arguments: [useIdentifier],
  }
  useIdentifier.parent = call
  return useIdentifier
}

const declaredVariable = (
  name: string,
  useIdentifiers: ReadonlyArray<MockNode>,
) => ({
  name,
  references: [
    { identifier: identifier(name), init: true },
    ...useIdentifiers.map(useIdentifier => ({
      identifier: useIdentifier,
      init: false,
    })),
  ],
})

const isNodeLike = (node: unknown): node is ESTree.Node =>
  typeof node === 'object' && node !== null && 'type' in node

type RunOptions = Readonly<{
  filename?: string
  isDocumentGlobal?: boolean
  declaredVariables?: ReadonlyArray<unknown>
}>

const runRule = (event: string, node: unknown, options: RunOptions = {}) => {
  const mock = Testing.createMockContext({
    filename: options.filename ?? '/app/src/command.ts',
  })
  Object.assign(mock.context.sourceCode, {
    isGlobalReference: () => options.isDocumentGlobal ?? true,
    getDeclaredVariables: () => options.declaredVariables ?? [],
  })
  const visitors = preferDomHelpersForElementOps.create(mock.context)
  const handler = visitors[event]
  if (handler !== undefined && isNodeLike(node)) {
    handler(node)
  }
  return mock.diagnostics
}

describe('prefer-dom-helpers-for-element-ops', () => {
  it.each(['focus', 'scrollIntoView', 'click', 'showModal', 'close'])(
    'flags %s called directly on a getElementById chain',
    targetMethod => {
      const result = runRule(
        'CallExpression',
        directChainCall(
          documentQueryCall('getElementById'),
          targetMethod,
          true,
        ),
      )

      expect(result).toHaveLength(1)
      expect(result[0]?.diagnostic.message).toContain('Dom')
      expect(result[0]?.diagnostic.message).toContain(`\`${targetMethod}\``)
    },
  )

  it('flags a target method on a querySelector chain', () => {
    const result = runRule(
      'CallExpression',
      directChainCall(documentQueryCall('querySelector'), 'showModal'),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('document.querySelector')
    expect(result[0]?.diagnostic.message).toContain('Dom.showDialog')
  })

  it('flags a chain through a non-null assertion', () => {
    const result = runRule(
      'CallExpression',
      directChainCall(
        {
          type: 'TSNonNullExpression',
          expression: documentQueryCall('getElementById'),
        },
        'close',
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Dom.closeDialog')
  })

  it('flags a chain through a parenthesized as-cast', () => {
    const result = runRule(
      'CallExpression',
      directChainCall(
        {
          type: 'ParenthesizedExpression',
          expression: {
            type: 'TSAsExpression',
            expression: documentQueryCall('getElementById'),
          },
        },
        'showModal',
      ),
    )

    expect(result).toHaveLength(1)
  })

  it('flags a const query variable used for a guard and a target call', () => {
    const result = runRule(
      'VariableDeclarator',
      queryDeclarator('el', 'getElementById'),
      {
        declaredVariables: [
          declaredVariable('el', [
            guardUseIdentifier('el'),
            targetUseIdentifier('el', 'focus'),
          ]),
        ],
      },
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('document.getElementById')
    expect(result[0]?.diagnostic.message).toContain('`el`')
  })

  it('flags a const query variable whose sole use is a target call', () => {
    const result = runRule(
      'VariableDeclarator',
      queryDeclarator('el', 'getElementById'),
      {
        declaredVariables: [
          declaredVariable('el', [targetUseIdentifier('el', 'scrollIntoView')]),
        ],
      },
    )

    expect(result).toHaveLength(1)
  })

  it('flags a const query variable with an optional-chained target call', () => {
    const result = runRule(
      'VariableDeclarator',
      queryDeclarator('el', 'querySelector'),
      {
        declaredVariables: [
          declaredVariable('el', [chainedTargetUseIdentifier('el', 'focus')]),
        ],
      },
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('document.querySelector')
  })

  it('flags inside subscription files', () => {
    const result = runRule(
      'CallExpression',
      directChainCall(documentQueryCall('getElementById'), 'focus'),
      { filename: '/app/src/subscriptions.ts' },
    )

    expect(result).toHaveLength(1)
  })

  it('flags with Windows path separators in the filename', () => {
    const result = runRule(
      'CallExpression',
      directChainCall(documentQueryCall('getElementById'), 'focus'),
      { filename: 'C:\\app\\src\\command.ts' },
    )

    expect(result).toHaveLength(1)
  })

  it('allows non-target methods on a direct query chain', () => {
    const result = runRule(
      'CallExpression',
      directChainCall(documentQueryCall('getElementById'), 'setSelectionRange'),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a direct chain when document is not a global reference', () => {
    const result = runRule(
      'CallExpression',
      directChainCall(documentQueryCall('getElementById'), 'focus'),
      { isDocumentGlobal: false },
    )

    expect(result).toHaveLength(0)
  })

  it('allows a direct chain in a non-gated file', () => {
    const result = runRule(
      'CallExpression',
      directChainCall(documentQueryCall('getElementById'), 'focus'),
      { filename: '/app/src/view.ts' },
    )

    expect(result).toHaveLength(0)
  })

  it('allows query methods outside the query set', () => {
    const result = runRule(
      'CallExpression',
      directChainCall(documentQueryCall('querySelectorAll'), 'focus'),
    )

    expect(result).toHaveLength(0)
  })

  it('allows member paths longer than document.<method>', () => {
    const windowDocumentQuery: MockNode = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: Testing.memberExpr('window', 'document'),
        property: identifier('getElementById'),
        computed: false,
        optional: false,
      },
      arguments: [{ type: 'Literal', value: 'target' }],
    }
    const result = runRule(
      'CallExpression',
      directChainCall(windowDocumentQuery, 'focus'),
    )

    expect(result).toHaveLength(0)
  })

  it('allows computed target member access', () => {
    const result = runRule('CallExpression', {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: documentQueryCall('getElementById'),
        property: identifier('focus'),
        computed: true,
        optional: false,
      },
      arguments: [],
    })

    expect(result).toHaveLength(0)
  })

  it('allows a query variable that is also passed to unrelated code', () => {
    const result = runRule(
      'VariableDeclarator',
      queryDeclarator('el', 'getElementById'),
      {
        declaredVariables: [
          declaredVariable('el', [
            targetUseIdentifier('el', 'focus'),
            callArgumentUseIdentifier('el'),
          ]),
        ],
      },
    )

    expect(result).toHaveLength(0)
  })

  it('allows a query variable with a target method plus a non-target method', () => {
    const result = runRule(
      'VariableDeclarator',
      queryDeclarator('el', 'getElementById'),
      {
        declaredVariables: [
          declaredVariable('el', [
            targetUseIdentifier('el', 'focus'),
            targetUseIdentifier('el', 'setSelectionRange'),
          ]),
        ],
      },
    )

    expect(result).toHaveLength(0)
  })

  it('allows a query variable with guard-only references', () => {
    const result = runRule(
      'VariableDeclarator',
      queryDeclarator('el', 'getElementById'),
      {
        declaredVariables: [declaredVariable('el', [guardUseIdentifier('el')])],
      },
    )

    expect(result).toHaveLength(0)
  })

  it('allows a let query variable with a target call', () => {
    const result = runRule(
      'VariableDeclarator',
      queryDeclarator('el', 'getElementById', 'let'),
      {
        declaredVariables: [
          declaredVariable('el', [targetUseIdentifier('el', 'focus')]),
        ],
      },
    )

    expect(result).toHaveLength(0)
  })

  it('allows a declarator when document is not a global reference', () => {
    const result = runRule(
      'VariableDeclarator',
      queryDeclarator('el', 'getElementById'),
      {
        isDocumentGlobal: false,
        declaredVariables: [
          declaredVariable('el', [targetUseIdentifier('el', 'focus')]),
        ],
      },
    )

    expect(result).toHaveLength(0)
  })

  it('allows destructured declarator ids', () => {
    const declarator: MockNode = {
      type: 'VariableDeclarator',
      id: { type: 'ArrayPattern', elements: [identifier('el')] },
      init: documentQueryCall('getElementById'),
    }
    declarator.parent = {
      type: 'VariableDeclaration',
      kind: 'const',
      declarations: [declarator],
    }
    const result = runRule('VariableDeclarator', declarator)

    expect(result).toHaveLength(0)
  })

  it('allows initializers that are not direct query calls', () => {
    const declarator: MockNode = {
      type: 'VariableDeclarator',
      id: identifier('el'),
      init: Testing.callExpr('maybeQuery'),
    }
    declarator.parent = {
      type: 'VariableDeclaration',
      kind: 'const',
      declarations: [declarator],
    }
    const result = runRule('VariableDeclarator', declarator, {
      declaredVariables: [
        declaredVariable('el', [targetUseIdentifier('el', 'focus')]),
      ],
    })

    expect(result).toHaveLength(0)
  })
})
