import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/prefer-option-match-over-map-getorelse.ts'

const optionMap = (...args: ReadonlyArray<unknown>) =>
  Testing.callOfMember('Option', 'map', args)

const optionGetOrElse = (...args: ReadonlyArray<unknown>) =>
  Testing.callOfMember('Option', 'getOrElse', args)

const optionMatch = (...args: ReadonlyArray<unknown>) =>
  Testing.callOfMember('Option', 'match', args)

describe('prefer-option-match-over-map-getorelse', () => {
  // ── method-form pipe: Option.map(...).pipe(Option.getOrElse(...)) ──
  it('flags `Option.map(...).pipe(Option.getOrElse(...))`', () => {
    const node = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: optionMap(Testing.arrowFn()),
        property: Testing.id('pipe'),
        computed: false,
        optional: false,
      },
      arguments: [optionGetOrElse(Testing.arrowFn())],
    }
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Option.match')
  })

  // ── freestanding pipe form: pipe(value, Option.map, Option.getOrElse) ──
  it('flags `pipe(value, Option.map(...), Option.getOrElse(...))`', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('pipe', [
        Testing.id('value'),
        optionMap(Testing.arrowFn()),
        optionGetOrElse(Testing.arrowFn()),
      ]),
    )
    expect(result).toHaveLength(1)
  })

  it('flags pipe with `Option.map` ⟶ `Option.getOrElse` even when other steps surround them', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('pipe', [
        Testing.id('value'),
        optionMap(Testing.arrowFn()),
        optionGetOrElse(Testing.arrowFn()),
        Testing.callExpr('trimEnd'),
      ]),
    )
    expect(result).toHaveLength(1)
  })

  // ── correct usage ────────────────────────────────────────
  it('does not flag direct `Option.match(...)`', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      optionMatch(Testing.id('opt'), Testing.objectExpr([])),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag a pipe with only `Option.map` and no `Option.getOrElse`', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('pipe', [
        Testing.id('value'),
        optionMap(Testing.arrowFn()),
        Testing.callOfMember('Option', 'flatMap', [Testing.arrowFn()]),
      ]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag a pipe with only `Option.getOrElse` and no `Option.map`', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('pipe', [
        Testing.id('value'),
        optionGetOrElse(Testing.arrowFn()),
      ]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag `Option.map(...).pipe(...)` without `Option.getOrElse`', () => {
    const node = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: optionMap(Testing.arrowFn()),
        property: Testing.id('pipe'),
        computed: false,
        optional: false,
      },
      arguments: [
        Testing.callOfMember('Option', 'flatMap', [Testing.arrowFn()]),
      ],
    }
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })
})
