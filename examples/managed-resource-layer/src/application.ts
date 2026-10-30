import { Effect, Match, Number, Option, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

import { Engine } from './engine'

export const EngineState = defineTaggedUnion({
  Off: {},
  Booting: {},
  Ready: { engineId: Schema.String },
  Failed: { reason: Schema.String },
})
export type EngineState = typeof EngineState.Type

export const Model = Schema.Struct({
  engine: EngineState,
  maybeComputeEngine: Schema.Option(Engine),
  computeCount: Schema.Number,
  maybeSquareResult: Schema.Option(Schema.Number),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedStartEngine: {},
  ClickedStopEngine: {},
  ClickedCompute: {},
  SucceededCompute: { result: Schema.Number },
  FailedCompute: {},
})
export type Message = typeof Message.Type

type ApplicationViewBuilder = HtmlBuilder<Message>

export const Compute = Command.define('Compute', {
  args: { value: Schema.Number },
  messages: [Message.SucceededCompute, Message.FailedCompute],
})

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
  Command: [Compute],
}) {}

const buttonClassName =
  'px-6 py-3 font-semibold text-white transition-colors data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed'

const primaryButton = (
  label: string,
  message: Message,
  colorClassName: string,
  isDisabled: boolean,
  h: ApplicationViewBuilder,
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
  h: ApplicationViewBuilder,
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
  h: ApplicationViewBuilder,
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
  h: ApplicationViewBuilder,
): Html => {
  const text = Option.match(maybeSquareResult, {
    onNone: () => 'No result yet.',
    onSome: value => `Square result: ${value}`,
  })

  return h.div([h.Class('text-gray-800')], [text])
}

const isEngineReady = (engine: EngineState): boolean => engine._tag === 'Ready'

const view = (model: Model, h: ApplicationViewBuilder) => {
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

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const computeEngine = yield* new Engine('computeEngine')

    return {
      model: {
        engine: EngineState.Off(),
        maybeComputeEngine: Option.none(),
        computeCount: 0,
        maybeSquareResult: Option.none(),
      },

      update: {
        ClickedStartEngine: model => ({
          model: modifyFields(model, {
            engine: () => EngineState.Booting(),
            maybeComputeEngine: Option.orElseSome(() => computeEngine),
          }),
        }),

        ClickedStopEngine: model => ({
          model: modifyFields(model, {
            engine: () => EngineState.Off(),
            maybeComputeEngine: () => Option.none(),
          }),
        }),

        ClickedCompute: model => {
          const nextComputeCount = Number.increment(model.computeCount)
          return {
            model: modifyFields(model, {
              computeCount: () => nextComputeCount,
            }),
            commands: [Compute({ value: nextComputeCount })],
          }
        },

        SucceededCompute: (model, { result }) => ({
          model: modifyFields(model, {
            maybeSquareResult: () => Option.some(result),
          }),
        }),

        FailedCompute: model => ({ model }),

        ...computeEngine.on<Model>({
          Started: (model, { engineId }) => ({
            model: modifyFields(model, {
              engine: () => EngineState.Ready({ engineId }),
            }),
          }),
          FailedStart: (model, { reason }) => ({
            model: modifyFields(model, {
              engine: () => EngineState.Failed({ reason }),
              maybeComputeEngine: () => Option.none(),
            }),
          }),
        }),
      },

      commands: {
        Compute: ({ value }) =>
          computeEngine.use.pipe(
            Effect.flatten,
            Effect.map(engine =>
              Message.SucceededCompute({ result: engine.square(value) }),
            ),
            Effect.catchCause(() => Effect.succeed(Message.FailedCompute())),
          ),
      },

      view,
    }
  }),
)
