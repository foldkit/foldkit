import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { attributeSelector, idSelector } from './selectors.js'

describe('idSelector', () => {
  it('builds a CSS id selector', () => {
    expect(idSelector('graduation-year-items')).toBe('#graduation-year-items')
  })

  it('escapes ids beginning with a digit into a valid selector', () => {
    const id = '889aeafb-48c6-42dd-9010-3de1b751c4eb-graduation-year-items'

    expect(idSelector(id)).toBe(`#${CSS.escape(id)}`)
    expect(() => document.querySelector(idSelector(id))).not.toThrow()
    expect(() => document.querySelector(`#${id}`)).toThrow()
  })

  it('replaces a null character with the replacement character', () => {
    expect(idSelector('a\u0000b')).toBe('#a\uFFFDb')
  })

  it('escapes control and delete characters as hex code points', () => {
    expect(idSelector('a\u0001b')).toBe('#a\\1 b')
    expect(idSelector('a\u007Fb')).toBe('#a\\7f b')
  })

  it('escapes a leading digit as a hex code point', () => {
    expect(idSelector('1abc')).toBe('#\\31 abc')
  })

  it('escapes a digit that follows a leading hyphen', () => {
    expect(idSelector('-1a')).toBe('#-\\31 a')
  })

  it('escapes a lone hyphen', () => {
    expect(idSelector('-')).toBe('#\\-')
  })

  it('passes identifier characters through unchanged', () => {
    expect(idSelector('a-b_C9\u00E9')).toBe('#a-b_C9\u00E9')
  })

  it('backslash-escapes any other character', () => {
    expect(idSelector('a b.c')).toBe('#a\\ b\\.c')
  })
})

describe('attributeSelector', () => {
  const findByAttribute = (value: string): boolean => {
    const element = document.createElement('div')
    element.setAttribute('data-draggable-id', value)
    document.body.appendChild(element)
    const isFound =
      document.querySelector(attributeSelector('data-draggable-id', value)) ===
      element
    document.body.removeChild(element)
    return isFound
  }

  it('builds a CSS attribute selector', () => {
    expect(attributeSelector('data-draggable-id', 'card-1')).toBe(
      '[data-draggable-id="card-1"]',
    )
  })

  it('matches values beginning with a digit', () => {
    expect(findByAttribute('1-first-item')).toBe(true)
    expect(() =>
      document.querySelector(
        `[data-draggable-id=${CSS.escape('1-first-item')}]`,
      ),
    ).toThrow()
  })

  it('matches values carrying a backslash or a space', () => {
    expect(findByAttribute('a\\b')).toBe(true)
    expect(findByAttribute('first item')).toBe(true)
  })
})
