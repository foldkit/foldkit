import { Context, Effect, Layer, Option, Schema, Stream } from 'effect'
import { afterEach, beforeEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { Block, deliver, runtimeBlockOf } from '../blocks/block.js'
import {
  constructSync,
  makeGraph,
  reconcile,
  renderRoot,
} from '../blocks/engine.js'
import { defineMessageUnion } from '../message/index.js'
import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
import { h as snabbdomH } from '../snabbdom/index.js'
import { createBoundaryRegistry } from './boundary.js'
import { type ChildAttribute, childAttributes } from './childAttribute.js'
import { type Html, __htmlBuilder } from './index.js'
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
  setRuntime(dispatchSync, context, createBoundaryRegistry())
}

const renderRootBlock = <Self>(
  root: abstract new (...args: ReadonlyArray<never>) => Self,
  layer: Layer.Layer<Self>,
): Effect.Effect<Html> =>
  Effect.scoped(
    Effect.gen(function* () {
      const context = yield* Layer.build(layer)
      const block = runtimeBlockOf(root)
      const graph = makeGraph({ isSimulation: false })
      const instance = constructSync(
        graph,
        block,
        [],
        block.id,
        undefined,
        context,
      )
      reconcile(graph, instance)
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      return renderRoot(graph, instance) as Html
    }),
  )

const clickHandlerOf = (html: Html): (() => void) => {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const onClick = html?.data?.on?.click as (() => void) | undefined
  if (onClick === undefined) {
    throw new Error('Expected the element to have a click handler')
  }
  return onClick
}

const ChildMessage = defineMessageUnion({ ClickedChild: {} })
const ParentMessage = defineMessageUnion({
  ClickedParent: {},
  PressedParentKey: {},
})

// CHECKBOX

type CheckboxViewInput = Readonly<{
  toView: (attributes: { checkbox: ReadonlyArray<ChildAttribute> }) => Html
}>

class Checkbox extends Block<Checkbox, void, CheckboxViewInput>()('Checkbox', {
  Message: ChildMessage,
}) {}

const CheckboxLive = Checkbox.make(
  Effect.fn(function* () {
    return {
      update: { ClickedChild: model => ({ model }) },
      view: (_model, h, { toView }) =>
        toView({
          checkbox: childAttributes([
            h.OnClick(Checkbox.Message.ClickedChild()),
          ]),
        }),
    }
  }),
)

const childClicked = deliver(
  Checkbox,
  'checkbox',
  Checkbox.Message.ClickedChild(),
)

describe('childAttributes', () => {
  let dispatched: Array<unknown>

  beforeEach(() => {
    dispatched = []
    setUpRuntime(dispatched)
  })

  afterEach(() => {
    clearRuntime()
  })

  it('captures a Mount dispatch resolver only for groups containing OnMount', () => {
    const h = __htmlBuilder<typeof ChildMessage.Type>()
    const clickAttributes = childAttributes([
      h.OnClick(ChildMessage.ClickedChild()),
    ])
    const mountAttributes = childAttributes([
      h.OnMount({
        name: 'ObserveChild',
        f: (_element, _viewStateChanges) => Stream.never,
      }),
    ])

    expect(
      clickAttributes.every(
        attribute => attribute.resolveMountDispatch === undefined,
      ),
    ).toBe(true)
    expect(
      mountAttributes.every(
        attribute => attribute.resolveMountDispatch !== undefined,
      ),
    ).toBe(true)
  })

  it.effect(
    'keeps a later OnMount group bound to the child after an event-only group',
    () =>
      Effect.gen(function* () {
        type ObserverViewInput = Readonly<{
          toView: (attributes: {
            event: ReadonlyArray<ChildAttribute>
            mount: ReadonlyArray<ChildAttribute>
          }) => Html
        }>

        class Observer extends Block<Observer, void, ObserverViewInput>()(
          'Observer',
          { Message: ChildMessage },
        ) {}

        const ObserverLive = Observer.make(
          Effect.fn(function* () {
            return {
              update: { ClickedChild: model => ({ model }) },
              view: (_model, h, { toView }) =>
                toView({
                  event: childAttributes([
                    h.OnClick(Observer.Message.ClickedChild()),
                  ]),
                  mount: childAttributes([
                    h.OnMount({
                      name: 'ObserveChild',
                      f: (_element, _viewStateChanges) =>
                        Stream.make(Observer.Message.ClickedChild()),
                    }),
                  ]),
                }),
            }
          }),
        )

        class Parent extends Block<Parent>()('Parent', {
          Model: Schema.Struct({ observer: Observer }),
        }) {}

        const ParentLive = Parent.make(
          Effect.fn(function* () {
            const observer = yield* new Observer('observer')
            return {
              model: { observer },
              update: {},
              view: (model, h) =>
                model.observer.view({
                  toView: attributes =>
                    h.div([...attributes.event, ...attributes.mount]),
                }),
            }
          }),
        ).pipe(Layer.provide(ObserverLive))

        const html = yield* renderRootBlock(Parent, ParentLive)
        if (html === null) {
          throw new Error('Expected the Block to render an element')
        }
        html.elm = document.createElement('div')
        html.data?.hook?.insert?.(html)

        yield* Effect.promise(() =>
          vi.waitFor(() => {
            expect(dispatched).toContainEqual(
              deliver(Observer, 'observer', Observer.Message.ClickedChild()),
            )
          }),
        )
      }),
  )

  it.effect(
    'routes a published OnClick to the child when the parent builds the element',
    () =>
      Effect.gen(function* () {
        class Parent extends Block<Parent>()('Parent', {
          Model: Schema.Struct({ checkbox: Checkbox }),
        }) {}

        const ParentLive = Parent.make(
          Effect.fn(function* () {
            const checkbox = yield* new Checkbox('checkbox')
            return {
              model: { checkbox },
              update: {},
              view: (model, h) =>
                model.checkbox.view({
                  toView: attributes => h.div([...attributes.checkbox]),
                }),
            }
          }),
        ).pipe(Layer.provide(CheckboxLive))

        const html = yield* renderRootBlock(Parent, ParentLive)
        clickHandlerOf(html)()

        expect(dispatched).toEqual([childClicked])
      }),
  )

  it.effect(
    'keeps child-owned attribute producers in the child when a parent view input invokes them',
    () =>
      Effect.gen(function* () {
        const producerInvocations: Array<unknown> = []
        const selection = Option.some({ label: 'checkbox' })

        type ProducerViewInput = Readonly<{
          toView: (
            attributes: {
              checkbox: (label: string) => ReadonlyArray<ChildAttribute>
            },
            selection: Option.Option<Readonly<{ label: string }>>,
          ) => Html
        }>

        class Producer extends Block<Producer, void, ProducerViewInput>()(
          'Producer',
          { Message: ChildMessage },
        ) {}

        const ProducerLive = Producer.make(
          Effect.fn(function* () {
            return {
              update: { ClickedChild: model => ({ model }) },
              view: (_model, h, { toView }) => {
                return toView(
                  {
                    checkbox: label => {
                      producerInvocations.push(label)
                      return childAttributes([
                        h.OnClick(Producer.Message.ClickedChild()),
                      ])
                    },
                  },
                  selection,
                )
              },
            }
          }),
        )

        class Parent extends Block<Parent>()('Parent', {
          Model: Schema.Struct({ producer: Producer }),
        }) {}

        const ParentLive = Parent.make(
          Effect.fn(function* () {
            const producer = yield* new Producer('producer')
            return {
              model: { producer },
              update: {},
              view: (model, h) =>
                model.producer.view({
                  toView: (attributes, selected) => {
                    producerInvocations.push(
                      selected,
                      Option.getOrThrow(selected).label,
                    )
                    return h.button([...attributes.checkbox('checkbox')])
                  },
                }),
            }
          }),
        ).pipe(Layer.provide(ProducerLive))

        const html = yield* renderRootBlock(Parent, ParentLive)
        clickHandlerOf(html)()

        expect(producerInvocations).toEqual([selection, 'checkbox', 'checkbox'])
        expect(dispatched).toEqual([
          deliver(Producer, 'producer', Producer.Message.ClickedChild()),
        ])
      }),
  )

  it.effect(
    "routes the parent's own handlers to the parent alongside published ChildAttributes",
    () =>
      Effect.gen(function* () {
        class Parent extends Block<Parent>()('Parent', {
          Model: Schema.Struct({ checkbox: Checkbox }),
          Message: ParentMessage,
        }) {}

        const ParentLive = Parent.make(
          Effect.fn(function* () {
            const checkbox = yield* new Checkbox('checkbox')
            return {
              model: { checkbox },
              update: {
                ClickedParent: model => ({ model }),
                PressedParentKey: model => ({ model }),
              },
              view: (model, h) =>
                model.checkbox.view({
                  toView: attributes =>
                    h.button([
                      ...attributes.checkbox,
                      h.OnKeyPress(() => Parent.Message.PressedParentKey()),
                      h.OnClick(Parent.Message.ClickedParent()),
                    ]),
                }),
            }
          }),
        ).pipe(Layer.provide(CheckboxLive))

        const html = yield* renderRootBlock(Parent, ParentLive)
        clickHandlerOf(html)()

        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        const onKeyPress = html?.data?.on?.keypress as (
          event: KeyboardEvent,
        ) => void
        onKeyPress(
          new KeyboardEvent('keypress', {
            key: 'a',
            shiftKey: false,
            ctrlKey: false,
            altKey: false,
            metaKey: false,
          }),
        )

        expect(dispatched).toEqual([
          childClicked,
          Parent.Message.ClickedParent(),
          Parent.Message.PressedParentKey(),
        ])
      }),
  )

  it.effect('binds each attribute group to the child that created it', () =>
    Effect.gen(function* () {
      type CaptureViewInput = Readonly<{
        capture: (attributes: ReadonlyArray<ChildAttribute>) => void
      }>

      class First extends Block<First, void, CaptureViewInput>()('First', {
        Message: ChildMessage,
      }) {}

      class Second extends Block<Second, void, CaptureViewInput>()('Second', {
        Message: ChildMessage,
      }) {}

      const FirstLive = First.make(
        Effect.fn(function* () {
          return {
            update: { ClickedChild: model => ({ model }) },
            view: (_model, h, { capture }) => {
              capture(
                childAttributes([h.OnClick(First.Message.ClickedChild())]),
              )
              return snabbdomH('span')
            },
          }
        }),
      )

      const SecondLive = Second.make(
        Effect.fn(function* () {
          return {
            update: { ClickedChild: model => ({ model }) },
            view: (_model, h, { capture }) => {
              capture(
                childAttributes([h.OnClick(Second.Message.ClickedChild())]),
              )
              return snabbdomH('span')
            },
          }
        }),
      )

      class Parent extends Block<Parent>()('Parent', {
        Model: Schema.Struct({ first: First, second: Second }),
      }) {}

      const ParentLive = Parent.make(
        Effect.fn(function* () {
          const first = yield* new First('first')
          const second = yield* new Second('second')
          return {
            model: { first, second },
            update: {},
            view: (model, h) => {
              let firstAttributes: ReadonlyArray<ChildAttribute> = []
              let secondAttributes: ReadonlyArray<ChildAttribute> = []
              model.first.view({
                capture: attributes => {
                  firstAttributes = attributes
                },
              })
              model.second.view({
                capture: attributes => {
                  secondAttributes = attributes
                },
              })
              return h.div([...firstAttributes, ...secondAttributes])
            },
          }
        }),
      ).pipe(Layer.provide(Layer.mergeAll(FirstLive, SecondLive)))

      const html = yield* renderRootBlock(Parent, ParentLive)
      clickHandlerOf(html)()

      expect(dispatched).toEqual([
        deliver(First, 'first', First.Message.ClickedChild()),
        deliver(Second, 'second', Second.Message.ClickedChild()),
      ])
    }),
  )
})
