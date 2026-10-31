import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { mountFactoryMustUseElement } from '../../src/rules/mount-factory-must-use-element.ts'

const bindingProperty = (key: string, value?: unknown) => ({
  type: 'Property',
  kind: 'init',
  key: Testing.id(key),
  value: value ?? Testing.id(key),
  computed: false,
  shorthand: value === undefined,
  method: false,
})

const objectPattern = (properties: ReadonlyArray<unknown>) => ({
  type: 'ObjectPattern',
  properties,
})

const elementPattern = (bindingName?: string) =>
  objectPattern([
    bindingProperty(
      'element',
      bindingName === undefined ? undefined : Testing.id(bindingName),
    ),
  ])

const elementPatternWithDefault = (bindingName?: string) =>
  objectPattern([
    bindingProperty('element', {
      type: 'AssignmentPattern',
      left: Testing.id(bindingName ?? 'element'),
      right: Testing.memberExpr('document', 'body'),
    }),
  ])

const mountDefinition = (method: 'define' | 'defineStream' = 'define') =>
  Testing.callOfMember('Mount', method, [
    Testing.strLiteral('MountThing'),
    Testing.objectExpr([
      { key: 'messages', value: Testing.id('CompletedMountThing') },
    ]),
  ])

const generatorConstructor = (handler: unknown) => ({
  type: 'FunctionExpression',
  id: null,
  params: [],
  body: Testing.blockStmt([Testing.returnStmt(handler)]),
  generator: true,
  async: false,
})

const attachedMountDefinition = (
  handler: unknown,
  method: 'define' | 'defineStream' = 'define',
  constructor: unknown = generatorConstructor(handler),
) =>
  Testing.callOfMember('Mount', method, [
    Testing.strLiteral('MountThing'),
    Testing.objectExpr([
      { key: 'messages', value: Testing.id('CompletedMountThing') },
      { key: 'handler', value: constructor },
    ]),
  ])

const toLayer = (
  definition: unknown,
  handler: unknown,
  build: unknown = Testing.callOfMember('Effect', 'succeed', [handler]),
) => ({
  type: 'CallExpression',
  callee: {
    type: 'MemberExpression',
    object: definition,
    property: Testing.id('toLayer'),
    computed: false,
    optional: false,
  },
  arguments: [build],
})

const mountLayer = (
  handler: unknown,
  method: 'define' | 'defineStream' = 'define',
  build: unknown = Testing.callOfMember('Effect', 'succeed', [handler]),
) => toLayer(mountDefinition(method), handler, build)

const effectConstructorCases: ReadonlyArray<
  Readonly<{ name: string; build: (handler: unknown) => unknown }>
> = [
  {
    name: 'succeed',
    build: handler => Testing.callOfMember('Effect', 'succeed', [handler]),
  },
  {
    name: 'sync',
    build: handler =>
      Testing.callOfMember('Effect', 'sync', [Testing.arrowFn(handler)]),
  },
  {
    name: 'gen',
    build: handler =>
      Testing.callOfMember('Effect', 'gen', [
        {
          type: 'FunctionExpression',
          id: null,
          params: [],
          body: Testing.blockStmt([Testing.returnStmt(handler)]),
          generator: true,
          async: false,
        },
      ]),
  },
  {
    name: 'map',
    build: handler =>
      Testing.callOfMember('Effect', 'map', [
        Testing.id('dependencyEffect'),
        Testing.arrowFn(handler),
      ]),
  },
  {
    name: 'flatMap',
    build: handler =>
      Testing.callOfMember('Effect', 'flatMap', [
        Testing.id('dependencyEffect'),
        Testing.arrowFn(Testing.callOfMember('Effect', 'succeed', [handler])),
      ]),
  },
  {
    name: 'acquireRelease',
    build: handler =>
      Testing.callOfMember('Effect', 'acquireRelease', [
        Testing.callOfMember('Effect', 'succeed', [handler]),
        Testing.arrowFn(Testing.id('released')),
      ]),
  },
]

const runOn = (node: unknown) =>
  Testing.runRule(mountFactoryMustUseElement, 'CallExpression', node)

describe('mount-factory-must-use-element', () => {
  it('allows a handler that uses its destructured element', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('useElement', [Testing.id('element')]),
          [elementPattern()],
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a renamed element binding when it is referenced', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(Testing.callExpr('useElement', [Testing.id('node')]), [
          elementPattern('node'),
        ]),
        'defineStream',
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a handler that destructures the element further', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(Testing.callExpr('useScrollTop'), [
          objectPattern([
            bindingProperty(
              'element',
              objectPattern([bindingProperty('scrollTop')]),
            ),
          ]),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows an unpacked input that reads its element field', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('useElement', [
            Testing.memberExpr('input', 'element'),
          ]),
          [Testing.id('input')],
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows an args-bearing handler that uses the element', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('anchorSetup', [
            Testing.id('element'),
            Testing.id('buttonId'),
          ]),
          [
            objectPattern([
              bindingProperty('element'),
              bindingProperty('buttonId'),
            ]),
          ],
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('skips identifier references to a handler defined elsewhere', () => {
    const result = runOn(mountLayer(Testing.id('mountTheThing')))

    expect(result).toHaveLength(0)
  })

  it('checks a Layer supplied to a named local Mount definition', () => {
    const definition = {
      type: 'VariableDeclarator',
      id: Testing.id('MountThing'),
      init: mountDefinition(),
    }
    const handler = Testing.arrowFn(Testing.callExpr('analyticsPing'), [
      elementPattern(),
    ])
    const result = Testing.runRuleMulti(mountFactoryMustUseElement, [
      ['VariableDeclarator', definition],
      ['CallExpression', toLayer(Testing.id('MountThing'), handler)],
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.node).toBe(handler)
  })

  const definitionMethods: ReadonlyArray<'define' | 'defineStream'> = [
    'define',
    'defineStream',
  ]

  it.each(definitionMethods)(
    'checks attached %s generator handlers',
    method => {
      const handler = Testing.arrowFn(Testing.callExpr('analyticsPing'), [
        elementPattern(),
      ])
      const result = runOn(attachedMountDefinition(handler, method))

      expect(result).toHaveLength(1)
      expect(result[0]?.diagnostic.node).toBe(handler)
    },
  )

  it('accepts an attached constructor handler that uses the element', () => {
    const handler = Testing.arrowFn(
      Testing.callExpr('measure', [Testing.id('element')]),
      [elementPattern()],
    )
    const result = runOn(attachedMountDefinition(handler))

    expect(result).toHaveLength(0)
  })

  it('checks the handler returned by an effectful constructor', () => {
    const handler = Testing.arrowFn(Testing.callExpr('analyticsPing'), [
      elementPattern(),
    ])
    const build = Testing.callOfMember('Effect', 'gen', [
      {
        type: 'FunctionExpression',
        id: null,
        params: [],
        body: Testing.blockStmt([
          Testing.exprStmt(Testing.callExpr('loadDependency')),
          Testing.returnStmt(handler),
        ]),
        generator: true,
        async: false,
      },
    ])
    const result = runOn(mountLayer(handler, 'define', build))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.node).toBe(handler)
  })

  it.each(effectConstructorCases)(
    'checks the handler returned through Effect.$name',
    ({ build }) => {
      const handler = Testing.arrowFn(Testing.callExpr('analyticsPing'), [
        elementPattern(),
      ])
      const result = runOn(mountLayer(handler, 'define', build(handler)))

      expect(result).toHaveLength(1)
      expect(result[0]?.diagnostic.node).toBe(handler)
    },
  )

  it('does not inspect constructor work as though it were the Mount handler', () => {
    const handler = Testing.arrowFn(
      Testing.callExpr('observe', [Testing.id('element')]),
      [elementPattern()],
    )
    const build = Testing.callOfMember('Effect', 'gen', [
      {
        type: 'FunctionExpression',
        id: null,
        params: [],
        body: Testing.blockStmt([
          Testing.exprStmt(Testing.callExpr('loadDependency')),
          Testing.returnStmt(handler),
        ]),
        generator: true,
        async: false,
      },
    ])
    const result = runOn(mountLayer(handler, 'define', build))

    expect(result).toHaveLength(0)
  })

  it('skips a Mount definition that is not supplied to a Layer', () => {
    const result = runOn(
      Testing.callOfMember('Mount', 'define', [
        Testing.strLiteral('MountThing'),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('skips an unrelated toLayer method', () => {
    const result = runOn(
      Testing.callOfMember('ExternalMount', 'toLayer', [
        Testing.callOfMember('Effect', 'succeed', [
          Testing.arrowFn(Testing.callExpr('analyticsPing'), [
            elementPattern(),
          ]),
        ]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('skips an implementation from an imported Mount factory', () => {
    const handler = Testing.arrowFn(Testing.callExpr('analyticsPing'), [
      elementPattern(),
    ])
    const result = runOn(toLayer(Testing.callExpr('createMount'), handler))

    expect(result).toHaveLength(0)
  })

  it('skips definitions of other primitives', () => {
    const result = runOn(
      Testing.callOfMember('CommandDefinition', 'toLayer', [
        Testing.callOfMember('Effect', 'succeed', [
          Testing.arrowFn(Testing.callExpr('doWork'), [elementPattern()]),
        ]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('skips computed toLayer calls', () => {
    const result = runOn({
      type: 'CallExpression',
      callee: Testing.computedMemberExpr('MountDefinition', 'toLayer'),
      arguments: [
        Testing.callOfMember('Effect', 'succeed', [
          Testing.arrowFn(Testing.callExpr('doWork'), [elementPattern()]),
        ]),
      ],
    })

    expect(result).toHaveLength(0)
  })

  it('counts computed property keys as element uses', () => {
    const result = runOn(
      mountLayer(
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
          [elementPattern()],
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('flags a handler that never references its element binding', () => {
    const handler = Testing.arrowFn(Testing.callExpr('analyticsPing'), [
      elementPattern(),
    ])
    const result = runOn(mountLayer(handler))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`element`')
    expect(result[0]?.diagnostic.message).toContain('never referenced')
    expect(result[0]?.diagnostic.node).toBe(handler)
  })

  it('does not count a nested function declaration shadow as an element use', () => {
    const nestedFunction = {
      type: 'FunctionDeclaration',
      id: Testing.id('readElement'),
      params: [Testing.id('element')],
      body: Testing.blockStmt([
        Testing.exprStmt(
          Testing.callExpr('useElement', [Testing.id('element')]),
        ),
      ]),
      generator: false,
      async: false,
    }
    const handler = Testing.arrowFn(Testing.blockStmt([nestedFunction]), [
      elementPattern(),
    ])
    const result = runOn(mountLayer(handler))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never referenced')
  })

  it('flags an underscore-prefixed element binding even when referenced', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('useElement', [Testing.id('_element')]),
          [elementPattern('_element')],
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`_element`')
    expect(result[0]?.diagnostic.message).toContain('named as ignored')
  })

  it('flags a handler that takes no input at all', () => {
    const result = runOn(mountLayer(Testing.arrowFn(Testing.id('done'), [])))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'never receives the element',
    )
  })

  it('flags an input pattern that never destructures the element', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('useButtonId', [Testing.id('buttonId')]),
          [objectPattern([bindingProperty('buttonId')])],
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'never receives the element',
    )
  })

  it('flags an unpacked input that never reads its element field', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('useButtonId', [
            Testing.memberExpr('input', 'buttonId'),
          ]),
          [Testing.id('input')],
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('reads other fields off')
    expect(result[0]?.diagnostic.message).toContain('never its `element`')
  })

  it('passes an unpacked input handed to a helper', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('attachObserver', [Testing.id('input')]),
          [Testing.id('input')],
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('flags an element binding that only carries a default value', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(Testing.callExpr('startAnalytics', []), [
          elementPatternWithDefault(),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`element`')
    expect(result[0]?.diagnostic.message).toContain('never referenced')
  })

  it('passes an element binding with a default value that is read', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(Testing.callExpr('observe', [Testing.id('element')]), [
          elementPatternWithDefault(),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('flags a renamed element binding that only carries a default value', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(Testing.callExpr('startAnalytics', []), [
          elementPatternWithDefault('node'),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`node`')
    expect(result[0]?.diagnostic.message).toContain('never referenced')
  })

  it('flags an unpacked input the handler never references at all', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(Testing.callExpr('startAnalytics', []), [
          Testing.id('input'),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never references `input`')
  })

  it('does not count a same-named property of another object as an element use', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('startAnalytics', [
            Testing.memberExpr('chart', 'element'),
          ]),
          [Testing.id('element')],
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'never references `element`',
    )
  })

  it('does not count a same-named object literal key as an element use', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('track', [
            Testing.objectExpr([
              { key: 'input', value: Testing.memberExpr('input', 'buttonId') },
            ]),
          ]),
          [Testing.id('input')],
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never its `element`')
  })

  it('does not count a same-named member property as a destructured element use', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('track', [Testing.memberExpr('chart', 'element')]),
          [elementPattern()],
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never referenced')
  })

  it('does not count a same-named member property as a renamed element use', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('track', [Testing.memberExpr('chart', 'node')]),
          [elementPattern('node')],
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`node`')
  })

  it('does not count a member property named for the unpacked input', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('track', [Testing.memberExpr('registry', 'input')]),
          [Testing.id('input')],
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never references `input`')
  })

  it('passes a rest pattern that reads the element off the rest binding', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('observe', [Testing.memberExpr('rest', 'element')]),
          [
            objectPattern([
              { type: 'RestElement', argument: Testing.id('rest') },
            ]),
          ],
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('reads a quoted element key in the destructuring pattern', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(Testing.callExpr('observe', [Testing.id('element')]), [
          objectPattern([
            {
              type: 'Property',
              kind: 'init',
              key: Testing.strLiteral('element'),
              value: Testing.id('element'),
              computed: false,
              shorthand: false,
              method: false,
            },
          ]),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('passes the canonical shape that calls a method on the element', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(Testing.callOfMember('element', 'focus', []), [
          elementPattern(),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('passes an element read through a member chain', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(Testing.memberExpr('element', 'scrollTop'), [
          elementPattern(),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('flags a rest pattern that reads only another field', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('observe', [Testing.memberExpr('rest', 'buttonId')]),
          [
            objectPattern([
              { type: 'RestElement', argument: Testing.id('rest') },
            ]),
          ],
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never its `element`')
  })

  it('flags a rest pattern the handler never references', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(Testing.callExpr('startAnalytics', []), [
          objectPattern([
            { type: 'RestElement', argument: Testing.id('rest') },
          ]),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never references `rest`')
  })

  it('reads a computed string-literal element key', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(Testing.callExpr('observe', [Testing.id('element')]), [
          objectPattern([
            {
              type: 'Property',
              kind: 'init',
              key: Testing.strLiteral('element'),
              value: Testing.id('element'),
              computed: true,
              shorthand: false,
              method: false,
            },
          ]),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('does not treat a differently named quoted key as the element', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(Testing.callExpr('observe', [Testing.id('buttonId')]), [
          objectPattern([
            {
              type: 'Property',
              kind: 'init',
              key: Testing.strLiteral('buttonId'),
              value: Testing.id('buttonId'),
              computed: false,
              shorthand: false,
              method: false,
            },
          ]),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'never receives the element',
    )
  })

  it('ignores a definition whose config is not an object literal', () => {
    const result = runOn(
      Testing.callOfMember('Mount', 'define', [
        Testing.strLiteral('MountThing'),
        Testing.id('sharedConfig'),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('passes an unpacked input that reads the element alongside another field', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('anchorSetup', [
            Testing.memberExpr('input', 'element'),
            Testing.memberExpr('input', 'buttonId'),
          ]),
          [Testing.id('input')],
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('passes a destructured element used as a computed key', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('observe', [
            {
              type: 'MemberExpression',
              object: Testing.id('registry'),
              property: Testing.id('element'),
              computed: true,
              optional: false,
            },
          ]),
          [elementPattern()],
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('passes an unpacked input used as a computed key', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('observe', [
            {
              type: 'MemberExpression',
              object: Testing.id('registry'),
              property: Testing.id('input'),
              computed: true,
              optional: false,
            },
          ]),
          [Testing.id('input')],
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('passes a computed element read off an unpacked input', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('observe', [
            {
              type: 'MemberExpression',
              object: Testing.id('input'),
              property: Testing.strLiteral('element'),
              computed: true,
              optional: false,
            },
          ]),
          [Testing.id('input')],
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('treats a shadowing inner parameter as hiding the unpacked input', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('run', [
            Testing.arrowFn(Testing.callOfMember('input', 'element', []), [
              Testing.id('input'),
            ]),
          ]),
          [Testing.id('input')],
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never references `input`')
  })

  it('counts a computed object literal key that reads the element', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callExpr('observe', [
            {
              type: 'ObjectExpression',
              properties: [
                {
                  type: 'Property',
                  kind: 'init',
                  key: Testing.memberExpr('input', 'element'),
                  value: Testing.numLiteral(1),
                  computed: true,
                  shorthand: false,
                  method: false,
                },
              ],
            },
          ]),
          [Testing.id('input')],
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('does not treat a computed identifier key as the element field', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(Testing.callExpr('observe', [Testing.id('node')]), [
          objectPattern([
            {
              type: 'Property',
              kind: 'init',
              key: Testing.id('element'),
              value: Testing.id('node'),
              computed: true,
              shorthand: false,
              method: false,
            },
          ]),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'never receives the element',
    )
  })

  it('flags an array pattern parameter', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(Testing.callOfMember('element', 'focus', []), [
          { type: 'ArrayPattern', elements: [Testing.id('element')] },
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'never receives the element',
    )
  })

  it('checks a function expression handler', () => {
    const result = runOn(
      mountLayer({
        type: 'FunctionExpression',
        id: null,
        params: [elementPattern()],
        body: { type: 'BlockStatement', body: [] },
        generator: false,
        async: false,
      }),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never referenced')
  })

  it('checks a defineStream handler', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(Testing.callExpr('startAnalytics', []), [
          elementPattern(),
        ]),
        'defineStream',
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never referenced')
  })

  it('treats a shadowing inner parameter as hiding the element', () => {
    const result = runOn(
      mountLayer(
        Testing.arrowFn(
          Testing.callOfMember('Effect', 'sync', [
            Testing.arrowFn(Testing.id('element'), [Testing.id('element')]),
          ]),
          [elementPattern()],
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never referenced')
  })

  it('does not count non-computed property keys as element uses', () => {
    const result = runOn(
      mountLayer(
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
          [elementPattern()],
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('never referenced')
  })
})
