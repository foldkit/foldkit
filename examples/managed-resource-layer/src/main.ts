import {
  Context,
  Crypto,
  Effect,
  Layer,
  Match as M,
  Number,
  Option,
  Schema as S,
} from 'effect'
import { Command, ManagedResource, Runtime } from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { m } from 'foldkit/message'
import { ts } from 'foldkit/schema'
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

export const EngineOff = ts('EngineOff')
export const EngineBooting = ts('EngineBooting')
export const EngineReady = ts('EngineReady', { engineId: S.String })
export const EngineFailed = ts('EngineFailed', { reason: S.String })

const EngineState = S.Union([
  EngineOff,
  EngineBooting,
  EngineReady,
  EngineFailed,
])
type EngineState = typeof EngineState.Type

export const Model = S.Struct({
  engine: EngineState,
  computeCount: S.Number,
  maybeSquareResult: S.Option(S.Number),
})
export type Model = typeof Model.Type

// MESSAGE

export const ClickedStartEngine = m('ClickedStartEngine')
export const ClickedStopEngine = m('ClickedStopEngine')
export const StartedEngine = m('StartedEngine', { engineId: S.String })
export const StoppedEngine = m('StoppedEngine')
export const FailedStartEngine = m('FailedStartEngine', { reason: S.String })
export const ClickedCompute = m('ClickedCompute')
export const CompletedCompute = m('CompletedCompute', { result: S.Number })
export const SkippedCompute = m('SkippedCompute')

export const Message = S.Union([
  ClickedStartEngine,
  ClickedStopEngine,
  StartedEngine,
  StoppedEngine,
  FailedStartEngine,
  ClickedCompute,
  CompletedCompute,
  SkippedCompute,
])
export type Message = typeof Message.Type

// COMMAND

export const Compute = Command.define('Compute', {
  args: { value: S.Number },
  messages: [CompletedCompute, SkippedCompute],
  execute: ({ value }) =>
    Effect.gen(function* () {
      const engine = yield* Engine.get
      return CompletedCompute({ result: engine.square(value) })
    }).pipe(
      Effect.catchTag('ResourceNotAvailable', () =>
        Effect.succeed(SkippedCompute()),
      ),
    ),
})

// UPDATE

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message, never, EngineService>>,
]

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ClickedStartEngine: () => [
        evo(model, { engine: () => EngineBooting() }),
        [],
      ],

      ClickedStopEngine: () => [evo(model, { engine: () => EngineOff() }), []],

      StartedEngine: ({ engineId }) => [
        evo(model, { engine: () => EngineReady({ engineId }) }),
        [],
      ],

      StoppedEngine: () => [model, []],

      FailedStartEngine: ({ reason }) => [
        evo(model, { engine: () => EngineFailed({ reason }) }),
        [],
      ],

      ClickedCompute: () => {
        const nextComputeCount = Number.increment(model.computeCount)
        return [
          evo(model, { computeCount: () => nextComputeCount }),
          [Compute({ value: nextComputeCount })],
        ]
      },

      CompletedCompute: ({ result }) => [
        evo(model, { maybeSquareResult: () => Option.some(result) }),
        [],
      ],

      SkippedCompute: () => [model, []],
    }),
  )

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => [
  { engine: EngineOff(), computeCount: 0, maybeSquareResult: Option.none() },
  [],
]

// MANAGED RESOURCE

export const managedResources = ManagedResource.make<Model, Message>()(
  entry => ({
    engine: entry(S.Option(S.Null), {
      resource: Engine,
      modelToMaybeRequirements: model =>
        M.value(model.engine).pipe(
          M.tag('EngineBooting', 'EngineReady', () => Option.some(null)),
          M.tag('EngineOff', 'EngineFailed', () => Option.none()),
          M.exhaustive,
        ),
      acquire: () =>
        Layer.build(engineLayer).pipe(
          Effect.map(context => Context.get(context, ComputeEngineService)),
        ),
      release: () => Effect.void,
      onAcquired: ({ engineId }) => StartedEngine({ engineId }),
      onReleased: () => StoppedEngine(),
      onAcquireError: error => FailedStartEngine({ reason: String(error) }),
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
  const status = M.value(engine).pipe(
    M.tag('EngineOff', () => ({
      colorClassName: 'text-gray-500',
      text: 'Engine is off.',
    })),
    M.tag('EngineBooting', () => ({
      colorClassName: 'text-amber-600',
      text: 'Booting engine...',
    })),
    M.tag('EngineReady', ({ engineId }) => ({
      colorClassName: 'text-green-600',
      text: `Engine ready: ${engineId}`,
    })),
    M.tag('EngineFailed', ({ reason }) => ({
      colorClassName: 'text-red-600',
      text: `Engine failed: ${reason}`,
    })),
    M.exhaustive,
  )

  return h.p([h.Class(status.colorClassName)], [status.text])
}

const engineControlsView = (
  engine: EngineState,
  h: HtmlBuilder<Message>,
): Html => {
  const controls = M.value(engine).pipe(
    M.tag('EngineBooting', 'EngineReady', () => ({
      label: 'Stop engine',
      message: ClickedStopEngine(),
      colorClassName: 'bg-red-500 hover:bg-red-600',
    })),
    M.tag('EngineOff', 'EngineFailed', () => ({
      label: 'Start engine',
      message: ClickedStartEngine(),
      colorClassName: 'bg-green-500 hover:bg-green-600',
    })),
    M.exhaustive,
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

const isEngineReady = (engine: EngineState): boolean =>
  engine._tag === 'EngineReady'

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const isComputeDisabled = !isEngineReady(model.engine)

  return {
    title: 'Managed Resource Layer',
    body: h.div(
      [h.Class('min-h-screen bg-gray-50 flex items-center justify-center p-6')],
      [
        h.div(
          [
            h.Class(
              'bg-white p-8 rounded-3xl border border-gray-200/80 shadow-xl flex flex-col gap-5 w-full max-w-96',
            ),
          ],
          [
            h.h1(
              [h.Class('text-2xl font-semibold tracking-tight text-gray-900')],
              ['Layer-backed Managed Resource'],
            ),
            engineStatusView(model.engine, h),
            engineControlsView(model.engine, h),
            primaryButton(
              'Compute next square',
              ClickedCompute(),
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
