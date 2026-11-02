import {
  Context,
  Data,
  Effect,
  Fiber,
  Layer,
  Option,
  Schema,
  Scope,
  Stream,
} from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Mount from './public.js'

const Message = defineMessageUnion({
  CompletedMeasurePanel: { panelId: Schema.String, width: Schema.Number },
  ScrolledPanel: { scroll: Schema.Number },
})
type Message = typeof Message.Type

const ConstructionMountCommand = Command.define('ConstructionMountCommand', {
  messages: [Message.CompletedMeasurePanel],
})

const PANEL_WIDTH = 320

class Prefix extends Context.Service<Prefix, { readonly value: string }>()(
  'MountHandlerTestPrefix',
) {}

class Suffix extends Context.Service<Suffix, { readonly value: string }>()(
  'MountHandlerTestSuffix',
) {}

const panelElement = (): Element => {
  const element = document.createElement('div')
  element.setAttribute('data-width', String(PANEL_WIDTH))
  return element
}

const measuredWidth = (element: Element): number =>
  Number(element.getAttribute('data-width'))

// NOTE: `if (false)` keeps this out of the run. The checks are the
// `@ts-expect-error` directives below: `pnpm typecheck` fails if declaring an
// args field named `element` or `viewStateChanges` ever stops being an error at
// the definition site.
if (false) {
  const wrapWithoutViewState = <Message>(
    action: Mount.MountAction<Message>,
  ): Mount.MountAction<Message> => ({
    ...action,
    f: element =>
      // @ts-expect-error MountAction wrappers must forward the required view-state Stream
      action.f(element),
  })
  void wrapWithoutViewState

  Mount.define('MeasurePanel', {
    // @ts-expect-error `element` names the live element the handler receives, so an arg cannot claim it
    args: {
      element: Schema.String,
    },
    messages: [Message.CompletedMeasurePanel],
  })

  Mount.define('ObserveViewState', {
    // @ts-expect-error `viewStateChanges` names the runtime Stream the handler receives, so an arg cannot claim it
    args: {
      viewStateChanges: Schema.String,
    },
    messages: [Message.CompletedMeasurePanel],
  })

  const LayerOnly = Mount.define('LayerOnlyMount', {
    messages: [Message.CompletedMeasurePanel],
  })
  LayerOnly.toLayer(({ element }) =>
    Effect.succeed(
      Message.CompletedMeasurePanel({
        panelId: 'panel',
        width: measuredWidth(element),
      }),
    ),
  )
  LayerOnly.toLayer(
    // @ts-expect-error Command handlers are unavailable while constructing a Mount handler.
    Effect.gen(function* () {
      yield* ConstructionMountCommand().effect
      return ({ element }) =>
        Effect.succeed(
          Message.CompletedMeasurePanel({
            panelId: 'guarded',
            width: measuredWidth(element),
          }),
        )
    }),
  )

  const EmptyArgs = Mount.define('EmptyArgs', {
    args: {},
    messages: [Message.CompletedMeasurePanel],
  })

  EmptyArgs.toLayer(
    Effect.gen(function* () {
      return ({ element, viewStateChanges }) => {
        expectTypeOf(element).toEqualTypeOf<Element>()
        expectTypeOf(viewStateChanges).toEqualTypeOf<
          Stream.Stream<Mount.ViewState>
        >()
        // @ts-expect-error Element is exact rather than any.
        element.doesNotExist()
        // @ts-expect-error The view-state Stream is exact rather than any.
        viewStateChanges.doesNotExist()
        return Effect.succeed(
          Message.CompletedMeasurePanel({
            panelId: 'empty',
            width: measuredWidth(element),
          }),
        )
      }
    }),
  )
  // @ts-expect-error A declared empty args Schema still requires an args value.
  EmptyArgs()
  expectTypeOf(EmptyArgs).parameter(0).toEqualTypeOf<Schema.Struct.Type<{}>>()

  Mount.define('ExactNoArgs', {
    messages: [Message.CompletedMeasurePanel],
  }).toLayer(
    Effect.gen(function* () {
      return ({ element, viewStateChanges }) => {
        const exactElement: Element = element
        const exactViewStateChanges: Stream.Stream<Mount.ViewState> =
          viewStateChanges
        void exactElement
        void exactViewStateChanges
        // @ts-expect-error Element is exact rather than any.
        element.doesNotExist()
        // @ts-expect-error The view-state Stream is exact rather than any.
        viewStateChanges.doesNotExist()
        return Effect.succeed(
          Message.CompletedMeasurePanel({
            panelId: 'no-args',
            width: measuredWidth(element),
          }),
        )
      }
    }),
  )

  Mount.defineStream('ExactNoArgsStream', {
    messages: [Message.CompletedMeasurePanel],
  }).toLayer(
    Effect.gen(function* () {
      return ({ element, viewStateChanges }) => {
        const exactElement: Element = element
        const exactViewStateChanges: Stream.Stream<Mount.ViewState> =
          viewStateChanges
        void exactElement
        void exactViewStateChanges
        // @ts-expect-error Element is exact rather than any.
        element.doesNotExist()
        // @ts-expect-error The view-state Stream is exact rather than any.
        viewStateChanges.doesNotExist()
        return Stream.make(
          Message.CompletedMeasurePanel({
            panelId: 'no-args',
            width: measuredWidth(element),
          }),
        )
      }
    }),
  )

  const OptionalArgs = Mount.define('OptionalArgs', {
    args: {
      panelId: Schema.String,
      count: Schema.NumberFromString,
      maybeCount: Schema.Option(Schema.Number),
      label: Schema.optional(Schema.String),
    },
    messages: [Message.CompletedMeasurePanel],
  })

  OptionalArgs.toLayer(
    Effect.gen(function* () {
      return ({ element, panelId, count, maybeCount, label }) => {
        const exactPanelId: string = panelId
        const exactCount: number = count
        const exactMaybeCount: Option.Option<number> = maybeCount
        const exactLabel: string | undefined = label
        void exactPanelId
        void exactCount
        void exactMaybeCount
        void exactLabel
        // @ts-expect-error Schema.String is decoded as string rather than any.
        panelId.doesNotExist()
        // @ts-expect-error Transformed Schema output is decoded as number.
        count.doesNotExist()
        // @ts-expect-error Schema.Option output is decoded as Option<number>.
        maybeCount.doesNotExist()
        // @ts-expect-error Optional Schema output is decoded as string | undefined.
        label?.doesNotExist()
        return Effect.succeed(
          Message.CompletedMeasurePanel({
            panelId: label ?? panelId,
            width: measuredWidth(element),
          }),
        )
      }
    }),
  )
  OptionalArgs({
    panelId: 'panel',
    count: 1,
    maybeCount: Option.none(),
  })

  const OptionalStreamArgs = Mount.defineStream('OptionalStreamArgs', {
    args: {
      panelId: Schema.String,
      count: Schema.NumberFromString,
      label: Schema.optional(Schema.String),
    },
    messages: [Message.CompletedMeasurePanel],
  })

  OptionalStreamArgs.toLayer(
    Effect.gen(function* () {
      return ({ element, panelId, count, label }) => {
        const exactCount: number = count
        void exactCount
        // @ts-expect-error Transformed Schema output is decoded as number.
        count.doesNotExist()
        return Stream.make(
          Message.CompletedMeasurePanel({
            panelId: label ?? panelId,
            width: measuredWidth(element),
          }),
        )
      }
    }),
  )
  OptionalStreamArgs({ panelId: 'panel', count: 1 })

  type TypedHandlerInput = Readonly<{
    element: Element
    viewStateChanges: Stream.Stream<Mount.ViewState>
    panelId: string
  }>
  const typedEffectHandler: Effect.Effect<
    (
      input: TypedHandlerInput,
    ) => Effect.Effect<
      typeof Message.CompletedMeasurePanel.Type,
      never,
      Prefix | Scope.Scope
    >,
    never,
    Suffix | Scope.Scope
  > = Effect.gen(function* () {
    yield* Effect.scope
    const suffix = yield* Suffix

    return ({ element, panelId }) =>
      Effect.gen(function* () {
        yield* Effect.scope
        const prefix = yield* Prefix
        return Message.CompletedMeasurePanel({
          panelId: prefix.value + panelId + suffix.value,
          width: measuredWidth(element),
        })
      })
  })
  const TypedEffectHandler = Mount.define('TypedEffectHandler', {
    args: { panelId: Schema.String },
    messages: [Message.CompletedMeasurePanel],
  })

  const TypedEffectHandlerLive = TypedEffectHandler.toLayer(
    Effect.gen(function* () {
      return yield* typedEffectHandler
    }),
  )
  expectTypeOf(TypedEffectHandlerLive).toEqualTypeOf<
    Layer.Layer<
      Mount.RequirementsOf<typeof TypedEffectHandler>,
      never,
      Prefix | Suffix
    >
  >()

  const failedTypedEffectHandler: Effect.Effect<
    (
      input: TypedHandlerInput,
    ) => Effect.Effect<
      typeof Message.CompletedMeasurePanel.Type,
      never,
      Prefix | Scope.Scope
    >,
    'mount-build-failure'
  > = Effect.fail('mount-build-failure')
  const FailedTypedEffectHandler = Mount.define('FailedTypedEffectHandler', {
    args: { panelId: Schema.String },
    messages: [Message.CompletedMeasurePanel],
  })

  const FailedTypedEffectHandlerLive = FailedTypedEffectHandler.toLayer(
    Effect.gen(function* () {
      return yield* failedTypedEffectHandler
    }),
  )
  expectTypeOf(FailedTypedEffectHandlerLive).toEqualTypeOf<
    Layer.Layer<
      Mount.RequirementsOf<typeof FailedTypedEffectHandler>,
      'mount-build-failure',
      Prefix
    >
  >()

  const typedStreamHandler: Effect.Effect<
    (
      input: TypedHandlerInput,
    ) => Stream.Stream<
      typeof Message.CompletedMeasurePanel.Type,
      never,
      Prefix | Scope.Scope
    >,
    never,
    Suffix | Scope.Scope
  > = Effect.gen(function* () {
    yield* Effect.scope
    const suffix = yield* Suffix

    return ({ element, panelId }) =>
      Stream.fromEffect(
        Effect.gen(function* () {
          yield* Effect.scope
          const prefix = yield* Prefix
          return Message.CompletedMeasurePanel({
            panelId: prefix.value + panelId + suffix.value,
            width: measuredWidth(element),
          })
        }),
      )
  })
  const TypedStreamHandler = Mount.defineStream('TypedStreamHandler', {
    args: { panelId: Schema.String },
    messages: [Message.CompletedMeasurePanel],
  })

  const TypedStreamHandlerLive = TypedStreamHandler.toLayer(
    Effect.gen(function* () {
      return yield* typedStreamHandler
    }),
  )
  expectTypeOf(TypedStreamHandlerLive).toEqualTypeOf<
    Layer.Layer<
      Mount.RequirementsOf<typeof TypedStreamHandler>,
      never,
      Prefix | Suffix
    >
  >()

  Mount.define('InvalidHandlerResult', {
    messages: [Message.CompletedMeasurePanel],
  }).toLayer(
    // @ts-expect-error Handler results must belong to the declared Messages.
    Effect.gen(function* () {
      return () => Effect.succeed(Message.ScrolledPanel({ scroll: 0 }))
    }),
  )

  Mount.define('NarrowHandlerArgs', {
    args: { panelId: Schema.String },
    messages: [Message.CompletedMeasurePanel],
  }).toLayer(
    // @ts-expect-error A handler must accept every value allowed by the args Schema.
    Effect.gen(function* () {
      return ({
        element,
        panelId,
      }: {
        readonly element: Element
        readonly panelId: 'only'
      }) =>
        Effect.succeed(
          Message.CompletedMeasurePanel({
            panelId,
            width: measuredWidth(element),
          }),
        )
    }),
  )

  Mount.define('NarrowNoArgsHandler', {
    messages: [Message.CompletedMeasurePanel],
  }).toLayer(
    // @ts-expect-error A handler must accept the full runtime input.
    Effect.gen(function* () {
      return ({ element }: { readonly element: HTMLDivElement }) =>
        Effect.succeed(
          Message.CompletedMeasurePanel({
            panelId: 'narrow',
            width: measuredWidth(element),
          }),
        )
    }),
  )
}

describe('Mount.define defers its handler body', () => {
  it.effect('does not run the handler until the element mounts', () =>
    Effect.gen(function* () {
      let bodyRunCount = 0

      const MeasurePanel = Mount.define('MeasurePanel', {
        args: { panelId: Schema.String },
        messages: [Message.CompletedMeasurePanel],
      })

      const MeasurePanelLive = MeasurePanel.toLayer(
        Effect.gen(function* () {
          return ({ element, panelId }) => {
            bodyRunCount = bodyRunCount + 1
            return Effect.succeed(
              Message.CompletedMeasurePanel({
                panelId,
                width: measuredWidth(element),
              }),
            )
          }
        }),
      )

      const action = MeasurePanel({ panelId: 'panel' })
      expect(bodyRunCount).toBe(0)

      const maybeMessage = yield* Stream.runHead(
        action.f(panelElement(), Mount.liveViewStateChanges),
      ).pipe(Effect.provide(MeasurePanelLive))

      expect(bodyRunCount).toBe(1)
      expect(maybeMessage).toStrictEqual(
        Option.some(
          Message.CompletedMeasurePanel({
            panelId: 'panel',
            width: PANEL_WIDTH,
          }),
        ),
      )
    }),
  )

  it('does not run the handler for a MountAction a view discards', () => {
    let bodyRunCount = 0

    const MeasurePanel = Mount.define('MeasurePanel', {
      args: { panelId: Schema.String },
      messages: [Message.CompletedMeasurePanel],
    })
    void MeasurePanel.toLayer(
      Effect.succeed(({ element, panelId }) => {
        bodyRunCount = bodyRunCount + 1
        return Effect.succeed(
          Message.CompletedMeasurePanel({
            panelId,
            width: measuredWidth(element),
          }),
        )
      }),
    )

    MeasurePanel({ panelId: 'discarded' })

    expect(bodyRunCount).toBe(0)
  })

  it('does not run a no-args handler when the action is constructed', () => {
    let bodyRunCount = 0

    const MeasurePanel = Mount.define('MeasurePanel', {
      messages: [Message.CompletedMeasurePanel],
    })

    void MeasurePanel.toLayer(
      Effect.gen(function* () {
        return ({ element }) => {
          bodyRunCount = bodyRunCount + 1
          return Effect.succeed(
            Message.CompletedMeasurePanel({
              panelId: 'panel',
              width: measuredWidth(element),
            }),
          )
        }
      }),
    )

    MeasurePanel()

    expect(bodyRunCount).toBe(0)
  })

  it.effect('infers view-state changes in a no-args handler', () =>
    Effect.gen(function* () {
      const observedViewStates: Array<Mount.ViewState> = []

      const ObserveViewState = Mount.define('ObserveViewState', {
        messages: [Message.CompletedMeasurePanel],
      })

      const ObserveViewStateLive = ObserveViewState.toLayer(
        Effect.gen(function* () {
          return ({ viewStateChanges }) =>
            Stream.take(viewStateChanges, 1).pipe(
              Stream.runForEach(viewState => {
                expectTypeOf(viewState).toEqualTypeOf<Mount.ViewState>()
                return Effect.sync(() => observedViewStates.push(viewState))
              }),
              Effect.as(
                Message.CompletedMeasurePanel({ panelId: 'panel', width: 0 }),
              ),
            )
        }),
      )

      yield* ObserveViewState()
        .f(panelElement(), Mount.liveViewStateChanges)
        .pipe(Stream.runHead, Effect.provide(ObserveViewStateLive))

      expect(observedViewStates).toEqual([Mount.ViewState.make('Live')])
    }),
  )
})

describe('Layer-backed Mount.define handlers', () => {
  const MeasurePanel = Mount.define('MeasureLayeredPanel', {
    args: { panelId: Schema.String },
    messages: [Message.CompletedMeasurePanel],
  })

  const MeasurePanelLive = MeasurePanel.toLayer(
    Effect.gen(function* () {
      return ({ element, panelId }) =>
        Effect.map(Prefix, ({ value }) =>
          Message.CompletedMeasurePanel({
            panelId: value + panelId,
            width: measuredWidth(element),
          }),
        )
    }),
  )

  it('carries the handler requirement and its implementation dependencies', () => {
    expectTypeOf(MeasurePanel({ panelId: 'panel' })).toMatchTypeOf<
      Mount.MountAction<
        Message,
        never,
        Mount.RequirementsOf<typeof MeasurePanel>
      >
    >()
    expectTypeOf(MeasurePanelLive).toEqualTypeOf<
      Layer.Layer<Mount.RequirementsOf<typeof MeasurePanel>, never, Prefix>
    >()

    const constructedLayer = MeasurePanel.toLayer(
      Effect.map(
        Suffix,
        () =>
          ({ element, panelId }) =>
            Effect.map(Prefix, ({ value }) =>
              Message.CompletedMeasurePanel({
                panelId: value + panelId,
                width: measuredWidth(element),
              }),
            ),
      ),
    )
    expectTypeOf(constructedLayer).toEqualTypeOf<
      Layer.Layer<
        Mount.RequirementsOf<typeof MeasurePanel>,
        never,
        Prefix | Suffix
      >
    >()
  })

  it.effect('uses invocation context over handler Layer context', () =>
    Effect.gen(function* () {
      const handlerLayer = Layer.provide(
        MeasurePanelLive,
        Layer.succeed(Prefix, { value: 'construction:' }),
      )

      const maybeMessage = yield* MeasurePanel({ panelId: 'panel' })
        .f(panelElement(), Mount.liveViewStateChanges)
        .pipe(
          Stream.runHead,
          Effect.provideService(Prefix, { value: 'invocation:' }),
          Effect.provide(handlerLayer),
        )

      expect(maybeMessage).toEqual(
        Option.some(
          Message.CompletedMeasurePanel({
            panelId: 'invocation:panel',
            width: PANEL_WIDTH,
          }),
        ),
      )
    }),
  )

  it.effect('builds the handler once for multiple Mounts', () =>
    Effect.gen(function* () {
      let builds = 0
      const BuildOnce = Mount.define('BuildOnce', {
        args: { panelId: Schema.String },
        messages: [Message.CompletedMeasurePanel],
      })

      const BuildOnceLive = BuildOnce.toLayer(
        Effect.gen(function* () {
          builds += 1

          return ({ element, panelId }) =>
            Effect.succeed(
              Message.CompletedMeasurePanel({
                panelId,
                width: measuredWidth(element),
              }),
            )
        }),
      )

      const results = yield* Effect.all([
        Stream.runHead(
          BuildOnce({ panelId: 'first' }).f(
            panelElement(),
            Mount.liveViewStateChanges,
          ),
        ),
        Stream.runHead(
          BuildOnce({ panelId: 'second' }).f(
            panelElement(),
            Mount.liveViewStateChanges,
          ),
        ),
      ]).pipe(Effect.provide(BuildOnceLive))

      expect(builds).toBe(1)
      expect(results).toEqual([
        Option.some(
          Message.CompletedMeasurePanel({
            panelId: 'first',
            width: PANEL_WIDTH,
          }),
        ),
        Option.some(
          Message.CompletedMeasurePanel({
            panelId: 'second',
            width: PANEL_WIDTH,
          }),
        ),
      ])
    }),
  )

  it.effect(
    'rejects another one-shot definition Layer with the same name',
    () =>
      Effect.gen(function* () {
        const otherMeasurePanel = Mount.define('MeasureLayeredPanel', {
          args: { panelId: Schema.String },
          messages: [Message.CompletedMeasurePanel],
        })
        const otherLayer = otherMeasurePanel.toLayer(
          Effect.succeed(({ element, panelId }) =>
            Effect.succeed(
              Message.CompletedMeasurePanel({
                panelId,
                width: measuredWidth(element),
              }),
            ),
          ),
        )

        const result = yield* Effect.exit(
          Stream.runHead(
            MeasurePanel({ panelId: 'panel' }).f(
              panelElement(),
              Mount.liveViewStateChanges,
            ),
          ).pipe(Effect.provide(otherLayer)),
        )

        expect(result.toString()).toContain(
          'belongs to another definition with the same name',
        )
      }),
  )

  it('infers constructor failures and nested handler requirements', () => {
    class BuildFailure extends Data.TaggedError('BuildFailure')<{}> {}

    const NestedRequirements = Mount.define('NestedRequirements', {
      args: { panelId: Schema.String },
      messages: [Message.CompletedMeasurePanel],
    })

    const NestedRequirementsLive = NestedRequirements.toLayer(
      Effect.gen(function* () {
        yield* Effect.scope
        const suffix = yield* Suffix
        if (suffix.value === 'unavailable') {
          return yield* Effect.fail(new BuildFailure())
        }

        return ({ element, panelId }) => {
          const exactPanelId: string = panelId
          void exactPanelId
          // @ts-expect-error Schema.String is decoded as string rather than any.
          panelId.doesNotExist()
          return Effect.gen(function* () {
            yield* Effect.scope
            const prefix = yield* Prefix
            return Message.CompletedMeasurePanel({
              panelId: prefix.value + panelId + suffix.value,
              width: measuredWidth(element),
            })
          })
        }
      }),
    )

    expectTypeOf(NestedRequirementsLive).toEqualTypeOf<
      Layer.Layer<
        Mount.RequirementsOf<typeof NestedRequirements>,
        BuildFailure,
        Prefix | Suffix
      >
    >()
  })

  it('infers no execution requirements from a failing constructor', () => {
    const MountBuildFailure = Mount.define('MountBuildFailure', {
      messages: [Message.CompletedMeasurePanel],
    })

    const MountBuildFailureLive = MountBuildFailure.toLayer(
      Effect.gen(function* () {
        return yield* Effect.fail('mount-build')
      }),
    )

    expectTypeOf(MountBuildFailureLive).toEqualTypeOf<
      Layer.Layer<Mount.RequirementsOf<typeof MountBuildFailure>, string, never>
    >()
  })
})

describe('Mount.defineStream defers its handler body', () => {
  it.effect('does not run the handler until the element mounts', () =>
    Effect.gen(function* () {
      let bodyRunCount = 0

      const WatchPanelScroll = Mount.defineStream('WatchPanelScroll', {
        args: { initialScroll: Schema.Number },
        messages: [Message.ScrolledPanel],
      })

      const WatchPanelScrollLive = WatchPanelScroll.toLayer(
        Effect.gen(function* () {
          return ({ element, initialScroll }) => {
            bodyRunCount = bodyRunCount + 1
            return Stream.make(
              Message.ScrolledPanel({
                scroll: initialScroll + measuredWidth(element),
              }),
            )
          }
        }),
      )

      const action = WatchPanelScroll({ initialScroll: 8 })
      expect(bodyRunCount).toBe(0)

      const maybeMessage = yield* Stream.runHead(
        action.f(panelElement(), Mount.liveViewStateChanges),
      ).pipe(Effect.provide(WatchPanelScrollLive))

      expect(bodyRunCount).toBe(1)
      expect(maybeMessage).toStrictEqual(
        Option.some(Message.ScrolledPanel({ scroll: 8 + PANEL_WIDTH })),
      )
    }),
  )

  it('does not run the handler for a MountAction a view discards', () => {
    let bodyRunCount = 0

    const WatchPanelScroll = Mount.defineStream('WatchPanelScroll', {
      messages: [Message.ScrolledPanel],
    })

    void WatchPanelScroll.toLayer(
      Effect.gen(function* () {
        return ({ element }) => {
          bodyRunCount = bodyRunCount + 1
          return Stream.make(
            Message.ScrolledPanel({ scroll: measuredWidth(element) }),
          )
        }
      }),
    )

    WatchPanelScroll()

    expect(bodyRunCount).toBe(0)
  })

  it.effect('keeps the live-only view-state Stream open after Live', () =>
    Effect.gen(function* () {
      const observedViewStates: Array<Mount.ViewState> = []

      const WatchViewState = Mount.defineStream('WatchViewState', {
        messages: [Message.ScrolledPanel],
      })

      const WatchViewStateLive = WatchViewState.toLayer(
        Effect.gen(function* () {
          return ({ viewStateChanges }) =>
            Stream.map(
              Stream.tap(viewStateChanges, viewState => {
                expectTypeOf(viewState).toEqualTypeOf<Mount.ViewState>()
                return Effect.sync(() => observedViewStates.push(viewState))
              }),
              () => Message.ScrolledPanel({ scroll: 0 }),
            )
        }),
      )

      const fiber = yield* WatchViewState()
        .f(panelElement(), Mount.liveViewStateChanges)
        .pipe(
          Stream.runCollect,
          Effect.provide(WatchViewStateLive),
          Effect.forkChild,
        )

      yield* Effect.yieldNow

      expect(observedViewStates).toEqual(['Live'])
      expect(fiber.pollUnsafe()).toBeUndefined()

      yield* Fiber.interrupt(fiber)
    }),
  )
})

describe('Layer-backed Mount.defineStream handlers', () => {
  it.effect('executes a streaming handler through its Layer', () =>
    Effect.gen(function* () {
      const WatchPanelScroll = Mount.defineStream('WatchLayeredPanelScroll', {
        args: { initialScroll: Schema.Number },
        messages: [Message.ScrolledPanel],
      })

      const WatchPanelScrollLive = WatchPanelScroll.toLayer(
        Effect.gen(function* () {
          return ({ element, initialScroll }) =>
            Stream.make(
              Message.ScrolledPanel({
                scroll: initialScroll + measuredWidth(element),
              }),
            )
        }),
      )

      const maybeMessage = yield* WatchPanelScroll({ initialScroll: 8 })
        .f(panelElement(), Mount.liveViewStateChanges)
        .pipe(Stream.runHead, Effect.provide(WatchPanelScrollLive))

      expect(maybeMessage).toEqual(
        Option.some(Message.ScrolledPanel({ scroll: 8 + PANEL_WIDTH })),
      )
    }),
  )

  it.effect('rejects another stream definition Layer with the same name', () =>
    Effect.gen(function* () {
      const WatchPanelScroll = Mount.defineStream('WatchSharedPanelScroll', {
        messages: [Message.ScrolledPanel],
      })
      const otherWatchPanelScroll = Mount.defineStream(
        'WatchSharedPanelScroll',
        {
          messages: [Message.ScrolledPanel],
        },
      )
      const otherLayer = otherWatchPanelScroll.toLayer(
        Effect.succeed(() => Stream.make(Message.ScrolledPanel({ scroll: 0 }))),
      )

      const result = yield* Effect.exit(
        Stream.runHead(
          WatchPanelScroll().f(panelElement(), Mount.liveViewStateChanges),
        ).pipe(Effect.provide(otherLayer)),
      )

      expect(result.toString()).toContain(
        'belongs to another definition with the same name',
      )
    }),
  )
})
