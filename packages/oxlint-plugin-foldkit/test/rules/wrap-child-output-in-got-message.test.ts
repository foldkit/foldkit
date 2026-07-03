import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/wrap-child-output-in-got-message.ts'

const prop = (key: string, value: unknown) => ({
  type: 'Property',
  kind: 'init',
  computed: false,
  method: false,
  shorthand: false,
  key: Testing.id(key),
  value,
})

const objectExpr = (properties: ReadonlyArray<unknown>) => ({
  type: 'ObjectExpression',
  properties: Array.from(properties),
})

const arrow = (body: unknown) => Testing.arrowFn(body, [Testing.id('message')])

const blockArrow = (call: unknown) =>
  arrow(Testing.blockStmt([Testing.returnStmt(call)]))

const gotCall = (name = 'GotChatMessage') =>
  Testing.callOfMember('Msg', name, [Testing.objectExpr([{ key: 'message' }])])

const nonGotCall = (name = 'ReceivedChatEvent') =>
  Testing.callOfMember('Msg', name, [Testing.objectExpr([{ key: 'message' }])])

const commandMapMessages = (mapper: unknown) =>
  Testing.callOfMember('Command', 'mapMessages', [
    Testing.id('commands'),
    mapper,
  ])

const commandMapMessage = (mapper: unknown) =>
  Testing.callOfMember('Command', 'mapMessage', [Testing.id('command'), mapper])

const subscriptionLift = (mapper: unknown) => ({
  type: 'CallExpression',
  callee: Testing.callOfMember('Subscription', 'lift', [
    Testing.id('subscriptions'),
  ]),
  arguments: [
    objectExpr([
      prop('toChildModel', arrow(Testing.memberExpr('model', 'chat'))),
      prop('toParentMessage', mapper),
    ]),
  ],
})

const subscriptionLiftWithTypeArgs = (mapper: unknown) => ({
  type: 'CallExpression',
  callee: {
    type: 'TSInstantiationExpression',
    expression: Testing.callOfMember('Subscription', 'lift', [
      Testing.id('subscriptions'),
    ]),
  },
  arguments: [objectExpr([prop('toParentMessage', mapper)])],
})

const delegatePage = (mapper: unknown) =>
  Testing.callExpr('delegatePage', [
    Testing.id('model'),
    Testing.id('result'),
    arrow(Testing.id('nextModel')),
    mapper,
  ])

const delegatePageWithOutMessage = (mapper: unknown) =>
  Testing.callExpr('delegatePageWithOutMessage', [
    Testing.id('model'),
    Testing.id('result'),
    arrow(Testing.id('nextModel')),
    mapper,
    Testing.id('handleOutMessage'),
  ])

const hSubmodel = (mapper: unknown) =>
  Testing.callOfMember('h', 'submodel', [
    objectExpr([prop('toParentMessage', mapper)]),
  ])

const runCall = (call: unknown) => Testing.runRule(rule, 'CallExpression', call)

describe('wrap-child-output-in-got-message', () => {
  it('allows Command.mapMessages mappers returning Got*Message calls', () => {
    const result = runCall(commandMapMessages(arrow(gotCall())))
    expect(result).toHaveLength(0)
  })

  it('flags Command.mapMessage mappers returning non-Got constructors', () => {
    const result = runCall(commandMapMessage(arrow(nonGotCall())))
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Got*Message')
    expect(result[0]?.diagnostic.message).toContain('ReceivedChatEvent')
  })

  it('analyzes block-bodied arrows with a sole return call', () => {
    const allowed = runCall(commandMapMessages(blockArrow(gotCall())))
    const flagged = runCall(commandMapMessages(blockArrow(nonGotCall())))
    expect(allowed).toHaveLength(0)
    expect(flagged).toHaveLength(1)
  })

  it('skips non-inline Command mappers', () => {
    const result = runCall(commandMapMessages(Testing.id('wrap')))
    expect(result).toHaveLength(0)
  })

  it('flags toParentMessage inside curried Subscription.lift configs', () => {
    const result = runCall(subscriptionLift(arrow(nonGotCall())))
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Subscription lift')
  })

  it('handles type-instantiated Subscription.lift applications', () => {
    const result = runCall(subscriptionLiftWithTypeArgs(arrow(nonGotCall())))
    expect(result).toHaveLength(1)
  })

  it('allows Subscription.lift toParentMessage Got wrappers', () => {
    const result = runCall(subscriptionLift(arrow(gotCall())))
    expect(result).toHaveLength(0)
  })

  it('flags delegatePage wrapper argument at index 3', () => {
    const result = runCall(delegatePage(arrow(nonGotCall())))
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('delegatePage')
  })

  it('flags delegatePageWithOutMessage wrapper argument at index 3', () => {
    const result = runCall(delegatePageWithOutMessage(arrow(nonGotCall())))
    expect(result).toHaveLength(1)
  })

  it('allows delegatePage wrappers returning Got*Message calls', () => {
    const result = runCall(delegatePage(arrow(gotCall())))
    expect(result).toHaveLength(0)
  })

  it('does not enforce h.submodel toParentMessage', () => {
    const result = runCall(hSubmodel(arrow(nonGotCall())))
    expect(result).toHaveLength(0)
  })

  it('skips arrow mappers whose body is not a call', () => {
    const result = runCall(commandMapMessages(arrow(Testing.id('message'))))
    expect(result).toHaveLength(0)
  })
})
