import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { subscriptionFileCanonicalShape } from '../../src/rules/subscription-file-canonical-shape.ts'

const subscriptionFilename = '/src/page/tasks/subscription.ts'

const callWithCallee = (
  callee: unknown,
  callArguments: ReadonlyArray<unknown> = [],
) => ({
  type: 'CallExpression',
  callee,
  arguments: callArguments,
})

const curriedSubscriptionCall = (
  method: string,
  innerArguments: ReadonlyArray<unknown> = [],
  outerArguments: ReadonlyArray<unknown> = [],
) =>
  callWithCallee(
    Testing.callOfMember('Subscription', method, innerArguments),
    outerArguments,
  )

const instantiatedCurriedSubscriptionCall = (
  method: string,
  innerArguments: ReadonlyArray<unknown>,
  outerArguments: ReadonlyArray<unknown>,
) =>
  callWithCallee(
    {
      type: 'TSInstantiationExpression',
      expression: Testing.callOfMember('Subscription', method, innerArguments),
    },
    outerArguments,
  )

const liftConfig = () =>
  Testing.objectExpr([
    {
      key: 'toChildModel',
      value: Testing.arrowFn(Testing.memberExpr('model', 'dragAndDrop'), [
        Testing.id('model'),
      ]),
    },
    {
      key: 'toParentMessage',
      value: Testing.arrowFn(
        Testing.callExpr('GotDragAndDropMessage', [
          Testing.objectExpr([{ key: 'message' }]),
        ]),
        [Testing.id('message')],
      ),
    },
  ])

const runOnProgram = (
  body: ReadonlyArray<unknown>,
  filename: string = subscriptionFilename,
) =>
  Testing.runRule(
    subscriptionFileCanonicalShape,
    'Program:exit',
    Testing.program(body),
    { filename },
  )

describe('subscription-file-canonical-shape', () => {
  it('flags Subscription usage without a canonical export', () => {
    const result = runOnProgram([
      Testing.varDecl(
        'const',
        'localSubscriptions',
        curriedSubscriptionCall('make'),
      ),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`subscriptions`')
  })

  it('flags a canonical export not rooted at a Subscription method', () => {
    const result = runOnProgram([
      Testing.exportNamedDecl(
        Testing.varDecl('const', 'subscriptions', Testing.objectExpr([])),
      ),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'Subscription.make, Subscription.aggregate, or Subscription.lift',
    )
  })

  it('flags every extra exported Subscription const with its method', () => {
    const result = runOnProgram([
      Testing.exportNamedDecl(
        Testing.varDecl('const', 'extraMake', curriedSubscriptionCall('make')),
      ),
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'extraLift',
          curriedSubscriptionCall('lift', [
            Testing.memberExpr('Child', 'subscriptions'),
          ]),
        ),
      ),
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'extraAggregate',
          curriedSubscriptionCall('aggregate'),
        ),
      ),
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'subscriptions',
          curriedSubscriptionCall('make'),
        ),
      ),
    ])

    expect(result).toHaveLength(3)
    expect(result[0]?.diagnostic.message).toContain('Subscription.make')
    expect(result[1]?.diagnostic.message).toContain('Subscription.lift')
    expect(result[2]?.diagnostic.message).toContain('Subscription.aggregate')
  })

  it('flags an object spread of a Subscription-rooted binding', () => {
    const result = runOnProgram([
      Testing.varDecl(
        'const',
        'localSubscriptions',
        curriedSubscriptionCall('make'),
      ),
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'subscriptions',
          curriedSubscriptionCall(
            'aggregate',
            [],
            [Testing.objectExprWithSpread(Testing.id('localSubscriptions'))],
          ),
        ),
      ),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Subscription.aggregate')
  })

  it('flags an object spread of a subscriptions member', () => {
    const result = runOnProgram([
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'subscriptions',
          curriedSubscriptionCall(
            'aggregate',
            [],
            [
              Testing.objectExprWithSpread(
                Testing.memberExpr('Child', 'subscriptions'),
              ),
            ],
          ),
        ),
      ),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('aggregate')
  })

  it('reports both the missing canonical export and the spread when a spread is the only usage', () => {
    const result = runOnProgram([
      Testing.varDecl(
        'const',
        'viewInputs',
        Testing.objectExprWithSpread(
          Testing.memberExpr('Child', 'subscriptions'),
        ),
      ),
    ])

    expect(result).toHaveLength(2)
    expect(result[0]?.diagnostic.message).toContain('`subscriptions`')
    expect(result[1]?.diagnostic.message).toContain('spread')
  })

  it('allows a canonical make export', () => {
    const result = runOnProgram([
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'subscriptions',
          curriedSubscriptionCall(
            'make',
            [],
            [Testing.arrowFn(Testing.objectExpr([]), [Testing.id('entry')])],
          ),
        ),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows a canonical const exported through a specifier statement', () => {
    const result = runOnProgram([
      Testing.varDecl(
        'const',
        'subscriptions',
        curriedSubscriptionCall(
          'make',
          [],
          [Testing.arrowFn(Testing.objectExpr([]), [Testing.id('entry')])],
        ),
      ),
      {
        type: 'ExportNamedDeclaration',
        declaration: null,
        specifiers: [
          {
            type: 'ExportSpecifier',
            local: Testing.id('subscriptions'),
            exported: Testing.id('subscriptions'),
          },
        ],
      },
    ])

    expect(result).toHaveLength(0)
  })

  it('allows a canonical aggregate with a local lifted helper and a non-Subscription export', () => {
    const result = runOnProgram([
      Testing.varDecl(
        'const',
        'virtualListSubscriptions',
        curriedSubscriptionCall(
          'lift',
          [
            Testing.objectExpr([
              {
                key: 'libraryContainer',
                value: Testing.chainedMemberExpr(
                  'Ui',
                  'VirtualList',
                  'subscriptions',
                  'containerEvents',
                ),
              },
            ]),
          ],
          [liftConfig()],
        ),
      ),
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'RouteParams',
          Testing.callOfMember('S', 'Struct', [Testing.objectExpr([])]),
        ),
      ),
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'subscriptions',
          curriedSubscriptionCall(
            'aggregate',
            [],
            [Testing.id('virtualListSubscriptions')],
          ),
        ),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows a canonical lift export in the curried instantiated form', () => {
    const result = runOnProgram([
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'subscriptions',
          instantiatedCurriedSubscriptionCall(
            'lift',
            [
              Testing.objectExpr([
                {
                  key: 'dragPointer',
                  value: Testing.chainedMemberExpr(
                    'DragAndDrop',
                    'subscriptions',
                    'documentPointer',
                  ),
                },
              ]),
            ],
            [liftConfig()],
          ),
        ),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores files with other basenames', () => {
    const result = runOnProgram(
      [
        Testing.varDecl(
          'const',
          'localSubscriptions',
          curriedSubscriptionCall('make'),
        ),
      ],
      '/src/page/tasks/view.ts',
    )

    expect(result).toHaveLength(0)
  })

  it('walks curried callees when validating the canonical initializer', () => {
    const result = runOnProgram([
      Testing.varDecl(
        'const',
        'localSubscriptions',
        curriedSubscriptionCall('make'),
      ),
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'subscriptions',
          curriedSubscriptionCall(
            'aggregate',
            [],
            [Testing.id('localSubscriptions')],
          ),
        ),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores spreads in argument position', () => {
    const result = runOnProgram([
      Testing.varDecl('const', 'localList', curriedSubscriptionCall('make')),
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'subscriptions',
          curriedSubscriptionCall(
            'aggregate',
            [],
            [{ type: 'SpreadElement', argument: Testing.id('localList') }],
          ),
        ),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores unrelated object spreads', () => {
    const result = runOnProgram([
      Testing.varDecl('const', 'viewInputs', Testing.objectExpr([])),
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'subscriptions',
          curriedSubscriptionCall(
            'aggregate',
            [],
            [Testing.objectExprWithSpread(Testing.id('viewInputs'))],
          ),
        ),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores helper schema arrays with spreads', () => {
    const result = runOnProgram([
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'HelperUnion',
          Testing.callOfMember('S', 'Union', [
            {
              type: 'ArrayExpression',
              elements: [
                {
                  type: 'SpreadElement',
                  argument: Testing.id('memberSchemas'),
                },
              ],
            },
          ]),
        ),
      ),
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'subscriptions',
          curriedSubscriptionCall('make'),
        ),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows a canonical make with type arguments', () => {
    const makeWithTypeArguments = callWithCallee(
      {
        ...Testing.callOfMember('Subscription', 'make', []),
        typeArguments: { type: 'TSTypeParameterInstantiation', params: [] },
      },
      [Testing.arrowFn(Testing.objectExpr([]), [Testing.id('entry')])],
    )
    const result = runOnProgram([
      Testing.exportNamedDecl(
        Testing.varDecl('const', 'subscriptions', makeWithTypeArguments),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows a canonical make next to an exported non-Subscription helper', () => {
    const result = runOnProgram([
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'handleKeyboardEvent',
          Testing.arrowFn(Testing.callOfMember('Effect', 'sync', []), [
            Testing.id('event'),
          ]),
        ),
      ),
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'subscriptions',
          curriedSubscriptionCall(
            'make',
            [],
            [Testing.arrowFn(Testing.objectExpr([]), [Testing.id('entry')])],
          ),
        ),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows local lift and make consts folded into an exported aggregate', () => {
    const result = runOnProgram([
      Testing.varDecl(
        'const',
        'flowStrengthSliderSubscriptions',
        instantiatedCurriedSubscriptionCall(
          'lift',
          [
            Testing.objectExpr([
              {
                key: 'flowStrengthSliderPointer',
                value: Testing.chainedMemberExpr(
                  'Slider',
                  'subscriptions',
                  'dragPointer',
                ),
              },
            ]),
          ],
          [liftConfig()],
        ),
      ),
      Testing.varDecl(
        'const',
        'noiseScaleSliderSubscriptions',
        instantiatedCurriedSubscriptionCall(
          'lift',
          [
            Testing.objectExpr([
              {
                key: 'noiseScaleSliderPointer',
                value: Testing.chainedMemberExpr(
                  'Slider',
                  'subscriptions',
                  'dragPointer',
                ),
              },
            ]),
          ],
          [liftConfig()],
        ),
      ),
      Testing.varDecl(
        'const',
        'frameSubscription',
        curriedSubscriptionCall(
          'make',
          [],
          [Testing.arrowFn(Testing.objectExpr([]), [Testing.id('entry')])],
        ),
      ),
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'subscriptions',
          curriedSubscriptionCall(
            'aggregate',
            [],
            [
              Testing.id('frameSubscription'),
              Testing.id('flowStrengthSliderSubscriptions'),
              Testing.id('noiseScaleSliderSubscriptions'),
            ],
          ),
        ),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('does not count Subscription.persistent entries as Subscription-rooted calls', () => {
    const entryBuilder = Testing.arrowFn(
      Testing.objectExpr([
        {
          key: 'roomStream',
          value: Testing.callOfMember('Subscription', 'persistent', [
            Testing.id('streamRoom'),
          ]),
        },
      ]),
      [Testing.id('entry')],
    )
    const result = runOnProgram([
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'subscriptions',
          curriedSubscriptionCall('make', [], [entryBuilder]),
        ),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('normalizes backslash paths before taking the basename', () => {
    const result = runOnProgram(
      [
        Testing.varDecl(
          'const',
          'localSubscriptions',
          curriedSubscriptionCall('make'),
        ),
      ],
      'C:\\src\\page\\tasks\\subscription.ts',
    )

    expect(result).toHaveLength(1)
  })
})
