import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { requireFoldForChildUpdateResult } from '../../src/rules/require-fold-for-child-update-result.ts'

const property = (key: string, value: unknown) => ({
  type: 'Property',
  key: Testing.id(key),
  value,
  computed: false,
})

const objectExpression = (properties: ReadonlyArray<unknown>) => ({
  type: 'ObjectExpression',
  properties,
})

const childCall = (namespace: string, helper: string, fieldName: string) =>
  Testing.callOfMember(namespace, helper, [
    Testing.memberExpr('model', fieldName),
  ])

const childReturn = (name: string, init: unknown) => ({
  type: 'VariableDeclarator',
  id: Testing.id(name),
  init,
})

const readChild = (fieldName: string) =>
  Testing.arrowFn(
    Testing.callOfMember('Option', 'some', [
      Testing.memberExpr('model', fieldName),
    ]),
    [Testing.id('model')],
  )

const writeChild = (fieldName: string) =>
  Testing.arrowFn(
    Testing.callExpr('modifyFields', [
      Testing.id('model'),
      objectExpression([
        property(fieldName, Testing.arrowFn(Testing.id('nextChild'))),
      ]),
    ]),
    [Testing.id('model'), Testing.id('nextChild')],
  )

const foldChild = (
  namespace: string,
  fieldName: string,
  read: unknown = readChild(fieldName),
  write: unknown = writeChild(fieldName),
  helperName = 'update',
  foldName = 'foldChild',
) =>
  Testing.callOfMember('Update', foldName, [
    objectExpression([
      property('update', Testing.memberExpr(namespace, helperName)),
      property('read', read),
      property('write', write),
    ]),
  ])

const modifyFieldsCall = (fieldName: string, resultName: string) =>
  Testing.callExpr('modifyFields', [
    Testing.id('model'),
    objectExpression([
      property(
        fieldName,
        Testing.arrowFn(Testing.memberExpr(resultName, 'model')),
      ),
    ]),
  ])

const modifyFieldsCallWithBlockReturn = (
  fieldName: string,
  resultName: string,
) =>
  Testing.callExpr('modifyFields', [
    Testing.id('model'),
    objectExpression([
      property(
        fieldName,
        Testing.arrowFn(
          Testing.blockStmt([
            Testing.returnStmt(Testing.memberExpr(resultName, 'model')),
          ]),
        ),
      ),
    ]),
  ])

const resultFor = (
  namespace: string,
  fieldName: string,
  declaration: unknown,
  modifyFields: unknown,
  programBody: ReadonlyArray<unknown> = [foldChild(namespace, fieldName)],
) =>
  Testing.runRuleMulti(requireFoldForChildUpdateResult, [
    ['Program', Testing.program(programBody)],
    ['VariableDeclarator', declaration],
    ['CallExpression', modifyFields],
  ])

describe('require-fold-for-child-update-result', () => {
  it('flags a Settings helper result copied into the settings field', () => {
    const result = resultFor(
      'Settings',
      'settings',
      childReturn(
        'settingsReset',
        childCall('Settings', 'setTheme', 'settings'),
      ),
      modifyFieldsCall('settings', 'settingsReset'),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('settingsReset.model')
    expect(result[0]?.diagnostic.message).toContain('Settings.setTheme')
    expect(result[0]?.diagnostic.message).toContain('Update.foldChild')
  })

  it('flags a direct child update result copied into the child field', () => {
    const result = resultFor(
      'Child',
      'child',
      childReturn('childUpdate', childCall('Child', 'update', 'child')),
      modifyFieldsCall('child', 'childUpdate'),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Child.update')
  })

  it('flags a direct child update result copied from a block-bodied updater', () => {
    const result = resultFor(
      'Child',
      'child',
      childReturn('childUpdate', childCall('Child', 'update', 'child')),
      modifyFieldsCallWithBlockReturn('child', 'childUpdate'),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('childUpdate.model')
  })

  it('flags a Dialog close result mapped by foldChildStep', () => {
    const result = resultFor(
      'Dialog',
      'dialog',
      childReturn('dialogClose', childCall('Dialog', 'close', 'dialog')),
      modifyFieldsCall('dialog', 'dialogClose'),
      [
        foldChild(
          'Dialog',
          'dialog',
          undefined,
          undefined,
          'close',
          'foldChildStep',
        ),
      ],
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Dialog.close')
  })

  it('allows a helper result written to a different field', () => {
    const result = resultFor(
      'Settings',
      'settings',
      childReturn(
        'settingsReset',
        childCall('Settings', 'setTheme', 'settings'),
      ),
      modifyFieldsCall('theme', 'settingsReset'),
    )

    expect(result).toHaveLength(0)
  })

  it('allows init assembly without a current child Model argument', () => {
    const result = resultFor(
      'Settings',
      'settings',
      childReturn('settingsInit', Testing.callOfMember('Settings', 'init')),
      modifyFieldsCall('settings', 'settingsInit'),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a Model-only reflect helper in a modifyFields updater', () => {
    const reflectCall = Testing.callOfMember('Slider', 'reflectRange', [
      Testing.id('range'),
    ])
    const modifyFields = Testing.callExpr('modifyFields', [
      Testing.id('model'),
      objectExpression([property('slider', Testing.arrowFn(reflectCall))]),
    ])
    const result = Testing.runRule(
      requireFoldForChildUpdateResult,
      'CallExpression',
      modifyFields,
    )

    expect(result).toHaveLength(0)
  })

  it('allows direct child helper calls when their Return is not copied', () => {
    const declaration = childReturn(
      'settingsReset',
      childCall('Settings', 'setTheme', 'settings'),
    )
    const result = Testing.runRuleMulti(requireFoldForChildUpdateResult, [
      ['Program', Testing.program([foldChild('Settings', 'settings')])],
      ['VariableDeclarator', declaration],
      ['CallExpression', modifyFieldsCall('settings', 'otherResult')],
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores a child result returned only by a nested callback', () => {
    const modifyFields = Testing.callExpr('modifyFields', [
      Testing.id('model'),
      objectExpression([
        property(
          'child',
          Testing.arrowFn(
            Testing.blockStmt([
              Testing.varDecl(
                'const',
                'readChildModel',
                Testing.arrowFn(Testing.memberExpr('childUpdate', 'model')),
              ),
              Testing.returnStmt(Testing.memberExpr('model', 'child')),
            ]),
          ),
        ),
      ]),
    ])
    const result = resultFor(
      'Child',
      'child',
      childReturn('childUpdate', childCall('Child', 'update', 'child')),
      modifyFields,
    )

    expect(result).toHaveLength(0)
  })

  it('ignores a block-bodied updater with multiple direct returns', () => {
    const modifyFields = Testing.callExpr('modifyFields', [
      Testing.id('model'),
      objectExpression([
        property(
          'child',
          Testing.arrowFn(
            Testing.blockStmt([
              Testing.returnStmt(Testing.memberExpr('childUpdate', 'model')),
              Testing.returnStmt(Testing.memberExpr('model', 'child')),
            ]),
          ),
        ),
      ]),
    ])
    const result = resultFor(
      'Child',
      'child',
      childReturn('childUpdate', childCall('Child', 'update', 'child')),
      modifyFields,
    )

    expect(result).toHaveLength(0)
  })

  it('flags a Products update result copied into the productsPage field', () => {
    const result = resultFor(
      'Products',
      'productsPage',
      childReturn(
        'productsUpdate',
        childCall('Products', 'update', 'productsPage'),
      ),
      modifyFieldsCall('productsPage', 'productsUpdate'),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Products.update')
  })

  it('derives Products fields from module-level read and write callbacks', () => {
    const readProducts = readChild('productsPage')
    const writeProducts = writeChild('productsPage')
    const result = resultFor(
      'Products',
      'productsPage',
      childReturn(
        'productsUpdate',
        childCall('Products', 'update', 'productsPage'),
      ),
      modifyFieldsCall('productsPage', 'productsUpdate'),
      [
        Testing.varDecl('const', 'readProducts', readProducts),
        Testing.varDecl('const', 'writeProducts', writeProducts),
        foldChild(
          'Products',
          'productsPage',
          Testing.id('readProducts'),
          Testing.id('writeProducts'),
        ),
      ],
    )

    expect(result).toHaveLength(1)
  })

  it('allows a Products result copied to a field not established by its fold', () => {
    const result = resultFor(
      'Products',
      'productsPage',
      childReturn(
        'productsUpdate',
        childCall('Products', 'update', 'products'),
      ),
      modifyFieldsCall('products', 'productsUpdate'),
    )

    expect(result).toHaveLength(0)
  })
})
