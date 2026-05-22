import { describe, it } from '@effect/vitest'
import { Context, Effect, Schema as S } from 'effect'
import {
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  init,
  styleModule,
  toVNode,
} from 'snabbdom'
import { expect } from 'vitest'

import {
  __clearRuntime as clearHtmlRuntime,
  html,
  __setRuntime as setHtmlRuntime,
} from '../html/index.js'
import { m } from '../message/index.js'
import { MountTracker } from '../mount/index.js'
import { propsModule } from '../propsModule.js'
import { Dispatch } from '../runtime/index.js'
import type { VNode } from '../vdom.js'
import * as CustomElement from './index.js'

const patch = init([
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  propsModule,
  styleModule,
])

const RatingChanged = m('RatingChanged', { value: S.Number })
const RatingCleared = m('RatingCleared')
const ToggledDisabled = m('ToggledDisabled', { value: S.Boolean })

const Message = S.Union([RatingChanged, RatingCleared, ToggledDisabled])
type Message = typeof Message.Type

const emojiRating = CustomElement.define({
  tag: 'fk-emoji-rating',
  properties: {
    value: S.Number,
    disabled: S.Boolean,
    label: S.String,
  },
  events: {
    'change-rating': S.Struct({ value: S.Number }),
    'clear-rating': S.Struct({}),
  },
})

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

describe('CustomElement.define', () => {
  it('renders the declared tag', () => {
    const rating = emojiRating.withMessage<Message>()
    const { dispatch } = createCapturingDispatch()

    const view = () => rating()
    const element = patchInto(renderView(view, dispatch))

    expect(element.tagName).toBe('FK-EMOJI-RATING')
  })

  it('produces a PascalCase factory per declared property that writes a JS property on the element', () => {
    const rating = emojiRating.withMessage<Message>()
    const { dispatch } = createCapturingDispatch()

    const view = () =>
      rating([
        rating.Value(4),
        rating.Disabled(true),
        rating.Label('Your rating'),
      ])
    const element = patchInto(renderView(view, dispatch))

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const typed = element as unknown as {
      value: number
      disabled: boolean
      label: string
    }
    expect(typed.value).toBe(4)
    expect(typed.disabled).toBe(true)
    expect(typed.label).toBe('Your rating')
  })

  it('produces an On{PascalCase} factory per declared event that converts kebab-cased event names', () => {
    const rating = emojiRating.withMessage<Message>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const view = () =>
      rating([
        rating.OnChangeRating(detail => RatingChanged({ value: detail.value })),
        rating.OnClearRating(() => RatingCleared()),
      ])
    const element = patchInto(renderView(view, dispatch))

    element.dispatchEvent(
      new CustomEvent('change-rating', { detail: { value: 5 } }),
    )
    element.dispatchEvent(new CustomEvent('clear-rating'))

    expect(dispatched).toStrictEqual([
      RatingChanged({ value: 5 }),
      RatingCleared(),
    ])
  })

  it('preserves property updates across renders via the propsModule diff', () => {
    const rating = emojiRating.withMessage<Message>()
    const { dispatch } = createCapturingDispatch()

    const renderWithValue = (value: number): VNode =>
      renderView(() => rating([rating.Value(value)]), dispatch)

    const first = patch(
      toVNode(document.createElement('div')),
      renderWithValue(2),
    )
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    expect((first.elm as unknown as { value: number }).value).toBe(2)

    const second = patch(first, renderWithValue(4))
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    expect((second.elm as unknown as { value: number }).value).toBe(4)
  })

  it('composes with standard html attributes from the same h factory', () => {
    const rating = emojiRating.withMessage<Message>()
    const h = html<Message>()
    const { dispatch } = createCapturingDispatch()

    const view = () => rating([rating.Value(3), h.Class('block w-full')])
    const element = patchInto(renderView(view, dispatch))

    expect(element.classList.contains('block')).toBe(true)
    expect(element.classList.contains('w-full')).toBe(true)
  })

  it('exposes the original config on the spec for runtime inspection', () => {
    expect(emojiRating.tag).toBe('fk-emoji-rating')
    expect(Object.keys(emojiRating.properties)).toStrictEqual([
      'value',
      'disabled',
      'label',
    ])
    expect(Object.keys(emojiRating.events)).toStrictEqual([
      'change-rating',
      'clear-rating',
    ])
  })
})

describe('CustomElement.define validation', () => {
  it('throws when the tag has no hyphen', () => {
    expect(() =>
      CustomElement.define({
        tag: 'rating',
        properties: { value: S.Number },
        events: {},
      }),
    ).toThrowError(/tag 'rating' is not a valid custom element name/)
  })

  it('throws when a property name collides with an event factory name', () => {
    expect(() =>
      CustomElement.define({
        tag: 'fk-collide',
        properties: { onClick: S.Boolean },
        events: { click: S.Struct({}) },
      }),
    ).toThrowError(/factory name 'OnClick' is claimed/)
  })

  it('throws when two properties capitalize to the same factory name', () => {
    expect(() =>
      CustomElement.define({
        tag: 'fk-collide',
        properties: {
          value: S.Number,
          Value: S.String,
        },
        events: {},
      }),
    ).toThrowError(/factory name 'Value' is claimed/)
  })

  it('rejects event names with consecutive hyphens', () => {
    expect(() =>
      CustomElement.define({
        tag: 'fk-bad-event',
        properties: {},
        events: { 'change--rating': S.Struct({}) },
      }),
    ).toThrowError(/event name 'change--rating' is not a valid kebab-case/)
  })

  it('rejects event names with leading or trailing hyphens', () => {
    expect(() =>
      CustomElement.define({
        tag: 'fk-leading-hyphen',
        properties: {},
        events: { '-change-rating': S.Struct({}) },
      }),
    ).toThrowError(/is not a valid kebab-case/)

    expect(() =>
      CustomElement.define({
        tag: 'fk-trailing-hyphen',
        properties: {},
        events: { 'change-rating-': S.Struct({}) },
      }),
    ).toThrowError(/is not a valid kebab-case/)
  })

  it('rejects empty event names', () => {
    expect(() =>
      CustomElement.define({
        tag: 'fk-empty-event',
        properties: {},
        events: { '': S.Struct({}) },
      }),
    ).toThrowError(/is not a valid kebab-case/)
  })

  it('rejects property names that are not valid JS identifiers', () => {
    expect(() =>
      CustomElement.define({
        tag: 'fk-bad-prop',
        properties: { 'has-dash': S.String },
        events: {},
      }),
    ).toThrowError(/property name 'has-dash' is not a valid JS identifier/)

    expect(() =>
      CustomElement.define({
        tag: 'fk-empty-prop',
        properties: { '': S.String },
        events: {},
      }),
    ).toThrowError(/is not a valid JS identifier/)
  })

  it('accepts properly multi-segment kebab-case event names', () => {
    const spec = CustomElement.define({
      tag: 'fk-multi-segment',
      properties: {},
      events: { 'change-rating-value': S.Struct({ value: S.Number }) },
    })
    const builder = spec.withMessage<Message>()
    expect('OnChangeRatingValue' in builder).toBe(true)
  })
})
