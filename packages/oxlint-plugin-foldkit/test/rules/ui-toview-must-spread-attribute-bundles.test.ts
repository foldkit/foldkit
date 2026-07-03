import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/ui-toview-must-spread-attribute-bundles.ts'

const arr = (elements: ReadonlyArray<unknown>) => ({
  type: 'ArrayExpression',
  elements: Array.from(elements),
})

const prop = (key: string, value: unknown) => ({
  type: 'Property',
  kind: 'init',
  computed: false,
  method: false,
  shorthand: false,
  key: Testing.id(key),
  value,
})

const objectExpr = (properties: ReadonlyArray<unknown>) => ({
  type: 'ObjectExpression',
  properties: Array.from(properties),
})

const spread = (argument: unknown) => ({
  type: 'SpreadElement',
  argument,
})

const member = (...path: readonly [string, string, ...ReadonlyArray<string>]) =>
  Testing.chainedMemberExpr(...path)

const call = (callee: unknown, args: ReadonlyArray<unknown> = []) => ({
  type: 'CallExpression',
  callee,
  arguments: Array.from(args),
})

const hCall = (name: string, args: ReadonlyArray<unknown> = []) =>
  call(member('h', name), args)

const arrow = (paramName: string, body: unknown) => ({
  type: 'ArrowFunctionExpression',
  expression: true,
  async: false,
  params: [Testing.id(paramName)],
  body,
  id: null,
  generator: false,
})

const uiViewCall = (component: string, config: unknown) =>
  call(member('Ui', component, 'view'), [config])

const toViewConfig = (component: string, fn: unknown) =>
  uiViewCall(component, objectExpr([prop('toView', fn)]))

const submodelCall = (component: string, viewInputs: unknown) =>
  hCall('submodel', [
    objectExpr([
      prop('slotId', Testing.strLiteral('slot')),
      prop('model', Testing.id('model')),
      prop('view', member('Ui', component, 'view')),
      prop('viewInputs', viewInputs),
      prop('toParentMessage', arrow('message', Testing.id('message'))),
    ]),
  ])

describe('ui-toview-must-spread-attribute-bundles', () => {
  it('allows direct Ui.*.view toViews that spread attribute bundles', () => {
    const node = toViewConfig(
      'Input',
      arrow(
        'attributes',
        hCall('input', [
          arr([spread(member('attributes', 'input')), hCall('Class')]),
        ]),
      ),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('allows submodel viewInputs toViews that pass a bundle as a direct call argument', () => {
    const node = submodelCall(
      'Checkbox',
      objectExpr([
        prop(
          'toView',
          arrow(
            'attributes',
            hCall('span', [
              member('attributes', 'label'),
              arr([Testing.strLiteral('Unblocked only')]),
            ]),
          ),
        ),
      ]),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('flags direct Ui.*.view toViews that drop all attribute bundles', () => {
    const node = toViewConfig(
      'Button',
      arrow('attributes', hCall('button', [arr([hCall('Class')])])),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('attribute bundles')
  })

  it('flags submodel viewInputs toViews that drop all attribute bundles', () => {
    const node = submodelCall(
      'Input',
      objectExpr([
        prop(
          'toView',
          arrow('attributes', hCall('input', [arr([hCall('Class')])])),
        ),
      ]),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
  })

  it('requires Ui.Dialog toViews to render h.dialog', () => {
    const node = toViewConfig(
      'Dialog',
      arrow(
        'info',
        hCall('div', [arr([spread(member('info', 'dialog'))]), arr([])]),
      ),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('h.dialog')
  })

  it('allows Ui.Dialog toViews that render h.dialog and pass dialog attributes', () => {
    const node = submodelCall(
      'Dialog',
      objectExpr([
        prop(
          'toView',
          arrow(
            'info',
            hCall('dialog', [arr([spread(member('info', 'dialog'))]), arr([])]),
          ),
        ),
      ]),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('can report both missing attributes and missing h.dialog for Dialog', () => {
    const node = toViewConfig(
      'Dialog',
      arrow('info', hCall('div', [arr([hCall('Class')]), arr([])])),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(2)
  })

  it('skips non-inline toView values', () => {
    const node = uiViewCall(
      'Input',
      objectExpr([prop('toView', Testing.id('inputToView'))]),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('skips toView properties outside Ui.*.view calls and Ui-backed submodels', () => {
    const unrelated = call(Testing.id('render'), [
      objectExpr([prop('toView', arrow('attributes', hCall('div')))]),
    ])
    const customSubmodel = hCall('submodel', [
      objectExpr([
        prop('view', Testing.id('customView')),
        prop(
          'viewInputs',
          objectExpr([prop('toView', arrow('attributes', hCall('div')))]),
        ),
      ]),
    ])
    expect(Testing.runRule(rule, 'CallExpression', unrelated)).toHaveLength(0)
    expect(
      Testing.runRule(rule, 'CallExpression', customSubmodel),
    ).toHaveLength(0)
  })
})
