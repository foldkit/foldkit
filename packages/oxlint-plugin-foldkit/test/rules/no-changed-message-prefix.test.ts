import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noChangedMessagePrefix } from '../../src/rules/no-changed-message-prefix.ts'

const m = (tag: string) => Testing.callExpr('m', [Testing.strLiteral(tag)])

const run = (node: unknown) =>
  Testing.runRule(noChangedMessagePrefix, 'CallExpression', node)

describe('no-changed-message-prefix', () => {
  it('flags a plain Changed tag with the precise-verb family', () => {
    const result = run(m('ChangedEmail'))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('ChangedEmail')
    expect(result[0]?.diagnostic.message).toContain('UpdatedEmail')
    expect(result[0]?.diagnostic.message).toContain('Selected* or Switched*')
    expect(result[0]?.diagnostic.message).toContain('Toggled*')
  })

  it('flags the bare Changed tag with a well formed message', () => {
    const result = run(m('Changed'))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Changed')
    expect(result[0]?.diagnostic.message).toContain('(Updated)')
  })

  it('flags a discrete-choice flavored tag with the family guidance', () => {
    const result = run(m('ChangedTheme'))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('ChangedTheme')
    expect(result[0]?.diagnostic.message).toContain('Selected* or Switched*')
    expect(result[0]?.diagnostic.message).toContain('Toggled*')
  })

  it('allows the recommended Updated prefix', () => {
    const result = run(m('UpdatedEmail'))

    expect(result).toHaveLength(0)
  })

  it('allows the route boundary event', () => {
    const result = run(m('ChangedRoute'))

    expect(result).toHaveLength(0)
  })

  it('allows the URL boundary event', () => {
    const result = run(m('ChangedUrl'))

    expect(result).toHaveLength(0)
  })

  it('allows a prefix without a word boundary', () => {
    const result = run(m('ChangelogOpened'))

    expect(result).toHaveLength(0)
  })

  it('ignores calls whose callee is not m', () => {
    const result = run(
      Testing.callExpr('something', [Testing.strLiteral('ChangedEmail')]),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores non-string first arguments', () => {
    const result = run(Testing.callExpr('m', [Testing.numLiteral(42)]))

    expect(result).toHaveLength(0)
  })
})
