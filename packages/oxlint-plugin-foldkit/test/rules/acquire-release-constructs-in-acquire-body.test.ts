import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { acquireReleaseConstructsInAcquireBody } from '../../src/rules/acquire-release-constructs-in-acquire-body.ts'

const acquireRelease = (acquire: unknown) =>
  Testing.callOfMember('Effect', 'acquireRelease', [
    acquire,
    Testing.id('release'),
  ])

describe('acquire-release-constructs-in-acquire-body', () => {
  it('flags an acquire that syncs a captured identifier', () => {
    const result = Testing.runRule(
      acquireReleaseConstructsInAcquireBody,
      'CallExpression',
      acquireRelease(
        Testing.callOfMember('Effect', 'sync', [
          Testing.arrowFn(Testing.id('socket')),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('acquireRelease')
  })

  it('flags an acquire that succeeds a captured identifier', () => {
    const result = Testing.runRule(
      acquireReleaseConstructsInAcquireBody,
      'CallExpression',
      acquireRelease(
        Testing.callOfMember('Effect', 'succeed', [Testing.id('socket')]),
      ),
    )

    expect(result).toHaveLength(1)
  })

  it('allows an acquire that constructs in place', () => {
    const result = Testing.runRule(
      acquireReleaseConstructsInAcquireBody,
      'CallExpression',
      acquireRelease(
        Testing.callOfMember('Effect', 'sync', [
          Testing.arrowFn(Testing.callExpr('makeSocket')),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a named acquire Effect', () => {
    const result = Testing.runRule(
      acquireReleaseConstructsInAcquireBody,
      'CallExpression',
      acquireRelease(Testing.id('makeSocket')),
    )

    expect(result).toHaveLength(0)
  })
})
