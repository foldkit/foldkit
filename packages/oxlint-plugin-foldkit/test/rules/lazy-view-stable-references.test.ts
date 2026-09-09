import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { lazyViewStableReferences } from '../../src/rules/lazy-view-stable-references.ts'

const parenthesized = (expression: unknown) => ({
  type: 'ParenthesizedExpression',
  expression,
})

const functionDeclaration = (name: string) => ({
  type: 'FunctionDeclaration',
  id: Testing.id(name),
  params: [],
  body: Testing.blockStmt(),
})

const moduleViewFunction = (parameterName: string) =>
  Testing.arrowFn(Testing.id(parameterName), [Testing.id(parameterName)])

const viewReturning = (
  returnedCall: unknown,
  parameters: ReadonlyArray<unknown> = [Testing.id('model')],
) =>
  Testing.exportNamedDecl(
    Testing.varDecl(
      'const',
      'view',
      Testing.arrowFn(
        Testing.blockStmt([Testing.returnStmt(returnedCall)]),
        parameters,
      ),
    ),
  )

const runRule = (programNode: unknown) =>
  Testing.runRule(lazyViewStableReferences, 'Program:exit', programNode)

describe('lazy-view-stable-references', () => {
  it('allows a module-scope createLazy slot called with a module-scope view', () => {
    const result = runRule(
      Testing.program([
        Testing.varDecl('const', 'lazyHeader', Testing.callExpr('createLazy')),
        Testing.varDecl('const', 'viewHeader', moduleViewFunction('model')),
        viewReturning(
          Testing.callExpr('lazyHeader', [
            Testing.id('viewHeader'),
            Testing.id('model'),
          ]),
        ),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows an exported keyed slot with a parenthesized initializer', () => {
    const result = runRule(
      Testing.program([
        Testing.exportNamedDecl(
          Testing.varDecl(
            'const',
            'lazyRow',
            parenthesized(Testing.callExpr('createKeyedLazy')),
          ),
        ),
        Testing.varDecl('const', 'viewRow', moduleViewFunction('row')),
        viewReturning(
          Testing.callExpr('lazyRow', [
            Testing.memberExpr('model', 'id'),
            Testing.id('viewRow'),
            Testing.id('model'),
          ]),
        ),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows calls to untracked slot names even with function-scoped views', () => {
    const result = runRule(
      Testing.program([
        viewReturning(
          Testing.callExpr('importedLazyHeader', [
            Testing.id('viewHeader'),
            Testing.id('model'),
          ]),
          [Testing.id('model'), Testing.id('viewHeader')],
        ),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a function-scoped key when the keyed view is module-scope', () => {
    const result = runRule(
      Testing.program([
        Testing.varDecl(
          'const',
          'lazyRow',
          Testing.callExpr('createKeyedLazy'),
        ),
        Testing.varDecl('const', 'viewRow', moduleViewFunction('row')),
        viewReturning(
          Testing.callExpr('lazyRow', [
            Testing.id('functionScopedKey'),
            Testing.id('viewRow'),
          ]),
          [Testing.id('model'), Testing.id('functionScopedKey')],
        ),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a spread view argument', () => {
    const result = runRule(
      Testing.program([
        Testing.varDecl('const', 'lazyHeader', Testing.callExpr('createLazy')),
        viewReturning(
          Testing.callExpr('lazyHeader', [
            { type: 'SpreadElement', argument: Testing.id('lazyArguments') },
          ]),
        ),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a member-expression view argument', () => {
    const result = runRule(
      Testing.program([
        Testing.varDecl('const', 'lazyHeader', Testing.callExpr('createLazy')),
        viewReturning(
          Testing.callExpr('lazyHeader', [
            Testing.memberExpr('views', 'header'),
            Testing.id('model'),
          ]),
        ),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('flags createLazy passed as an argument inside a function body', () => {
    const result = runRule(
      Testing.program([
        viewReturning(
          Testing.callExpr('render', [
            Testing.callExpr('createLazy'),
            Testing.id('model'),
          ]),
        ),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('module-scope `const`')
  })

  it('flags createKeyedLazy assigned to a local const inside a function', () => {
    const result = runRule(
      Testing.program([
        Testing.exportNamedDecl(
          Testing.varDecl(
            'const',
            'makeView',
            Testing.arrowFn(
              Testing.blockStmt([
                Testing.varDecl(
                  'const',
                  'lazyRow',
                  Testing.callExpr('createKeyedLazy'),
                ),
                Testing.returnStmt(Testing.id('lazyRow')),
              ]),
              [],
            ),
          ),
        ),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('createKeyedLazy')
  })

  it('flags a module-scope create call nested inside another initializer', () => {
    const result = runRule(
      Testing.program([
        Testing.varDecl(
          'const',
          'lazyHeader',
          Testing.callExpr('makeSlot', [Testing.callExpr('createLazy')]),
        ),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('createLazy')
  })

  it('flags a module-scope let slot declaration', () => {
    const result = runRule(
      Testing.program([
        Testing.varDecl('let', 'lazyHeader', Testing.callExpr('createLazy')),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('module-scope `const`')
  })

  it('flags a destructured slot declaration', () => {
    const result = runRule(
      Testing.program([
        {
          type: 'VariableDeclaration',
          kind: 'const',
          declarations: [
            {
              type: 'VariableDeclarator',
              id: { type: 'ArrayPattern', elements: [Testing.id('slot')] },
              init: Testing.callExpr('createLazy'),
            },
          ],
        },
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('module-scope `const`')
  })

  it('flags an inline arrow as the view argument of a lazy slot', () => {
    const result = runRule(
      Testing.program([
        Testing.varDecl('const', 'lazyHeader', Testing.callExpr('createLazy')),
        viewReturning(
          Testing.callExpr('lazyHeader', [
            moduleViewFunction('model'),
            Testing.id('model'),
          ]),
        ),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`lazyHeader`')
    expect(result[0]?.diagnostic.message).toContain('inline view function')
  })

  it('flags an inline arrow at index one of a keyed slot call', () => {
    const result = runRule(
      Testing.program([
        Testing.varDecl(
          'const',
          'lazyRow',
          Testing.callExpr('createKeyedLazy'),
        ),
        viewReturning(
          Testing.callExpr('lazyRow', [
            Testing.id('rowId'),
            moduleViewFunction('row'),
            Testing.id('model'),
          ]),
        ),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`lazyRow`')
    expect(result[0]?.diagnostic.message).toContain('inline view function')
  })

  it('flags a view identifier that is a parameter of the enclosing function', () => {
    const result = runRule(
      Testing.program([
        Testing.varDecl('const', 'lazyHeader', Testing.callExpr('createLazy')),
        viewReturning(
          Testing.callExpr('lazyHeader', [
            Testing.id('viewHeader'),
            Testing.id('model'),
          ]),
          [Testing.id('model'), Testing.id('viewHeader')],
        ),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`viewHeader`')
    expect(result[0]?.diagnostic.message).toContain(
      'bound inside an enclosing function',
    )
  })

  it('flags a view identifier bound by a local const in the enclosing function', () => {
    const result = runRule(
      Testing.program([
        Testing.varDecl('const', 'lazyHeader', Testing.callExpr('createLazy')),
        Testing.exportNamedDecl(
          Testing.varDecl(
            'const',
            'view',
            Testing.arrowFn(
              Testing.blockStmt([
                Testing.varDecl(
                  'const',
                  'viewHeader',
                  moduleViewFunction('model'),
                ),
                Testing.returnStmt(
                  Testing.callExpr('lazyHeader', [
                    Testing.id('viewHeader'),
                    Testing.id('model'),
                  ]),
                ),
              ]),
              [Testing.id('model')],
            ),
          ),
        ),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`viewHeader`')
    expect(result[0]?.diagnostic.message).toContain('module scope')
  })

  it('flags a view identifier bound in a sibling block of the enclosing function', () => {
    const result = runRule(
      Testing.program([
        Testing.varDecl('const', 'lazyHeader', Testing.callExpr('createLazy')),
        Testing.exportNamedDecl(
          Testing.varDecl(
            'const',
            'view',
            Testing.arrowFn(
              Testing.blockStmt([
                Testing.ifStmt(
                  Testing.id('isReady'),
                  Testing.blockStmt([
                    Testing.varDecl(
                      'const',
                      'viewHeader',
                      moduleViewFunction('model'),
                    ),
                  ]),
                  null,
                ),
                Testing.returnStmt(
                  Testing.callExpr('lazyHeader', [Testing.id('viewHeader')]),
                ),
              ]),
              [Testing.id('model')],
            ),
          ),
        ),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`viewHeader`')
  })

  it('flags a view identifier bound by a nested function declaration name', () => {
    const result = runRule(
      Testing.program([
        Testing.varDecl('const', 'lazyHeader', Testing.callExpr('createLazy')),
        Testing.exportNamedDecl(
          Testing.varDecl(
            'const',
            'view',
            Testing.arrowFn(
              Testing.blockStmt([
                functionDeclaration('viewHeader'),
                Testing.returnStmt(
                  Testing.callExpr('lazyHeader', [
                    Testing.id('viewHeader'),
                    Testing.id('model'),
                  ]),
                ),
              ]),
              [Testing.id('model')],
            ),
          ),
        ),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`viewHeader`')
  })
})
