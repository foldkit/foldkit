import { describe, it } from '@effect/vitest'
import { Context, Option } from 'effect'
import { afterEach, beforeEach, expect } from 'vitest'

import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
import { html } from './index.js'
import {
  type DispatchSync,
  clearRuntime,
  setRuntime,
} from './runtimeSingleton.js'

const setUpRuntime = (dispatched: Array<unknown>): void => {
  const dispatchSync: DispatchSync = message => {
    dispatched.push(message)
  }
  const dispatchService = Dispatch.of({
    dispatchAsync: () =>
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      Promise.resolve() as unknown as ReturnType<
        typeof Dispatch.Service.dispatchAsync
      >,
    dispatchSync,
  })
  const context = Context.make(Dispatch, dispatchService).pipe(
    Context.add(MountTracker, {
      started: () => {},
      ended: () => {},
    }),
  )
  setRuntime(dispatchSync, context)
}

type PastedText = Readonly<{ _tag: 'PastedText'; text: string }>

const PastedText = (args: { text: string }): PastedText => ({
  _tag: 'PastedText',
  ...args,
})

type CutSelection = Readonly<{ _tag: 'CutSelection' }>

const CutSelection = (): CutSelection => ({ _tag: 'CutSelection' })

type Message = PastedText | CutSelection

const fakeClipboardEvent = (initialData: Record<string, string> = {}) => {
  const data: Record<string, string> = { ...initialData }
  let isDefaultPrevented = false
  return {
    event: {
      clipboardData: {
        getData: (format: string) => data[format] ?? '',
        setData: (format: string, value: string) => {
          data[format] = value
        },
      },
      preventDefault: () => {
        isDefaultPrevented = true
      },
    },
    readData: (format: string) => data[format],
    isDefaultPrevented: () => isDefaultPrevented,
  }
}

const fakeClipboardEventWithoutData = () => {
  let isDefaultPrevented = false
  return {
    event: {
      clipboardData: null,
      preventDefault: () => {
        isDefaultPrevented = true
      },
    },
    isDefaultPrevented: () => isDefaultPrevented,
  }
}

/* eslint-disable @typescript-eslint/consistent-type-assertions */
const handlerOf = (
  vnode: ReturnType<ReturnType<typeof html<Message>>['div']>,
  eventName: string,
): ((event: unknown) => void) =>
  vnode?.data?.on?.[eventName] as unknown as (event: unknown) => void
/* eslint-enable @typescript-eslint/consistent-type-assertions */

describe('clipboard attributes', () => {
  let dispatched: Array<unknown>

  beforeEach(() => {
    dispatched = []
    setUpRuntime(dispatched)
  })

  afterEach(() => {
    clearRuntime()
  })

  describe('OnPastePreventDefault', () => {
    it('prevents default and dispatches when the handler returns Some', () => {
      const h = html<Message>()
      const vnode = h.div(
        [h.OnPastePreventDefault(text => Option.some(PastedText({ text })))],
        [],
      )

      const fake = fakeClipboardEvent({ 'text/plain': 'pasted content' })
      handlerOf(vnode, 'paste')(fake.event)

      expect(fake.isDefaultPrevented()).toBe(true)
      expect(dispatched).toEqual([
        { _tag: 'PastedText', text: 'pasted content' },
      ])
    })

    it('leaves the paste to the browser when the handler returns None', () => {
      const h = html<Message>()
      const vnode = h.div([h.OnPastePreventDefault(() => Option.none())], [])

      const fake = fakeClipboardEvent({ 'text/plain': 'pasted content' })
      handlerOf(vnode, 'paste')(fake.event)

      expect(fake.isDefaultPrevented()).toBe(false)
      expect(dispatched).toEqual([])
    })

    it('passes an empty string when the event carries no clipboardData', () => {
      const h = html<Message>()
      const vnode = h.div(
        [h.OnPastePreventDefault(text => Option.some(PastedText({ text })))],
        [],
      )

      const fake = fakeClipboardEventWithoutData()
      handlerOf(vnode, 'paste')(fake.event)

      expect(fake.isDefaultPrevented()).toBe(true)
      expect(dispatched).toEqual([{ _tag: 'PastedText', text: '' }])
    })
  })

  describe('OnCopyText', () => {
    it('writes the text to the clipboard and prevents default', () => {
      const h = html<Message>()
      const vnode = h.div([h.OnCopyText('serialized selection')], [])

      const fake = fakeClipboardEvent()
      handlerOf(vnode, 'copy')(fake.event)

      expect(fake.readData('text/plain')).toBe('serialized selection')
      expect(fake.isDefaultPrevented()).toBe(true)
      expect(dispatched).toEqual([])
    })

    it('leaves the copy to the browser when the event carries no clipboardData', () => {
      const h = html<Message>()
      const vnode = h.div([h.OnCopyText('serialized selection')], [])

      const fake = fakeClipboardEventWithoutData()
      handlerOf(vnode, 'copy')(fake.event)

      expect(fake.isDefaultPrevented()).toBe(false)
    })
  })

  describe('OnCutText', () => {
    it('writes the text to the clipboard, prevents default, and dispatches', () => {
      const h = html<Message>()
      const vnode = h.div(
        [h.OnCutText('serialized selection', CutSelection())],
        [],
      )

      const fake = fakeClipboardEvent()
      handlerOf(vnode, 'cut')(fake.event)

      expect(fake.readData('text/plain')).toBe('serialized selection')
      expect(fake.isDefaultPrevented()).toBe(true)
      expect(dispatched).toEqual([{ _tag: 'CutSelection' }])
    })

    it('leaves the cut to the browser when the event carries no clipboardData', () => {
      const h = html<Message>()
      const vnode = h.div(
        [h.OnCutText('serialized selection', CutSelection())],
        [],
      )

      const fake = fakeClipboardEventWithoutData()
      handlerOf(vnode, 'cut')(fake.event)

      expect(fake.isDefaultPrevented()).toBe(false)
      expect(dispatched).toEqual([])
    })
  })
})
