import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noDirectSubmodelStateUpdate } from '../../src/rules/no-direct-submodel-state-update.ts'

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

const evo = (model: string, updates: unknown) =>
  Testing.callExpr('evo', [Testing.id(model), updates])

const foldChild = (read: unknown, write: unknown) =>
  Testing.callOfMember('Update', 'foldChild', [
    objectExpression([property('read', read), property('write', write)]),
  ])

const readSettings = Testing.arrowFn(
  Testing.callOfMember('Option', 'some', [
    Testing.memberExpr('model', 'settings'),
  ]),
  [Testing.id('model')],
)

const writeSettings = Testing.arrowFn(
  evo(
    'model',
    objectExpression([
      property('settings', Testing.arrowFn(Testing.id('nextSettings'))),
    ]),
  ),
  [Testing.id('model'), Testing.id('nextSettings')],
)

const directSettingsUpdate = (model: string) =>
  evo(
    model,
    objectExpression([
      property(
        'settings',
        Testing.arrowFn(
          evo(
            'settings',
            objectExpression([
              property('theme', Testing.arrowFn(Testing.strLiteral('Light'))),
            ]),
          ),
          [Testing.id('settings')],
        ),
      ),
    ]),
  )

const directPreferencesUpdate = (model: string) =>
  evo(
    model,
    objectExpression([
      property(
        'preferences',
        Testing.arrowFn(
          evo(
            'preferences',
            objectExpression([
              property('theme', Testing.arrowFn(Testing.strLiteral('Light'))),
            ]),
          ),
          [Testing.id('preferences')],
        ),
      ),
    ]),
  )

const foldSettings = Testing.varDecl(
  'const',
  'foldSettings',
  foldChild(readSettings, writeSettings),
)

const foldSettingsDataFirst = (model: string) =>
  Testing.callExpr('foldSettings', [Testing.id(model), Testing.id('message')])

const foldSettingsDataLast = (model: string) => ({
  type: 'CallExpression',
  callee: Testing.callExpr('foldSettings', [Testing.id('message')]),
  arguments: [Testing.id(model)],
})

const foldSettingsStep = (model: string) =>
  Testing.callOfMember('Update', 'combine', [
    Testing.id(model),
    {
      type: 'ArrayExpression',
      elements: [Testing.callExpr('foldSettings', [Testing.id('message')])],
    },
  ])

const foldSettingsDataLastCombine = (model: string) => ({
  type: 'CallExpression',
  callee: Testing.callOfMember('Update', 'combine', [
    {
      type: 'ArrayExpression',
      elements: [Testing.callExpr('foldSettings', [Testing.id('message')])],
    },
  ]),
  arguments: [Testing.id(model)],
})

const foldSettingsReturnedStep = Testing.varDecl(
  'const',
  'foldSettingsStep',
  Testing.callOfMember('Update', 'combine', [
    {
      type: 'ArrayExpression',
      elements: [Testing.callExpr('foldSettings', [Testing.id('message')])],
    },
  ]),
)

const applyFoldSettingsStep = (model: string) =>
  Testing.callExpr('foldSettingsStep', [Testing.id(model)])

const foldSettingsNestedCombine = () =>
  Testing.callOfMember('Update', 'combine', [
    Testing.id('outerModel'),
    {
      type: 'ArrayExpression',
      elements: [
        Testing.arrowFn(foldSettingsDataLastCombine('stepModel'), [
          Testing.id('stepModel'),
        ]),
      ],
    },
  ])

const foldSettingsDataFirstCombine = () =>
  Testing.callOfMember('Update', 'combine', [
    Testing.id('outerModel'),
    {
      type: 'ArrayExpression',
      elements: [
        Testing.arrowFn(
          Testing.callExpr('foldSettings', [
            Testing.id('stepModel'),
            Testing.id('message'),
          ]),
          [Testing.id('stepModel')],
        ),
      ],
    },
  ])

const runRule = (statements: ReadonlyArray<unknown>) =>
  Testing.runRule(
    noDirectSubmodelStateUpdate,
    'Program:exit',
    Testing.program(statements),
  )

describe('no-direct-submodel-state-update', () => {
  it('flags nested evo on a field wired as a child Submodel', () => {
    const result = runRule([
      foldSettings,
      foldSettingsDataFirst('model'),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`settings`')
    expect(result[0]?.diagnostic.message).toContain(
      'child-owned update capability',
    )
  })

  it('allows a nested evo on an ordinary Model field', () => {
    const result = runRule([
      foldSettings,
      foldSettingsDataFirst('model'),
      directPreferencesUpdate('model'),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows the evo in the fold write callback', () => {
    const writeWithNestedEvo = Testing.arrowFn(
      evo(
        'model',
        objectExpression([
          property(
            'settings',
            Testing.arrowFn(
              evo(
                'settings',
                objectExpression([
                  property(
                    'theme',
                    Testing.arrowFn(Testing.strLiteral('Light')),
                  ),
                ]),
              ),
              [Testing.id('settings')],
            ),
          ),
        ]),
      ),
      [Testing.id('model'), Testing.id('nextSettings')],
    )
    const result = runRule([
      Testing.varDecl(
        'const',
        'foldSettings',
        foldChild(readSettings, writeWithNestedEvo),
      ),
      foldSettingsDataFirst('model'),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows child-owned reflect helpers', () => {
    const result = runRule([
      foldSettings,
      foldSettingsDataFirst('model'),
      evo(
        'model',
        objectExpression([
          property(
            'settings',
            Testing.arrowFn(
              Testing.callOfMember('Settings', 'reflectTheme', [
                Testing.id('settings'),
                Testing.strLiteral('Light'),
              ]),
              [Testing.id('settings')],
            ),
          ),
        ]),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('requires matching read and write field evidence', () => {
    const writeOtherField = Testing.arrowFn(
      evo(
        'model',
        objectExpression([
          property('other', Testing.arrowFn(Testing.id('nextSettings'))),
        ]),
      ),
      [Testing.id('model'), Testing.id('nextSettings')],
    )
    const result = runRule([
      Testing.varDecl(
        'const',
        'foldSettings',
        foldChild(readSettings, writeOtherField),
      ),
      foldSettingsDataFirst('model'),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(0)
  })

  it('binds a child field to the Model passed through a data-first fold', () => {
    const result = runRule([
      foldSettings,
      foldSettingsDataFirst('parentModel'),
      directSettingsUpdate('otherModel'),
    ])

    expect(result).toHaveLength(0)
  })

  it('flags nested evo on the Model passed through a data-last fold', () => {
    const result = runRule([
      foldSettings,
      foldSettingsDataLast('model'),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags nested evo on the Model passed through a combine Step', () => {
    const result = runRule([
      foldSettings,
      foldSettingsStep('model'),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags nested evo on the Model applied to a data-last combine', () => {
    const result = runRule([
      foldSettings,
      foldSettingsDataLastCombine('model'),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags nested evo on the Model applied to a returned combine Step', () => {
    const result = runRule([
      foldSettings,
      foldSettingsReturnedStep,
      applyFoldSettingsStep('model'),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(1)
  })

  it('binds a nested combine fold to its closest Step Model', () => {
    const result = runRule([
      foldSettings,
      foldSettingsNestedCombine(),
      directSettingsUpdate('stepModel'),
    ])

    expect(result).toHaveLength(1)
  })

  it('keeps a data-first fold bound to its explicit Model inside combine', () => {
    const result = runRule([
      foldSettings,
      foldSettingsDataFirstCombine(),
      directSettingsUpdate('stepModel'),
    ])

    expect(result).toHaveLength(1)
  })
})
