import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { commandDefinePascalConst } from '../../src/rules/command-define-pascal-const.ts'

const commandDefineCall = (defineArguments: ReadonlyArray<unknown>) =>
  Testing.callOfMember('Command', 'define', defineArguments)

const inDeclaration = (kind: string, declarator: Record<string, unknown>) =>
  Object.assign(declarator, {
    parent: { type: 'VariableDeclaration', kind },
  })

const declaredDirectDefine = (
  constName: string,
  defineArguments: ReadonlyArray<unknown>,
  kind = 'const',
) => {
  const defineCall = commandDefineCall(defineArguments)
  const declarator = inDeclaration(kind, {
    type: 'VariableDeclarator',
    id: Testing.id(constName),
    init: defineCall,
  })
  return Object.assign(defineCall, { parent: declarator })
}

const declaredCurriedDefine = (
  constName: string,
  defineArguments: ReadonlyArray<unknown>,
  kind = 'const',
) => {
  const defineCall = commandDefineCall(defineArguments)
  const application = {
    type: 'CallExpression',
    callee: defineCall,
    arguments: [Testing.id('handler')],
  }
  const declarator = inDeclaration(kind, {
    type: 'VariableDeclarator',
    id: Testing.id(constName),
    init: application,
  })
  Object.assign(application, { parent: declarator })
  return Object.assign(defineCall, { parent: application })
}

const inlineCurriedDefine = (defineArguments: ReadonlyArray<unknown>) => {
  const defineCall = commandDefineCall(defineArguments)
  const application = {
    type: 'CallExpression',
    callee: defineCall,
    arguments: [Testing.id('handler')],
  }
  return Object.assign(defineCall, { parent: application })
}

const wrappedDefine = (
  constName: string,
  defineArguments: ReadonlyArray<unknown>,
) => {
  const defineCall = commandDefineCall(defineArguments)
  const wrapper = {
    type: 'CallExpression',
    callee: Testing.id('wrap'),
    arguments: [defineCall],
  }
  const declarator = {
    type: 'VariableDeclarator',
    id: Testing.id(constName),
    init: wrapper,
  }
  Object.assign(wrapper, { parent: declarator })
  return Object.assign(defineCall, { parent: wrapper })
}

const destructuredDefine = (defineArguments: ReadonlyArray<unknown>) => {
  const defineCall = commandDefineCall(defineArguments)
  const declarator = inDeclaration('const', {
    type: 'VariableDeclarator',
    id: { type: 'ObjectPattern', properties: [] },
    init: defineCall,
  })
  return Object.assign(defineCall, { parent: declarator })
}

const run = (node: unknown) =>
  Testing.runRule(commandDefinePascalConst, 'CallExpression', node)

describe('command-define-pascal-const', () => {
  it('flags a curried const whose name does not match the Command name', () => {
    const result = run(
      declaredCurriedDefine('Foo', [Testing.strLiteral('Bar')]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Bar')
    expect(result[0]?.diagnostic.message).toContain('Foo')
    expect(result[0]?.diagnostic.message).toContain(
      'mirrors the Command identity',
    )
  })

  it('flags an inline curried call with no declarator', () => {
    const result = run(inlineCurriedDefine([Testing.strLiteral('Foo')]))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'must be assigned to a PascalCase const',
    )
  })

  it('flags a camelCase Command name', () => {
    const result = run(
      declaredDirectDefine('fetchWeather', [
        Testing.strLiteral('fetchWeather'),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('PascalCase')
  })

  it('flags a snake_case Command name', () => {
    const result = run(
      declaredDirectDefine('fetch_weather', [
        Testing.strLiteral('fetch_weather'),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('PascalCase')
  })

  it('flags an inline direct call with no declarator', () => {
    const result = run(commandDefineCall([Testing.strLiteral('Foo')]))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'must be assigned to a PascalCase const',
    )
  })

  it('flags a direct const whose name does not match the Command name', () => {
    const result = run(declaredDirectDefine('Foo', [Testing.strLiteral('Bar')]))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('not Foo')
  })

  it('flags a call with no arguments', () => {
    const result = run(commandDefineCall([]))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('literal string name')
  })

  it('flags a non-literal first argument', () => {
    const result = run(commandDefineCall([Testing.id('someVar')]))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('literal string name')
  })

  it('flags a define call wrapped in another call before assignment', () => {
    const result = run(wrappedDefine('Foo', [Testing.strLiteral('Foo')]))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'must be assigned to a PascalCase const',
    )
  })

  it('flags a Command assigned to a let binding', () => {
    const result = run(
      declaredDirectDefine(
        'FetchWeather',
        [Testing.strLiteral('FetchWeather')],
        'let',
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('const, not let or var')
  })

  it('allows a canonical direct assignment', () => {
    const result = run(
      declaredDirectDefine('FetchWeather', [
        Testing.strLiteral('FetchWeather'),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a canonical curried assignment', () => {
    const result = run(
      declaredCurriedDefine('NavigateInternal', [
        Testing.strLiteral('NavigateInternal'),
        Testing.id('payload'),
        Testing.id('resultMessage'),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows an unrelated member call', () => {
    const result = run(
      Testing.callOfMember('Foo', 'bar', [Testing.strLiteral('x')]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a different method on Command', () => {
    const result = run(
      Testing.callOfMember('Command', 'something', [Testing.strLiteral('x')]),
    )

    expect(result).toHaveLength(0)
  })

  it('stays silent when the declarator id is a destructuring pattern', () => {
    const result = run(destructuredDefine([Testing.strLiteral('Foo')]))

    expect(result).toHaveLength(0)
  })
})
