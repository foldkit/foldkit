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

const mountDefinition = (
  execute: unknown,
  method: 'define' | 'defineStream' = 'define',
) =>
  Testing.callOfMember('Mount', method, [
    Testing.strLiteral('MountThing'),
    Testing.objectExpr([
      { key: 'messages', value: Testing.id('CompletedMountThing') },
      { key: 'execute', value: execute },
    ]),
  ])

const runOn = (node: unknown) =>
  Testing.runRule(mountFactoryMustUseElement, 'CallExpression', node)

describe('mount-factory-must-use-element', () => {
  it('allows an execute that uses its destructured element', () => {
    const result = runOn(
      mountDefinition(
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
      mountDefinition(
        Testing.arrowFn(Testing.callExpr('useElement', [Testing.id('node')]), [
          elementPattern('node'),
        ]),
        'defineStream',
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows an execute that destructures the element further', () => {
    const result = runOn(
      mountDefinition(
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
      mountDefinition(
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

  it('allows an args-bearing execute that uses the element', () => {
    const result = runOn(
      mountDefinition(
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

  it('skips identifier references to an execute defined elsewhere', () => {
    const result = runOn(mountDefinition(Testing.id('mountTheThing')))

    expect(result).toHaveLength(0)
  })

  it('skips a definition call with no config object', () => {
    const result = runOn(
      Testing.callOfMember('Mount', 'define', [
        Testing.strLiteral('MountThing'),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('skips a config object with no execute field', () => {
    const result = runOn(
      Testing.callOfMember('Mount', 'define', [
        Testing.strLiteral('MountThing'),
        Testing.objectExpr([
          { key: 'messages', value: Testing.id('CompletedMountThing') },
        ]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('skips a spread config object', () => {
    const result = runOn(
      Testing.callOfMember('Mount', 'define', [
        Testing.strLiteral('MountThing'),
        Testing.objectExprWithSpread(Testing.id('config')),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('skips definitions of other primitives', () => {
    const result = runOn(
      Testing.callOfMember('Command', 'define', [
        Testing.strLiteral('DoThing'),
        Testing.objectExpr([
          {
            key: 'execute',
            value: Testing.arrowFn(Testing.callExpr('doWork'), [
              Testing.id('element'),
            ]),
          },
        ]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('skips computed Mount callees', () => {
    const result = runOn({
      type: 'CallExpression',
      callee: Testing.computedMemberExpr('Mount', 'define'),
      arguments: [
        Testing.strLiteral('MountThing'),
        Testing.objectExpr([
          {
            key: 'execute',
            value: Testing.arrowFn(Testing.callExpr('doWork'), [
              elementPattern(),
            ]),
          },
        ]),
      ],
    })

    expect(result).toHaveLength(0)
  })

  it('counts computed property keys as element uses', () => {
    const result = runOn(
      mountDefinition(
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

  it('flags an execute that never references its element binding', () => {
    const execute = Testing.arrowFn(Testing.callExpr('analyticsPing'), [
      elementPattern(),
    ])
    const result = runOn(mountDefinition(execute))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`element`')
    expect(result[0]?.diagnostic.message).toContain('never referenced')
    expect(result[0]?.diagnostic.node).toBe(execute)
  })

  it('flags an underscore-prefixed element binding even when referenced', () => {
    const result = runOn(
      mountDefinition(
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

  it('flags an execute that takes no input at all', () => {
    const result = runOn(
      mountDefinition(Testing.arrowFn(Testing.id('done'), [])),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'never receives the element',
    )
  })

  it('flags an input pattern that never destructures the element', () => {
    const result = runOn(
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
        Testing.arrowFn(Testing.callExpr('observe', [Testing.id('element')]), [
          elementPatternWithDefault(),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('flags a renamed element binding that only carries a default value', () => {
    const result = runOn(
      mountDefinition(
        Testing.arrowFn(Testing.callExpr('startAnalytics', []), [
          elementPatternWithDefault('node'),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`node`')
    expect(result[0]?.diagnostic.message).toContain('never referenced')
  })

  it('flags an unpacked input the execute never references at all', () => {
    const result = runOn(
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
        Testing.arrowFn(Testing.callOfMember('element', 'focus', []), [
          elementPattern(),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('passes an element read through a member chain', () => {
    const result = runOn(
      mountDefinition(
        Testing.arrowFn(Testing.memberExpr('element', 'scrollTop'), [
          elementPattern(),
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('flags a rest pattern that reads only another field', () => {
    const result = runOn(
      mountDefinition(
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

  it('flags a rest pattern the execute never references', () => {
    const result = runOn(
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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

  it('checks a function expression execute', () => {
    const result = runOn(
      mountDefinition({
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

  it('checks a defineStream execute', () => {
    const result = runOn(
      mountDefinition(
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
      mountDefinition(
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
      mountDefinition(
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
