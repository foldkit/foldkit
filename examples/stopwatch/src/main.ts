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
import { Html, html } from 'foldkit/html'
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

// UPDATE

const RequestedStart = m('RequestedStart')
const Started = m('Started', { startTime: S.Number })
const ClickedStop = m('ClickedStop')
const ClickedReset = m('ClickedReset')
const RequestedTick = m('RequestedTick')
const Ticked = m('Ticked', { elapsedMs: S.Number })

export const Message = S.Union(
  RequestedStart,
  Started,
  ClickedStop,
  ClickedReset,
  RequestedTick,
  Ticked,
)
export type Message = typeof Message.Type

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command.Command<Message>>]>(),
    M.tagsExhaustive({
      RequestedStart: () => [
        model,
        [
          Effect.gen(function* () {
            const now = yield* Clock.currentTimeMillis
            return Started({ startTime: now - model.elapsedMs })
          }).pipe(Command.make('GetStartTime')),
        ],
      ],

      Started: ({ startTime }) => [
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

      RequestedTick: () => [
        model,
        [
          Effect.gen(function* () {
            const now = yield* Clock.currentTimeMillis
            return Ticked({ elapsedMs: now - model.startTime })
          }).pipe(Command.make('GetTickTime')),
        ],
      ],

      Ticked: ({ elapsedMs }) => [
        evo(model, {
          elapsedMs: () => elapsedMs,
        }),
        [],
      ],
    }),
  )

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [
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
    depsToStream: ({ isRunning }) =>
      Stream.when(
        Stream.tick(Duration.millis(TICK_INTERVAL_MS)).pipe(
          Stream.map(RequestedTick),
        ),
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

const view = (model: Model): Html =>
  div(
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
  )

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
          OnClick(RequestedStart()),
          Class(buttonStyle + ' bg-green-500 hover:bg-green-600'),
        ],
        ['Start'],
      )

// STYLE

const buttonStyle =
  'px-6 py-4 flex-1 font-semibold text-white transition-colors'

// RUN

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root')!,
})

Runtime.run(element)
