import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/mount-factory-must-use-element.ts'

const mountDefine = (method: 'define' | 'defineStream', factory: unknown) => ({
  type: 'CallExpression',
  callee: Testing.callOfMember('Mount', method, [
    Testing.strLiteral('MountThing'),
    Testing.id('CompletedMountThing'),
  ]),
  arguments: [factory],
})

const elementEffect = (elementName = 'element') =>
  Testing.callExpr('useElement', [Testing.id(elementName)])

const elementFactory = (paramName: string, body: unknown) =>
  Testing.arrowFn(body, [Testing.id(paramName)])

const argsFactory = (inner: unknown) =>
  Testing.arrowFn(inner, [Testing.id('args')])

const blockReturning = (value: unknown) =>
  Testing.arrowFn(Testing.blockStmt([Testing.returnStmt(value)]), [
    Testing.id('args'),
  ])

describe('mount-factory-must-use-element', () => {
  it('allows `Mount.define(...)(element => Effect using element)`', () => {
    const node = mountDefine(
      'define',
      elementFactory('element', elementEffect()),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('allows `Mount.defineStream(...)(element => Stream using element)`', () => {
    const node = mountDefine(
      'defineStream',
      elementFactory('node', elementEffect('node')),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('flags argless Mount factories that never reference the element', () => {
    const node = mountDefine(
      'define',
      elementFactory('element', Testing.callExpr('analyticsPing')),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never used')
  })

  it('flags underscore-prefixed element parameters even when referenced', () => {
    const node = mountDefine(
      'define',
      elementFactory('_element', elementEffect('_element')),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('explicitly ignored')
  })

  it('flags factories with no element parameter', () => {
    const node = mountDefine('define', Testing.arrowFn(Testing.id('done')))
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('accept and use')
  })

  it('descends through args-form factories', () => {
    const node = mountDefine(
      'define',
      argsFactory(elementFactory('element', Testing.callExpr('doWork'))),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never used')
  })

  it('allows args-form factories whose inner element factory uses the element', () => {
    const node = mountDefine(
      'define',
      argsFactory(elementFactory('element', elementEffect())),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('descends through block-bodied args factories that return an element factory', () => {
    const node = mountDefine(
      'define',
      blockReturning(elementFactory('element', Testing.callExpr('doWork'))),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
  })

  it('does not count references to a shadowed nested parameter', () => {
    const shadowingCallback = Testing.callExpr('Effect.sync', [
      Testing.arrowFn(Testing.id('element'), [Testing.id('element')]),
    ])
    const node = mountDefine(
      'define',
      elementFactory('element', shadowingCallback),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
  })

  it('skips identifier-referenced factories', () => {
    const node = mountDefine('define', Testing.id('makeMount'))
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag the inner `Mount.define(...)` call before application', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callOfMember('Mount', 'define', [
        Testing.strLiteral('MountThing'),
        Testing.id('CompletedMountThing'),
      ]),
    )
    expect(result).toHaveLength(0)
  })

  it('ignores unrelated curried calls', () => {
    const node = {
      type: 'CallExpression',
      callee: Testing.callOfMember('Command', 'define', [
        Testing.strLiteral('DoThing'),
      ]),
      arguments: [elementFactory('element', Testing.callExpr('doWork'))],
    }
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })
})
