import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { selectionSubmodelFactoryAtModuleScope } from '../../src/rules/selection-submodel-factory-at-module-scope.ts'

const callWithCallee = (
  callee: unknown,
  callArguments: ReadonlyArray<unknown> = [],
) => ({
  type: 'CallExpression',
  callee,
  arguments: callArguments,
})

const propertyAccess = (object: unknown, propertyName: string) => ({
  type: 'MemberExpression',
  computed: false,
  object,
  property: Testing.id(propertyName),
})

const factoryCall = (
  first: string,
  second: string,
  ...rest: ReadonlyArray<string>
) => callWithCallee(Testing.chainedMemberExpr(first, second, ...rest))

const runOnProgram = (body: ReadonlyArray<unknown>) =>
  Testing.runRule(
    selectionSubmodelFactoryAtModuleScope,
    'Program:exit',
    Testing.program(body),
  )

describe('selection-submodel-factory-at-module-scope', () => {
  it('flags a factory created inline inside a function body', () => {
    const result = runOnProgram([
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'view',
          Testing.arrowFn(
            Testing.blockStmt([
              Testing.returnStmt(
                callWithCallee(
                  propertyAccess(factoryCall('Combobox', 'create'), 'view'),
                ),
              ),
            ]),
          ),
        ),
      ),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('module-scope')
  })

  it('flags a function-scoped direct initializer', () => {
    const result = runOnProgram([
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'makeView',
          Testing.arrowFn(
            Testing.blockStmt([
              Testing.varDecl(
                'const',
                'InnerListbox',
                factoryCall('Listbox', 'create'),
              ),
            ]),
          ),
        ),
      ),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Listbox.create')
  })

  it('flags a module-scope initializer that only nests the factory call', () => {
    const result = runOnProgram([
      Testing.varDecl(
        'const',
        'PlanListboxView',
        propertyAccess(factoryCall('Listbox', 'create'), 'view'),
      ),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags a factory call nested inside an exported module-scope initializer', () => {
    const result = runOnProgram([
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'PlanListboxView',
          Testing.callExpr('makeFactory', [factoryCall('Listbox', 'create')]),
        ),
      ),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags a Ui-rooted inline call', () => {
    const result = runOnProgram([
      Testing.varDecl(
        'const',
        'render',
        Testing.arrowFn(factoryCall('Ui', 'Listbox', 'create')),
      ),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Ui.Listbox.create')
  })

  it('flags a Ui-rooted Multi factory created inline', () => {
    const result = runOnProgram([
      Testing.varDecl(
        'const',
        'render',
        Testing.arrowFn(factoryCall('Ui', 'Combobox', 'Multi', 'create')),
      ),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Ui.Combobox.Multi.create')
  })

  it('allows a direct module-scope const initializer', () => {
    const result = runOnProgram([
      Testing.varDecl('const', 'PlanListbox', factoryCall('Listbox', 'create')),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows an exported module-scope Multi initializer', () => {
    const result = runOnProgram([
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'FeatureSpecListbox',
          factoryCall('Listbox', 'Multi', 'create'),
        ),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows wrapper expressions around a direct initializer', () => {
    const wrappedFactory = {
      type: 'ParenthesizedExpression',
      expression: {
        type: 'TSSatisfiesExpression',
        expression: {
          type: 'TSAsExpression',
          expression: factoryCall('Combobox', 'create'),
        },
      },
    }
    const result = runOnProgram([
      Testing.exportNamedDecl(
        Testing.varDecl('const', 'CityCombobox', wrappedFactory),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores non-selection and wrong-root calls at any position', () => {
    const result = runOnProgram([
      Testing.varDecl(
        'const',
        'buttonView',
        Testing.callOfMember('Ui', 'Button', [Testing.id('label')]),
      ),
      Testing.varDecl(
        'const',
        'ButtonFactory',
        factoryCall('Ui', 'Button', 'create'),
      ),
      Testing.varDecl(
        'const',
        'ButtonFactory2',
        factoryCall('Button', 'create'),
      ),
      Testing.varDecl(
        'const',
        'OtherListbox',
        factoryCall('Other', 'Listbox', 'create'),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows a Ui-rooted direct module-scope initializer', () => {
    const result = runOnProgram([
      Testing.varDecl(
        'const',
        'PlanListbox',
        factoryCall('Ui', 'Listbox', 'create'),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores Multi on components without a Multi export', () => {
    const result = runOnProgram([
      Testing.varDecl(
        'const',
        'M',
        Testing.arrowFn(factoryCall('Menu', 'Multi', 'create')),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows a module-scope factory with type arguments', () => {
    const factoryWithTypeArguments = {
      ...Testing.callOfMember('Tabs', 'create', []),
      typeArguments: { type: 'TSTypeParameterInstantiation', params: [] },
    }
    const instantiatedFactory = callWithCallee({
      type: 'TSInstantiationExpression',
      expression: Testing.memberExpr('Tabs', 'create'),
    })
    const result = runOnProgram([
      Testing.exportNamedDecl(
        Testing.varDecl('const', 'DemoTabs', factoryWithTypeArguments),
      ),
      Testing.exportNamedDecl(
        Testing.varDecl('const', 'OverviewTabs', instantiatedFactory),
      ),
    ])

    expect(result).toHaveLength(0)
  })
})
