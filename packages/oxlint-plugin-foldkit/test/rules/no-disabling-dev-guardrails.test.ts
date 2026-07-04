import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noDisablingDevGuardrails } from '../../src/rules/no-disabling-dev-guardrails.ts'

const property = (key: string, value: unknown) => ({
  type: 'Property',
  key: Testing.id(key),
  value,
  computed: false,
})

const literalKeyProperty = (key: string, value: unknown) => ({
  type: 'Property',
  key: Testing.strLiteral(key),
  value,
  computed: false,
})

const computedProperty = (key: unknown, value: unknown) => ({
  type: 'Property',
  key,
  value,
  computed: true,
})

const spreadProperty = (name: string) => ({
  type: 'SpreadElement',
  argument: Testing.id(name),
})

const objectExpression = (properties: ReadonlyArray<unknown>) => ({
  type: 'ObjectExpression',
  properties,
})

describe('no-disabling-dev-guardrails', () => {
  it('flags freezeModel: false in a makeApplication config with a spread', () => {
    const result = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callExpr('makeApplication', [
        objectExpression([
          property('freezeModel', Testing.boolLiteral(false)),
          spreadProperty('rest'),
        ]),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('freezeModel: false')
  })

  it('flags slow: false in a makeApplication config', () => {
    const result = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callExpr('makeApplication', [
        objectExpression([property('slow', Testing.boolLiteral(false))]),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('slow: false')
  })

  it('flags slow: false in a makeElement config', () => {
    const result = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callExpr('makeElement', [
        objectExpression([property('slow', Testing.boolLiteral(false))]),
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('matches member callees by their last segment', () => {
    const result = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callOfMember('Foldkit', 'makeApplication', [
        objectExpression([property('freezeModel', Testing.boolLiteral(false))]),
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('flags string-literal guardrail keys', () => {
    const result = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callExpr('makeApplication', [
        objectExpression([
          literalKeyProperty('slow', Testing.boolLiteral(false)),
        ]),
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('reports each disabled guardrail independently', () => {
    const result = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callExpr('makeApplication', [
        objectExpression([
          property('slow', Testing.boolLiteral(false)),
          property('freezeModel', Testing.boolLiteral(false)),
        ]),
      ]),
    )

    expect(result).toHaveLength(2)
    expect(result[0]?.diagnostic.message).toContain('slow: false')
    expect(result[1]?.diagnostic.message).toContain('freezeModel: false')
  })

  it('allows guardrails set to true', () => {
    const result = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callExpr('makeApplication', [
        objectExpression([
          property('freezeModel', Testing.boolLiteral(true)),
          property('slow', Testing.boolLiteral(true)),
        ]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows dynamic values for guardrail keys', () => {
    const result = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callExpr('makeApplication', [
        objectExpression([property('slow', Testing.id('disabled'))]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows unrelated keys set to false', () => {
    const result = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callExpr('makeApplication', [
        objectExpression([
          property('devTools', Testing.boolLiteral(false)),
          property('container', Testing.boolLiteral(false)),
        ]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('skips computed guardrail-like keys', () => {
    const result = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callExpr('makeApplication', [
        objectExpression([
          computedProperty(
            Testing.strLiteral('slow'),
            Testing.boolLiteral(false),
          ),
          computedProperty(Testing.id('key'), Testing.boolLiteral(false)),
        ]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('never flags object-valued slow tuning', () => {
    const tuned = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callExpr('makeApplication', [
        objectExpression([
          property(
            'slow',
            objectExpression([
              property(
                'thresholdOverrides',
                objectExpression([property('View', Testing.numLiteral(32))]),
              ),
            ]),
          ),
        ]),
      ]),
    )
    const emptied = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callExpr('makeApplication', [
        objectExpression([property('slow', objectExpression([]))]),
      ]),
    )

    expect(tuned).toHaveLength(0)
    expect(emptied).toHaveLength(0)
  })

  it('ignores config objects bound to a variable first', () => {
    const config = objectExpression([
      property('slow', Testing.boolLiteral(false)),
      property('freezeModel', Testing.boolLiteral(false)),
    ])
    const result = Testing.runRuleMulti(noDisablingDevGuardrails, [
      ['ObjectExpression', config],
      [
        'CallExpression',
        Testing.callExpr('makeApplication', [Testing.id('config')]),
      ],
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores calls to non-factory functions', () => {
    const otherFactory = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callExpr('someOtherFactory', [
        objectExpression([property('slow', Testing.boolLiteral(false))]),
      ]),
    )
    const describeCall = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callExpr('describe', [
        objectExpression([property('slow', Testing.boolLiteral(false))]),
      ]),
    )

    expect(otherFactory).toHaveLength(0)
    expect(describeCall).toHaveLength(0)
  })

  it('ignores run and embed, which take a built program', () => {
    const runCall = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callExpr('run', [
        objectExpression([property('slow', Testing.boolLiteral(false))]),
      ]),
    )
    const embedCall = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callExpr('embed', [
        objectExpression([property('freezeModel', Testing.boolLiteral(false))]),
      ]),
    )

    expect(runCall).toHaveLength(0)
    expect(embedCall).toHaveLength(0)
  })

  it('does not scan nested object literals inside config values', () => {
    const result = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callExpr('makeApplication', [
        objectExpression([
          property(
            'devTools',
            objectExpression([property('slow', Testing.boolLiteral(false))]),
          ),
        ]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('does not recognize the slowView key', () => {
    const result = Testing.runRule(
      noDisablingDevGuardrails,
      'CallExpression',
      Testing.callExpr('makeApplication', [
        objectExpression([property('slowView', Testing.boolLiteral(false))]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('never matches computed callees', () => {
    const result = Testing.runRule(noDisablingDevGuardrails, 'CallExpression', {
      type: 'CallExpression',
      callee: Testing.computedMemberExpr('foldkit', 'makeApplication'),
      arguments: [
        objectExpression([property('slow', Testing.boolLiteral(false))]),
      ],
    })

    expect(result).toHaveLength(0)
  })
})
