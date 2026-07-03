import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/require-succeeded-failed-pair.ts'

const m = (tag: string) => Testing.callExpr('m', [Testing.strLiteral(tag)])

const programExit = ['Program:exit', { type: 'Program' }] as const

describe('require-succeeded-failed-pair', () => {
  it('flags a `Succeeded*` Message with no matching `Failed*`', () => {
    const result = Testing.runRuleMulti(rule, [
      ['CallExpression', m('SucceededFetchUser')],
      programExit,
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('SucceededFetchUser')
    expect(result[0]?.diagnostic.message).toContain('FailedFetchUser')
  })

  it('does not flag when both `Succeeded*` and `Failed*` are present', () => {
    const result = Testing.runRuleMulti(rule, [
      ['CallExpression', m('SucceededFetchUser')],
      ['CallExpression', m('FailedFetchUser')],
      programExit,
    ])
    expect(result).toHaveLength(0)
  })

  it('flags only the `Succeeded*` that lacks its `Failed*` partner', () => {
    const result = Testing.runRuleMulti(rule, [
      ['CallExpression', m('SucceededFetchUser')],
      ['CallExpression', m('FailedFetchUser')], // paired
      ['CallExpression', m('SucceededSaveDraft')], // unpaired
      programExit,
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('SucceededSaveDraft')
  })

  it('flags multiple unpaired `Succeeded*` Messages', () => {
    const result = Testing.runRuleMulti(rule, [
      ['CallExpression', m('SucceededFetchUser')],
      ['CallExpression', m('SucceededSaveDraft')],
      programExit,
    ])
    expect(result).toHaveLength(2)
  })

  it('does not flag a `Failed*` Message without a matching `Succeeded*`', () => {
    // The rule is asymmetric — it only walks `Succeeded*` ⟶ `Failed*`,
    // since a Failure on its own (e.g. validation failure) is meaningful.
    const result = Testing.runRuleMulti(rule, [
      ['CallExpression', m('FailedSomethingOrOther')],
      programExit,
    ])
    expect(result).toHaveLength(0)
  })

  it('does not flag non-`m` calls', () => {
    const result = Testing.runRuleMulti(rule, [
      [
        'CallExpression',
        Testing.callExpr('foo', [Testing.strLiteral('SucceededWhatever')]),
      ],
      programExit,
    ])
    expect(result).toHaveLength(0)
  })

  it('does not flag prefix-without-word-boundary tags', () => {
    // `Succeededness` does not match `^Succeeded[A-Z]` — not classified as a pair candidate.
    const result = Testing.runRuleMulti(rule, [
      ['CallExpression', m('Succeededness')],
      programExit,
    ])
    expect(result).toHaveLength(0)
  })
})
