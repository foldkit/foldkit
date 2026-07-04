import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { wrapChildOutputInGotMessage } from '../../src/rules/wrap-child-output-in-got-message.ts'

const messageParameter = () => [Testing.id('message')]

const payloadObject = () => Testing.objectExpr([{ key: 'message' }])

const memberConstructorCall = (namespace: string, constructorName: string) =>
  Testing.callOfMember(namespace, constructorName, [payloadObject()])

const commandMapperCall = (method: string, mapper: unknown) =>
  Testing.callOfMember('Command', method, [Testing.id('commands'), mapper])

const callWithCallee = (
  callee: unknown,
  callArguments: ReadonlyArray<unknown> = [],
) => ({
  type: 'CallExpression',
  callee,
  arguments: callArguments,
})

const liftConfig = (mapper: unknown) =>
  Testing.objectExpr([
    {
      key: 'toChildModel',
      value: Testing.arrowFn(Testing.memberExpr('model', 'chat'), [
        Testing.id('model'),
      ]),
    },
    { key: 'toParentMessage', value: mapper },
  ])

const liftApplication = (root: string, config: unknown) =>
  callWithCallee(
    Testing.callOfMember(root, 'lift', [Testing.id('subscriptions')]),
    [config],
  )

const instantiatedLiftApplication = (config: unknown) =>
  callWithCallee(
    {
      type: 'TSInstantiationExpression',
      expression: Testing.callOfMember('Subscription', 'lift', [
        Testing.id('subscriptions'),
      ]),
    },
    [config],
  )

describe('wrap-child-output-in-got-message', () => {
  it('flags a non-Got constructor in a Command.mapMessage mapper', () => {
    const mapper = Testing.arrowFn(
      memberConstructorCall('Msg', 'ReceivedChatEvent'),
      messageParameter(),
    )
    const result = Testing.runRule(
      wrapChildOutputInGotMessage,
      'CallExpression',
      commandMapperCall('mapMessage', mapper),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Got*Message')
    expect(result[0]?.diagnostic.message).toContain('Msg.ReceivedChatEvent')
  })

  it('flags a block-bodied Command.mapMessages mapper returning a non-Got call', () => {
    const mapper = Testing.arrowFn(
      Testing.blockStmt([
        Testing.returnStmt(memberConstructorCall('Msg', 'ReceivedChatEvent')),
      ]),
      messageParameter(),
    )
    const result = Testing.runRule(
      wrapChildOutputInGotMessage,
      'CallExpression',
      commandMapperCall('mapMessages', mapper),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Msg.ReceivedChatEvent')
  })

  it('flags a non-Got toParentMessage mapper in a curried Subscription.lift application', () => {
    const mapper = Testing.arrowFn(
      memberConstructorCall('Msg', 'ReceivedChatEvent'),
      messageParameter(),
    )
    const result = Testing.runRule(
      wrapChildOutputInGotMessage,
      'CallExpression',
      liftApplication('Subscription', liftConfig(mapper)),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Subscription.lift')
    expect(result[0]?.diagnostic.message).toContain('toParentMessage')
    expect(result[0]?.diagnostic.message).toContain('Msg.ReceivedChatEvent')
  })

  it('flags a non-Got toParentMessage mapper in a type-instantiated Subscription.lift application', () => {
    const mapper = Testing.arrowFn(
      memberConstructorCall('Msg', 'ReceivedChatEvent'),
      messageParameter(),
    )
    const config = Testing.objectExpr([
      { key: 'toParentMessage', value: mapper },
    ])
    const result = Testing.runRule(
      wrapChildOutputInGotMessage,
      'CallExpression',
      instantiatedLiftApplication(config),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Subscription.lift')
  })

  it('flags a dynamic callee inside a Command mapper with a placeholder label', () => {
    const mapper = Testing.arrowFn(
      callWithCallee(Testing.computedMemberExpr('handlers', 'key'), [
        payloadObject(),
      ]),
      messageParameter(),
    )
    const result = Testing.runRule(
      wrapChildOutputInGotMessage,
      'CallExpression',
      commandMapperCall('mapMessages', mapper),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('<dynamic call>')
  })

  it('allows a Got wrapper in a Command.mapMessages mapper', () => {
    const mapper = Testing.arrowFn(
      memberConstructorCall('Msg', 'GotChatMessage'),
      messageParameter(),
    )
    const result = Testing.runRule(
      wrapChildOutputInGotMessage,
      'CallExpression',
      commandMapperCall('mapMessages', mapper),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a block-bodied Command mapper returning a Got wrapper', () => {
    const mapper = Testing.arrowFn(
      Testing.blockStmt([
        Testing.returnStmt(memberConstructorCall('Msg', 'GotChatMessage')),
      ]),
      messageParameter(),
    )
    const result = Testing.runRule(
      wrapChildOutputInGotMessage,
      'CallExpression',
      commandMapperCall('mapMessages', mapper),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a named mapper reference', () => {
    const result = Testing.runRule(
      wrapChildOutputInGotMessage,
      'CallExpression',
      commandMapperCall('mapMessages', Testing.id('wrap')),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a Got toParentMessage mapper in Subscription.lift', () => {
    const mapper = Testing.arrowFn(
      memberConstructorCall('Msg', 'GotChatMessage'),
      messageParameter(),
    )
    const result = Testing.runRule(
      wrapChildOutputInGotMessage,
      'CallExpression',
      liftApplication('Subscription', liftConfig(mapper)),
    )

    expect(result).toHaveLength(0)
  })

  it('allows an identity mapper whose body is not a call', () => {
    const mapper = Testing.arrowFn(Testing.id('message'), messageParameter())
    const result = Testing.runRule(
      wrapChildOutputInGotMessage,
      'CallExpression',
      commandMapperCall('mapMessages', mapper),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores toParentMessage under ManagedResource.lift', () => {
    const mapper = Testing.arrowFn(
      memberConstructorCall('Msg', 'ReceivedChatEvent'),
      messageParameter(),
    )
    const result = Testing.runRule(
      wrapChildOutputInGotMessage,
      'CallExpression',
      liftApplication('ManagedResource', liftConfig(mapper)),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores Command functions other than mapMessage and mapMessages', () => {
    const mapper = Testing.arrowFn(
      memberConstructorCall('Msg', 'ReceivedChatEvent'),
      messageParameter(),
    )
    const result = Testing.runRule(
      wrapChildOutputInGotMessage,
      'CallExpression',
      commandMapperCall('mapEffect', mapper),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a bare-identifier Got constructor', () => {
    const mapper = Testing.arrowFn(
      Testing.callExpr('GotHomeMessage', [payloadObject()]),
      messageParameter(),
    )
    const result = Testing.runRule(
      wrapChildOutputInGotMessage,
      'CallExpression',
      commandMapperCall('mapMessages', mapper),
    )

    expect(result).toHaveLength(0)
  })
})
