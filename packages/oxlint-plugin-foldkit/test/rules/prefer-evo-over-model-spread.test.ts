import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/prefer-evo-over-model-spread.ts'

const UPDATE_FILE = '/repo/apps/ui/src/page/tasks/update.ts'
const VIEW_FILE = '/repo/apps/ui/src/page/tasks/view.ts'

const modelSpreadObject = () =>
  Testing.objectExprWithSpread(Testing.id('model'))

const arraySpread = () => ({
  type: 'ArrayExpression',
  elements: [
    {
      type: 'SpreadElement',
      argument: Testing.memberExpr('model', 'items'),
    },
  ],
})

const arrowWithParams = (params: ReadonlyArray<string>, body: unknown) =>
  Testing.arrowFn(
    body,
    params.map(param => Testing.id(param)),
  )

const runInArrow = (
  fn: object,
  object: object,
  filename: string = UPDATE_FILE,
) =>
  Testing.runRuleMulti(
    rule,
    [
      ['ArrowFunctionExpression', fn],
      ['ObjectExpression', object],
      ['ArrowFunctionExpression:exit', fn],
    ],
    { filename },
  )

const functionDeclaration = (params: ReadonlyArray<string>, body: unknown) => ({
  type: 'FunctionDeclaration',
  params: params.map(Testing.id),
  body,
})

describe('prefer-evo-over-model-spread', () => {
  it('flags object-spreading a `model` parameter in update.ts', () => {
    const object = modelSpreadObject()
    const fn = arrowWithParams(['model', 'message'], object)
    const result = runInArrow(fn, object)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('evo(model')
  })

  it('flags object-spreading a `model` parameter under update directories', () => {
    const object = modelSpreadObject()
    const fn = arrowWithParams(['model'], object)
    const result = runInArrow(
      fn,
      object,
      '/repo/apps/ui/src/page/tasks/update/child.ts',
    )
    expect(result).toHaveLength(1)
  })

  it('flags function declarations with a `model` parameter', () => {
    const object = modelSpreadObject()
    const fn = functionDeclaration(['model'], Testing.blockStmt())
    const result = Testing.runRuleMulti(
      rule,
      [
        ['FunctionDeclaration', fn],
        ['ObjectExpression', object],
        ['FunctionDeclaration:exit', fn],
      ],
      { filename: UPDATE_FILE },
    )
    expect(result).toHaveLength(1)
  })

  it('does not flag object spreads of non-model values', () => {
    const object = Testing.objectExprWithSpread(Testing.id('edit'))
    const fn = arrowWithParams(['model'], object)
    const result = runInArrow(fn, object)
    expect(result).toHaveLength(0)
  })

  it('does not flag when no in-scope function parameter is named `model`', () => {
    const object = modelSpreadObject()
    const fn = arrowWithParams(['state'], object)
    const result = runInArrow(fn, object)
    expect(result).toHaveLength(0)
  })

  it('does not flag array spreads from model fields', () => {
    const fn = arrowWithParams(['model'], arraySpread())
    const result = Testing.runRuleMulti(
      rule,
      [
        ['ArrowFunctionExpression', fn],
        ['ArrowFunctionExpression:exit', fn],
      ],
      { filename: UPDATE_FILE },
    )
    expect(result).toHaveLength(0)
  })

  it('does not run outside update files', () => {
    const object = modelSpreadObject()
    const fn = arrowWithParams(['model'], object)
    const result = runInArrow(fn, object, VIEW_FILE)
    expect(result).toHaveLength(0)
  })
})
