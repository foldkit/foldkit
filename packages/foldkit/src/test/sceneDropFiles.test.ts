// @vitest-environment node
import { Context } from 'effect'
import { beforeEach, describe, expect, test } from 'vitest'

import { __clearRuntime, __htmlBuilder, __setRuntime } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as FileUpload from './apps/fileUpload.js'
import * as Scene from './scene.js'

const Message = defineMessageUnion({
  EnteredDropZone: {},
  LeftDropZone: {},
  Dropped: {},
})
type Message = typeof Message.Type

const h = __htmlBuilder<Message>()

describe('drag events without a DOM', () => {
  beforeEach(() => {
    expect(typeof document).toBe('undefined')
    expect(typeof Element).toBe('undefined')
  })

  test('dropFiles delivers files and updates the view without DOM globals', () => {
    const resume = new File(['resume'], 'resume.txt', {
      type: 'text/plain',
      lastModified: 0,
    })
    const cover = new File(['cover'], 'cover.txt', {
      type: 'text/plain',
      lastModified: 0,
    })

    Scene.scene(
      FileUpload,
      Scene.given(FileUpload.initialModel),
      Scene.dropFiles(Scene.label('attachments'), [resume, cover]),
      Scene.expect(Scene.selector('[key="received-names"]')).toHaveText(
        'names=resume.txt,cover.txt',
      ),
      Scene.dropFiles(Scene.label('attachments'), []),
      Scene.expect(Scene.selector('[key="received-count"]')).toHaveText(
        'count=0',
      ),
    )
  })

  test.each([
    {
      eventName: 'dragenter',
      attribute: h.OnDragEnter(Message.EnteredDropZone()),
      message: Message.EnteredDropZone(),
      isDefaultPrevented: true,
    },
    {
      eventName: 'dragleave',
      attribute: h.OnDragLeave(Message.LeftDropZone()),
      message: Message.LeftDropZone(),
      isDefaultPrevented: false,
    },
    {
      eventName: 'drop',
      attribute: h.OnDrop(Message.Dropped()),
      message: Message.Dropped(),
      isDefaultPrevented: true,
    },
  ])('$eventName dispatches without DOM bookkeeping', testCase => {
    const dispatched: Array<unknown> = []
    __setRuntime(message => dispatched.push(message), Context.empty())
    try {
      const vnode = h.div([testCase.attribute])
      const event = new Event(testCase.eventName, { cancelable: true })
      const handler = vnode?.data?.on?.[event.type]
      if (vnode === null || typeof handler !== 'function') {
        throw new Error('expected a drag event handler')
      }

      handler.call(vnode, event, vnode)

      expect(dispatched).toEqual([testCase.message])
      expect(event.defaultPrevented).toBe(testCase.isDefaultPrevented)
    } finally {
      __clearRuntime()
    }
  })
})
