import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/selection-submodel-factory-at-module-scope.ts'

const callFromCallee = (
  callee: unknown,
  args: ReadonlyArray<unknown> = [],
) => ({
  type: 'CallExpression',
  callee,
  arguments: Array.from(args),
})

const memberFromObject = (object: unknown, property: string) => ({
  type: 'MemberExpression',
  object,
  property: Testing.id(property),
  computed: false,
})

const parenthesized = (expression: unknown) => ({
  type: 'ParenthesizedExpression',
  expression,
})

const tsAs = (expression: unknown) => ({
  type: 'TSAsExpression',
  expression,
  typeAnnotation: { type: 'TSTypeReference' },
})

const satisfies = (expression: unknown) => ({
  type: 'TSSatisfiesExpression',
  expression,
  typeAnnotation: { type: 'TSTypeReference' },
})

const uiCreate = (...segments: readonly [string, ...ReadonlyArray<string>]) =>
  callFromCallee(Testing.chainedMemberExpr('Ui', ...segments, 'create'))

const otherCreate = () =>
  callFromCallee(Testing.chainedMemberExpr('Other', 'Listbox', 'create'))

const constDecl = (name: string, init: unknown) =>
  Testing.varDecl('const', name, init)

const exportConst = (name: string, init: unknown) =>
  Testing.exportNamedDecl(constDecl(name, init))

const programExit = (body: ReadonlyArray<unknown>) =>
  Testing.runRule(rule, 'Program:exit', Testing.program(body))

describe('selection-submodel-factory-at-module-scope', () => {
  it('allows Ui.<Component>.create as a direct module-scope const initializer', () => {
    const result = programExit([constDecl('PlanListbox', uiCreate('Listbox'))])
    expect(result).toHaveLength(0)
  })

  it('allows Ui.<Component>.Multi.create as an exported module-scope const initializer', () => {
    const result = programExit([
      exportConst('FeatureSpecListbox', uiCreate('Listbox', 'Multi')),
    ])
    expect(result).toHaveLength(0)
  })

  it('allows parenthesized, as, and satisfies wrappers around a direct initializer', () => {
    const result = programExit([
      exportConst(
        'CityCombobox',
        satisfies(tsAs(parenthesized(uiCreate('Combobox')))),
      ),
    ])
    expect(result).toHaveLength(0)
  })

  it('flags inline Ui selection factories inside function bodies', () => {
    const result = programExit([
      exportConst(
        'view',
        Testing.arrowFn(
          Testing.blockStmt([
            Testing.returnStmt(
              callFromCallee(memberFromObject(uiCreate('Combobox'), 'view')),
            ),
          ]),
        ),
      ),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'factories must be declared once as a module-scope variable initializer',
    )
  })

  it('flags function-scoped direct variable initializers', () => {
    const result = programExit([
      exportConst(
        'makeView',
        Testing.arrowFn(
          Testing.blockStmt([constDecl('InnerListbox', uiCreate('Listbox'))]),
        ),
      ),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Ui.Listbox.create')
  })

  it('flags module-scope initializers that use the factory call as a nested expression', () => {
    const result = programExit([
      constDecl(
        'PlanListboxView',
        memberFromObject(uiCreate('Listbox'), 'view'),
      ),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Ui.Listbox.create')
  })

  it('flags factory calls nested inside exported module-scope initializers', () => {
    const result = programExit([
      exportConst(
        'PlanListboxView',
        callFromCallee('makeFactory', [uiCreate('Listbox')]),
      ),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Ui.Listbox.create')
  })

  it('does not flag unrelated Ui calls, non-selection Ui create calls, or non-Ui create calls', () => {
    const result = programExit([
      constDecl('buttonView', Testing.callOfMember('Ui', 'Button', [])),
      constDecl('ButtonFactory', uiCreate('Button')),
      constDecl('OtherListbox', otherCreate()),
    ])
    expect(result).toHaveLength(0)
  })
})
