import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { uiToviewMustSpreadAttributeBundles } from '../../src/rules/ui-toview-must-spread-attribute-bundles.ts'

const arrayExpression = (elements: ReadonlyArray<unknown> = []) => ({
  type: 'ArrayExpression',
  elements,
})

const spreadElement = (argument: unknown) => ({
  type: 'SpreadElement',
  argument,
})

const uiViewCall = (componentName: string, toViewValue: unknown) => ({
  type: 'CallExpression',
  callee: Testing.chainedMemberExpr('Ui', componentName, 'view'),
  arguments: [Testing.objectExpr([{ key: 'toView', value: toViewValue }])],
})

const submodelConfig = (viewValue: unknown, viewInputsValue: unknown) =>
  Testing.objectExpr([
    { key: 'slotId', value: Testing.strLiteral('slot') },
    { key: 'model', value: Testing.id('model') },
    { key: 'view', value: viewValue },
    { key: 'viewInputs', value: viewInputsValue },
    {
      key: 'toParentMessage',
      value: Testing.arrowFn(Testing.id('message'), [Testing.id('message')]),
    },
  ])

const submodelCall = (viewValue: unknown, toViewValue: unknown) =>
  Testing.callOfMember('h', 'submodel', [
    submodelConfig(
      viewValue,
      Testing.objectExpr([{ key: 'toView', value: toViewValue }]),
    ),
  ])

const spreadingInputView = () =>
  Testing.arrowFn(
    Testing.callOfMember('h', 'input', [
      arrayExpression([
        spreadElement(Testing.memberExpr('attributes', 'input')),
        Testing.callOfMember('h', 'Class', []),
      ]),
    ]),
    [Testing.id('attributes')],
  )

const bundleArgumentView = () =>
  Testing.arrowFn(
    Testing.callOfMember('h', 'span', [
      Testing.memberExpr('attributes', 'label'),
      arrayExpression([Testing.strLiteral('Unblocked only')]),
    ]),
    [Testing.id('attributes')],
  )

const noBundleView = (elementName: string) =>
  Testing.arrowFn(
    Testing.callOfMember('h', elementName, [
      arrayExpression([Testing.callOfMember('h', 'Class', [])]),
    ]),
    [Testing.id('attributes')],
  )

const dialogSpreadingView = (elementName: string) =>
  Testing.arrowFn(
    Testing.callOfMember('h', elementName, [
      arrayExpression([spreadElement(Testing.memberExpr('info', 'dialog'))]),
      arrayExpression(),
    ]),
    [Testing.id('info')],
  )

const dialogNoBundleView = () =>
  Testing.arrowFn(
    Testing.callOfMember('h', 'div', [
      arrayExpression([Testing.callOfMember('h', 'Class', [])]),
      arrayExpression(),
    ]),
    [Testing.id('info')],
  )

describe('ui-toview-must-spread-attribute-bundles', () => {
  it('allows a direct view call whose toView spreads a bundle', () => {
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      uiViewCall('Input', spreadingInputView()),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a Submodel toView passing a bundle as a direct call argument', () => {
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      submodelCall(
        Testing.chainedMemberExpr('Ui', 'Checkbox', 'view'),
        bundleArgumentView(),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a Dialog Submodel toView that renders h.dialog and spreads its bundle', () => {
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      submodelCall(
        Testing.memberExpr('Dialog', 'view'),
        dialogSpreadingView('dialog'),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a deeper bundle path rooted at the parameter', () => {
    const deepSpreadView = Testing.arrowFn(
      Testing.callOfMember('h', 'button', [
        arrayExpression([
          spreadElement(
            Testing.chainedMemberExpr('attributes', 'button', 'extra'),
          ),
        ]),
      ]),
      [Testing.id('attributes')],
    )
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      uiViewCall('Button', deepSpreadView),
    )

    expect(result).toHaveLength(0)
  })

  it('allows non-inline toView values', () => {
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      uiViewCall('Input', Testing.id('inputToView')),
    )

    expect(result).toHaveLength(0)
  })

  it('allows toView properties inside unrelated calls', () => {
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      Testing.callExpr('render', [
        Testing.objectExpr([{ key: 'toView', value: noBundleView('div') }]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows Submodels whose view is a custom identifier', () => {
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      submodelCall(Testing.id('customView'), noBundleView('div')),
    )

    expect(result).toHaveLength(0)
  })

  it('allows Submodels whose viewInputs is not an inline object', () => {
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      Testing.callOfMember('h', 'submodel', [
        submodelConfig(
          Testing.chainedMemberExpr('Ui', 'Input', 'view'),
          Testing.id('viewInputs'),
        ),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('flags a direct view call whose toView uses no bundle', () => {
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      uiViewCall('Button', noBundleView('button')),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('attribute bundles')
    expect(result[0]?.diagnostic.message).toContain('Ui.Button.view')
  })

  it('flags a Submodel toView that uses no bundle', () => {
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      submodelCall(
        Testing.chainedMemberExpr('Ui', 'Input', 'view'),
        noBundleView('input'),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('attribute bundles')
  })

  it('flags a bare submodel call whose toView uses no bundle', () => {
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      Testing.callExpr('submodel', [
        submodelConfig(
          Testing.memberExpr('Select', 'view'),
          Testing.objectExpr([{ key: 'toView', value: noBundleView('div') }]),
        ),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Select.view')
  })

  it('flags a Dialog Submodel toView that spreads its bundle but renders h.div', () => {
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      submodelCall(
        Testing.chainedMemberExpr('Ui', 'Dialog', 'view'),
        dialogSpreadingView('div'),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('h.dialog')
  })

  it('flags a Dialog Submodel toView that neither uses bundles nor renders h.dialog', () => {
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      submodelCall(
        Testing.chainedMemberExpr('Ui', 'Dialog', 'view'),
        dialogNoBundleView(),
      ),
    )

    expect(result).toHaveLength(2)
    expect(result[0]?.diagnostic.message).toContain('attribute bundles')
    expect(result[1]?.diagnostic.message).toContain('h.dialog')
  })

  it('flags a direct Dialog view call without h.dialog', () => {
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      uiViewCall('Dialog', dialogSpreadingView('div')),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('h.dialog')
  })

  it('flags when only the whole parameter is passed', () => {
    const wholeParameterView = Testing.arrowFn(
      Testing.callOfMember('h', 'div', [Testing.id('attributes')]),
      [Testing.id('attributes')],
    )
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      uiViewCall('Button', wholeParameterView),
    )

    expect(result).toHaveLength(1)
  })

  it('flags when a bundle appears as an array element without a spread', () => {
    const unspreadView = Testing.arrowFn(
      Testing.callOfMember('h', 'input', [
        arrayExpression([Testing.memberExpr('attributes', 'input')]),
      ]),
      [Testing.id('attributes')],
    )
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      uiViewCall('Input', unspreadView),
    )

    expect(result).toHaveLength(1)
  })

  it('flags when the bundle access is computed', () => {
    const computedView = Testing.arrowFn(
      Testing.callOfMember('h', 'input', [
        arrayExpression([
          spreadElement(Testing.computedMemberExpr('attributes', 'input')),
        ]),
      ]),
      [Testing.id('attributes')],
    )
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      uiViewCall('Input', computedView),
    )

    expect(result).toHaveLength(1)
  })

  it('flags when the only bundle use is inside a nested callback', () => {
    const nestedUseView = Testing.arrowFn(
      Testing.callOfMember('h', 'div', [
        arrayExpression([
          Testing.arrowFn(
            Testing.callOfMember('h', 'span', [
              arrayExpression([
                spreadElement(Testing.memberExpr('attributes', 'input')),
              ]),
            ]),
            [Testing.id('item')],
          ),
        ]),
      ]),
      [Testing.id('attributes')],
    )
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      uiViewCall('Input', nestedUseView),
    )

    expect(result).toHaveLength(1)
  })

  it('flags when the first parameter is destructured', () => {
    const destructuredView = Testing.arrowFn(
      Testing.callOfMember('h', 'input', [
        arrayExpression([spreadElement(Testing.memberExpr('input', 'extra'))]),
      ]),
      [{ type: 'ObjectPattern', properties: [] }],
    )
    const result = Testing.runRule(
      uiToviewMustSpreadAttributeBundles,
      'CallExpression',
      uiViewCall('Input', destructuredView),
    )

    expect(result).toHaveLength(1)
  })
})
