import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { preferOptionOverNullableInModel } from '../../src/rules/prefer-option-over-nullable-in-model.ts'

const modelStruct = (
  name: string,
  fields: ReadonlyArray<Readonly<{ key: string; value: unknown }>>,
) =>
  Testing.varDeclarator(
    name,
    Testing.callOfMember('Schema', 'Struct', [Testing.objectExpr(fields)]),
  )

describe('prefer-option-over-nullable-in-model', () => {
  it('flags NullOr / Null / optional fields in the Model struct', () => {
    const result = Testing.runRule(
      preferOptionOverNullableInModel,
      'VariableDeclarator',
      modelStruct('Model', [
        {
          key: 'currentUser',
          value: Testing.callOfMember('Schema', 'NullOr', [Testing.id('User')]),
        },
        {
          key: 'nickname',
          value: Testing.callOfMember('Schema', 'optional', [
            Testing.memberExpr('Schema', 'String'),
          ]),
        },
        { key: 'token', value: Testing.memberExpr('Schema', 'Null') },
      ]),
    )

    expect(result).toHaveLength(3)
    expect(result[0]?.diagnostic.message).toContain('Schema.Option')
  })

  it('flags NullishOr / UndefinedOr / Undefined / optionalKey fields in the Model struct', () => {
    const result = Testing.runRule(
      preferOptionOverNullableInModel,
      'VariableDeclarator',
      modelStruct('Model', [
        {
          key: 'avatar',
          value: Testing.callOfMember('Schema', 'NullishOr', [
            Testing.id('User'),
          ]),
        },
        {
          key: 'displayName',
          value: Testing.callOfMember('Schema', 'UndefinedOr', [
            Testing.memberExpr('Schema', 'String'),
          ]),
        },
        { key: 'sentinel', value: Testing.memberExpr('Schema', 'Undefined') },
        {
          key: 'bio',
          value: Testing.callOfMember('Schema', 'optionalKey', [
            Testing.memberExpr('Schema', 'String'),
          ]),
        },
      ]),
    )

    expect(result).toHaveLength(4)
  })

  it('allows Schema.Option fields in the Model struct', () => {
    const result = Testing.runRule(
      preferOptionOverNullableInModel,
      'VariableDeclarator',
      modelStruct('Model', [
        {
          key: 'currentUser',
          value: Testing.callOfMember('Schema', 'Option', [Testing.id('User')]),
        },
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores nullable fields outside the Model struct', () => {
    const result = Testing.runRule(
      preferOptionOverNullableInModel,
      'VariableDeclarator',
      modelStruct('ApiUser', [
        {
          key: 'avatar',
          value: Testing.callOfMember('Schema', 'NullOr', [
            Testing.memberExpr('Schema', 'String'),
          ]),
        },
      ]),
    )

    expect(result).toHaveLength(0)
  })
})
