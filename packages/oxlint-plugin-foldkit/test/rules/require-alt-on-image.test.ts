import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { requireAltOnImage } from '../../src/rules/require-alt-on-image.ts'

const attrArray = (elements: ReadonlyArray<unknown>) => ({
  type: 'ArrayExpression' as const,
  elements,
})

const imgCall = (elements: ReadonlyArray<unknown>) =>
  Testing.callOfMember('h', 'img', [attrArray(elements)])

const src = (url: string) =>
  Testing.callOfMember('h', 'Src', [Testing.strLiteral(url)])

const alt = (text: string) =>
  Testing.callOfMember('h', 'Alt', [Testing.strLiteral(text)])

const run = (node: unknown) =>
  Testing.runRule(requireAltOnImage, 'CallExpression', node)

describe('require-alt-on-image', () => {
  it('flags an img without an Alt attribute', () => {
    const result = run(imgCall([src('/logo.svg')]))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Alt')
  })

  it('flags an img with an empty attribute array', () => {
    const result = run(imgCall([]))

    expect(result).toHaveLength(1)
  })

  it('allows an img carrying an Alt attribute', () => {
    const result = run(imgCall([src('/avatar.png'), alt('User avatar')]))

    expect(result).toHaveLength(0)
  })

  it('flags the bare img(...) form without Alt', () => {
    const result = run(Testing.callExpr('img', [attrArray([src('/logo.svg')])]))

    expect(result).toHaveLength(1)
  })

  it('ignores non-img elements such as h.div', () => {
    const result = run(imgDivLike())

    expect(result).toHaveLength(0)
  })

  it('ignores an img whose first argument is not an attribute array', () => {
    const result = run(Testing.callOfMember('h', 'img', [Testing.id('attrs')]))

    expect(result).toHaveLength(0)
  })
})

function imgDivLike() {
  return Testing.callOfMember('h', 'div', [
    { type: 'ArrayExpression' as const, elements: [] },
  ])
}
