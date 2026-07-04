import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { preferEvoOverModelSpread } from '../../src/rules/prefer-evo-over-model-spread.ts'

const UPDATE_FILENAME = '/repo/apps/ui/src/page/tasks/update.ts'
const UPDATE_DIRECTORY_FILENAME = '/repo/apps/ui/src/page/tasks/update/child.ts'
const VIEW_FILENAME = '/repo/apps/ui/src/page/tasks/view.ts'

const modelSpreadObject = () =>
  Testing.objectExprWithSpread(Testing.id('model'))

describe('prefer-evo-over-model-spread', () => {
  it('flags spreading the model parameter in update.ts', () => {
    const arrow = Testing.arrowFn(undefined, [
      Testing.id('model'),
      Testing.id('message'),
    ])
    const result = Testing.runRuleMulti(
      preferEvoOverModelSpread,
      [
        ['ArrowFunctionExpression', arrow],
        ['ObjectExpression', modelSpreadObject()],
        ['ArrowFunctionExpression:exit', arrow],
      ],
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('evo(model')
  })

  it('flags the spread in files under an update directory', () => {
    const arrow = Testing.arrowFn(undefined, [Testing.id('model')])
    const result = Testing.runRuleMulti(
      preferEvoOverModelSpread,
      [
        ['ArrowFunctionExpression', arrow],
        ['ObjectExpression', modelSpreadObject()],
        ['ArrowFunctionExpression:exit', arrow],
      ],
      { filename: UPDATE_DIRECTORY_FILENAME },
    )

    expect(result).toHaveLength(1)
  })

  it('treats function declarations as arming scopes', () => {
    const functionDeclaration = {
      type: 'FunctionDeclaration',
      params: [Testing.id('model')],
    }
    const result = Testing.runRuleMulti(
      preferEvoOverModelSpread,
      [
        ['FunctionDeclaration', functionDeclaration],
        ['ObjectExpression', modelSpreadObject()],
        ['FunctionDeclaration:exit', functionDeclaration],
      ],
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(1)
  })

  it('treats function expressions as arming scopes', () => {
    const functionExpression = {
      type: 'FunctionExpression',
      params: [Testing.id('model')],
    }
    const result = Testing.runRuleMulti(
      preferEvoOverModelSpread,
      [
        ['FunctionExpression', functionExpression],
        ['ObjectExpression', modelSpreadObject()],
        ['FunctionExpression:exit', functionExpression],
      ],
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(1)
  })

  it('reports each model spread in an object independently', () => {
    const arrow = Testing.arrowFn(undefined, [Testing.id('model')])
    const doubleSpread = {
      type: 'ObjectExpression',
      properties: [
        { type: 'SpreadElement', argument: Testing.id('model') },
        { type: 'SpreadElement', argument: Testing.id('model') },
      ],
    }
    const result = Testing.runRuleMulti(
      preferEvoOverModelSpread,
      [
        ['ArrowFunctionExpression', arrow],
        ['ObjectExpression', doubleSpread],
        ['ArrowFunctionExpression:exit', arrow],
      ],
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(2)
  })

  it('keeps nested callbacks armed by an ancestor model function', () => {
    const outerArrow = Testing.arrowFn(undefined, [Testing.id('model')])
    const innerArrow = Testing.arrowFn(undefined, [Testing.id('task')])
    const result = Testing.runRuleMulti(
      preferEvoOverModelSpread,
      [
        ['ArrowFunctionExpression', outerArrow],
        ['ArrowFunctionExpression', innerArrow],
        ['ObjectExpression', modelSpreadObject()],
        ['ArrowFunctionExpression:exit', innerArrow],
        ['ArrowFunctionExpression:exit', outerArrow],
      ],
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(1)
  })

  it('allows spreading a non-model identifier', () => {
    const arrow = Testing.arrowFn(undefined, [Testing.id('model')])
    const result = Testing.runRuleMulti(
      preferEvoOverModelSpread,
      [
        ['ArrowFunctionExpression', arrow],
        ['ObjectExpression', Testing.objectExprWithSpread(Testing.id('edit'))],
        ['ArrowFunctionExpression:exit', arrow],
      ],
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(0)
  })

  it('allows spreading a member expression of model', () => {
    const arrow = Testing.arrowFn(undefined, [Testing.id('model')])
    const result = Testing.runRuleMulti(
      preferEvoOverModelSpread,
      [
        ['ArrowFunctionExpression', arrow],
        [
          'ObjectExpression',
          Testing.objectExprWithSpread(Testing.memberExpr('model', 'settings')),
        ],
        ['ArrowFunctionExpression:exit', arrow],
      ],
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(0)
  })

  it('stays unarmed when no function declares a model parameter', () => {
    const arrow = Testing.arrowFn(undefined, [Testing.id('state')])
    const result = Testing.runRuleMulti(
      preferEvoOverModelSpread,
      [
        ['ArrowFunctionExpression', arrow],
        ['ObjectExpression', modelSpreadObject()],
        ['ArrowFunctionExpression:exit', arrow],
      ],
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(0)
  })

  it('produces nothing for array spreads of model fields', () => {
    const arrow = Testing.arrowFn(undefined, [Testing.id('model')])
    const result = Testing.runRuleMulti(
      preferEvoOverModelSpread,
      [
        ['ArrowFunctionExpression', arrow],
        ['ArrowFunctionExpression:exit', arrow],
      ],
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(0)
  })

  it('disarms after the model function exits', () => {
    const arrow = Testing.arrowFn(undefined, [Testing.id('model')])
    const result = Testing.runRuleMulti(
      preferEvoOverModelSpread,
      [
        ['ArrowFunctionExpression', arrow],
        ['ArrowFunctionExpression:exit', arrow],
        ['ObjectExpression', modelSpreadObject()],
      ],
      { filename: UPDATE_FILENAME },
    )

    expect(result).toHaveLength(0)
  })

  it('stays inert outside update-layer files', () => {
    const arrow = Testing.arrowFn(undefined, [Testing.id('model')])
    const result = Testing.runRuleMulti(
      preferEvoOverModelSpread,
      [
        ['ArrowFunctionExpression', arrow],
        ['ObjectExpression', modelSpreadObject()],
        ['ArrowFunctionExpression:exit', arrow],
      ],
      { filename: VIEW_FILENAME },
    )

    expect(result).toHaveLength(0)
  })
})
