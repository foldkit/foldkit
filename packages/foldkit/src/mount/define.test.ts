import { Context, Effect, Fiber, Layer, Option, Schema, Stream } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Mount from './public.js'

const Message = defineMessageUnion({
  CompletedMeasurePanel: { panelId: Schema.String, width: Schema.Number },
  ScrolledPanel: { scroll: Schema.Number },
})
type Message = typeof Message.Type

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
    // @ts-expect-error `element` names the live element execute receives, so an arg cannot claim it
    args: {
      element: Schema.String,
    },
    messages: [Message.CompletedMeasurePanel],
    execute: ({ element }) =>
      Effect.succeed(
        Message.CompletedMeasurePanel({
          panelId: 'panel',
          width: measuredWidth(element),
        }),
      ),
  })

  Mount.define('ObserveViewState', {
    // @ts-expect-error `viewStateChanges` names the runtime Stream execute receives, so an arg cannot claim it
    args: {
      viewStateChanges: Schema.String,
    },
    messages: [Message.CompletedMeasurePanel],
    execute: ({ element }) =>
      Effect.succeed(
        Message.CompletedMeasurePanel({
          panelId: 'panel',
          width: measuredWidth(element),
        }),
      ),
  })
}

describe('Mount.define defers its execute body', () => {
  it.effect('does not run execute until the element mounts', () =>
    Effect.gen(function* () {
      let bodyRunCount = 0

      const MeasurePanel = Mount.define('MeasurePanel', {
        args: { panelId: Schema.String },
        messages: [Message.CompletedMeasurePanel],
        execute: ({ element, panelId }) => {
          bodyRunCount = bodyRunCount + 1
          return Effect.succeed(
            Message.CompletedMeasurePanel({
              panelId,
              width: measuredWidth(element),
            }),
          )
        },
      })

      const action = MeasurePanel({ panelId: 'panel' })
      expect(bodyRunCount).toBe(0)

      const maybeMessage = yield* Stream.runHead(
        action.f(panelElement(), Mount.liveViewStateChanges),
      )

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

  it('never runs execute for a MountAction a view constructs and discards', () => {
    let bodyRunCount = 0

    const MeasurePanel = Mount.define('MeasurePanel', {
      args: { panelId: Schema.String },
      messages: [Message.CompletedMeasurePanel],
      execute: ({ element, panelId }) => {
        bodyRunCount = bodyRunCount + 1
        return Effect.succeed(
          Message.CompletedMeasurePanel({
            panelId,
            width: measuredWidth(element),
          }),
        )
      },
    })

    MeasurePanel({ panelId: 'discarded' })

    expect(bodyRunCount).toBe(0)
  })

  it('does not run a no-args execute when the action is constructed', () => {
    let bodyRunCount = 0

    const MeasurePanel = Mount.define('MeasurePanel', {
      messages: [Message.CompletedMeasurePanel],
      execute: ({ element }) => {
        bodyRunCount = bodyRunCount + 1
        return Effect.succeed(
          Message.CompletedMeasurePanel({
            panelId: 'panel',
            width: measuredWidth(element),
          }),
        )
      },
    })

    MeasurePanel()

    expect(bodyRunCount).toBe(0)
  })
})

describe('Layer-backed Mount.define handlers', () => {
  const MeasurePanel = Mount.define('MeasureLayeredPanel', {
    args: { panelId: Schema.String },
    messages: [Message.CompletedMeasurePanel],
  })

  it('carries the handler requirement and its implementation dependencies', () => {
    const layer = MeasurePanel.toLayer(({ element, panelId }) =>
      Effect.map(Prefix, ({ value }) =>
        Message.CompletedMeasurePanel({
          panelId: value + panelId,
          width: measuredWidth(element),
        }),
      ),
    )

    expectTypeOf(MeasurePanel({ panelId: 'panel' })).toMatchTypeOf<
      Mount.MountAction<Message, never, Mount.Handler<'MeasureLayeredPanel'>>
    >()
    expectTypeOf(layer).toEqualTypeOf<
      Layer.Layer<Mount.Handler<'MeasureLayeredPanel'>, never, Prefix>
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
      Layer.Layer<Mount.Handler<'MeasureLayeredPanel'>, never, Prefix | Suffix>
    >()
  })

  it.effect('uses invocation context over handler Layer context', () =>
    Effect.gen(function* () {
      const layer = MeasurePanel.toLayer(({ element, panelId }) =>
        Effect.map(Prefix, ({ value }) =>
          Message.CompletedMeasurePanel({
            panelId: value + panelId,
            width: measuredWidth(element),
          }),
        ),
      )
      const handlerLayer = Layer.provide(
        layer,
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

  it.effect('builds an Effect supplied handler once for multiple Mounts', () =>
    Effect.gen(function* () {
      let builds = 0
      const layer = MeasurePanel.toLayer(
        Effect.sync(() => {
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
          MeasurePanel({ panelId: 'first' }).f(
            panelElement(),
            Mount.liveViewStateChanges,
          ),
        ),
        Stream.runHead(
          MeasurePanel({ panelId: 'second' }).f(
            panelElement(),
            Mount.liveViewStateChanges,
          ),
        ),
      ]).pipe(Effect.provide(layer))

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
        const otherLayer = otherMeasurePanel.toLayer(({ element, panelId }) =>
          Effect.succeed(
            Message.CompletedMeasurePanel({
              panelId,
              width: measuredWidth(element),
            }),
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
})

describe('Mount.defineStream defers its execute body', () => {
  it.effect('does not run execute until the element mounts', () =>
    Effect.gen(function* () {
      let bodyRunCount = 0

      const WatchPanelScroll = Mount.defineStream('WatchPanelScroll', {
        args: { initialScroll: Schema.Number },
        messages: [Message.ScrolledPanel],
        execute: ({ element, initialScroll }) => {
          bodyRunCount = bodyRunCount + 1
          return Stream.make(
            Message.ScrolledPanel({
              scroll: initialScroll + measuredWidth(element),
            }),
          )
        },
      })

      const action = WatchPanelScroll({ initialScroll: 8 })
      expect(bodyRunCount).toBe(0)

      const maybeMessage = yield* Stream.runHead(
        action.f(panelElement(), Mount.liveViewStateChanges),
      )

      expect(bodyRunCount).toBe(1)
      expect(maybeMessage).toStrictEqual(
        Option.some(Message.ScrolledPanel({ scroll: 8 + PANEL_WIDTH })),
      )
    }),
  )

  it('never runs execute for a MountAction a view constructs and discards', () => {
    let bodyRunCount = 0

    const WatchPanelScroll = Mount.defineStream('WatchPanelScroll', {
      messages: [Message.ScrolledPanel],
      execute: ({ element }) => {
        bodyRunCount = bodyRunCount + 1
        return Stream.make(
          Message.ScrolledPanel({ scroll: measuredWidth(element) }),
        )
      },
    })

    WatchPanelScroll()

    expect(bodyRunCount).toBe(0)
  })

  it.effect('keeps the live-only view-state Stream open after Live', () =>
    Effect.gen(function* () {
      const observedViewStates: Array<Mount.ViewState> = []

      const WatchViewState = Mount.defineStream('WatchViewState', {
        messages: [Message.ScrolledPanel],
        execute: ({ viewStateChanges }) =>
          viewStateChanges.pipe(
            Stream.tap(viewState =>
              Effect.sync(() => observedViewStates.push(viewState)),
            ),
            Stream.map(() => Message.ScrolledPanel({ scroll: 0 })),
          ),
      })

      const fiber = yield* WatchViewState()
        .f(panelElement(), Mount.liveViewStateChanges)
        .pipe(Stream.runCollect, Effect.forkChild)

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
      const layer = WatchPanelScroll.toLayer(({ element, initialScroll }) =>
        Stream.make(
          Message.ScrolledPanel({
            scroll: initialScroll + measuredWidth(element),
          }),
        ),
      )

      const maybeMessage = yield* WatchPanelScroll({ initialScroll: 8 })
        .f(panelElement(), Mount.liveViewStateChanges)
        .pipe(Stream.runHead, Effect.provide(layer))

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
      const otherLayer = otherWatchPanelScroll.toLayer(() =>
        Stream.make(Message.ScrolledPanel({ scroll: 0 })),
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
