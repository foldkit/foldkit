import {
  Clock,
  Duration,
  Effect,
  Layer,
  Schema,
  Stream,
  String,
  flow,
  pipe,
} from 'effect'
import { Block } from 'foldkit'
import { Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Button } from '@foldkit/ui'

const TICK_INTERVAL_MS = 10

export const Model = Schema.Struct({
  elapsedMs: Schema.Number,
  isRunning: Schema.Boolean,
  startTime: Schema.Number,
})

export const Message = defineMessageUnion({
  ClickedStart: {},
  CompletedDetermineStartTime: { startTime: Schema.Number },
  ClickedStop: {},
  ClickedReset: {},
  Ticked: {},
  CompletedDetermineTickTime: { elapsedMs: Schema.Number },
})

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

export const ApplicationComposition = ApplicationDefinition.makeComposition()
type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>

export const DetermineStartTime = ApplicationDefinition.makeCommand(
  'DetermineStartTime',
  {
    args: { elapsedMs: Schema.Number },
    messages: [Message.CompletedDetermineStartTime],
    handler: function* () {
      const clock = yield* Clock.Clock

      return ({ elapsedMs }) =>
        Effect.gen(function* () {
          const now = yield* clock.currentTimeMillis

          return Message.CompletedDetermineStartTime({
            startTime: now - elapsedMs,
          })
        })
    },
  },
)

export const DetermineTickTime = ApplicationDefinition.makeCommand(
  'DetermineTickTime',
  {
    args: { startTime: Schema.Number },
    messages: [Message.CompletedDetermineTickTime],
    handler: function* () {
      const clock = yield* Clock.Clock

      return ({ startTime }) =>
        Effect.gen(function* () {
          const now = yield* clock.currentTimeMillis

          return Message.CompletedDetermineTickTime({
            elapsedMs: now - startTime,
          })
        })
    },
  },
)

export const update = ApplicationComposition.makeUpdate({
  ClickedStart: ApplicationDefinition.makeCommandsStep(model => [
    DetermineStartTime({ elapsedMs: model.elapsedMs }),
  ]),

  CompletedDetermineStartTime: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ startTime }) => ({
      isRunning: () => true,
      startTime: () => startTime,
    }),
  ),

  ClickedStop: ApplicationDefinition.makeFieldsStep(() => ({
    isRunning: () => false,
  })),

  ClickedReset: ApplicationDefinition.makeFieldsStep(() => ({
    elapsedMs: () => 0,
    isRunning: () => false,
    startTime: () => 0,
  })),

  Ticked: ApplicationDefinition.makeCommandsStep(model => [
    DetermineTickTime({ startTime: model.startTime }),
  ]),

  CompletedDetermineTickTime: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ elapsedMs }) => ({
      elapsedMs: () => elapsedMs,
    }),
  ),
})

export const init = ApplicationComposition.makeInit(() => ({
  model: {
    elapsedMs: 0,
    isRunning: false,
    startTime: 0,
  },
}))

export const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
  stopwatchTicks: entry(
    'StopwatchTicks',
    { isRunning: Schema.Boolean },
    {
      messages: [Message.Ticked],
      modelToDependencies: model => ({ isRunning: model.isRunning }),
      handler: function* () {
        return ({ isRunning }) =>
          Stream.when(
            Stream.tick(Duration.millis(TICK_INTERVAL_MS)).pipe(
              Stream.drop(1),
              Stream.map(Message.Ticked),
            ),
            Effect.sync(() => isRunning),
          )
      },
    },
  ),
}))

export const EffectsLayer = Layer.mergeAll(
  DetermineStartTime.layer,
  DetermineTickTime.layer,
  subscriptions.layer,
)

const formatTime = (ms: number): string => {
  const minutes = pipe(Duration.millis(ms), Duration.toMinutes, floorAndPad)

  const seconds = pipe(
    Duration.millis(ms % 60000),
    Duration.toSeconds,
    floorAndPad,
  )

  const centiseconds = pipe(
    Duration.millis(ms % 1000),
    Duration.toMillis,
    v => v / 10,
    floorAndPad,
  )

  return `${minutes}:${seconds}.${centiseconds}`
}

const floorAndPad = flow(Math.floor, v => v.toString(), String.padStart(2, '0'))

export const view = ApplicationComposition.makeView((model, h) => ({
  title: `Stopwatch ${formatTime(model.elapsedMs)}`,
  body: h.div(
    [h.Class('min-h-screen bg-gray-200 flex items-center justify-center')],
    [
      h.div(
        [h.Class('bg-white text-center')],
        [
          h.div(
            [h.Class('text-6xl font-mono font-bold text-gray-800 p-8')],
            [formatTime(model.elapsedMs)],
          ),
          h.div(
            [h.Class('flex')],
            [
              Button.view(
                {
                  onClick: Message.ClickedReset(),
                  toView: attributes =>
                    h.button(
                      [
                        ...attributes.button,
                        h.Class(buttonStyle + ' bg-gray-500 hover:bg-gray-600'),
                      ],
                      ['Reset'],
                    ),
                },
                h,
              ),
              startStopButton(model.isRunning, h),
            ],
          ),
        ],
      ),
    ],
  ),
}))

const startStopButton = (
  isRunning: boolean,
  h: ApplicationViewBuilder,
): Html =>
  isRunning
    ? Button.view(
        {
          onClick: Message.ClickedStop(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(buttonStyle + ' bg-red-500 hover:bg-red-600'),
              ],
              ['Stop'],
            ),
        },
        h,
      )
    : Button.view(
        {
          onClick: Message.ClickedStart(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(buttonStyle + ' bg-green-500 hover:bg-green-600'),
              ],
              ['Start'],
            ),
        },
        h,
      )

// STYLE

const buttonStyle =
  'px-6 py-4 flex-1 font-semibold text-white transition-colors'

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
    subscriptions,
    EffectsLayer,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
