import { Context, Effect, Option, Schema as S } from 'effect'
import {
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  init,
  styleModule,
  toVNode,
} from 'snabbdom'
import { afterEach, describe, expect, it } from 'vitest'

import { m } from '../message/index.js'
import { MountTracker } from '../mount/index.js'
import { propsModule } from '../propsModule.js'
import { Dispatch } from '../runtime/index.js'
import type { VNode } from '../vdom.js'
import {
  __clearRuntime as clearHtmlRuntime,
  html,
  __inputEventValue as inputEventValue,
  __setRuntime as setHtmlRuntime,
} from './index.js'

const patch = init([
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  propsModule,
  styleModule,
])

const UpdatedValue = m('UpdatedValue', { value: S.String })
const InsertedText = m('InsertedText', { value: S.String })
const ObservedEdit = m('ObservedEdit', {
  inputType: S.String,
  hasData: S.Boolean,
})

const dispatchBeforeInput = (
  element: Element,
  inputType: string,
  data: string | null,
  cancelable = true,
): boolean => {
  const event = new InputEvent('beforeinput', {
    inputType,
    data,
    cancelable,
    bubbles: true,
  })
  // happy-dom coerces a null `data` to '' in the constructor, but real
  // browsers keep `data` null for deletions. Force the exact value so the test
  // exercises the same absence the production code sees in a browser.
  Object.defineProperty(event, 'data', { value: data, configurable: true })
  element.dispatchEvent(event)
  return event.defaultPrevented
}

const createCapturingDispatch = () => {
  const dispatched: Array<unknown> = []
  const dispatch = Dispatch.of({
    dispatchAsync: () => Effect.void,
    dispatchSync: message => {
      dispatched.push(message)
    },
  })
  return { dispatch, dispatched }
}

const renderView = (
  buildView: () => VNode | null,
  dispatch: Dispatch['Type'],
): VNode => {
  const testContext = Context.make(Dispatch, dispatch).pipe(
    Context.add(MountTracker, {
      started: () => {},
      ended: () => {},
    }),
  )

  setHtmlRuntime(dispatch.dispatchSync, testContext)
  let vnode: VNode | null
  try {
    vnode = buildView()
  } finally {
    clearHtmlRuntime()
  }
  if (vnode === null) {
    throw new Error('renderView received a null VNode')
  }
  return vnode
}

const mountIntoBody = (vnode: VNode): void => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  patch(toVNode(container), vnode)
}

const requireElement = <T extends Element>(element: T | null): T => {
  if (element === null) {
    throw new Error('Expected the mounted element to exist.')
  }
  return element
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('inputEventValue', () => {
  it('prefers a string value over innerText', () => {
    const element = document.createElement('input')
    element.value = 'typed'
    Object.defineProperty(element, 'innerText', {
      value: 'rendered',
      configurable: true,
    })
    expect(inputEventValue(element)).toBe('typed')
  })

  it('falls back to innerText when there is no string value', () => {
    const element = document.createElement('div')
    Object.defineProperty(element, 'innerText', {
      value: 'rendered',
      configurable: true,
    })
    element.textContent = 'raw'
    expect(inputEventValue(element)).toBe('rendered')
  })

  it('falls back to textContent when innerText is absent', () => {
    const element = document.createElement('div')
    Object.defineProperty(element, 'innerText', {
      value: undefined,
      configurable: true,
    })
    element.textContent = 'raw'
    expect(inputEventValue(element)).toBe('raw')
  })

  it('returns the empty string for a null target', () => {
    expect(inputEventValue(null)).toBe('')
  })
})

describe('OnInput', () => {
  it('reads the rendered text from a real contenteditable host', () => {
    const h = html<typeof UpdatedValue.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const view = () =>
      h.div(
        [
          h.Contenteditable('true'),
          h.OnInput(value => UpdatedValue({ value })),
        ],
        [],
      )
    mountIntoBody(renderView(view, dispatch))

    const editor = requireElement(document.body.querySelector('div'))
    editor.textContent = 'hello from contenteditable'
    editor.dispatchEvent(new Event('input', { bubbles: true }))

    expect(dispatched).toStrictEqual([
      UpdatedValue({ value: 'hello from contenteditable' }),
    ])
  })

  it('reads the value from a real form control', () => {
    const h = html<typeof UpdatedValue.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const view = () =>
      h.input([h.Type('text'), h.OnInput(value => UpdatedValue({ value }))])
    mountIntoBody(renderView(view, dispatch))

    const field = requireElement(document.body.querySelector('input'))
    field.value = 'typed into a field'
    field.dispatchEvent(new Event('input', { bubbles: true }))

    expect(dispatched).toStrictEqual([
      UpdatedValue({ value: 'typed into a field' }),
    ])
  })
})

describe('OnChange', () => {
  it('reads the value from a real form control', () => {
    const h = html<typeof UpdatedValue.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const view = () =>
      h.input([h.Type('text'), h.OnChange(value => UpdatedValue({ value }))])
    mountIntoBody(renderView(view, dispatch))

    const field = requireElement(document.body.querySelector('input'))
    field.value = 'committed value'
    field.dispatchEvent(new Event('change', { bubbles: true }))

    expect(dispatched).toStrictEqual([
      UpdatedValue({ value: 'committed value' }),
    ])
  })
})

describe('OnBeforeInput', () => {
  it('observes the inputType and data of an insertion', () => {
    const h = html<typeof ObservedEdit.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const view = () =>
      h.div(
        [
          h.Contenteditable('true'),
          h.OnBeforeInput((inputType, data) =>
            ObservedEdit({ inputType, hasData: Option.isSome(data) }),
          ),
        ],
        [],
      )
    mountIntoBody(renderView(view, dispatch))

    const editor = requireElement(document.body.querySelector('div'))
    const prevented = dispatchBeforeInput(editor, 'insertText', 'a')

    expect(prevented).toBe(false)
    expect(dispatched).toStrictEqual([
      ObservedEdit({ inputType: 'insertText', hasData: true }),
    ])
  })

  it('reports absent data as None for a deletion', () => {
    const h = html<typeof ObservedEdit.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const view = () =>
      h.div(
        [
          h.Contenteditable('true'),
          h.OnBeforeInput((inputType, data) =>
            ObservedEdit({ inputType, hasData: Option.isSome(data) }),
          ),
        ],
        [],
      )
    mountIntoBody(renderView(view, dispatch))

    const editor = requireElement(document.body.querySelector('div'))
    dispatchBeforeInput(editor, 'deleteContentBackward', null)

    expect(dispatched).toStrictEqual([
      ObservedEdit({ inputType: 'deleteContentBackward', hasData: false }),
    ])
  })
})

describe('OnBeforeInputPreventDefault', () => {
  const editorView = (dispatch: Dispatch['Type']) => {
    const h = html<typeof InsertedText.Type>()
    return renderView(
      () =>
        h.div(
          [
            h.Contenteditable('true'),
            h.OnBeforeInputPreventDefault((inputType, data) =>
              inputType === 'insertText'
                ? Option.map(data, value => InsertedText({ value }))
                : Option.none(),
            ),
          ],
          [],
        ),
      dispatch,
    )
  }

  it('cancels the native edit and dispatches when the handler returns Some', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    mountIntoBody(editorView(dispatch))

    const editor = requireElement(document.body.querySelector('div'))
    const prevented = dispatchBeforeInput(editor, 'insertText', 'z')

    expect(prevented).toBe(true)
    expect(dispatched).toStrictEqual([InsertedText({ value: 'z' })])
  })

  it('lets the native edit proceed when the handler returns None', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    mountIntoBody(editorView(dispatch))

    const editor = requireElement(document.body.querySelector('div'))
    const prevented = dispatchBeforeInput(editor, 'deleteContentBackward', null)

    expect(prevented).toBe(false)
    expect(dispatched).toStrictEqual([])
  })

  it('does not dispatch or prevent a non-cancelable edit even when the handler returns Some', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    mountIntoBody(editorView(dispatch))

    const editor = requireElement(document.body.querySelector('div'))
    const cancelable = false
    const prevented = dispatchBeforeInput(editor, 'insertText', 'z', cancelable)

    expect(prevented).toBe(false)
    expect(dispatched).toStrictEqual([])
  })
})
