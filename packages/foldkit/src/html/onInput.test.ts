import { Context, Effect, Option, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { MountTracker } from '../mount/index.js'
import { propsModule } from '../propsModule.js'
import { Dispatch } from '../runtime/index.js'
import {
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  init,
  styleModule,
  toVNode,
} from '../snabbdom/index.js'
import type { VNode } from '../vdom.js'
import {
  __htmlBuilder,
  __clearRuntime as clearHtmlRuntime,
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

const Message = defineMessageUnion({
  UpdatedValue: { value: Schema.String },
  InsertedText: { value: Schema.String },
  ObservedEdit: { inputType: Schema.String, hasData: Schema.Boolean },
})
type Message = typeof Message.Type

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
  build: () => VNode | null,
  dispatch: typeof Dispatch.Service,
): VNode => {
  const context = Context.make(Dispatch, dispatch).pipe(
    Context.add(MountTracker, {
      started: () => {},
      ended: () => {},
    }),
  )

  setHtmlRuntime(dispatch.dispatchSync, context)
  let vnode: VNode | null
  try {
    vnode = build()
  } finally {
    clearHtmlRuntime()
  }

  if (vnode === null) {
    throw new Error('renderView received a null VNode')
  }

  return vnode
}

const patchInto = (vnode: VNode): Element => {
  const patched = patch(toVNode(document.createElement('div')), vnode)
  if (!(patched.elm instanceof Element)) {
    throw new Error('patch did not produce an Element')
  }

  return patched.elm
}

const requireInput = (element: Element): HTMLInputElement => {
  if (!(element instanceof HTMLInputElement)) {
    throw new Error('expected an HTMLInputElement')
  }

  return element
}

const dispatchBeforeInput = (
  element: Element,
  inputType: string,
  data: Option.Option<string>,
  cancelable = true,
): boolean => {
  const eventData = Option.getOrNull(data)
  const event = new InputEvent('beforeinput', {
    inputType,
    data: eventData,
    cancelable,
    bubbles: true,
  })

  // NOTE: happy-dom coerces null data to an empty string, while browsers keep
  // it null for deletions. Preserve the browser value in this test event.
  Object.defineProperty(event, 'data', {
    value: eventData,
    configurable: true,
  })
  element.dispatchEvent(event)

  return event.defaultPrevented
}

const renderInput = (
  dispatch: typeof Dispatch.Service,
  attribute: 'OnInput' | 'OnChange',
): HTMLInputElement => {
  const h = __htmlBuilder<Message>()
  const toMessage = (value: string) => Message.UpdatedValue({ value })

  return requireInput(
    patchInto(
      renderView(
        () =>
          h.input([
            h.Type('text'),
            attribute === 'OnInput'
              ? h.OnInput(toMessage)
              : h.OnChange(toMessage),
          ]),
        dispatch,
      ),
    ),
  )
}

const renderContenteditable = (dispatch: typeof Dispatch.Service): Element => {
  const h = __htmlBuilder<Message>()

  return patchInto(
    renderView(
      () =>
        h.div([
          h.Contenteditable('true'),
          h.OnInput(value => Message.UpdatedValue({ value })),
        ]),
      dispatch,
    ),
  )
}

const renderBeforeInput = (
  dispatch: typeof Dispatch.Service,
  mode: 'Observe' | 'PreventDefault',
): Element => {
  const h = __htmlBuilder<Message>()

  return patchInto(
    renderView(
      () =>
        h.div([
          h.Contenteditable('true'),
          mode === 'PreventDefault'
            ? h.OnBeforeInputPreventDefault((inputType, data) =>
                inputType === 'insertText'
                  ? Option.map(data, value => Message.InsertedText({ value }))
                  : Option.none(),
              )
            : h.OnBeforeInput((inputType, data) =>
                Message.ObservedEdit({
                  inputType,
                  hasData: Option.isSome(data),
                }),
              ),
        ]),
      dispatch,
    ),
  )
}

describe('OnInput', () => {
  it('reads rendered text from a contenteditable host', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    const editor = renderContenteditable(dispatch)
    editor.textContent = 'hello from contenteditable'

    editor.dispatchEvent(new Event('input', { bubbles: true }))

    expect(dispatched).toStrictEqual([
      Message.UpdatedValue({ value: 'hello from contenteditable' }),
    ])
  })

  it('reads value from a form control', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    const field = renderInput(dispatch, 'OnInput')
    field.value = 'typed into a field'

    field.dispatchEvent(new Event('input', { bubbles: true }))

    expect(dispatched).toStrictEqual([
      Message.UpdatedValue({ value: 'typed into a field' }),
    ])
  })

  it('falls back to textContent when innerText is unavailable', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    const editor = renderContenteditable(dispatch)
    Object.defineProperty(editor, 'innerText', {
      value: undefined,
      configurable: true,
    })
    editor.textContent = 'raw text'

    editor.dispatchEvent(new Event('input', { bubbles: true }))

    expect(dispatched).toStrictEqual([
      Message.UpdatedValue({ value: 'raw text' }),
    ])
  })
})

describe('OnChange', () => {
  it('reads value from a form control', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    const field = renderInput(dispatch, 'OnChange')
    field.value = 'committed value'

    field.dispatchEvent(new Event('change', { bubbles: true }))

    expect(dispatched).toStrictEqual([
      Message.UpdatedValue({ value: 'committed value' }),
    ])
  })
})

describe('OnBeforeInput', () => {
  it('observes the inputType and data of an insertion', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    const editor = renderBeforeInput(dispatch, 'Observe')

    const isPrevented = dispatchBeforeInput(
      editor,
      'insertText',
      Option.some('a'),
    )

    expect(isPrevented).toBe(false)
    expect(dispatched).toStrictEqual([
      Message.ObservedEdit({ inputType: 'insertText', hasData: true }),
    ])
  })

  it('reports absent data as None for a deletion', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    const editor = renderBeforeInput(dispatch, 'Observe')

    dispatchBeforeInput(editor, 'deleteContentBackward', Option.none())

    expect(dispatched).toStrictEqual([
      Message.ObservedEdit({
        inputType: 'deleteContentBackward',
        hasData: false,
      }),
    ])
  })
})

describe('OnBeforeInputPreventDefault', () => {
  it('prevents the native edit and dispatches when the handler returns Some', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    const editor = renderBeforeInput(dispatch, 'PreventDefault')

    const isPrevented = dispatchBeforeInput(
      editor,
      'insertText',
      Option.some('z'),
    )

    expect(isPrevented).toBe(true)
    expect(dispatched).toStrictEqual([Message.InsertedText({ value: 'z' })])
  })

  it('lets the native edit proceed when the handler returns None', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    const editor = renderBeforeInput(dispatch, 'PreventDefault')

    const isPrevented = dispatchBeforeInput(
      editor,
      'deleteContentBackward',
      Option.none(),
    )

    expect(isPrevented).toBe(false)
    expect(dispatched).toStrictEqual([])
  })

  it('does not dispatch or prevent a non-cancelable edit', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    const editor = renderBeforeInput(dispatch, 'PreventDefault')

    const isPrevented = dispatchBeforeInput(
      editor,
      'insertText',
      Option.some('z'),
      false,
    )

    expect(isPrevented).toBe(false)
    expect(dispatched).toStrictEqual([])
  })
})
