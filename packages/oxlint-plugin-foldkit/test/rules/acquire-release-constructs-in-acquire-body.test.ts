import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { acquireReleaseConstructsInAcquireBody } from '../../src/rules/acquire-release-constructs-in-acquire-body.ts'

const acquireRelease = (acquire: unknown) => ({
  type: 'CallExpression' as const,
  callee: Testing.memberExpr('Effect', 'acquireRelease'),
  arguments: [acquire, Testing.arrowFn()],
  optional: false,
})

const effectSync = (body: unknown) => ({
  type: 'CallExpression' as const,
  callee: Testing.memberExpr('Effect', 'sync'),
  arguments: [Testing.arrowFn(body)],
  optional: false,
})

const effectSucceed = (arg: unknown) => ({
  type: 'CallExpression' as const,
  callee: Testing.memberExpr('Effect', 'succeed'),
  arguments: [arg],
  optional: false,
})

const run = (node: unknown) =>
  Testing.runRule(acquireReleaseConstructsInAcquireBody, 'CallExpression', node)

describe('acquire-release-constructs-in-acquire-body', () => {
  it('flags Effect.sync(() => socket) acquire', () => {
    const result = run(acquireRelease(effectSync(Testing.id('socket'))))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('acquire')
  })

  it('flags Effect.succeed(conn) acquire', () => {
    const result = run(acquireRelease(effectSucceed(Testing.id('conn'))))

    expect(result).toHaveLength(1)
  })

  it('allows Effect.sync(() => new WebSocket(url))', () => {
    const result = run(
      acquireRelease(effectSync(Testing.newExpr('WebSocket', [Testing.id('url')]))),
    )

    expect(result).toHaveLength(0)
  })

  it('allows Effect.sync(() => makeSocket()) (factory call)', () => {
    const result = run(
      acquireRelease(effectSync(Testing.callExpr('makeSocket'))),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores non-acquireRelease calls', () => {
    const result = run({
      type: 'CallExpression',
      callee: Testing.memberExpr('Effect', 'scoped'),
      arguments: [effectSync(Testing.id('socket'))],
      optional: false,
    })

    expect(result).toHaveLength(0)
  })
})
