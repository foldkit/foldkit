import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { requireSucceededFailedPair } from '../../src/rules/require-succeeded-failed-pair.ts'

const m = (tag: string) => Testing.callExpr('m', [Testing.strLiteral(tag)])

const runFile = (calls: ReadonlyArray<unknown>) =>
  Testing.runRuleMulti(requireSucceededFailedPair, [
    ...calls.map((call): readonly [string, unknown] => [
      'CallExpression',
      call,
    ]),
    ['Program:exit', Testing.program()],
  ])

describe('require-succeeded-failed-pair', () => {
  it('flags a lone Succeeded tag', () => {
    const result = runFile([m('SucceededFetchUser')])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('SucceededFetchUser')
    expect(result[0]?.diagnostic.message).toContain('FailedFetchUser')
  })

  it('flags only the unpaired action in a mixed file', () => {
    const result = runFile([
      m('SucceededFetchUser'),
      m('FailedFetchUser'),
      m('SucceededSaveDraft'),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('SucceededSaveDraft')
  })

  it('flags every unpaired Succeeded action', () => {
    const result = runFile([m('SucceededFetchUser'), m('SucceededSaveDraft')])

    expect(result).toHaveLength(2)
  })

  it('reports one diagnostic for duplicate Succeeded tags', () => {
    const result = runFile([m('SucceededFetchUser'), m('SucceededFetchUser')])

    expect(result).toHaveLength(1)
  })

  it('allows a complete pair', () => {
    const result = runFile([m('SucceededFetchUser'), m('FailedFetchUser')])

    expect(result).toHaveLength(0)
  })

  it('allows a lone Failed tag', () => {
    const result = runFile([m('FailedSomethingOrOther')])

    expect(result).toHaveLength(0)
  })

  it('ignores calls whose callee is not m', () => {
    const result = runFile([
      Testing.callExpr('foo', [Testing.strLiteral('SucceededWhatever')]),
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores a prefix without a word boundary', () => {
    const result = runFile([m('Succeededness')])

    expect(result).toHaveLength(0)
  })

  it('ignores m calls without a string literal first argument', () => {
    const result = runFile([
      Testing.callExpr('m', [Testing.id('tag')]),
      Testing.callExpr('m'),
    ])

    expect(result).toHaveLength(0)
  })
})
