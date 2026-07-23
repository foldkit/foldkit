import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { preferCommandMapmessage } from '../../src/rules/prefer-command-mapmessage.ts'

const messageWrapArrow = () =>
  Testing.arrowFn(
    Testing.callExpr('Parent', [Testing.objectExpr([{ key: 'childMessage' }])]),
    [Testing.id('childMessage')],
  )

const messageWrapBlockArrow = () =>
  Testing.arrowFn(
    Testing.blockStmt([
      Testing.returnStmt(
        Testing.callExpr('Parent', [
          Testing.objectExpr([{ key: 'childMessage' }]),
        ]),
      ),
    ]),
    [Testing.id('childMessage')],
  )

const effectMap = (transform: unknown) =>
  Testing.callOfMember('Effect', 'map', [transform])

describe('prefer-command-mapmessage', () => {
  it('flags the data-first Command.mapEffect message wrap', () => {
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

  it('flags the data-last Command.mapEffect message wrap', () => {
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

  it('flags a point-free Command.mapEffect message wrap', () => {
    const result = Testing.runRule(
      preferCommandMapmessage,
      'CallExpression',
      Testing.callOfMember('Command', 'mapEffect', [
        Testing.id('command'),
        effectMap(Testing.id('Parent')),
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('allows Command.mapEffect that adjusts the Effect via a bare transform', () => {
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

  it('allows Effect.map with a bare function reference', () => {
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

  it('allows Effect.map whose arrow returns a non-constructor value', () => {
    const result = Testing.runRule(
      preferCommandMapmessage,
      'CallExpression',
      Testing.callOfMember('Command', 'mapEffect', [
        Testing.id('command'),
        effectMap(
          Testing.arrowFn(
            Testing.callExpr('handleValue', [Testing.id('value')]),
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
