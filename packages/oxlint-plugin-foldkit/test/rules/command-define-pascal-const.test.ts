import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/command-define-pascal-const.ts'

interface MutableNode {
  type: string
  parent?: MutableNode
  init?: MutableNode
  callee?: unknown
  arguments?: ReadonlyArray<unknown>
  id?: unknown
}

/**
 * Build a `Command.define(name, body)` call wired into a `VariableDeclarator`
 * named `declaratorName` (which becomes its parent and `init`).
 *
 * Pass `declaratorName: undefined` to omit the wrapper entirely (inline call,
 * e.g. inside a `pipe()` or expression statement).
 */
const buildCall = (opts: {
  readonly arg0?: unknown
  readonly declaratorName?: string
}): MutableNode => {
  const call: MutableNode = {
    type: 'CallExpression',
    callee: Testing.memberExpr('Command', 'define'),
    arguments: opts.arg0 === undefined ? [] : [opts.arg0],
  }
  if (opts.declaratorName !== undefined) {
    const declarator: MutableNode = {
      type: 'VariableDeclarator',
      id: Testing.id(opts.declaratorName),
      init: call,
    }
    call.parent = declarator
  }
  return call
}

/**
 * Build Foldkit's canonical curried form
 * `const <declaratorName> = Command.define(name, payload, ctor)(handler)`.
 *
 * Returns the inner `Command.define(...)` call (the node the rule matches via
 * `AST.isCallOf`). Its parent is the outer application call, whose parent is the
 * `VariableDeclarator` — mirroring the real AST shape.
 */
const buildCurriedCall = (opts: {
  readonly arg0?: unknown
  readonly declaratorName?: string
}): MutableNode => {
  const inner: MutableNode = {
    type: 'CallExpression',
    callee: Testing.memberExpr('Command', 'define'),
    arguments: opts.arg0 === undefined ? [] : [opts.arg0],
  }
  const outer: MutableNode = {
    type: 'CallExpression',
    callee: inner,
    arguments: [],
  }
  inner.parent = outer
  if (opts.declaratorName !== undefined) {
    const declarator: MutableNode = {
      type: 'VariableDeclarator',
      id: Testing.id(opts.declaratorName),
      init: outer,
    }
    outer.parent = declarator
  }
  return inner
}

describe('command-define-pascal-const', () => {
  // ── happy path ───────────────────────────────────────────
  it('does not flag `const FetchWeather = Command.define("FetchWeather", ...)`', () => {
    const node = buildCall({
      arg0: Testing.strLiteral('FetchWeather'),
      declaratorName: 'FetchWeather',
    })
    expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0)
  })

  it('does not flag curried `const NavigateInternal = Command.define("NavigateInternal", payload, ctor)(handler)`', () => {
    const node = buildCurriedCall({
      arg0: Testing.strLiteral('NavigateInternal'),
      declaratorName: 'NavigateInternal',
    })
    expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0)
  })

  it('flags curried const-name mismatch `const Foo = Command.define("Bar", ...)(handler)`', () => {
    const node = buildCurriedCall({
      arg0: Testing.strLiteral('Bar'),
      declaratorName: 'Foo',
    })
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'mirror the Command identity',
    )
  })

  it('flags inline curried `Command.define("Foo", ...)(handler)` (no enclosing declarator)', () => {
    const node = buildCurriedCall({ arg0: Testing.strLiteral('Foo') })
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'must be assigned to a PascalCase',
    )
  })

  // ── name shape ───────────────────────────────────────────
  it('flags non-PascalCase Command name `Command.define("fetchWeather", ...)`', () => {
    const node = buildCall({
      arg0: Testing.strLiteral('fetchWeather'),
      declaratorName: 'fetchWeather',
    })
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('PascalCase')
  })

  it('flags snake_case Command name', () => {
    const node = buildCall({
      arg0: Testing.strLiteral('fetch_weather'),
      declaratorName: 'fetch_weather',
    })
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('PascalCase')
  })

  // ── const wrapper requirements ───────────────────────────
  it('flags inline `Command.define("Foo", ...)` (no enclosing declarator)', () => {
    const node = buildCall({ arg0: Testing.strLiteral('Foo') })
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'must be assigned to a PascalCase',
    )
  })

  it('flags const-name mismatch `const Foo = Command.define("Bar", ...)`', () => {
    const node = buildCall({
      arg0: Testing.strLiteral('Bar'),
      declaratorName: 'Foo',
    })
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'mirror the Command identity',
    )
    expect(result[0]?.diagnostic.message).toContain('got `Foo`')
  })

  // ── argument shape ───────────────────────────────────────
  it('flags `Command.define()` with no arguments', () => {
    const node = buildCall({})
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('literal string name')
  })

  it('flags `Command.define(someVar, ...)` (non-literal first arg)', () => {
    const node = buildCall({ arg0: Testing.id('someVar') })
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('literal string name')
  })

  // ── non-target calls ─────────────────────────────────────
  it('does not flag unrelated calls like `Foo.bar(...)`', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callOfMember('Foo', 'bar', [Testing.strLiteral('x')]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag `Command.something(...)` (different method)', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callOfMember('Command', 'something', [Testing.strLiteral('x')]),
    )
    expect(result).toHaveLength(0)
  })
})
