import {
  Clock,
  Duration,
  Effect,
  Match as M,
  Schema as S,
  Stream,
  String,
  flow,
  pipe,
} from 'effect'
import { Command, Runtime, Subscription } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

const TICK_INTERVAL_MS = 10

// MODEL

export const Model = S.Struct({
  elapsedMs: S.Number,
  isRunning: S.Boolean,
  startTime: S.Number,
})
export type Model = typeof Model.Type

// MESSAGE

export const ClickedStart = m('ClickedStart')
export const DeterminedStartTime = m('DeterminedStartTime', {
  startTime: S.Number,
})
export const ClickedStop = m('ClickedStop')
export const ClickedReset = m('ClickedReset')
export const Ticked = m('Ticked')
export const DeterminedTickTime = m('DeterminedTickTime', {
  elapsedMs: S.Number,
})

export const Message = S.Union([
  ClickedStart,
  DeterminedStartTime,
  ClickedStop,
  ClickedReset,
  Ticked,
  DeterminedTickTime,
])
export type Message = typeof Message.Type

// COMMAND

export const DetermineStartTime = Command.define(
  'DetermineStartTime',
  { elapsedMs: S.Number },
  DeterminedStartTime,
)(({ elapsedMs }) =>
  Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis
    return DeterminedStartTime({ startTime: now - elapsedMs })
  }),
)

export const DetermineTickTime = Command.define(
  'DetermineTickTime',
  { startTime: S.Number },
  DeterminedTickTime,
)(({ startTime }) =>
  Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis
    return DeterminedTickTime({ elapsedMs: now - startTime })
  }),
)

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ClickedStart: () => [
        model,
        [DetermineStartTime({ elapsedMs: model.elapsedMs })],
      ],

      DeterminedStartTime: ({ startTime }) => [
        evo(model, {
          isRunning: () => true,
          startTime: () => startTime,
        }),
        [],
      ],

      ClickedStop: () => [
        evo(model, {
          isRunning: () => false,
        }),
        [],
      ],

      ClickedReset: () => [
        evo(model, {
          elapsedMs: () => 0,
          isRunning: () => false,
          startTime: () => 0,
        }),
        [],
      ],

      Ticked: () => [
        model,
        [DetermineTickTime({ startTime: model.startTime })],
      ],

      DeterminedTickTime: ({ elapsedMs }) => [
        evo(model, {
          elapsedMs: () => elapsedMs,
        }),
        [],
      ],
    }),
  )

// INIT

export const init: Runtime.ProgramInit<Model, Message> = () => [
  {
    elapsedMs: 0,
    isRunning: false,
    startTime: 0,
  },
  [],
]

// SUBSCRIPTION

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  tick: entry(
    { isRunning: S.Boolean },
    {
      modelToDependencies: model => ({ isRunning: model.isRunning }),
      dependenciesToStream: ({ isRunning }) =>
        Stream.when(
          Stream.tick(Duration.millis(TICK_INTERVAL_MS)).pipe(
            Stream.map(Ticked),
          ),
          Effect.sync(() => isRunning),
        ),
    },
  ),
}))

// VIEW

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

export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
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
                h.button(
                  [
                    h.OnClick(ClickedReset()),
                    h.Class(buttonStyle + ' bg-gray-500 hover:bg-gray-600'),
                  ],
                  ['Reset'],
                ),
                startStopButton(model.isRunning),
              ],
            ),
          ],
        ),
      ],
    ),
  }
}

const startStopButton = (isRunning: boolean): Html => {
  const h = html<Message>()

  return isRunning
    ? h.button(
        [
          h.OnClick(ClickedStop()),
          h.Class(buttonStyle + ' bg-red-500 hover:bg-red-600'),
        ],
        ['Stop'],
      )
    : h.button(
        [
          h.OnClick(ClickedStart()),
          h.Class(buttonStyle + ' bg-green-500 hover:bg-green-600'),
        ],
        ['Start'],
      )
}

// STYLE

const buttonStyle =
  'px-6 py-4 flex-1 font-semibold text-white transition-colors'
