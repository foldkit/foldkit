import { describe, expect, it } from 'vitest'

import { toVNode } from './tovnode.js'
import type { VNode } from './vnode.js'

const asVNode = (child: VNode | string | undefined): VNode => {
  if (child === undefined || typeof child === 'string') {
    throw new Error('expected a VNode')
  }
  return child
}

describe('toVNode', () => {
  it('converts an element with id, classes, attributes, and data attributes', () => {
    const element = document.createElement('div')
    element.id = 'host'
    element.setAttribute('class', 'a b')
    element.setAttribute('title', 'greeting')
    element.setAttribute('data-row-id', '7')
    element.appendChild(document.createTextNode('hello'))

    const converted = toVNode(element)

    expect(converted.sel).toBe('div#host.a.b')
    expect(converted.data?.attrs).toEqual({ title: 'greeting' })
    expect(converted.data?.dataset).toEqual({ rowId: '7' })
    expect(converted.children).toHaveLength(1)
    expect(asVNode(converted.children?.[0]).text).toBe('hello')
  })

  it('converts text and comment nodes', () => {
    const text = document.createTextNode('plain')
    const comment = document.createComment('note')

    expect(toVNode(text).sel).toBeUndefined()
    expect(toVNode(text).text).toBe('plain')
    expect(toVNode(comment).sel).toBe('!')
    expect(toVNode(comment).text).toBe('note')
  })

  it('converts any other node kind to an empty-selector vnode', () => {
    const fragment = document.createDocumentFragment()

    const converted = toVNode(fragment)

    expect(converted.sel).toBe('')
    expect(converted.children).toEqual([])
  })

  it('marks an svg element and its children with the svg namespace', () => {
    const svgNS = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(svgNS, 'svg')
    const circle = document.createElementNS(svgNS, 'circle')
    svg.appendChild(circle)

    const converted = toVNode(svg)

    expect(converted.data?.ns).toBe(svgNS)
    expect(asVNode(converted.children?.[0]).data?.ns).toBe(svgNS)
  })
})
