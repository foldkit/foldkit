import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { preferCommandMapmessage } from '../../src/rules/prefer-command-mapmessage.ts'

const messageConstructorCall = () =>
  Testing.callOfMember('Message', 'GotChildMessage', [
    Testing.objectExpr([{ key: 'message' }]),
  ])

const messageWrapArrow = () =>
  Testing.arrowFn(messageConstructorCall(), [Testing.id('message')])

const messageWrapBlockArrow = () =>
  Testing.arrowFn(
    Testing.blockStmt([Testing.returnStmt(messageConstructorCall())]),
    [Testing.id('message')],
  )

const effectMap = (transform: unknown) =>
  Testing.callOfMember('Effect', 'map', [transform])

describe('prefer-command-mapmessage', () => {
  it('flags a data-first Command.mapEffect message wrap', () => {
    const result = Testing.runRule(
      preferCommandMapmessage,
      'CallExpression',
      Testing.callOfMember('Command', 'mapEffect', [
        Testing.id('command'),
        effectMap(messageWrapArrow()),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('mapMessage')
  })

  it('flags a data-last Command.mapEffect message wrap', () => {
    const result = Testing.runRule(
      preferCommandMapmessage,
      'CallExpression',
      Testing.callOfMember('Command', 'mapEffect', [
        effectMap(messageWrapArrow()),
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('flags a block-bodied Command.mapEffect message wrap', () => {
    const result = Testing.runRule(
      preferCommandMapmessage,
      'CallExpression',
      Testing.callOfMember('Command', 'mapEffect', [
        Testing.id('command'),
        effectMap(messageWrapBlockArrow()),
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('flags a point-free namespaced Message constructor', () => {
    const result = Testing.runRule(
      preferCommandMapmessage,
      'CallExpression',
      Testing.callOfMember('Command', 'mapEffect', [
        Testing.id('command'),
        effectMap(Testing.memberExpr('Message', 'GotChildMessage')),
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('flags Effect.map nested inside a mapEffect transform', () => {
    const result = Testing.runRule(
      preferCommandMapmessage,
      'CallExpression',
      Testing.callOfMember('Command', 'mapEffect', [
        Testing.id('command'),
        Testing.arrowFn(
          Testing.callOfMember('Effect', 'map', [
            Testing.id('effect'),
            messageWrapArrow(),
          ]),
          [Testing.id('effect')],
        ),
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('allows Command.mapEffect that adjusts the Effect', () => {
    const result = Testing.runRule(
      preferCommandMapmessage,
      'CallExpression',
      Testing.callOfMember('Command', 'mapEffect', [
        Testing.id('command'),
        Testing.id('provideContext'),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a bare PascalCase Effect mapper', () => {
    const result = Testing.runRule(
      preferCommandMapmessage,
      'CallExpression',
      Testing.callOfMember('Command', 'mapEffect', [
        Testing.id('command'),
        effectMap(Testing.id('User')),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows Effect.map with an unrecognized function reference', () => {
    const result = Testing.runRule(
      preferCommandMapmessage,
      'CallExpression',
      Testing.callOfMember('Command', 'mapEffect', [
        Testing.id('command'),
        effectMap(Testing.id('toParent')),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows Effect.map whose arrow returns a non-Message constructor', () => {
    const result = Testing.runRule(
      preferCommandMapmessage,
      'CallExpression',
      Testing.callOfMember('Command', 'mapEffect', [
        Testing.id('command'),
        effectMap(
          Testing.arrowFn(
            Testing.callOfMember('AsyncData', 'Ok', [Testing.id('value')]),
            [Testing.id('value')],
          ),
        ),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores Stream.mapEffect', () => {
    const result = Testing.runRule(
      preferCommandMapmessage,
      'CallExpression',
      Testing.callOfMember('Stream', 'mapEffect', [
        Testing.id('stream'),
        effectMap(messageWrapArrow()),
      ]),
    )

    expect(result).toHaveLength(0)
  })
})
