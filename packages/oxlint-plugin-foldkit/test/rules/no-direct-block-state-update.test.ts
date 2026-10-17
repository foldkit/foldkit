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

const modifyFields = (model: string, updates: unknown) =>
  Testing.callExpr('modifyFields', [Testing.id(model), updates])

const foldChild = (read: unknown, write: unknown) =>
  Testing.callOfMember('Update', 'foldChild', [
    objectExpression([property('read', read), property('write', write)]),
  ])

const foldChildStep = (read: unknown, write: unknown) =>
  Testing.callOfMember('Update', 'foldChildStep', [
    objectExpression([property('read', read), property('write', write)]),
  ])

const foldChildAt = (readAt: unknown, writeAt: unknown) =>
  Testing.callOfMember('Update', 'foldChildAt', [
    objectExpression([
      property('readAt', readAt),
      property('writeAt', writeAt),
    ]),
  ])

const readSettings = Testing.arrowFn(
  Testing.callOfMember('Option', 'some', [
    Testing.memberExpr('model', 'settings'),
  ]),
  [Testing.id('model')],
)

const writeSettings = Testing.arrowFn(
  modifyFields(
    'model',
    objectExpression([
      property('settings', Testing.arrowFn(Testing.id('nextSettings'))),
    ]),
  ),
  [Testing.id('model'), Testing.id('nextSettings')],
)

const readSettingsAt = Testing.arrowFn(
  Testing.callOfMember('Option', 'some', [
    Testing.memberExpr('model', 'settings'),
  ]),
  [Testing.id('model'), Testing.id('key')],
)

const writeSettingsAt = Testing.arrowFn(
  modifyFields(
    'model',
    objectExpression([
      property('settings', Testing.arrowFn(Testing.id('nextSettings'))),
    ]),
  ),
  [Testing.id('model'), Testing.id('key'), Testing.id('nextSettings')],
)

const directSettingsUpdate = (model: string) =>
  modifyFields(
    model,
    objectExpression([
      property(
        'settings',
        Testing.arrowFn(
          modifyFields(
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
  modifyFields(
    model,
    objectExpression([
      property(
        'preferences',
        Testing.arrowFn(
          modifyFields(
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

const foldSettingsStep = Testing.varDecl(
  'const',
  'foldSettingsStep',
  foldChildStep(readSettings, writeSettings),
)

const foldSettingsAt = Testing.varDecl(
  'const',
  'foldSettingsAt',
  foldChildAt(readSettingsAt, writeSettingsAt),
)

const foldSettingsDataFirst = (model: string) =>
  Testing.callExpr('foldSettings', [Testing.id(model), Testing.id('message')])

const foldSettingsDataLast = (model: string) => ({
  type: 'CallExpression',
  callee: Testing.callExpr('foldSettings', [Testing.id('message')]),
  arguments: [Testing.id(model)],
})

const foldSettingsAtDataFirst = (model: string) =>
  Testing.callExpr('foldSettingsAt', [
    Testing.id(model),
    Testing.id('key'),
    Testing.id('message'),
  ])

const foldSettingsAtDataLast = (model: string) => ({
  type: 'CallExpression',
  callee: Testing.callExpr('foldSettingsAt', [
    Testing.id('key'),
    Testing.id('message'),
  ]),
  arguments: [Testing.id(model)],
})

const identityStep = () =>
  Testing.arrowFn(
    objectExpression([property('model', Testing.id('stepModel'))]),
    [Testing.id('stepModel')],
  )

const foldSettingsAtCombine = (model: string) =>
  Testing.callOfMember('Update', 'combine', [
    Testing.id(model),
    {
      type: 'ArrayExpression',
      elements: [
        Testing.callExpr('foldSettingsAt', [
          Testing.id('key'),
          Testing.id('message'),
        ]),
        identityStep(),
      ],
    },
  ])

const foldSettingsAtDataLastCombine = (model: string) => ({
  type: 'CallExpression',
  callee: Testing.callOfMember('Update', 'combine', [
    {
      type: 'ArrayExpression',
      elements: [
        Testing.callExpr('foldSettingsAt', [
          Testing.id('key'),
          Testing.id('message'),
        ]),
        identityStep(),
      ],
    },
  ]),
  arguments: [Testing.id(model)],
})

const foldSettingsCombine = (model: string) =>
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

const foldSettingsAppliedToOtherModelInsideCombine = () =>
  Testing.callOfMember('Update', 'combine', [
    Testing.id('outerModel'),
    {
      type: 'ArrayExpression',
      elements: [
        Testing.arrowFn(foldSettingsDataLast('otherModel'), [
          Testing.id('stepModel'),
        ]),
      ],
    },
  ])

const conditionalSettingsUpdate = (model: string) =>
  modifyFields(
    model,
    objectExpression([
      property(
        'settings',
        Testing.arrowFn(
          {
            type: 'BlockStatement',
            body: [
              {
                type: 'IfStatement',
                test: Testing.id('condition'),
                consequent: {
                  type: 'BlockStatement',
                  body: [
                    {
                      type: 'ReturnStatement',
                      argument: modifyFields(
                        'settings',
                        objectExpression([
                          property(
                            'theme',
                            Testing.arrowFn(Testing.strLiteral('Light')),
                          ),
                        ]),
                      ),
                    },
                  ],
                },
                alternate: null,
              },
              { type: 'ReturnStatement', argument: Testing.id('settings') },
            ],
          },
          [Testing.id('settings')],
        ),
      ),
    ]),
  )

const deferredSettingsUpdate = (model: string) =>
  modifyFields(
    model,
    objectExpression([
      property(
        'settings',
        Testing.arrowFn(
          {
            type: 'BlockStatement',
            body: [
              Testing.varDecl(
                'const',
                'deferredUpdate',
                Testing.arrowFn(
                  modifyFields(
                    'settings',
                    objectExpression([
                      property(
                        'theme',
                        Testing.arrowFn(Testing.strLiteral('Light')),
                      ),
                    ]),
                  ),
                  [],
                ),
              ),
              { type: 'ReturnStatement', argument: Testing.id('settings') },
            ],
          },
          [Testing.id('settings')],
        ),
      ),
    ]),
  )

const runRule = (statements: ReadonlyArray<unknown>) =>
  Testing.runRule(
    noDirectBlockStateUpdate,
    'Program:exit',
    Testing.program(statements),
  )

describe('no-direct-block-state-update', () => {
  it('flags nested modifyFields on a field wired as a child Block', () => {
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
    expect(result[0]?.diagnostic.message).toContain('registered Binding')
  })

  it('flags a direct-field child wired through a data-first keyed fold', () => {
    const result = runRule([
      foldSettingsAt,
      foldSettingsAtDataFirst('model'),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags a direct-field child wired through a data-last keyed fold', () => {
    const result = runRule([
      foldSettingsAt,
      foldSettingsAtDataLast('model'),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags a direct-field keyed fold in data-first combine', () => {
    const result = runRule([
      foldSettingsAt,
      foldSettingsAtCombine('model'),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags a direct-field keyed fold in data-last combine', () => {
    const result = runRule([
      foldSettingsAt,
      foldSettingsAtDataLastCombine('model'),
      directSettingsUpdate('model'),
    ])

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
      modifyFields(
        'model',
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
      ),
      [Testing.id('model'), Testing.id('key'), Testing.id('nextEntry')],
    )
    const result = runRule([
      Testing.varDecl(
        'const',
        'foldEntry',
        foldChildAt(readEntryAt, writeEntryAt),
      ),
      Testing.callExpr('foldEntry', [
        Testing.id('model'),
        Testing.id('key'),
        Testing.id('message'),
      ]),
      modifyFields(
        'model',
        objectExpression([
          property(
            'entries',
            Testing.arrowFn(
              modifyFields(
                'entries',
                objectExpression([
                  property(
                    'selection',
                    Testing.arrowFn(Testing.id('selection')),
                  ),
                ]),
              ),
              [Testing.id('entries')],
            ),
          ),
        ]),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows a nested modifyFields on an ordinary Model field', () => {
    const result = runRule([
      foldSettings,
      foldSettingsDataFirst('model'),
      directPreferencesUpdate('model'),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows the modifyFields in the fold write callback', () => {
    const writeWithNestedModifyFields = Testing.arrowFn(
      modifyFields(
        'model',
        objectExpression([
          property(
            'settings',
            Testing.arrowFn(
              modifyFields(
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
        foldChild(readSettings, writeWithNestedModifyFields),
      ),
      foldSettingsDataFirst('model'),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows child-owned reflect helpers', () => {
    const result = runRule([
      foldSettings,
      foldSettingsDataFirst('model'),
      modifyFields(
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
      modifyFields(
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

  it('flags nested modifyFields on the Model passed through a data-last fold', () => {
    const result = runRule([
      foldSettings,
      foldSettingsDataLast('model'),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags nested modifyFields on the Model passed through a combine Step', () => {
    const result = runRule([
      foldSettings,
      foldSettingsCombine('model'),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags nested modifyFields on the Model applied to a data-last combine', () => {
    const result = runRule([
      foldSettings,
      foldSettingsDataLastCombine('model'),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags nested modifyFields on the Model applied to a returned combine Step', () => {
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

  it('does not attribute a fold applied to another Model to an outer combine', () => {
    const result = runRule([
      foldSettings,
      foldSettingsAppliedToOtherModelInsideCombine(),
      directSettingsUpdate('outerModel'),
    ])

    expect(result).toHaveLength(0)
  })

  it('flags a direct foldChildStep application', () => {
    const result = runRule([
      foldSettingsStep,
      Testing.callExpr('foldSettingsStep', [Testing.id('model')]),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags a foldChildStep used directly in a combine Step array', () => {
    const result = runRule([
      foldSettingsStep,
      Testing.callOfMember('Update', 'combine', [
        Testing.id('model'),
        { type: 'ArrayExpression', elements: [Testing.id('foldSettingsStep')] },
      ]),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags a conditional return that directly evolves the child Model', () => {
    const result = runRule([
      foldSettings,
      foldSettingsDataFirst('model'),
      conditionalSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(1)
  })

  it('ignores child modifyFields expressions returned from nested callbacks', () => {
    const result = runRule([
      foldSettings,
      foldSettingsDataFirst('model'),
      deferredSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(0)
  })
})

describe('completed Block bindings', () => {
  const settingsBinding = Testing.varDecl('const', 'settings', {
    type: 'CallExpression',
    callee: {
      type: 'MemberExpression',
      object: Testing.id('Application'),
      property: Testing.id('bindChild'),
      computed: false,
    },
    arguments: [
      Testing.id('Settings'),
      objectExpression([
        property('read', readSettings),
        property('write', writeSettings),
        property('toParentMessage', Testing.arrowFn(Testing.id('message'))),
      ]),
    ],
  })

  const directSettingsBinding = Testing.varDecl('const', 'settings', {
    type: 'CallExpression',
    callee: {
      type: 'MemberExpression',
      object: Testing.id('Application'),
      property: Testing.id('bindChild'),
      computed: false,
    },
    arguments: [
      Testing.id('Settings'),
      objectExpression([
        property('field', { type: 'Literal', value: 'settings' }),
        property(
          'parentMessage',
          Testing.memberExpr('Message', 'GotSettingsMessage'),
        ),
      ]),
    ],
  })

  const directEntriesBinding = (keyPropertyName = 'key') =>
    Testing.varDecl('const', 'entries', {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: Testing.id('Application'),
        property: Testing.id('bindChild'),
        computed: false,
      },
      arguments: [
        Testing.id('Entry'),
        objectExpression([
          property('field', Testing.strLiteral('entries')),
          property(keyPropertyName, Testing.strLiteral('id')),
          property('toParentMessage', Testing.arrowFn(Testing.id('message'))),
        ]),
      ],
    })

  const wrappedEntriesBinding = Testing.varDecl('const', 'entries', {
    type: 'CallExpression',
    callee: {
      type: 'MemberExpression',
      object: Testing.id('Application'),
      property: Testing.id('bindChild'),
      computed: false,
    },
    arguments: [
      Testing.id('Counter'),
      objectExpression([
        property('field', Testing.strLiteral('entries')),
        property('key', Testing.strLiteral('id')),
        property('childField', Testing.strLiteral('counter')),
        property('toParentMessage', Testing.arrowFn(Testing.id('message'))),
      ]),
    ],
  })

  const updateEntriesManually = () =>
    modifyFields(
      'model',
      objectExpression([
        property(
          'entries',
          Testing.callOfMember('Array', 'map', [
            Testing.arrowFn(
              modifyFields(
                'entry',
                objectExpression([
                  property(
                    'theme',
                    Testing.arrowFn(Testing.strLiteral('Light')),
                  ),
                ]),
              ),
              [Testing.id('entry')],
            ),
          ]),
        ),
      ]),
    )

  const updateWrappedEntry = (field: string) =>
    modifyFields(
      'model',
      objectExpression([
        property(
          'entries',
          Testing.callOfMember('Array', 'map', [
            Testing.arrowFn(
              modifyFields(
                'entry',
                objectExpression([
                  property(field, Testing.arrowFn(Testing.id('replacement'))),
                ]),
              ),
              [Testing.id('entry')],
            ),
          ]),
        ),
      ]),
    )

  const removeWrappedEntry = () =>
    modifyFields(
      'model',
      objectExpression([
        property(
          'entries',
          Testing.callOfMember('Array', 'filter', [
            Testing.arrowFn(Testing.id('shouldKeep'), [Testing.id('entry')]),
          ]),
        ),
      ]),
    )

  const applicationComposition = (
    name: string,
    definition: unknown,
    childBindings: ReadonlyArray<unknown>,
  ) =>
    Testing.varDecl('const', name, {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: definition,
        property: Testing.id('makeComposition'),
        computed: false,
      },
      arguments: [
        objectExpression([
          property('childBindings', {
            type: 'ArrayExpression',
            elements: childBindings,
          }),
        ]),
      ],
    })

  const compositionUpdate = (
    composition: string,
    model: unknown = directSettingsUpdate('model'),
  ) =>
    Testing.callOfMember(composition, 'makeUpdate', [
      Testing.arrowFn(objectExpression([property('model', model)]), [
        Testing.id('model'),
        Testing.id('message'),
      ]),
    ])

  it('tracks a parent Model dispatched through binding.fold', () => {
    const result = runRule([
      settingsBinding,
      Testing.callOfMember('settings', 'fold', [
        Testing.id('model'),
        Testing.id('message'),
      ]),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(1)
  })

  it('tracks an exposed operation inside Update.combine', () => {
    const result = runRule([
      settingsBinding,
      Testing.callOfMember('Update', 'combine', [
        Testing.id('model'),
        {
          type: 'ArrayExpression',
          elements: [Testing.callOfMember('settings', 'clearSelection', [])],
        },
      ]),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(1)
  })

  it('tracks a direct field Binding through binding.fold', () => {
    const result = runRule([
      directSettingsBinding,
      Testing.callOfMember('settings', 'fold', [
        Testing.id('model'),
        Testing.id('message'),
      ]),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(1)
  })

  it('tracks direct keyed fields through named Binding operations', () => {
    const result = runRule([
      directEntriesBinding(),
      Testing.callOfMember('Update', 'combine', [
        Testing.id('model'),
        {
          type: 'ArrayExpression',
          elements: [
            Testing.callOfMember('entries', 'setTheme', [
              Testing.strLiteral('first'),
              Testing.strLiteral('Light'),
            ]),
          ],
        },
      ]),
      updateEntriesManually(),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags replacing a wrapped child Model through binding.fold', () => {
    const result = runRule([
      wrappedEntriesBinding,
      Testing.callOfMember('entries', 'fold', [
        Testing.id('model'),
        Testing.strLiteral('first'),
        Testing.id('message'),
      ]),
      updateWrappedEntry('counter'),
    ])

    expect(result).toHaveLength(1)
  })

  it('tracks wrapped child Models through named Binding operations', () => {
    const result = runRule([
      wrappedEntriesBinding,
      Testing.callOfMember('Update', 'combine', [
        Testing.id('model'),
        {
          type: 'ArrayExpression',
          elements: [
            Testing.callOfMember('entries', 'increment', [
              Testing.strLiteral('first'),
            ]),
          ],
        },
      ]),
      updateWrappedEntry('counter'),
    ])

    expect(result).toHaveLength(1)
  })

  it('allows updating metadata beside a wrapped child Model', () => {
    const result = runRule([
      wrappedEntriesBinding,
      Testing.callOfMember('entries', 'fold', [
        Testing.id('model'),
        Testing.strLiteral('first'),
        Testing.id('message'),
      ]),
      updateWrappedEntry('label'),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows removing a wrapper from the parent collection', () => {
    const result = runRule([
      wrappedEntriesBinding,
      Testing.callOfMember('entries', 'fold', [
        Testing.id('model'),
        Testing.strLiteral('first'),
        Testing.id('message'),
      ]),
      removeWrappedEntry(),
    ])

    expect(result).toHaveLength(0)
  })

  it('does not recognize keyField as direct keyed shorthand', () => {
    const result = runRule([
      directEntriesBinding('keyField'),
      Testing.callOfMember('entries', 'fold', [
        Testing.id('model'),
        Testing.strLiteral('first'),
        Testing.id('message'),
      ]),
      updateEntriesManually(),
    ])

    expect(result).toHaveLength(0)
  })

  it('does not attribute an unrelated Model to a binding', () => {
    const result = runRule([
      settingsBinding,
      Testing.callOfMember('settings', 'fold', [
        Testing.id('otherModel'),
        Testing.id('message'),
      ]),
      directSettingsUpdate('model'),
    ])

    expect(result).toHaveLength(0)
  })

  it('tracks an automatically routed Binding in Composition.makeUpdate', () => {
    const result = runRule([
      directSettingsBinding,
      applicationComposition(
        'ApplicationComposition',
        Testing.id('Application'),
        [Testing.id('settings')],
      ),
      compositionUpdate('ApplicationComposition'),
    ])

    expect(result).toHaveLength(1)
  })

  it('tracks a registered Binding through a namespace Definition receiver', () => {
    const namespacedApplication = Testing.memberExpr('Feature', 'Application')
    const namespacedBinding = Testing.varDecl('const', 'settings', {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: namespacedApplication,
        property: Testing.id('bindChild'),
        computed: false,
      },
      arguments: [
        Testing.id('Settings'),
        objectExpression([
          property('field', Testing.strLiteral('settings')),
          property(
            'parentMessage',
            Testing.memberExpr('Message', 'GotSettingsMessage'),
          ),
        ]),
      ],
    })
    const result = runRule([
      namespacedBinding,
      applicationComposition('ApplicationComposition', namespacedApplication, [
        Testing.id('settings'),
      ]),
      compositionUpdate('ApplicationComposition'),
    ])

    expect(result).toHaveLength(1)
  })

  it('tracks an automatically routed keyed Binding', () => {
    const result = runRule([
      directEntriesBinding(),
      applicationComposition(
        'ApplicationComposition',
        Testing.id('Application'),
        [Testing.id('entries')],
      ),
      compositionUpdate('ApplicationComposition', updateEntriesManually()),
    ])

    expect(result).toHaveLength(1)
  })

  it('tracks an automatically routed wrapped keyed Binding', () => {
    const result = runRule([
      wrappedEntriesBinding,
      applicationComposition(
        'ApplicationComposition',
        Testing.id('Application'),
        [Testing.id('entries')],
      ),
      compositionUpdate(
        'ApplicationComposition',
        updateWrappedEntry('counter'),
      ),
    ])

    expect(result).toHaveLength(1)
  })

  it('does not track a Binding omitted from childBindings', () => {
    const result = runRule([
      directSettingsBinding,
      applicationComposition(
        'ApplicationComposition',
        Testing.id('Application'),
        [],
      ),
      compositionUpdate('ApplicationComposition'),
    ])

    expect(result).toHaveLength(0)
  })

  it('does not track a Binding registered on another Composition receiver', () => {
    const result = runRule([
      directSettingsBinding,
      applicationComposition(
        'ApplicationCompositionWithSettings',
        Testing.id('Application'),
        [Testing.id('settings')],
      ),
      applicationComposition(
        'ApplicationComposition',
        Testing.id('Application'),
        [],
      ),
      compositionUpdate('ApplicationComposition'),
    ])

    expect(result).toHaveLength(0)
  })

  it('does not track a Binding owned by another Definition', () => {
    const otherSettingsBinding = Testing.varDecl('const', 'otherSettings', {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: Testing.id('OtherApplication'),
        property: Testing.id('bindChild'),
        computed: false,
      },
      arguments: [
        Testing.id('Settings'),
        objectExpression([
          property('field', Testing.strLiteral('settings')),
          property(
            'parentMessage',
            Testing.memberExpr('Message', 'GotSettingsMessage'),
          ),
        ]),
      ],
    })
    const result = runRule([
      otherSettingsBinding,
      applicationComposition(
        'ApplicationComposition',
        Testing.id('Application'),
        [Testing.id('otherSettings')],
      ),
      compositionUpdate('ApplicationComposition'),
    ])

    expect(result).toHaveLength(0)
  })

  it('does not infer child fields from an imported Binding', () => {
    const result = runRule([
      applicationComposition(
        'ApplicationComposition',
        Testing.id('Application'),
        [Testing.id('ImportedSettingsBinding')],
      ),
      compositionUpdate('ApplicationComposition'),
    ])

    expect(result).toHaveLength(0)
  })

  it('does not infer child fields from a namespace Binding', () => {
    const result = runRule([
      applicationComposition(
        'ApplicationComposition',
        Testing.id('Application'),
        [Testing.memberExpr('Settings', 'SettingsBinding')],
      ),
      compositionUpdate('ApplicationComposition'),
    ])

    expect(result).toHaveLength(0)
  })
})
