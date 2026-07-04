import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { preferArrayFromoptionForOptionalCommand } from '../../src/rules/prefer-array-fromoption-for-optional-command.ts'

const arrayExpr = (elements: ReadonlyArray<unknown>) => ({
  type: 'ArrayExpression' as const,
  elements,
})

const optionMatch = (onNone: unknown, onSome: unknown) => ({
  type: 'CallExpression' as const,
  callee: Testing.memberExpr('Option', 'match'),
  arguments: [
    Testing.id('maybeReload'),
    Testing.objectExpr([
      { key: 'onNone', value: onNone },
      { key: 'onSome', value: onSome },
    ]),
  ],
  optional: false,
})

const run = (node: unknown) =>
  Testing.runRule(
    preferArrayFromoptionForOptionalCommand,
    'CallExpression',
    node,
  )

describe('prefer-array-fromoption-for-optional-command', () => {
  it('flags onNone: () => [], onSome: (command) => [command]', () => {
    const result = run(
      optionMatch(
        Testing.arrowFn(arrayExpr([])),
        Testing.arrowFn(arrayExpr([Testing.id('command')]), [
          Testing.id('command'),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Array.fromOption')
  })

  it('does not flag when onNone returns a non-empty array', () => {
    const result = run(
      optionMatch(
        Testing.arrowFn(arrayExpr([Testing.id('fallback')])),
        Testing.arrowFn(arrayExpr([Testing.id('command')]), [
          Testing.id('command'),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('does not flag when onSome returns a multi-element array', () => {
    const result = run(
      optionMatch(
        Testing.arrowFn(arrayExpr([])),
        Testing.arrowFn(
          arrayExpr([Testing.id('command'), Testing.id('other')]),
          [Testing.id('command')],
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('does not flag when onSome returns the bare param (not wrapped)', () => {
    const result = run(
      optionMatch(
        Testing.arrowFn(arrayExpr([])),
        Testing.arrowFn(Testing.id('command'), [Testing.id('command')]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores non-Option.match calls', () => {
    const result = run({
      type: 'CallExpression',
      callee: Testing.memberExpr('Option', 'map'),
      arguments: [
        Testing.id('maybeReload'),
        Testing.arrowFn(arrayExpr([Testing.id('command')]), [
          Testing.id('command'),
        ]),
      ],
      optional: false,
    })

    expect(result).toHaveLength(0)
  })
})
