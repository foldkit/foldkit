import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { mountFactoryMustUseElement } from '../../src/rules/mount-factory-must-use-element.ts'

const mountDefinition = (method: 'define' | 'defineStream') =>
  Testing.callOfMember('Mount', method, [
    Testing.strLiteral('MountThing'),
    Testing.id('CompletedMountThing'),
  ])

const appliedMount = (
  factory: unknown,
  method: 'define' | 'defineStream' = 'define',
) => ({
  type: 'CallExpression',
  callee: mountDefinition(method),
  arguments: [factory],
})

describe('mount-factory-must-use-element', () => {
  it('allows a factory that uses its element', () => {
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      appliedMount(
        Testing.arrowFn(
          Testing.callExpr('useElement', [Testing.id('element')]),
          [Testing.id('element')],
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows any parameter name when it is referenced', () => {
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      appliedMount(
        Testing.arrowFn(Testing.callExpr('useElement', [Testing.id('node')]), [
          Testing.id('node'),
        ]),
        'defineStream',
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows the args form when the inner factory uses the element', () => {
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      appliedMount(
        Testing.arrowFn(
          Testing.arrowFn(
            Testing.callExpr('useElement', [Testing.id('element')]),
            [Testing.id('element')],
          ),
          [Testing.id('args')],
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('skips identifier references to factories defined elsewhere', () => {
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      appliedMount(Testing.id('makeMount')),
    )

    expect(result).toHaveLength(0)
  })

  it('skips the bare definition call without an application', () => {
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      mountDefinition('define'),
    )

    expect(result).toHaveLength(0)
  })

  it('skips curried applications of other definitions', () => {
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      {
        type: 'CallExpression',
        callee: Testing.callOfMember('Command', 'define', [
          Testing.strLiteral('DoThing'),
        ]),
        arguments: [
          Testing.arrowFn(Testing.callExpr('doWork'), [Testing.id('element')]),
        ],
      },
    )

    expect(result).toHaveLength(0)
  })

  it('skips computed Mount callees', () => {
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      {
        type: 'CallExpression',
        callee: {
          type: 'CallExpression',
          callee: Testing.computedMemberExpr('Mount', 'define'),
          arguments: [Testing.strLiteral('MountThing')],
        },
        arguments: [
          Testing.arrowFn(Testing.callExpr('doWork'), [Testing.id('element')]),
        ],
      },
    )

    expect(result).toHaveLength(0)
  })

  it('skips a spread first argument', () => {
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      appliedMount({
        type: 'SpreadElement',
        argument: Testing.id('factories'),
      }),
    )

    expect(result).toHaveLength(0)
  })

  it('flags a factory that never references its element parameter', () => {
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      appliedMount(
        Testing.arrowFn(Testing.callExpr('analyticsPing'), [
          Testing.id('element'),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`element`')
    expect(result[0]?.diagnostic.message).toContain('never referenced')
  })

  it('flags an underscore-prefixed parameter even when referenced', () => {
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      appliedMount(
        Testing.arrowFn(
          Testing.callExpr('useElement', [Testing.id('_element')]),
          [Testing.id('_element')],
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`_element`')
    expect(result[0]?.diagnostic.message).toContain('named as ignored')
  })

  it('flags a factory with no element parameter', () => {
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      appliedMount(Testing.arrowFn(Testing.id('done'), [])),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'never receives the element',
    )
  })

  it('flags a destructuring first parameter as unusable', () => {
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      appliedMount(
        Testing.arrowFn(
          Testing.callExpr('useElement', [Testing.id('target')]),
          [{ type: 'ObjectPattern', properties: [] }],
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'never receives the element',
    )
  })

  it('descends into the args form and reports on the inner factory', () => {
    const innerFactory = Testing.arrowFn(Testing.callExpr('doWork'), [
      Testing.id('element'),
    ])
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      appliedMount(Testing.arrowFn(innerFactory, [Testing.id('args')])),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never referenced')
    expect(result[0]?.diagnostic.node).toBe(innerFactory)
  })

  it('descends through a block-bodied builder return', () => {
    const innerFactory = Testing.arrowFn(Testing.callExpr('doWork'), [
      Testing.id('element'),
    ])
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      appliedMount(
        Testing.arrowFn(Testing.blockStmt([Testing.returnStmt(innerFactory)]), [
          Testing.id('args'),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.node).toBe(innerFactory)
  })

  it('treats a shadowing inner parameter as hiding the element', () => {
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      appliedMount(
        Testing.arrowFn(
          Testing.callOfMember('Effect', 'sync', [
            Testing.arrowFn(Testing.id('element'), [Testing.id('element')]),
          ]),
          [Testing.id('element')],
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never referenced')
  })

  it('counts computed property keys as element uses', () => {
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      appliedMount(
        Testing.arrowFn(
          {
            type: 'ObjectExpression',
            properties: [
              {
                type: 'Property',
                key: Testing.id('element'),
                value: Testing.boolLiteral(true),
                computed: true,
              },
            ],
          },
          [Testing.id('element')],
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('does not count non-computed property keys as element uses', () => {
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      appliedMount(
        Testing.arrowFn(
          {
            type: 'ObjectExpression',
            properties: [
              {
                type: 'Property',
                key: Testing.id('element'),
                value: Testing.boolLiteral(true),
                computed: false,
              },
            ],
          },
          [Testing.id('element')],
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never referenced')
  })

  it('checks every application level of a deeper curried chain', () => {
    const result = Testing.runRule(
      mountFactoryMustUseElement,
      'CallExpression',
      {
        type: 'CallExpression',
        callee: appliedMount(Testing.id('makeMount')),
        arguments: [
          Testing.arrowFn(Testing.callExpr('doWork'), [Testing.id('element')]),
        ],
      },
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never referenced')
  })
})
