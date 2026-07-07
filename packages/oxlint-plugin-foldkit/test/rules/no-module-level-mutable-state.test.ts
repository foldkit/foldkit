import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noModuleLevelMutableState } from '../../src/rules/no-module-level-mutable-state.ts'

const variableDeclaration = (
  kind: 'let' | 'var' | 'const',
  name: string,
  isAmbient = false,
) => ({
  type: 'VariableDeclaration',
  kind,
  declare: isAmbient,
  declarations: [
    { type: 'VariableDeclarator', id: Testing.id(name), init: null },
  ],
})

const program = (body: ReadonlyArray<unknown>) => ({ type: 'Program', body })

describe('no-module-level-mutable-state', () => {
  it('flags a module-level let', () => {
    const result = Testing.runRule(
      noModuleLevelMutableState,
      'Program',
      program([variableDeclaration('let', 'cache')]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('state outside the Model')
  })

  it('flags a module-level var', () => {
    const result = Testing.runRule(
      noModuleLevelMutableState,
      'Program',
      program([variableDeclaration('var', 'cache')]),
    )

    expect(result).toHaveLength(1)
  })

  it('flags an exported module-level let', () => {
    const result = Testing.runRule(
      noModuleLevelMutableState,
      'Program',
      program([
        {
          type: 'ExportNamedDeclaration',
          declaration: variableDeclaration('let', 'counter'),
        },
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('allows a module-level const', () => {
    const result = Testing.runRule(
      noModuleLevelMutableState,
      'Program',
      program([variableDeclaration('const', 'config')]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows an ambient declare let', () => {
    const result = Testing.runRule(
      noModuleLevelMutableState,
      'Program',
      program([variableDeclaration('let', '__DEV__', true)]),
    )

    expect(result).toHaveLength(0)
  })
})
