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

const Model = S.Struct({
  elapsedMs: S.Number,
  isRunning: S.Boolean,
  startTime: S.Number,
})
type Model = typeof Model.Type

// MESSAGE

const ClickedStart = m('ClickedStart')
const RecordedStartTime = m('RecordedStartTime', { startTime: S.Number })
const ClickedStop = m('ClickedStop')
const ClickedReset = m('ClickedReset')
const Ticked = m('Ticked')
const RecordedTickTime = m('RecordedTickTime', { elapsedMs: S.Number })

export const Message = S.Union(
  ClickedStart,
  RecordedStartTime,
  ClickedStop,
  ClickedReset,
  Ticked,
  RecordedTickTime,
)
export type Message = typeof Message.Type

// COMMAND

const RecordStartTime = Command.define('RecordStartTime', RecordedStartTime)
const RecordTickTime = Command.define('RecordTickTime', RecordedTickTime)

// UPDATE

const update = (
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
        [
          RecordStartTime(
            Effect.gen(function* () {
              const now = yield* Clock.currentTimeMillis
              return RecordedStartTime({ startTime: now - model.elapsedMs })
            }),
          ),
        ],
      ],

      RecordedStartTime: ({ startTime }) => [
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
        [
          RecordTickTime(
            Effect.gen(function* () {
              const now = yield* Clock.currentTimeMillis
              return RecordedTickTime({ elapsedMs: now - model.startTime })
            }),
          ),
        ],
      ],

      RecordedTickTime: ({ elapsedMs }) => [
        evo(model, {
          elapsedMs: () => elapsedMs,
        }),
        [],
      ],
    }),
  )

// INIT

const init: Runtime.ProgramInit<Model, Message> = () => [
  {
    elapsedMs: 0,
    isRunning: false,
    startTime: 0,
  },
  [],
]

// SUBSCRIPTION

const SubscriptionDeps = S.Struct({
  tick: S.Struct({
    isRunning: S.Boolean,
  }),
})

const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  tick: {
    modelToDependencies: (model: Model) => ({ isRunning: model.isRunning }),
    dependenciesToStream: ({ isRunning }) =>
      Stream.when(
        Stream.tick(Duration.millis(TICK_INTERVAL_MS)).pipe(Stream.map(Ticked)),
        () => isRunning,
      ),
  },
})

// VIEW

const { div, button, Class, OnClick } = html<Message>()

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

const view = (model: Model): Document => ({
  title: `Stopwatch ${formatTime(model.elapsedMs)}`,
  body: div(
    [Class('min-h-screen bg-gray-200 flex items-center justify-center')],
    [
      div(
        [Class('bg-white text-center')],
        [
          div(
            [Class('text-6xl font-mono font-bold text-gray-800 p-8')],
            [formatTime(model.elapsedMs)],
          ),
          div(
            [Class('flex')],
            [
              button(
                [
                  OnClick(ClickedReset()),
                  Class(buttonStyle + ' bg-gray-500 hover:bg-gray-600'),
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
})

const startStopButton = (isRunning: boolean): Html =>
  isRunning
    ? button(
        [
          OnClick(ClickedStop()),
          Class(buttonStyle + ' bg-red-500 hover:bg-red-600'),
        ],
        ['Stop'],
      )
    : button(
        [
          OnClick(ClickedStart()),
          Class(buttonStyle + ' bg-green-500 hover:bg-green-600'),
        ],
        ['Start'],
      )

// STYLE

const buttonStyle =
  'px-6 py-4 flex-1 font-semibold text-white transition-colors'

// RUN

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root')!,
  devTools: {
    Message,
  },
})

Runtime.run(program)
