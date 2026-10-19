import { describe, expect, it } from 'vitest'

import { isSwipeExcludedTarget } from './swipeTarget.js'

describe('isSwipeExcludedTarget', () => {
  it('excludes a button and its descendants', () => {
    const button = document.createElement('button')
    const icon = document.createElement('svg')
    button.appendChild(icon)

    expect(isSwipeExcludedTarget('mouse', button)).toBe(true)
    expect(isSwipeExcludedTarget('touch', icon)).toBe(true)
  })

  it('excludes text marked to ignore swipes for mouse but not touch', () => {
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

  it('does not exclude ordinary entry content', () => {
    const card = document.createElement('div')

    expect(isSwipeExcludedTarget('mouse', card)).toBe(false)
    expect(isSwipeExcludedTarget('touch', card)).toBe(false)
  })
})
