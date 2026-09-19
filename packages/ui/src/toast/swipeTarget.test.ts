import { describe, expect, it } from 'vitest'

import { isSwipeExcludedTarget } from './swipeTarget.js'

describe('isSwipeExcludedTarget', () => {
  it('ignores the close control and its descendants', () => {
    const button = document.createElement('button')
    const icon = document.createElement('svg')
    button.appendChild(icon)

    expect(isSwipeExcludedTarget('mouse', button)).toBe(true)
    expect(isSwipeExcludedTarget('touch', icon)).toBe(true)
  })

  it('allows selecting marked text with a mouse while retaining touch swipes', () => {
    const paragraph = document.createElement('p')
    paragraph.setAttribute('data-toast-swipe-ignore', '')
    const text = document.createElement('span')
    const textNode = document.createTextNode('Selectable')
    text.appendChild(textNode)
    paragraph.appendChild(text)

    expect(isSwipeExcludedTarget('mouse', text)).toBe(true)
    expect(isSwipeExcludedTarget('mouse', textNode)).toBe(true)
    expect(isSwipeExcludedTarget('touch', text)).toBe(false)
  })

  it('still allows a swipe on ordinary entry content', () => {
    const card = document.createElement('div')

    expect(isSwipeExcludedTarget('mouse', card)).toBe(false)
    expect(isSwipeExcludedTarget('touch', card)).toBe(false)
  })
})
