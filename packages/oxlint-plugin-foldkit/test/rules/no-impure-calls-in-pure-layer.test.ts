import type { CreateRule, OxlintScope, Variable } from 'effect-oxlint'
import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noImpureCallsInPureLayer } from '../../src/rules/no-impure-calls-in-pure-layer.ts'

const UPDATE_FILENAME = '/repo/apps/ui/src/page/tasks/update.ts'
const VIEW_ROW_FILENAME = '/repo/apps/ui/src/page/tasks/view/row.ts'
const COMMAND_FILENAME = '/repo/apps/ui/src/page/tasks/command.ts'

const isVisitorHandler = (value: unknown): value is (node: unknown) => void =>
  typeof value === 'function'

const locallyBoundVariable = (name: string): Variable => {
  const bindingIdentifier = Testing.id(name)
  return {
    ...Testing.variable(name),
    defs: [
      {
        type: 'Variable',
        name: bindingIdentifier,
        node: bindingIdentifier,
        parent: null,
      },
    ],
  }
}

const runRuleWithLocalBinding = (
  rule: CreateRule,
  event: string,
  node: unknown,
  localName: string,
  filename: string,
): ReadonlyArray<Testing.ReportedDiagnostic> => {
  const mock = Testing.createMockContext({ filename })
  const scopeWithLocalBinding: OxlintScope = Testing.scope({
    variables: [locallyBoundVariable(localName)],
  })
  const context = {
    ...mock.context,
    sourceCode: {
      ...mock.context.sourceCode,
      getScope: () => scopeWithLocalBinding,
    },
  }
  const visitors: Record<string, unknown> = rule.create(context)
  const handler = visitors[event]
  if (isVisitorHandler(handler)) {
    handler(node)
  }
  return mock.diagnostics
}

const linkedMemberCall = (objectName: string, propertyName: string) => {
  const objectIdentifier: Record<string, unknown> = {
    type: 'Identifier',
    name: objectName,
  }
  const callee: Record<string, unknown> = {
    type: 'MemberExpression',
    object: objectIdentifier,
    property: Testing.id(propertyName),
    computed: false,
  }
  const call: Record<string, unknown> = {
    type: 'CallExpression',
    callee,
    arguments: [],
  }
  objectIdentifier.parent = callee
  callee.parent = call
  return { call, objectIdentifier }
}

describe('no-impure-calls-in-pure-layer', () => {
  it('flags Date.now() in update.ts', () => {
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'CallExpression',
      Testing.callOfMember('Date', 'now'),
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Date.now')
  })

  it('flags Math.random() in a view directory file', () => {
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'CallExpression',
      Testing.callOfMember('Math', 'random'),
      { filename: VIEW_ROW_FILENAME },
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Math.random')
  })

  it('flags performance.now() in update.ts', () => {
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'CallExpression',
      Testing.callOfMember('performance', 'now'),
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('performance.now')
  })

  it('flags crypto.randomUUID() in update.ts', () => {
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'CallExpression',
      Testing.callOfMember('crypto', 'randomUUID'),
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('crypto.randomUUID')
  })

  it('flags zero-argument new Date() in update.ts', () => {
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'NewExpression',
      Testing.newExpr('Date', []),
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('new Date()')
  })

  it('flags a bare window read in a view directory file', () => {
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'Identifier',
      Testing.id('window'),
      { filename: VIEW_ROW_FILENAME },
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('window')
  })

  it('flags addEventListener on any receiver', () => {
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'CallExpression',
      Testing.callOfMember('element', 'addEventListener', [
        Testing.strLiteral('click'),
        Testing.arrowFn(),
      ]),
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('listener')
  })

  it('flags the outer call of a curried impure member application', () => {
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'CallExpression',
      {
        type: 'CallExpression',
        callee: Testing.callOfMember('Date', 'now', [Testing.id('x')]),
        arguments: [Testing.id('y')],
      },
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Date.now')
  })

  it('flags a bare fetch call through the fetch identifier', () => {
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'Identifier',
      Testing.id('fetch'),
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('fetch')
  })

  it('flags shorthand object properties reading a global', () => {
    const windowIdentifier: Record<string, unknown> = {
      type: 'Identifier',
      name: 'window',
    }
    const shorthandProperty: Record<string, unknown> = {
      type: 'Property',
      key: windowIdentifier,
      value: windowIdentifier,
      computed: false,
    }
    windowIdentifier.parent = shorthandProperty
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'Identifier',
      windowIdentifier,
      { filename: VIEW_ROW_FILENAME },
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('window')
  })

  it('reports one diagnostic for an impure member call and its object', () => {
    const { call, objectIdentifier } = linkedMemberCall('performance', 'now')
    const result = Testing.runRuleMulti(
      noImpureCallsInPureLayer,
      [
        ['CallExpression', call],
        ['Identifier', objectIdentifier],
      ],
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('performance.now')
  })

  it('reports one diagnostic for window.addEventListener', () => {
    const { call, objectIdentifier } = linkedMemberCall(
      'window',
      'addEventListener',
    )
    const result = Testing.runRuleMulti(
      noImpureCallsInPureLayer,
      [
        ['CallExpression', call],
        ['Identifier', objectIdentifier],
      ],
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('listener')
  })

  it('still flags global reads on unlisted member calls', () => {
    const { call, objectIdentifier } = linkedMemberCall(
      'localStorage',
      'getItem',
    )
    const result = Testing.runRuleMulti(
      noImpureCallsInPureLayer,
      [
        ['CallExpression', call],
        ['Identifier', objectIdentifier],
      ],
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('localStorage')
  })

  it('allows new Date(value)', () => {
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'NewExpression',
      Testing.newExpr('Date', [Testing.id('value')]),
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(0)
  })

  it('allows identifiers that resolve to a local binding', () => {
    const result = runRuleWithLocalBinding(
      noImpureCallsInPureLayer,
      'Identifier',
      Testing.id('document'),
      'document',
      UPDATE_FILENAME,
    )

    expect(result).toHaveLength(0)
  })

  it('allows impure member calls on a locally bound object', () => {
    const result = runRuleWithLocalBinding(
      noImpureCallsInPureLayer,
      'CallExpression',
      Testing.callOfMember('performance', 'now'),
      'performance',
      UPDATE_FILENAME,
    )

    expect(result).toHaveLength(0)
  })

  it('allows global names as static object keys', () => {
    const windowIdentifier: Record<string, unknown> = {
      type: 'Identifier',
      name: 'window',
    }
    const staticKeyProperty: Record<string, unknown> = {
      type: 'Property',
      key: windowIdentifier,
      value: Testing.strLiteral('ok'),
      computed: false,
    }
    windowIdentifier.parent = staticKeyProperty
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'Identifier',
      windowIdentifier,
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(0)
  })

  it('allows global names in member property position', () => {
    const historyIdentifier: Record<string, unknown> = {
      type: 'Identifier',
      name: 'history',
    }
    const memberExpression: Record<string, unknown> = {
      type: 'MemberExpression',
      object: Testing.id('foo'),
      property: historyIdentifier,
      computed: false,
    }
    historyIdentifier.parent = memberExpression
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'Identifier',
      historyIdentifier,
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(0)
  })

  it('allows global names as type property signature keys', () => {
    const historyIdentifier: Record<string, unknown> = {
      type: 'Identifier',
      name: 'history',
    }
    const propertySignature: Record<string, unknown> = {
      type: 'TSPropertySignature',
      key: historyIdentifier,
      computed: false,
    }
    historyIdentifier.parent = propertySignature
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'Identifier',
      historyIdentifier,
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(0)
  })

  it('allows global names inside a typeof type query', () => {
    const windowIdentifier: Record<string, unknown> = {
      type: 'Identifier',
      name: 'window',
    }
    const typeQuery: Record<string, unknown> = {
      type: 'TSTypeQuery',
      exprName: windowIdentifier,
    }
    windowIdentifier.parent = typeQuery
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'Identifier',
      windowIdentifier,
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(0)
  })

  it('still flags a global read on the value side of an as-cast', () => {
    const windowIdentifier: Record<string, unknown> = {
      type: 'Identifier',
      name: 'window',
    }
    const asExpression: Record<string, unknown> = {
      type: 'TSAsExpression',
      expression: windowIdentifier,
    }
    windowIdentifier.parent = asExpression
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'Identifier',
      windowIdentifier,
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(1)
  })

  it('allows impure calls inside Command.define arguments', () => {
    const dateNowCall: Record<string, unknown> = {
      type: 'CallExpression',
      callee: Testing.memberExpr('Date', 'now'),
      arguments: [],
    }
    const commandDefinition: Record<string, unknown> = {
      type: 'CallExpression',
      callee: Testing.memberExpr('Command', 'define'),
      arguments: [Testing.strLiteral('FetchTime'), dateNowCall],
    }
    dateNowCall.parent = commandDefinition
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'CallExpression',
      dateNowCall,
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(0)
  })

  it('allows impure calls inside an applied factory definition', () => {
    const dateNowCall: Record<string, unknown> = {
      type: 'CallExpression',
      callee: Testing.memberExpr('Date', 'now'),
      arguments: [],
    }
    const application: Record<string, unknown> = {
      type: 'CallExpression',
      callee: Testing.callOfMember('Command', 'define', [
        Testing.strLiteral('FetchTime'),
      ]),
      arguments: [dateNowCall],
    }
    dateNowCall.parent = application
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'CallExpression',
      dateNowCall,
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(0)
  })

  it('never matches computed callee segments', () => {
    const result = Testing.runRule(
      noImpureCallsInPureLayer,
      'CallExpression',
      {
        type: 'CallExpression',
        callee: Testing.computedMemberExpr('Date', 'now'),
        arguments: [],
      },
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(0)
  })

  it('stays inert outside pure-layer files', () => {
    const impureCall = Testing.runRule(
      noImpureCallsInPureLayer,
      'CallExpression',
      Testing.callOfMember('Date', 'now'),
      { filename: COMMAND_FILENAME },
    )
    const globalRead = Testing.runRule(
      noImpureCallsInPureLayer,
      'Identifier',
      Testing.id('window'),
      { filename: COMMAND_FILENAME },
    )

    expect(impureCall).toHaveLength(0)
    expect(globalRead).toHaveLength(0)
  })
})
