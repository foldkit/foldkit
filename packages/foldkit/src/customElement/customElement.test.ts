import { Context, Effect, Schema } from 'effect'
import { expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { beginRender, createBoundaryRegistry } from '../html/boundary.js'
import { type ChildAttribute, childAttributes } from '../html/childAttribute.js'
import {
  type Html,
  __htmlBuilder,
  __clearRuntime as clearHtmlRuntime,
  __setRuntime as setHtmlRuntime,
} from '../html/index.js'
import { defineView, submodel as submodelImpl } from '../html/submodel.js'
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
import * as CustomElement from './index.js'

const patch = init([
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  propsModule,
  styleModule,
])

const Message = defineMessageUnion({
  RatingChanged: { value: Schema.Number },
  RatingCleared: {},
  ToggledDisabled: { value: Schema.Boolean },
})
type Message = typeof Message.Type

const emojiRating = CustomElement.define({
  tag: 'fk-emoji-rating',
  properties: {
    value: Schema.Number,
    disabled: Schema.Boolean,
    label: Schema.String,
  },
  events: {
    'change-rating': Schema.Struct({ value: Schema.Number }),
    'clear-rating': Schema.Struct({}),
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
  dispatch: typeof Dispatch.Service,
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
    const rating = emojiRating.withMessage(__htmlBuilder<Message>())
    const { dispatch } = createCapturingDispatch()

    const view = () => rating()
    const element = patchInto(renderView(view, dispatch))

    expect(element.tagName).toBe('FK-EMOJI-RATING')
  })

  it('produces a PascalCase factory per declared property that writes a JS property on the element', () => {
    const rating = emojiRating.withMessage(__htmlBuilder<Message>())
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
    const rating = emojiRating.withMessage(__htmlBuilder<Message>())
    const { dispatch, dispatched } = createCapturingDispatch()

    const view = () =>
      rating([
        rating.OnChangeRating(detail =>
          Message.RatingChanged({ value: detail.value }),
        ),
        rating.OnClearRating(() => Message.RatingCleared()),
      ])
    const element = patchInto(renderView(view, dispatch))

    element.dispatchEvent(
      new CustomEvent('change-rating', { detail: { value: 5 } }),
    )
    element.dispatchEvent(new CustomEvent('clear-rating'))

    expect(dispatched).toStrictEqual([
      Message.RatingChanged({ value: 5 }),
      Message.RatingCleared(),
    ])
  })

  it('decodes event detail against its declared Schema before invoking the callback', () => {
    const rating = emojiRating.withMessage(__htmlBuilder<Message>())
    const { dispatch, dispatched } = createCapturingDispatch()
    const receivedDetails: Array<unknown> = []

    const view = () =>
      rating([
        rating.OnChangeRating(detail => {
          receivedDetails.push(detail)
          return Message.RatingChanged({ value: detail.value })
        }),
      ])
    const element = patchInto(renderView(view, dispatch))

    element.dispatchEvent(
      new CustomEvent('change-rating', {
        detail: { value: 5, undeclared: true },
      }),
    )

    expect(receivedDetails).toStrictEqual([{ value: 5 }])
    expect(dispatched).toStrictEqual([Message.RatingChanged({ value: 5 })])
  })

  it('reports invalid event detail and dispatches no Message', () => {
    const rating = emojiRating.withMessage(__htmlBuilder<Message>())
    const { dispatch, dispatched } = createCapturingDispatch()
    const reported: Array<unknown> = []
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation((...args) => {
        reported.push(args.at(0))
      })

    try {
      const view = () =>
        rating([
          rating.OnChangeRating(detail =>
            Message.RatingChanged({ value: detail.value }),
          ),
        ])
      const element = patchInto(renderView(view, dispatch))

      element.dispatchEvent(
        new CustomEvent('change-rating', { detail: { value: 'invalid' } }),
      )

      expect(dispatched).toStrictEqual([])
      expect(reported).toHaveLength(1)
      expect(String(reported.at(0))).toContain(
        `CustomElement 'fk-emoji-rating' rejected the detail of a "change-rating" event`,
      )
    } finally {
      consoleError.mockRestore()
    }
  })

  it('decodes a payload-less event as an empty object', () => {
    const rating = emojiRating.withMessage(__htmlBuilder<Message>())
    const { dispatch, dispatched } = createCapturingDispatch()

    const view = () =>
      rating([rating.OnClearRating(() => Message.RatingCleared())])
    const element = patchInto(renderView(view, dispatch))

    element.dispatchEvent(new CustomEvent('clear-rating'))

    expect(dispatched).toStrictEqual([Message.RatingCleared()])
  })

  it('preserves a null detail when the declared Schema accepts null', () => {
    const nullableRating = CustomElement.define({
      tag: 'fk-nullable-rating',
      properties: {},
      events: { cleared: Schema.Null },
    })
    const rating = nullableRating.withMessage(__htmlBuilder<Message>())
    const { dispatch, dispatched } = createCapturingDispatch()
    const receivedDetails: Array<unknown> = []

    const view = () =>
      rating([
        rating.OnCleared(detail => {
          receivedDetails.push(detail)
          return Message.RatingCleared()
        }),
      ])
    const element = patchInto(renderView(view, dispatch))

    element.dispatchEvent(new CustomEvent('cleared'))

    expect(receivedDetails).toStrictEqual([null])
    expect(dispatched).toStrictEqual([Message.RatingCleared()])
  })

  it('preserves property updates across renders via the propsModule diff', () => {
    const rating = emojiRating.withMessage(__htmlBuilder<Message>())
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
    const h = __htmlBuilder<Message>()
    const rating = emojiRating.withMessage(h)
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

describe('ElementBuilder ChildAttribute support', () => {
  type ChildClicked = Readonly<{ _tag: 'ChildClicked' }>
  type GotChild = Readonly<{ _tag: 'GotChild'; message: ChildClicked }>

  const GotChild = (args: { message: ChildClicked }): GotChild => ({
    _tag: 'GotChild',
    ...args,
  })

  it('routes a published ChildAttribute OnClick through the Submodel boundary when spread into a custom element', () => {
    // Mirrors the childAttributes scenario: a Submodel publishes an
    // attribute group and the consumer spreads it into an element built
    // in the parent's boundary. Here the consumer's element is a defined
    // custom element rather than an html builder element, so this locks
    // in both halves: the ElementBuilder signature accepts the union,
    // and the runtime routes the handler through the Submodel's wrap.
    const registry = createBoundaryRegistry()
    const { dispatch, dispatched } = createCapturingDispatch()
    const testContext = Context.make(Dispatch, dispatch).pipe(
      Context.add(MountTracker, {
        started: () => {},
        ended: () => {},
      }),
    )

    setHtmlRuntime(dispatch.dispatchSync, testContext, registry)
    beginRender(registry)
    try {
      type ControlViewInputs = Readonly<{
        toView: (attributes: { control: ReadonlyArray<ChildAttribute> }) => Html
      }>

      const fakeControlView = defineView<
        object,
        ChildClicked,
        ControlViewInputs
      >((_model, viewInputs) => {
        const h = __htmlBuilder<ChildClicked>()
        return viewInputs.toView({
          control: childAttributes([h.OnClick({ _tag: 'ChildClicked' })]),
        })
      })

      const result = submodelImpl(
        {
          slotId: 'fake-control',
          model: {},
          view: fakeControlView,
          viewInputs: {
            toView: attributes => {
              const rating = emojiRating.withMessage(__htmlBuilder<Message>())
              return rating([...attributes.control, rating.Value(3)])
            },
          },
          toParentMessage: message => GotChild({ message }),
        },
        __htmlBuilder(),
      )
      if (result === null) {
        throw new Error('submodel returned null Html')
      }

      const element = patchInto(result)
      expect(element.tagName).toBe('FK-EMOJI-RATING')
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      expect((element as unknown as { value: number }).value).toBe(3)

      element.dispatchEvent(new Event('click'))
      expect(dispatched).toStrictEqual([
        { _tag: 'GotChild', message: { _tag: 'ChildClicked' } },
      ])
    } finally {
      clearHtmlRuntime()
    }
  })
})

describe('CustomElement.define validation', () => {
  it('throws when the tag has no hyphen', () => {
    expect(() =>
      CustomElement.define({
        tag: 'rating',
        properties: { value: Schema.Number },
        events: {},
      }),
    ).toThrowError(/tag 'rating' is not a valid custom element name/)
  })

  it('throws when the tag carries markup characters despite a hyphen', () => {
    expect(() =>
      CustomElement.define({
        tag: 'x-a><script>alert(1)</script><x-a',
        properties: {},
        events: {},
      }),
    ).toThrowError(/is not a valid custom element name/)
  })

  it('throws when the tag is a browser-reserved custom element name', () => {
    expect(() =>
      CustomElement.define({
        tag: 'annotation-xml',
        properties: {},
        events: {},
      }),
    ).toThrowError(/reserved custom element name/)
  })

  it('throws when a property name collides with an event factory name', () => {
    expect(() =>
      CustomElement.define({
        tag: 'fk-collide',
        properties: { onClick: Schema.Boolean },
        events: { click: Schema.Struct({}) },
      }),
    ).toThrowError(/factory name 'OnClick' is claimed/)
  })

  it('throws when two properties capitalize to the same factory name', () => {
    expect(() =>
      CustomElement.define({
        tag: 'fk-collide',
        properties: {
          value: Schema.Number,
          Value: Schema.String,
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
        events: { 'change--rating': Schema.Struct({}) },
      }),
    ).toThrowError(/event name 'change--rating' is not a valid kebab-case/)
  })

  it('rejects event names with leading or trailing hyphens', () => {
    expect(() =>
      CustomElement.define({
        tag: 'fk-leading-hyphen',
        properties: {},
        events: { '-change-rating': Schema.Struct({}) },
      }),
    ).toThrowError(/is not a valid kebab-case/)

    expect(() =>
      CustomElement.define({
        tag: 'fk-trailing-hyphen',
        properties: {},
        events: { 'change-rating-': Schema.Struct({}) },
      }),
    ).toThrowError(/is not a valid kebab-case/)
  })

  it('rejects empty event names', () => {
    expect(() =>
      CustomElement.define({
        tag: 'fk-empty-event',
        properties: {},
        events: { '': Schema.Struct({}) },
      }),
    ).toThrowError(/is not a valid kebab-case/)
  })

  it('rejects property names that are not valid JS identifiers', () => {
    expect(() =>
      CustomElement.define({
        tag: 'fk-bad-prop',
        properties: { 'has-dash': Schema.String },
        events: {},
      }),
    ).toThrowError(/property name 'has-dash' is not a valid JS identifier/)

    expect(() =>
      CustomElement.define({
        tag: 'fk-empty-prop',
        properties: { '': Schema.String },
        events: {},
      }),
    ).toThrowError(/is not a valid JS identifier/)
  })

  it('accepts properly multi-segment kebab-case event names', () => {
    const spec = CustomElement.define({
      tag: 'fk-multi-segment',
      properties: {},
      events: {
        'change-rating-value': Schema.Struct({ value: Schema.Number }),
      },
    })
    const builder = spec.withMessage(__htmlBuilder<Message>())
    expect('OnChangeRatingValue' in builder).toBe(true)
  })
})
