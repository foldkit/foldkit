import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noDirectBlockStateUpdate } from '../../src/rules/no-direct-block-state-update.ts'

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

const readChildAt = (fieldName: string) =>
  Testing.arrowFn(
    Testing.callOfMember('Option', 'some', [
      Testing.memberExpr('model', fieldName),
    ]),
    [Testing.id('model'), Testing.id('key')],
  )

const writeChildAt = (fieldName: string) =>
  Testing.arrowFn(
    Testing.callExpr('modifyFields', [
      Testing.id('model'),
      objectExpression([
        property(fieldName, Testing.arrowFn(Testing.id('nextChild'))),
      ]),
    ]),
    [Testing.id('model'), Testing.id('key'), Testing.id('nextChild')],
  )

const foldChild = (
  namespace: string,
  fieldName: string,
  read: unknown = readChild(fieldName),
  write: unknown = writeChild(fieldName),
  helperName = 'update',
  foldName = 'foldChild',
) => {
  const readPropertyName = foldName === 'foldChildAt' ? 'readAt' : 'read'
  const writePropertyName = foldName === 'foldChildAt' ? 'writeAt' : 'write'

  return Testing.callOfMember('Update', foldName, [
    objectExpression([
      property('update', Testing.memberExpr(namespace, helperName)),
      property(readPropertyName, read),
      property(writePropertyName, write),
    ]),
  ])
}

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
) => {
  const bindingStatements = programBody.flatMap((statement, index) => {
    if (
      typeof statement !== 'object' ||
      statement === null ||
      !('type' in statement) ||
      statement.type !== 'CallExpression'
    ) {
      if (
        typeof statement === 'object' &&
        statement !== null &&
        'type' in statement &&
        statement.type === 'VariableDeclaration' &&
        'declarations' in statement &&
        globalThis.Array.isArray(statement.declarations)
      ) {
        const [declarator] = statement.declarations
        if (
          typeof declarator === 'object' &&
          declarator !== null &&
          'id' in declarator &&
          typeof declarator.id === 'object' &&
          declarator.id !== null &&
          'type' in declarator.id &&
          declarator.id.type === 'Identifier' &&
          'name' in declarator.id &&
          typeof declarator.id.name === 'string'
        ) {
          return [
            statement,
            Testing.callOfMember(declarator.id.name, 'fold', [
              Testing.id('model'),
              Testing.id('key'),
              Testing.id('message'),
            ]),
          ]
        }
      }

      return [statement]
    }

    const bindingName = `foldChild${index}`
    return [
      Testing.varDecl('const', bindingName, statement),
      Testing.callExpr(bindingName, [
        Testing.id('model'),
        Testing.id('key'),
        Testing.id('message'),
      ]),
    ]
  })

  return Testing.runRule(
    noDirectBlockStateUpdate,
    'Program:exit',
    Testing.program([
      ...bindingStatements,
      {
        type: 'VariableDeclaration',
        kind: 'const',
        declarations: [declaration],
      },
      modifyFields,
    ]),
  )
}

describe('no-direct-block-state-update child Returns', () => {
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
    expect(result[0]?.diagnostic.message).toContain('registered Binding')
  })

  it('flags a direct-field child result established by foldChildAt', () => {
    const result = resultFor(
      'Settings',
      'settings',
      childReturn(
        'settingsReset',
        childCall('Settings', 'setTheme', 'settings'),
      ),
      modifyFieldsCall('settings', 'settingsReset'),
      [
        foldChild(
          'Settings',
          'settings',
          readChildAt('settings'),
          writeChildAt('settings'),
          'update',
          'foldChildAt',
        ),
      ],
    )

    expect(result).toHaveLength(1)
  })

  it('does not treat a keyed collection write as a direct child field', () => {
    const readEntryAt = Testing.arrowFn(
      Testing.callOfMember('HashMap', 'get', [
        Testing.memberExpr('model', 'entries'),
        Testing.id('key'),
      ]),
      [Testing.id('model'), Testing.id('key')],
    )
    const writeEntryAt = Testing.arrowFn(
      Testing.callExpr('modifyFields', [
        Testing.id('model'),
        objectExpression([
          property(
            'entries',
            Testing.arrowFn(
              Testing.callOfMember('HashMap', 'set', [
                Testing.id('entries'),
                Testing.id('key'),
                Testing.id('nextEntry'),
              ]),
              [Testing.id('entries')],
            ),
          ),
        ]),
      ]),
      [Testing.id('model'), Testing.id('key'), Testing.id('nextEntry')],
    )
    const result = resultFor(
      'Entry',
      'entries',
      childReturn('entryUpdate', childCall('Entry', 'update', 'entries')),
      modifyFieldsCall('entries', 'entryUpdate'),
      [
        foldChild(
          'Entry',
          'entries',
          readEntryAt,
          writeEntryAt,
          'update',
          'foldChildAt',
        ),
      ],
    )

    expect(result).toHaveLength(0)
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

  it('allows init completion without a current child Model argument', () => {
    const result = resultFor(
      'Settings',
      'settings',
      childReturn('settingsInit', Testing.callOfMember('Settings', 'init')),
      modifyFieldsCall('settings', 'settingsInit'),
    )

    expect(result).toHaveLength(0)
  })

  it('allows direct child helper calls when their Return is not copied', () => {
    const result = resultFor(
      'Settings',
      'settings',
      childReturn(
        'settingsReset',
        childCall('Settings', 'setTheme', 'settings'),
      ),
      modifyFieldsCall('settings', 'otherResult'),
    )

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

it('detects copied child results using completed Block binding evidence', () => {
  const binding = {
    type: 'CallExpression',
    callee: {
      type: 'MemberExpression',
      object: Testing.id('Application'),
      property: Testing.id('makeCustomBinding'),
      computed: false,
    },
    arguments: [
      Testing.id('Settings'),
      objectExpression([
        property('read', readChild('settings')),
        property('write', writeChild('settings')),
        property('toParentMessage', Testing.arrowFn(Testing.id('message'))),
      ]),
    ],
  }
  const result = resultFor(
    'Settings',
    'settings',
    childReturn('settingsReset', childCall('Settings', 'setTheme', 'settings')),
    modifyFieldsCall('settings', 'settingsReset'),
    [Testing.varDecl('const', 'settings', binding)],
  )

  expect(result).toHaveLength(1)
})

it('detects copied child results using direct field Binding shorthand', () => {
  const binding = Testing.callOfMember(
    'Application',
    'makeRequiredFieldBinding',
    [
      Testing.id('Settings'),
      objectExpression([
        property('field', Testing.strLiteral('settings')),
        property(
          'parentMessage',
          Testing.memberExpr('Message', 'GotSettingsMessage'),
        ),
      ]),
    ],
  )
  const result = resultFor(
    'Settings',
    'settings',
    childReturn('settingsReset', childCall('Settings', 'setTheme', 'settings')),
    modifyFieldsCall('settings', 'settingsReset'),
    [Testing.varDecl('const', 'settings', binding)],
  )

  expect(result).toHaveLength(1)
})

it('detects copied child results using keyed Binding evidence', () => {
  const readAll = Testing.arrowFn(
    {
      type: 'ArrayExpression',
      elements: [Testing.memberExpr('model', 'settings')],
    },
    [Testing.id('model')],
  )
  const binding = Testing.callOfMember(
    'Application',
    'makeCustomKeyedBinding',
    [
      Testing.id('Settings'),
      objectExpression([
        property('readAll', readAll),
        property(
          'key',
          Testing.arrowFn(Testing.memberExpr('settings', 'id'), [
            Testing.id('settings'),
          ]),
        ),
        property('read', Testing.arrowFn(Testing.id('settings'))),
        property('writeAt', writeChildAt('settings')),
        property('toParentMessage', Testing.arrowFn(Testing.id('message'))),
      ]),
    ],
  )
  const result = resultFor(
    'Settings',
    'settings',
    childReturn('settingsReset', childCall('Settings', 'setTheme', 'settings')),
    modifyFieldsCall('settings', 'settingsReset'),
    [Testing.varDecl('const', 'settings', binding)],
  )

  expect(result).toHaveLength(1)
})
