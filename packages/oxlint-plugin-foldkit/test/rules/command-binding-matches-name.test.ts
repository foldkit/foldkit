import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { commandBindingMatchesName } from '../../src/rules/command-binding-matches-name.ts'

const variableDeclarator = (name: string, init: unknown) => ({
  type: 'VariableDeclarator',
  id: Testing.id(name),
  init,
})

const commandDefineApplication = (name: string) => {
  const defineCall = Testing.callOfMember('Command', 'define', [
    Testing.strLiteral(name),
  ])
  return {
    type: 'CallExpression',
    callee: defineCall,
    arguments: [Testing.id('effectImplementation')],
  }
}

describe('command-binding-matches-name', () => {
  it('flags command bindings that do not match Command.define names', () => {
    const result = Testing.runRule(
      commandBindingMatchesName,
      'VariableDeclarator',
      variableDeclarator('SaveUser', commandDefineApplication('FetchUser')),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('does not match')
  })

  it('allows Command bindings that match Command.define names', () => {
    const result = Testing.runRule(
      commandBindingMatchesName,
      'VariableDeclarator',
      variableDeclarator('FetchUser', commandDefineApplication('FetchUser')),
    )

    expect(result).toHaveLength(0)
  })
})
