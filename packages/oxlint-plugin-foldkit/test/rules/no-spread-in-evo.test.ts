import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noSpreadInEvo } from '../../src/rules/no-spread-in-evo.ts'

const property = (key: string, value: unknown) => ({
  type: 'Property',
  key: Testing.id(key),
  value,
  computed: false,
})

const literalKeyProperty = (key: string, value: unknown) => ({
  type: 'Property',
  key: Testing.strLiteral(key),
  value,
  computed: false,
})

const computedProperty = (key: unknown, value: unknown) => ({
  type: 'Property',
  key,
  value,
  computed: true,
})

const spreadOf = (argument: unknown) => ({
  type: 'SpreadElement',
  argument,
})

const objectExpression = (properties: ReadonlyArray<unknown>) => ({
  type: 'ObjectExpression',
  properties,
})

const evoCall = (updates: unknown) =>
  Testing.callExpr('evo', [Testing.id('model'), updates])

describe('no-spread-in-evo', () => {
  it('flags an expression-bodied updater that spreads the record', () => {
    const result = Testing.runRule(
      noSpreadInEvo,
      'CallExpression',
      evoCall(
        objectExpression([
          property(
            'f',
            Testing.arrowFn(
              objectExpression([
                spreadOf(Testing.memberExpr('model', 'f')),
                property('x', Testing.numLiteral(1)),
              ]),
            ),
          ),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`f`')
    expect(result[0]?.diagnostic.message).toContain('nested `evo`')
  })

  it('flags a block-bodied updater that returns a spread object', () => {
    const result = Testing.runRule(
      noSpreadInEvo,
      'CallExpression',
      evoCall(
        objectExpression([
          property(
            'f',
            Testing.arrowFn(
              Testing.blockStmt([
                Testing.returnStmt(
                  objectExpression([
                    spreadOf(Testing.memberExpr('model', 'f')),
                  ]),
                ),
              ]),
            ),
          ),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`f`')
  })

  it('reports each offending field independently', () => {
    const result = Testing.runRule(
      noSpreadInEvo,
      'CallExpression',
      evoCall(
        objectExpression([
          property(
            'a',
            Testing.arrowFn(
              objectExpression([spreadOf(Testing.memberExpr('model', 'a'))]),
            ),
          ),
          property(
            'b',
            Testing.arrowFn(
              objectExpression([spreadOf(Testing.memberExpr('model', 'a'))]),
            ),
          ),
        ]),
      ),
    )

    expect(result).toHaveLength(2)
    expect(result[0]?.diagnostic.message).toContain('`a`')
    expect(result[1]?.diagnostic.message).toContain('`b`')
  })

  it('flags a spread combined with only static keys', () => {
    const result = Testing.runRule(
      noSpreadInEvo,
      'CallExpression',
      evoCall(
        objectExpression([
          property(
            'f',
            Testing.arrowFn(
              objectExpression([
                spreadOf(Testing.memberExpr('model', 'f')),
                property('y', Testing.numLiteral(1)),
              ]),
            ),
          ),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`f`')
  })

  it('names non-identifier keys with a placeholder', () => {
    const result = Testing.runRule(
      noSpreadInEvo,
      'CallExpression',
      evoCall(
        objectExpression([
          literalKeyProperty(
            'my-field',
            Testing.arrowFn(
              objectExpression([spreadOf(Testing.memberExpr('model', 'f'))]),
            ),
          ),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('<key>')
  })

  it('flags a member-form Struct.evo call', () => {
    const result = Testing.runRule(
      noSpreadInEvo,
      'CallExpression',
      Testing.callOfMember('Struct', 'evo', [
        Testing.id('model'),
        objectExpression([
          property(
            'f',
            Testing.arrowFn(
              objectExpression([spreadOf(Testing.memberExpr('model', 'f'))]),
            ),
          ),
        ]),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`f`')
  })

  it('allows a clean nested evo updater', () => {
    const result = Testing.runRule(
      noSpreadInEvo,
      'CallExpression',
      evoCall(
        objectExpression([
          property(
            'f',
            Testing.arrowFn(
              Testing.callExpr('evo', [
                Testing.memberExpr('model', 'f'),
                objectExpression([property('x', Testing.numLiteral(1))]),
              ]),
            ),
          ),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows object literals without a spread', () => {
    const result = Testing.runRule(
      noSpreadInEvo,
      'CallExpression',
      evoCall(
        objectExpression([
          property(
            'f',
            Testing.arrowFn(
              objectExpression([property('x', Testing.numLiteral(1))]),
            ),
          ),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a spread combined with a computed key', () => {
    const result = Testing.runRule(
      noSpreadInEvo,
      'CallExpression',
      evoCall(
        objectExpression([
          property(
            'expanded',
            Testing.arrowFn(
              objectExpression([
                spreadOf(Testing.id('x')),
                computedProperty(
                  Testing.id('slug'),
                  Testing.unaryExpr('!', Testing.id('v')),
                ),
              ]),
              [Testing.id('x')],
            ),
          ),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores non-evo calls with the same shape', () => {
    const result = Testing.runRule(
      noSpreadInEvo,
      'CallExpression',
      Testing.callExpr('foo', [
        Testing.id('model'),
        objectExpression([
          property(
            'f',
            Testing.arrowFn(
              objectExpression([spreadOf(Testing.memberExpr('model', 'f'))]),
            ),
          ),
        ]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores evo calls whose second argument is not an object literal', () => {
    const result = Testing.runRule(
      noSpreadInEvo,
      'CallExpression',
      Testing.callExpr('evo', [Testing.id('model'), Testing.id('x')]),
    )

    expect(result).toHaveLength(0)
  })

  it('does not inspect function-expression updaters', () => {
    const result = Testing.runRule(
      noSpreadInEvo,
      'CallExpression',
      evoCall(
        objectExpression([
          property('f', {
            type: 'FunctionExpression',
            params: [],
            body: Testing.blockStmt([
              Testing.returnStmt(
                objectExpression([spreadOf(Testing.memberExpr('model', 'f'))]),
              ),
            ]),
          }),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('inspects only the first top-level return statement', () => {
    const result = Testing.runRule(
      noSpreadInEvo,
      'CallExpression',
      evoCall(
        objectExpression([
          property(
            'f',
            Testing.arrowFn(
              Testing.blockStmt([
                Testing.returnStmt(Testing.id('other')),
                Testing.returnStmt(
                  objectExpression([
                    spreadOf(Testing.memberExpr('model', 'f')),
                  ]),
                ),
              ]),
            ),
          ),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })
})
