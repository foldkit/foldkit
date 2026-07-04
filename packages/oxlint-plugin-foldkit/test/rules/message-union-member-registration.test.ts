import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { messageUnionMemberRegistration } from '../../src/rules/message-union-member-registration.ts'

const declarator = (name: string, init: unknown) => ({
  type: 'VariableDeclarator' as const,
  id: Testing.id(name),
  init,
})

const constDecl = (name: string, init: unknown) => ({
  type: 'VariableDeclaration' as const,
  kind: 'const' as const,
  declarations: [declarator(name, init)],
})

const exportConst = (name: string, init: unknown) => ({
  type: 'ExportNamedDeclaration' as const,
  declaration: constDecl(name, init),
})

const messageCtor = (tag: string) =>
  Testing.callExpr('m', [Testing.strLiteral(tag)])

const arrayOf = (...names: ReadonlyArray<string>) => ({
  type: 'ArrayExpression' as const,
  elements: names.map(Testing.id),
})

const schemaUnionArray = (namespace: 'S' | 'Schema', ...names: ReadonlyArray<string>) =>
  Testing.callOfMember(namespace, 'Union', [arrayOf(...names)])

const schemaUnionSpread = (namespace: 'S' | 'Schema', ...names: ReadonlyArray<string>) =>
  Testing.callOfMember(namespace, 'Union', names.map(Testing.id))

const program = (body: ReadonlyArray<unknown>) => ({
  type: 'Program' as const,
  body,
})

const run = (body: ReadonlyArray<unknown>) =>
  Testing.runRule(messageUnionMemberRegistration, 'Program', program(body))

describe('message-union-member-registration', () => {
  it('flags a Message constructor missing from the Schema.Union', () => {
    const result = run([
      exportConst('ClickedSave', messageCtor('ClickedSave')),
      exportConst('ClickedClear', messageCtor('ClickedClear')),
      exportConst('Message', schemaUnionArray('Schema', 'ClickedSave')),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('ClickedClear')
    expect(result[0]?.diagnostic.message).toContain('Message')
  })

  it('does not flag when every constructor is registered', () => {
    const result = run([
      exportConst('ClickedSave', messageCtor('ClickedSave')),
      exportConst('ClickedClear', messageCtor('ClickedClear')),
      exportConst('Message', schemaUnionArray('Schema', 'ClickedSave', 'ClickedClear')),
    ])

    expect(result).toHaveLength(0)
  })

  it('does not flag when no Message union is present', () => {
    const result = run([
      exportConst('ClickedSave', messageCtor('ClickedSave')),
      exportConst('ClickedClear', messageCtor('ClickedClear')),
    ])

    expect(result).toHaveLength(0)
  })

  it('handles the S.Union alias', () => {
    const result = run([
      exportConst('ClickedSave', messageCtor('ClickedSave')),
      exportConst('ClickedClear', messageCtor('ClickedClear')),
      exportConst('Message', schemaUnionArray('S', 'ClickedSave')),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('ClickedClear')
  })

  it('handles the spread-argument union form', () => {
    const result = run([
      constDecl('ClickedSave', messageCtor('ClickedSave')),
      constDecl('ClickedClear', messageCtor('ClickedClear')),
      constDecl('Message', schemaUnionSpread('Schema', 'ClickedSave')),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('ClickedClear')
  })

  it('does not flag the union members themselves', () => {
    const result = run([
      constDecl('ClickedSave', messageCtor('ClickedSave')),
      constDecl('Message', schemaUnionArray('S', 'ClickedSave')),
    ])

    expect(result).toHaveLength(0)
  })
})
