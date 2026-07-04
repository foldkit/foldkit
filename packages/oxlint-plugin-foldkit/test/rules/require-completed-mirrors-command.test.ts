import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { requireCompletedMirrorsCommand } from '../../src/rules/require-completed-mirrors-command.ts'

const m = (tag: string) => Testing.callExpr('m', [Testing.strLiteral(tag)])

const commandDefine = (nameArgument: unknown) =>
  Testing.callOfMember('Command', 'define', [nameArgument])

const runFile = (calls: ReadonlyArray<unknown>) =>
  Testing.runRuleMulti(requireCompletedMirrorsCommand, [
    ...calls.map((call): readonly [string, unknown] => [
      'CallExpression',
      call,
    ]),
    ['Program:exit', Testing.program()],
  ])

describe('require-completed-mirrors-command', () => {
  it('flags a noun-first ack next to its Command', () => {
    const result = runFile([
      commandDefine(Testing.strLiteral('FocusInput')),
      m('CompletedInputFocus'),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('CompletedInputFocus')
    expect(result[0]?.diagnostic.message).toContain('verb-first')
  })

  it('flags only the orphan in a mixed file', () => {
    const result = runFile([
      commandDefine(Testing.strLiteral('FocusInput')),
      commandDefine(Testing.strLiteral('FetchWeather')),
      m('CompletedFocusInput'),
      m('CompletedSomethingElse'),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('CompletedSomethingElse')
  })

  it('reports every non-mirroring Completed mention independently', () => {
    const result = runFile([
      commandDefine(Testing.strLiteral('FocusInput')),
      m('CompletedSomethingElse'),
      m('CompletedSomethingElse'),
    ])

    expect(result).toHaveLength(2)
  })

  it('allows an exact mirror', () => {
    const result = runFile([
      commandDefine(Testing.strLiteral('FocusInput')),
      m('CompletedFocusInput'),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows a mirror defined after the Completed Message', () => {
    const result = runFile([
      m('CompletedFocusInput'),
      commandDefine(Testing.strLiteral('FocusInput')),
    ])

    expect(result).toHaveLength(0)
  })

  it('stays silent in a file with no Commands', () => {
    const result = runFile([m('CompletedAnythingHere')])

    expect(result).toHaveLength(0)
  })

  it('allows non-Completed Messages alongside Commands', () => {
    const result = runFile([
      commandDefine(Testing.strLiteral('FocusInput')),
      m('SucceededFocusInput'),
      m('FailedFocusInput'),
      m('ClickedSubmit'),
    ])

    expect(result).toHaveLength(0)
  })

  it('stays silent when the only Command name is unextractable', () => {
    const result = runFile([
      commandDefine(Testing.id('someVar')),
      m('CompletedAnything'),
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores a prefix without a word boundary', () => {
    const result = runFile([
      commandDefine(Testing.strLiteral('FocusInput')),
      m('Completedness'),
    ])

    expect(result).toHaveLength(0)
  })
})
