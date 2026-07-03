import type { ESTree } from 'effect-oxlint'
import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/prefer-dom-helpers-for-element-ops.ts'

const commandFile = '/repo/apps/ui/src/page/chat/command.ts'
const viewFile = '/repo/apps/ui/src/page/chat/view.ts'

const parent = (child: object, value: object) => {
  Object.defineProperty(child, 'parent', { value })
}

const runCall = (
  node: ESTree.CallExpression,
  isGlobalReference = true,
  filename = commandFile,
) => {
  const { context, diagnostics } = Testing.createMockContext({ filename })
  Object.defineProperty(context.sourceCode, 'isGlobalReference', {
    value: () => isGlobalReference,
  })
  const visitors = rule.create(context)
  visitors.CallExpression?.(node)
  return diagnostics
}

const runDeclarator = (
  node: ESTree.VariableDeclarator,
  references: ReadonlyArray<{
    readonly identifier: ESTree.IdentifierName
    readonly init: boolean
  }> = [],
  isGlobalReference = true,
  filename = commandFile,
) => {
  const { context, diagnostics } = Testing.createMockContext({ filename })
  Object.defineProperty(context.sourceCode, 'isGlobalReference', {
    value: () => isGlobalReference,
  })
  Object.defineProperty(context.sourceCode, 'getDeclaredVariables', {
    value: () => [
      {
        name: 'el',
        references,
      },
    ],
  })
  const visitors = rule.create(context)
  visitors.VariableDeclarator?.(node)
  return diagnostics
}

const documentQuery = (
  method: 'getElementById' | 'querySelector' = 'getElementById',
) => Testing.callOfMember('document', method, [Testing.strLiteral('target')])

const methodCallOn = (receiver: unknown, method: string, optional = false) => {
  const node = Testing.callExpr('placeholder')
  Object.defineProperty(node, 'callee', {
    value: {
      type: 'MemberExpression',
      object: receiver,
      property: Testing.id(method),
      computed: false,
      optional,
    },
  })
  Object.defineProperty(node, 'optional', { value: false })
  return node
}

const constQueryDeclarator = () => {
  const declarator = Testing.varDeclarator('el', documentQuery())
  parent(declarator, {
    type: 'VariableDeclaration',
    kind: 'const',
    declarations: [declarator],
  })
  return declarator
}

const receiverReference = (method: string) => {
  const identifier = Testing.id('el')
  const member = {
    type: 'MemberExpression',
    object: identifier,
    property: Testing.id(method),
    computed: false,
    optional: false,
  }
  const call = { type: 'CallExpression', callee: member, arguments: [] }
  parent(identifier, member)
  parent(member, call)
  return identifier
}

const ifGuardReference = () => {
  const identifier = Testing.id('el')
  const statement = Testing.ifStmt(identifier)
  parent(identifier, statement)
  return identifier
}

const argumentReference = () => {
  const identifier = Testing.id('el')
  const call = Testing.callExpr('doSomething', [identifier])
  parent(identifier, call)
  return identifier
}

const reference = (identifier: ESTree.IdentifierName) => ({
  identifier,
  init: false,
})

describe('prefer-dom-helpers-for-element-ops', () => {
  it.each(['focus', 'scrollIntoView', 'click', 'showModal', 'close'])(
    'flags direct document query `%s()` calls in command files',
    method => {
      const result = runCall(methodCallOn(documentQuery(), method, true))
      expect(result).toHaveLength(1)
      expect(result[0]?.diagnostic.message).toContain('Dom')
      expect(result[0]?.diagnostic.message).toContain(method)
    },
  )

  it('flags direct querySelector chains', () => {
    const result = runCall(
      methodCallOn(documentQuery('querySelector'), 'showModal'),
    )
    expect(result).toHaveLength(1)
  })

  it('does not flag unrelated direct DOM calls', () => {
    const result = runCall(methodCallOn(documentQuery(), 'setSelectionRange'))
    expect(result).toHaveLength(0)
  })

  it('does not flag local document-shaped values', () => {
    const result = runCall(methodCallOn(documentQuery(), 'focus'), false)
    expect(result).toHaveLength(0)
  })

  it('does not run outside command/subscription files', () => {
    const result = runCall(
      methodCallOn(documentQuery(), 'focus'),
      true,
      viewFile,
    )
    expect(result).toHaveLength(0)
  })

  it('flags query variables whose only reads are target method receivers plus existence guards', () => {
    const result = runDeclarator(constQueryDeclarator(), [
      reference(ifGuardReference()),
      reference(receiverReference('focus')),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('document.getElementById')
  })

  it('flags query variables used as optional target method receivers', () => {
    const result = runDeclarator(constQueryDeclarator(), [
      reference(receiverReference('scrollIntoView')),
    ])
    expect(result).toHaveLength(1)
  })

  it('does not flag query variables also passed to unrelated code', () => {
    const result = runDeclarator(constQueryDeclarator(), [
      reference(receiverReference('focus')),
      reference(argumentReference()),
    ])
    expect(result).toHaveLength(0)
  })

  it('does not flag focus plus setSelectionRange pairs', () => {
    const result = runDeclarator(constQueryDeclarator(), [
      reference(receiverReference('focus')),
      reference(receiverReference('setSelectionRange')),
    ])
    expect(result).toHaveLength(0)
  })

  it('does not flag query variables with no target method receiver reads', () => {
    const result = runDeclarator(constQueryDeclarator(), [
      reference(ifGuardReference()),
    ])
    expect(result).toHaveLength(0)
  })

  it('does not flag non-const query variables', () => {
    const declarator = Testing.varDeclarator('el', documentQuery())
    parent(declarator, {
      type: 'VariableDeclaration',
      kind: 'let',
      declarations: [declarator],
    })
    const result = runDeclarator(declarator, [
      reference(receiverReference('focus')),
    ])
    expect(result).toHaveLength(0)
  })
})
