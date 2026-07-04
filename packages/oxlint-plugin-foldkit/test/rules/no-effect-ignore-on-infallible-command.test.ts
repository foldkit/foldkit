import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noEffectIgnoreOnInfallibleCommand } from '../../src/rules/no-effect-ignore-on-infallible-command.ts'

const effectMember = (prop: string) => Testing.memberExpr('Effect', prop)

const pipeChain = (innerCalleeName: string, pipeArgs: ReadonlyArray<unknown>) => ({
  type: 'CallExpression' as const,
  callee: {
    type: 'MemberExpression' as const,
    object: {
      type: 'CallExpression' as const,
      callee: Testing.id(innerCalleeName),
      arguments: [],
      optional: false,
    },
    property: Testing.id('pipe'),
    computed: false,
    optional: false,
  },
  arguments: pipeArgs,
  optional: false,
})

const run = (node: unknown) =>
  Testing.runRule(noEffectIgnoreOnInfallibleCommand, 'CallExpression', node)

describe('no-effect-ignore-on-infallible-command', () => {
  it('flags Effect.ignore on pushUrl().pipe(...)', () => {
    const result = run(
      pipeChain('pushUrl', [effectMember('ignore'), effectMember('as')]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Effect.ignore')
  })

  it('flags Effect.ignore on replaceUrl().pipe(...)', () => {
    const result = run(pipeChain('replaceUrl', [effectMember('ignore')]))

    expect(result).toHaveLength(1)
  })

  it('allows a pipe without Effect.ignore', () => {
    const result = run(pipeChain('pushUrl', [effectMember('as')]))

    expect(result).toHaveLength(0)
  })

  it('ignores Effect.ignore on a non-nav (fallible) call', () => {
    const result = run(pipeChain('httpGet', [effectMember('ignore')]))

    expect(result).toHaveLength(0)
  })

  it('ignores a bare nav call without a pipe', () => {
    const result = run({
      type: 'CallExpression',
      callee: Testing.id('pushUrl'),
      arguments: [],
      optional: false,
    })

    expect(result).toHaveLength(0)
  })
})
