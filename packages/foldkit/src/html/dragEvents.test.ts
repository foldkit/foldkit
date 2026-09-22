import { Context, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { File } from '../file/index.js'
import { defineMessageUnion } from '../message/index.js'
import { eventListenersModule, init, toVNode } from '../snabbdom/index.js'
import {
  type Attribute,
  __clearRuntime,
  __htmlBuilder,
  __setRuntime,
} from './index.js'

const Message = defineMessageUnion({
  EnteredDropZone: {},
  LeftDropZone: {},
  Dropped: {},
  DroppedFiles: { files: Schema.Array(File) },
})
type Message = typeof Message.Type

const h = __htmlBuilder<Message>()
const patch = init([eventListenersModule])

const renderZone = (dropAttribute: Attribute<Message>) => {
  const dispatched: Array<unknown> = []
  __setRuntime(message => dispatched.push(message), Context.empty())
  try {
    const vnode = h.div(
      [
        h.OnDragEnter(Message.EnteredDropZone()),
        h.OnDragLeave(Message.LeftDropZone()),
        dropAttribute,
      ],
      [h.span([], ['First']), h.span([], ['Second'])],
    )
    if (vnode === null) {
      throw new Error('expected a drop zone VNode')
    }

    const patched = patch(toVNode(document.createElement('div')), vnode)
    if (!(patched.elm instanceof Element)) {
      throw new Error('expected a drop zone Element')
    }

    return { zone: patched.elm, dispatched }
  } finally {
    __clearRuntime()
  }
}

describe('native drag event handlers', () => {
  it('tracks entry across children and dispatches leave after leaving the zone', async () => {
    const { zone, dispatched } = renderZone(h.OnDrop(Message.Dropped()))
    const first = zone.firstElementChild
    const second = zone.lastElementChild
    if (first === null || second === null) {
      throw new Error('expected drop zone children')
    }

    const entered = new Event('dragenter', {
      bubbles: true,
      cancelable: true,
    })
    first.dispatchEvent(entered)
    expect(entered.defaultPrevented).toBe(true)
    expect(dispatched).toEqual([Message.EnteredDropZone()])

    first.dispatchEvent(new Event('dragleave', { bubbles: true }))
    second.dispatchEvent(new Event('dragenter', { bubbles: true }))
    await Promise.resolve()
    expect(dispatched).toEqual([Message.EnteredDropZone()])

    const left = new Event('dragleave', {
      bubbles: true,
      cancelable: true,
    })
    second.dispatchEvent(left)
    expect(left.defaultPrevented).toBe(false)
    expect(dispatched).toEqual([Message.EnteredDropZone()])
    await Promise.resolve()
    expect(dispatched).toEqual([
      Message.EnteredDropZone(),
      Message.LeftDropZone(),
    ])
  })

  const file = new globalThis.File(['attachment'], 'attachment.txt', {
    type: 'text/plain',
    lastModified: 0,
  })

  it.each([
    {
      name: 'OnDrop',
      attribute: h.OnDrop(Message.Dropped()),
      message: Message.Dropped(),
    },
    {
      name: 'OnDropFiles',
      attribute: h.OnDropFiles(files => Message.DroppedFiles({ files })),
      message: Message.DroppedFiles({ files: [file] }),
    },
  ])(
    '$name prevents the default and resets tracking for the next drag',
    testCase => {
      const { zone, dispatched } = renderZone(testCase.attribute)
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      const dropped = Object.assign(
        new Event('drop', { bubbles: true, cancelable: true }),
        { dataTransfer },
      )

      zone.dispatchEvent(new Event('dragenter', { bubbles: true }))
      zone.dispatchEvent(dropped)
      expect(dropped.defaultPrevented).toBe(true)
      zone.dispatchEvent(new Event('dragenter', { bubbles: true }))

      expect(dispatched).toEqual([
        Message.EnteredDropZone(),
        testCase.message,
        Message.EnteredDropZone(),
      ])
    },
  )
})
