import type { ESTree } from 'effect-oxlint'
import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/no-impure-calls-in-pure-layer.ts'

const updateFile = '/repo/apps/ui/src/page/tasks/update.ts'
const viewFile = '/repo/apps/ui/src/page/tasks/view/row.ts'
const commandFile = '/repo/apps/ui/src/page/tasks/command.ts'

const runCall = (
  node: ESTree.CallExpression,
  opts: {
    readonly filename?: string
    readonly isGlobalReference?: boolean
  } = {},
) => {
  const mock = Testing.createMockContext({
    filename: opts.filename ?? updateFile,
  })
  Object.defineProperty(mock.context.sourceCode, 'isGlobalReference', {
    value: () => opts.isGlobalReference ?? true,
  })
  const visitors = rule.create(mock.context)
  visitors.CallExpression?.(node)
  return mock.diagnostics
}

const runNew = (
  node: ESTree.NewExpression,
  opts: {
    readonly filename?: string
  } = {},
) => {
  const mock = Testing.createMockContext({
    filename: opts.filename ?? updateFile,
  })
  const visitors = rule.create(mock.context)
  visitors.NewExpression?.(node)
  return mock.diagnostics
}

const runIdentifier = (
  node: ESTree.IdentifierName,
  opts: {
    readonly filename?: string
    readonly isGlobalReference?: boolean
  } = {},
) => {
  const mock = Testing.createMockContext({
    filename: opts.filename ?? viewFile,
  })
  Object.defineProperty(mock.context.sourceCode, 'isGlobalReference', {
    value: () => opts.isGlobalReference ?? true,
  })
  const visitors = rule.create(mock.context)
  visitors.Identifier?.(node)
  return mock.diagnostics
}

describe('no-impure-calls-in-pure-layer', () => {
  it('flags `Date.now()` in update files', () => {
    const result = runCall(Testing.callOfMember('Date', 'now'))
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Date.now')
  })

  it('flags `Math.random()` in view subdirectories', () => {
    const result = runCall(Testing.callOfMember('Math', 'random'), {
      filename: viewFile,
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Math.random')
  })

  it('flags `performance.now()` and `crypto.randomUUID()`', () => {
    const performanceResult = runCall(
      Testing.callOfMember('performance', 'now'),
    )
    const cryptoResult = runCall(Testing.callOfMember('crypto', 'randomUUID'))
    expect(performanceResult).toHaveLength(1)
    expect(cryptoResult).toHaveLength(1)
  })

  it('flags zero-argument `new Date()`', () => {
    const result = runNew(Testing.newExpr('Date'))
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('new Date()')
  })

  it('does not flag `new Date(value)`', () => {
    const result = runNew(Testing.newExpr('Date', [Testing.id('value')]))
    expect(result).toHaveLength(0)
  })

  it('flags global browser identifiers like `window`', () => {
    const result = runIdentifier(Testing.id('window'))
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('window')
  })

  it('does not flag shadowed browser identifiers', () => {
    const result = runIdentifier(Testing.id('document'), {
      isGlobalReference: false,
    })
    expect(result).toHaveLength(0)
  })

  it('does not flag static object property keys named like globals', () => {
    const key = Testing.id('window')
    const property = {
      type: 'Property',
      computed: false,
      key,
      value: Testing.strLiteral('ok'),
    }
    Object.defineProperty(key, 'parent', { value: property })
    const result = runIdentifier(key)
    expect(result).toHaveLength(0)
  })

  it('flags any `.addEventListener(...)` call', () => {
    const result = runCall(
      Testing.callOfMember('element', 'addEventListener', [
        Testing.strLiteral('click'),
        Testing.arrowFn(),
      ]),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('addEventListener')
  })

  it('does not flag impure calls inside `Command.define` factories', () => {
    const dateNow = Testing.callOfMember('Date', 'now')
    const defineCall = Testing.callOfMember('Command', 'define', [dateNow])
    Object.defineProperty(dateNow, 'parent', { value: defineCall })
    const result = runCall(dateNow)
    expect(result).toHaveLength(0)
  })

  it('does not run outside pure-layer files', () => {
    const result = runCall(Testing.callOfMember('Date', 'now'), {
      filename: commandFile,
    })
    expect(result).toHaveLength(0)
  })
})
