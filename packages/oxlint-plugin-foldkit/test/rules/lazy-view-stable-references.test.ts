import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/lazy-view-stable-references.ts'

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

const createLazy = () => Testing.callExpr('createLazy')
const createKeyedLazy = () => Testing.callExpr('createKeyedLazy')

const constDecl = (name: string, init: unknown) =>
  Testing.varDecl('const', name, init)

const letDecl = (name: string, init: unknown) =>
  Testing.varDecl('let', name, init)

const exportConst = (name: string, init: unknown) =>
  Testing.exportNamedDecl(constDecl(name, init))

const arrow = (body: unknown, params: ReadonlyArray<string> = []) =>
  Testing.arrowFn(body, params.map(Testing.id))

const blockReturn = (expression: unknown) =>
  Testing.blockStmt([Testing.returnStmt(expression)])

const viewFunction = (
  body: unknown,
  params: ReadonlyArray<string> = ['model'],
) => exportConst('view', arrow(blockReturn(body), params))

const programExit = (body: ReadonlyArray<unknown>) =>
  Testing.runRule(rule, 'Program:exit', Testing.program(body))

describe('lazy-view-stable-references', () => {
  it('allows module-scope createLazy slots called with module-scope view functions', () => {
    const result = programExit([
      constDecl('lazyHeader', createLazy()),
      constDecl('viewHeader', arrow(Testing.id('model'), ['model'])),
      viewFunction(
        Testing.callExpr('lazyHeader', [
          Testing.id('viewHeader'),
          Testing.id('model'),
        ]),
      ),
    ])
    expect(result).toHaveLength(0)
  })

  it('allows module-scope createKeyedLazy slots called with module-scope view functions', () => {
    const result = programExit([
      constDecl('lazyRow', parenthesized(createKeyedLazy())),
      constDecl('viewRow', arrow(Testing.id('row'), ['row'])),
      viewFunction(
        Testing.callExpr('lazyRow', [
          memberFromObject(Testing.id('model'), 'id'),
          Testing.id('viewRow'),
          Testing.id('model'),
        ]),
      ),
    ])
    expect(result).toHaveLength(0)
  })

  it('flags createLazy calls that are not direct module-scope const initializers', () => {
    const result = programExit([
      viewFunction(
        Testing.callExpr('render', [createLazy(), Testing.id('model')]),
      ),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'direct module-scope `const` initializers',
    )
  })

  it('flags createKeyedLazy calls that are not direct module-scope const initializers', () => {
    const result = programExit([
      exportConst(
        'makeView',
        arrow(
          Testing.blockStmt([
            constDecl('lazyRow', createKeyedLazy()),
            Testing.returnStmt(Testing.id('lazyRow')),
          ]),
        ),
      ),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('createKeyedLazy')
  })

  it('flags module-scope lazy calls hidden inside another initializer', () => {
    const result = programExit([
      constDecl('lazyHeader', callFromCallee('makeSlot', [createLazy()])),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('createLazy')
  })

  it('flags module-scope non-const lazy slot declarations', () => {
    const result = programExit([letDecl('lazyHeader', createLazy())])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'direct module-scope `const`',
    )
  })

  it('flags inline createLazy view functions at slot call sites', () => {
    const result = programExit([
      constDecl('lazyHeader', createLazy()),
      viewFunction(
        Testing.callExpr('lazyHeader', [
          arrow(Testing.id('model'), ['model']),
          Testing.id('model'),
        ]),
      ),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('not an inline function')
  })

  it('flags inline createKeyedLazy view functions at argument index 1', () => {
    const result = programExit([
      constDecl('lazyRow', createKeyedLazy()),
      viewFunction(
        Testing.callExpr('lazyRow', [
          Testing.id('rowId'),
          arrow(Testing.id('row'), ['row']),
          Testing.id('model'),
        ]),
      ),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('not an inline function')
  })

  it('flags function-scoped createLazy view identifiers', () => {
    const result = programExit([
      constDecl('lazyHeader', createLazy()),
      viewFunction(
        Testing.callExpr('lazyHeader', [
          Testing.id('viewHeader'),
          Testing.id('model'),
        ]),
        ['model', 'viewHeader'],
      ),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'function-scoped view reference `viewHeader`',
    )
  })

  it('flags local const view identifiers passed to lazy slots', () => {
    const result = programExit([
      constDecl('lazyHeader', createLazy()),
      exportConst(
        'view',
        arrow(
          Testing.blockStmt([
            constDecl('viewHeader', arrow(Testing.id('model'), ['model'])),
            Testing.returnStmt(
              Testing.callExpr('lazyHeader', [
                Testing.id('viewHeader'),
                Testing.id('model'),
              ]),
            ),
          ]),
          ['model'],
        ),
      ),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'function-scoped view reference `viewHeader`',
    )
  })

  it('does not inspect imported or otherwise untracked lazy slot calls', () => {
    const result = programExit([
      viewFunction(
        Testing.callExpr('importedLazyHeader', [
          Testing.id('viewHeader'),
          Testing.id('model'),
        ]),
        ['model', 'viewHeader'],
      ),
    ])
    expect(result).toHaveLength(0)
  })

  it('does not treat non-view arguments as lazy view functions', () => {
    const result = programExit([
      constDecl('lazyRow', createKeyedLazy()),
      constDecl('viewRow', arrow(Testing.id('row'), ['row'])),
      viewFunction(
        Testing.callExpr('lazyRow', [
          Testing.id('functionScopedKey'),
          Testing.id('viewRow'),
        ]),
        ['model', 'functionScopedKey'],
      ),
    ])
    expect(result).toHaveLength(0)
  })
})
