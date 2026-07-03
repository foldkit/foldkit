import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/no-changed-message-prefix.ts'

describe('no-changed-message-prefix', () => {
  it('flags `m("ChangedEmail")`', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('m', [Testing.strLiteral('ChangedEmail')]),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('UpdatedEmail')
  })

  it('flags exact `m("Changed")` (boundary case)', () => {
    // `Changed` followed by end-of-string — still a `Changed*` tag.
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('m', [Testing.strLiteral('Changed')]),
    )
    expect(result).toHaveLength(1)
  })

  it('does not flag `m("UpdatedEmail")`', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('m', [Testing.strLiteral('UpdatedEmail')]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag route-change messages', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('m', [Testing.strLiteral('ChangedRoute')]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag URL-change messages', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('m', [Testing.strLiteral('ChangedUrl')]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag `m("ChangelogOpened")` — `Change` prefix without word boundary', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('m', [Testing.strLiteral('ChangelogOpened')]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag non-`m` calls with the same shape', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('something', [Testing.strLiteral('ChangedEmail')]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag `m(...)` with non-string first argument', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('m', [Testing.numLiteral(42)]),
    )
    expect(result).toHaveLength(0)
  })
})
