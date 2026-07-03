import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/require-completed-mirrors-command.ts'

const m = (tag: string) => Testing.callExpr('m', [Testing.strLiteral(tag)])

const cmd = (name: string) =>
  Testing.callOfMember('Command', 'define', [
    Testing.strLiteral(name),
    Testing.arrowFn(), // body — not inspected by this rule
  ])

const programExit = ['Program:exit', { type: 'Program' }] as const

describe('require-completed-mirrors-command', () => {
  it('flags `m("CompletedX")` when no `Command.define("X", ...)` exists', () => {
    const result = Testing.runRuleMulti(rule, [
      ['CallExpression', cmd('FocusInput')],
      ['CallExpression', m('CompletedInputFocus')], // noun-first, not mirror
      programExit,
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('CompletedInputFocus')
    expect(result[0]?.diagnostic.message).toContain('verb-first')
  })

  it('does not flag `m("CompletedX")` that mirrors `Command.define("X", ...)`', () => {
    const result = Testing.runRuleMulti(rule, [
      ['CallExpression', cmd('FocusInput')],
      ['CallExpression', m('CompletedFocusInput')],
      programExit,
    ])
    expect(result).toHaveLength(0)
  })

  it('flags only the `Completed*` Messages that have no Command mirror', () => {
    const result = Testing.runRuleMulti(rule, [
      ['CallExpression', cmd('FocusInput')],
      ['CallExpression', cmd('FetchWeather')],
      ['CallExpression', m('CompletedFocusInput')], // mirrors
      ['CallExpression', m('CompletedSomethingElse')], // doesn't mirror
      programExit,
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('CompletedSomethingElse')
  })

  it('does NOT flag when the file defines no Commands at all', () => {
    // Files without any `Command.define` cannot give a confident judgment —
    // the `Completed*` may be defined elsewhere and re-used here.
    const result = Testing.runRuleMulti(rule, [
      ['CallExpression', m('CompletedAnythingHere')],
      programExit,
    ])
    expect(result).toHaveLength(0)
  })

  it('does not flag non-`Completed*` Messages', () => {
    const result = Testing.runRuleMulti(rule, [
      ['CallExpression', cmd('FocusInput')],
      ['CallExpression', m('SucceededFocusInput')],
      ['CallExpression', m('FailedFocusInput')],
      ['CallExpression', m('ClickedSubmit')],
      programExit,
    ])
    expect(result).toHaveLength(0)
  })

  it('does not crash when `Command.define` has a non-string first argument', () => {
    // `Command.define(someVar, ...)` — we cannot extract the action name,
    // so the file is treated as if no Command was defined at all.
    const result = Testing.runRuleMulti(rule, [
      [
        'CallExpression',
        Testing.callOfMember('Command', 'define', [
          Testing.id('someVar'),
          Testing.arrowFn(),
        ]),
      ],
      ['CallExpression', m('CompletedAnything')],
      programExit,
    ])
    expect(result).toHaveLength(0)
  })
})
