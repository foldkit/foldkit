import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/subscription-file-canonical-shape.ts'

const filename = (path = '/repo/apps/ui/src/page/tasks/subscription.ts') => ({
  filename: path,
})

const arr = (elements: ReadonlyArray<unknown>) => ({
  type: 'ArrayExpression',
  elements: Array.from(elements),
})

const callFromCallee = (
  callee: unknown,
  args: ReadonlyArray<unknown> = [],
) => ({
  type: 'CallExpression',
  callee,
  arguments: Array.from(args),
})

const subscriptionMember = (
  method: 'make' | 'lift' | 'aggregate',
  args: ReadonlyArray<unknown> = [],
) => Testing.callOfMember('Subscription', method, args)

const subscriptionCall = (
  method: 'make' | 'lift' | 'aggregate',
  args: ReadonlyArray<unknown> = [],
) => callFromCallee(subscriptionMember(method), args)

const constDecl = (name: string, init: unknown) =>
  Testing.varDecl('const', name, init)

const exportConst = (name: string, init: unknown) =>
  Testing.exportNamedDecl(constDecl(name, init))

const programExit = (body: ReadonlyArray<unknown>, path?: string) =>
  Testing.runRule(rule, 'Program:exit', Testing.program(body), filename(path))

describe('subscription-file-canonical-shape', () => {
  it('allows canonical subscriptions made with Subscription.make', () => {
    const result = programExit([
      exportConst(
        'subscriptions',
        subscriptionCall('make', [Testing.arrowFn()]),
      ),
    ])
    expect(result).toHaveLength(0)
  })

  it('allows canonical subscriptions made with Subscription.aggregate plus local lifted helpers and extra non-subscription exports', () => {
    const result = programExit([
      constDecl(
        'virtualListSubscriptions',
        subscriptionCall('lift', [
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
        ]),
      ),
      exportConst('RouteParams', Testing.callOfMember('S', 'Struct', [])),
      exportConst(
        'subscriptions',
        subscriptionCall('aggregate', [Testing.id('virtualListSubscriptions')]),
      ),
    ])
    expect(result).toHaveLength(0)
  })

  it('ignores files not named subscription.ts', () => {
    const result = programExit(
      [constDecl('localSubscriptions', subscriptionCall('make'))],
      '/repo/apps/ui/src/page/tasks/view.ts',
    )
    expect(result).toHaveLength(0)
  })

  it('flags subscription usage without an exported subscriptions const', () => {
    const result = programExit([
      constDecl('localSubscriptions', subscriptionCall('make')),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'export one canonical `subscriptions` const',
    )
  })

  it('flags a subscriptions export rooted at Subscription.lift', () => {
    const result = programExit([
      exportConst(
        'subscriptions',
        subscriptionCall('lift', [
          Testing.memberExpr('Child', 'subscriptions'),
        ]),
      ),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'initialized from `Subscription.make',
    )
  })

  it('flags a subscriptions export not rooted at Subscription.make or Subscription.aggregate', () => {
    const result = programExit([
      exportConst('subscriptions', Testing.objectExpr([])),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'canonical `subscriptions` export',
    )
  })

  it('walks curried callees when checking the subscriptions initializer', () => {
    const result = programExit([
      exportConst(
        'subscriptions',
        callFromCallee(subscriptionCall('aggregate'), [
          Testing.id('localSubscriptions'),
        ]),
      ),
    ])
    expect(result).toHaveLength(0)
  })

  it('flags other exported consts rooted at Subscription.make, Subscription.lift, or Subscription.aggregate', () => {
    const result = programExit([
      exportConst('extraMake', subscriptionCall('make')),
      exportConst(
        'extraLift',
        subscriptionCall('lift', [
          Testing.memberExpr('Child', 'subscriptions'),
        ]),
      ),
      exportConst('extraAggregate', subscriptionCall('aggregate')),
      exportConst('subscriptions', subscriptionCall('make')),
    ])
    expect(result).toHaveLength(3)
    expect(result.map(item => item.diagnostic.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Subscription.make'),
        expect.stringContaining('Subscription.lift'),
        expect.stringContaining('Subscription.aggregate'),
      ]),
    )
  })

  it('flags object-expression spreads of subscription-typed bindings', () => {
    const result = programExit([
      constDecl('localSubscriptions', subscriptionCall('make')),
      exportConst(
        'subscriptions',
        subscriptionCall('aggregate', [
          Testing.objectExprWithSpread(Testing.id('localSubscriptions')),
        ]),
      ),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'Do not spread subscription records',
    )
  })

  it('flags object-expression spreads of .subscriptions members', () => {
    const result = programExit([
      exportConst(
        'subscriptions',
        subscriptionCall('aggregate', [
          Testing.objectExprWithSpread(
            Testing.memberExpr('Child', 'subscriptions'),
          ),
        ]),
      ),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'Do not spread subscription records',
    )
  })

  it('does not flag non-object spreads', () => {
    const result = programExit([
      constDecl('localSubscriptions', subscriptionCall('make')),
      exportConst(
        'subscriptions',
        subscriptionCall('aggregate', [
          {
            type: 'SpreadElement',
            argument: Testing.id('localSubscriptions'),
          },
        ]),
      ),
    ])
    expect(result).toHaveLength(0)
  })

  it('does not flag object spreads unrelated to subscriptions', () => {
    const result = programExit([
      exportConst(
        'subscriptions',
        subscriptionCall('aggregate', [
          Testing.objectExprWithSpread(Testing.id('viewInputs')),
        ]),
      ),
    ])
    expect(result).toHaveLength(0)
  })

  it('allows helper schema arrays without treating them as subscription records', () => {
    const result = programExit([
      exportConst('HelperUnion', Testing.callOfMember('S', 'Union', [arr([])])),
      exportConst('subscriptions', subscriptionCall('make')),
    ])
    expect(result).toHaveLength(0)
  })
})
