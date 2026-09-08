import {
  Context,
  Crypto,
  Effect,
  Layer,
  Match,
  Number,
  Option,
  Schema,
} from 'effect'
import { Command, ManagedResource, Runtime, type Update } from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

import { BrowserCrypto } from '@effect/platform-browser'
import { Button } from '@foldkit/ui'

// ENGINE

interface ComputeEngine {
  readonly engineId: string
  readonly square: (value: number) => number
}

class ComputeEngineService extends Context.Service<
  ComputeEngineService,
  ComputeEngine
>()('ComputeEngineService') {}

const engineLayer: Layer.Layer<ComputeEngineService> = Layer.effect(
  ComputeEngineService,
  Effect.acquireRelease(
    Effect.gen(function* () {
      const crypto = yield* Crypto.Crypto
      const id = yield* Effect.orDie(crypto.randomUUIDv4)
      const engineId = `engine-${id.slice(0, 8)}`
      return { engineId, square: (value: number) => value * value }
    }).pipe(Effect.provide(BrowserCrypto.layer)),
    ({ engineId }) => Effect.log(`Tore down ${engineId}`),
  ),
)

const Engine = ManagedResource.tag<ComputeEngine>()('ComputeEngine')
type EngineService = ManagedResource.ServiceOf<typeof Engine>

// MODEL

export const EngineState = defineTaggedUnion({
  Off: {},
  Booting: {},
  Ready: { engineId: Schema.String },
  Failed: { reason: Schema.String },
})
type EngineState = typeof EngineState.Type

export const Model = Schema.Struct({
  engine: EngineState,
  computeCount: Schema.Number,
  maybeSquareResult: Schema.Option(Schema.Number),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedStartEngine: {},
  ClickedStopEngine: {},
  StartedEngine: { engineId: Schema.String },
  StoppedEngine: {},
  FailedStartEngine: { reason: Schema.String },
  ClickedCompute: {},
  CompletedCompute: { result: Schema.Number },
  SkippedCompute: {},
})

export type Message = typeof Message.Type

// COMMAND

export const Compute = Command.define('Compute', {
  args: { value: Schema.Number },
  messages: [Message.CompletedCompute, Message.SkippedCompute],
  execute: ({ value }) =>
    Effect.gen(function* () {
      const engine = yield* Engine.get
      return Message.CompletedCompute({ result: engine.square(value) })
    }).pipe(
      Effect.catchTag('ResourceNotAvailable', () =>
        Effect.succeed(Message.SkippedCompute()),
      ),
    ),
})

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message, EngineService>>(message, {
    ClickedStartEngine: () => ({
      model: evo(model, { engine: () => EngineState.Booting() }),
    }),

    ClickedStopEngine: () => ({
      model: evo(model, { engine: () => EngineState.Off() }),
    }),

    StartedEngine: ({ engineId }) => ({
      model: evo(model, {
        engine: () => EngineState.Ready({ engineId }),
      }),
    }),

    StoppedEngine: () => ({ model }),

    FailedStartEngine: ({ reason }) => ({
      model: evo(model, { engine: () => EngineState.Failed({ reason }) }),
    }),

    ClickedCompute: () => {
      const nextComputeCount = Number.increment(model.computeCount)
      return {
        model: evo(model, { computeCount: () => nextComputeCount }),
        commands: [Compute({ value: nextComputeCount })],
      }
    },

    CompletedCompute: ({ result }) => ({
      model: evo(model, { maybeSquareResult: () => Option.some(result) }),
    }),

    SkippedCompute: () => ({ model }),
  })

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: {
    engine: EngineState.Off(),
    computeCount: 0,
    maybeSquareResult: Option.none(),
  },
})

// MANAGED RESOURCE

export const managedResources = ManagedResource.make<Model, Message>()(
  entry => ({
    engine: entry(Schema.Option(Schema.Null), {
      resource: Engine,
      modelToMaybeRequirements: model =>
        Match.value(model.engine).pipe(
          Match.tag('Booting', 'Ready', () => Option.some(null)),
          Match.tag('Off', 'Failed', () => Option.none()),
          Match.exhaustive,
        ),
      acquire: () =>
        Layer.build(engineLayer).pipe(
          Effect.map(context => Context.get(context, ComputeEngineService)),
        ),
      release: () => Effect.void,
      onAcquired: ({ engineId }) => Message.StartedEngine({ engineId }),
      onReleased: () => Message.StoppedEngine(),
      onAcquireError: error =>
        Message.FailedStartEngine({ reason: String(error) }),
    }),
  }),
)

// VIEW

const buttonClassName =
  'px-6 py-3 font-semibold text-white transition-colors data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed'

const primaryButton = (
  label: string,
  message: Message,
  colorClassName: string,
  isDisabled: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  Button.view(
    {
      onClick: message,
      isDisabled,
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.Class(`${buttonClassName} ${colorClassName}`),
          ],
          [label],
        ),
    },
    h,
  )

const engineStatusView = (
  engine: EngineState,
  h: HtmlBuilder<Message>,
): Html => {
  const status = EngineState.match(engine, {
    Off: () => ({
      colorClassName: 'text-gray-500',
      text: 'Engine is off.',
    }),
    Booting: () => ({
      colorClassName: 'text-amber-600',
      text: 'Booting engine...',
    }),
    Ready: ({ engineId }) => ({
      colorClassName: 'text-green-600',
      text: `Engine ready: ${engineId}`,
    }),
    Failed: ({ reason }) => ({
      colorClassName: 'text-red-600',
      text: `Engine failed: ${reason}`,
    }),
  })

  return h.p([h.Class(status.colorClassName)], [status.text])
}

const engineControlsView = (
  engine: EngineState,
  h: HtmlBuilder<Message>,
): Html => {
  const controls = Match.value(engine).pipe(
    Match.tag('Booting', 'Ready', () => ({
      label: 'Stop engine',
      message: Message.ClickedStopEngine(),
      colorClassName: 'bg-red-500 hover:bg-red-600',
    })),
    Match.tag('Off', 'Failed', () => ({
      label: 'Start engine',
      message: Message.ClickedStartEngine(),
      colorClassName: 'bg-green-500 hover:bg-green-600',
    })),
    Match.exhaustive,
  )

  return h.div(
    [h.Class('flex gap-3')],
    [
      primaryButton(
        controls.label,
        controls.message,
        controls.colorClassName,
        false,
        h,
      ),
    ],
  )
}

const squareResultView = (
  maybeSquareResult: Option.Option<number>,
  h: HtmlBuilder<Message>,
): Html => {
  const text = Option.match(maybeSquareResult, {
    onNone: () => 'No result yet.',
    onSome: value => `Square result: ${value}`,
  })

  return h.div([h.Class('text-gray-800')], [text])
}

const isEngineReady = (engine: EngineState): boolean => engine._tag === 'Ready'

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const isComputeDisabled = !isEngineReady(model.engine)

  return {
    title: 'Managed Resource Layer',
    body: h.div(
      [h.Class('min-h-screen bg-gray-100 flex items-center justify-center')],
      [
        h.div(
          [h.Class('bg-white p-8 rounded-lg shadow flex flex-col gap-5 w-96')],
          [
            h.h1(
              [h.Class('text-xl font-bold text-gray-900')],
              ['Layer-backed Managed Resource'],
            ),
            engineStatusView(model.engine, h),
            engineControlsView(model.engine, h),
            primaryButton(
              'Compute next square',
              Message.ClickedCompute(),
              'bg-blue-500 hover:bg-blue-600 data-[disabled]:hover:bg-blue-500',
              isComputeDisabled,
              h,
            ),
            squareResultView(model.maybeSquareResult, h),
          ],
        ),
      ],
    ),
  }
}
