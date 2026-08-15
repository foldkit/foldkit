import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noPreventDefaultInStreamOperator } from '../../src/rules/no-prevent-default-in-stream-operator.ts'

const preventDefaultCall = () => Testing.callOfMember('event', 'preventDefault')

const streamOperatorCall = (operator: string, callbackBody: unknown) =>
  Testing.callOfMember('Stream', operator, [
    Testing.arrowFn(callbackBody, [Testing.id('event')]),
  ])

describe('no-prevent-default-in-stream-operator', () => {
  it('flags preventDefault inside a Stream.mapEffect callback', () => {
    const result = Testing.runRule(
      noPreventDefaultInStreamOperator,
      'CallExpression',
      streamOperatorCall('mapEffect', preventDefaultCall()),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Stream.mapEffect')
    expect(result[0]?.diagnostic.message).toContain(
      'Subscription.fromEventPreventDefault',
    )
  })

  it('flags the other Stream operators', () => {
    for (const operator of [
      'map',
      'filterMap',
      'filterMapEffect',
      'filter',
      'filterEffect',
      'tap',
    ]) {
      const result = Testing.runRule(
        noPreventDefaultInStreamOperator,
        'CallExpression',
        streamOperatorCall(operator, preventDefaultCall()),
      )

      expect(result).toHaveLength(1)
      expect(result[0]?.diagnostic.message).toContain(`Stream.${operator}`)
    }
  })

  it('finds preventDefault nested inside an Effect.sync thunk', () => {
    const result = Testing.runRule(
      noPreventDefaultInStreamOperator,
      'CallExpression',
      streamOperatorCall(
        'mapEffect',
        Testing.callOfMember('Effect', 'sync', [
          Testing.arrowFn(preventDefaultCall()),
        ]),
      ),
    )

    expect(result).toHaveLength(1)
  })

  it('allows Stream operator callbacks without preventDefault', () => {
    const result = Testing.runRule(
      noPreventDefaultInStreamOperator,
      'CallExpression',
      streamOperatorCall('map', Testing.callExpr('toMessage', [])),
    )

    expect(result).toHaveLength(0)
  })

  it('allows preventDefault in callbacks passed outside Stream operators', () => {
    const result = Testing.runRule(
      noPreventDefaultInStreamOperator,
      'CallExpression',
      Testing.callOfMember('target', 'addEventListener', [
        Testing.strLiteral('keydown'),
        Testing.arrowFn(preventDefaultCall(), [Testing.id('event')]),
      ]),
    )

    expect(result).toHaveLength(0)
  })
})
