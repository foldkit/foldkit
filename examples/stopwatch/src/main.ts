import {
  Clock,
  Duration,
  Effect,
  Schema as S,
  Stream,
  String,
  flow,
  pipe,
} from 'effect'
import { Command, Runtime, Subscription, type Update } from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

const TICK_INTERVAL_MS = 10

// MODEL

export const Model = S.Struct({
  elapsedMs: S.Number,
  isRunning: S.Boolean,
  startTime: S.Number,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedStart: {},
  CompletedDetermineStartTime: { startTime: S.Number },
  ClickedStop: {},
  ClickedReset: {},
  Ticked: {},
  CompletedDetermineTickTime: { elapsedMs: S.Number },
})

export type Message = typeof Message.Type

// COMMAND

export const DetermineStartTime = Command.define('DetermineStartTime', {
  args: { elapsedMs: S.Number },
  messages: [Message.CompletedDetermineStartTime],
  execute: ({ elapsedMs }) =>
    Effect.gen(function* () {
      const now = yield* Clock.currentTimeMillis
      return Message.CompletedDetermineStartTime({ startTime: now - elapsedMs })
    }),
})

export const DetermineTickTime = Command.define('DetermineTickTime', {
  args: { startTime: S.Number },
  messages: [Message.CompletedDetermineTickTime],
  execute: ({ startTime }) =>
    Effect.gen(function* () {
      const now = yield* Clock.currentTimeMillis
      return Message.CompletedDetermineTickTime({ elapsedMs: now - startTime })
    }),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedStart: () => ({
      model,
      commands: [DetermineStartTime({ elapsedMs: model.elapsedMs })],
    }),

    CompletedDetermineStartTime: ({ startTime }) => ({
      model: evo(model, {
        isRunning: () => true,
        startTime: () => startTime,
      }),
    }),

    ClickedStop: () => ({
      model: evo(model, {
        isRunning: () => false,
      }),
    }),

    ClickedReset: () => ({
      model: evo(model, {
        elapsedMs: () => 0,
        isRunning: () => false,
        startTime: () => 0,
      }),
    }),

    Ticked: () => ({
      model,
      commands: [DetermineTickTime({ startTime: model.startTime })],
    }),

    CompletedDetermineTickTime: ({ elapsedMs }) => ({
      model: evo(model, {
        elapsedMs: () => elapsedMs,
      }),
    }),
  })

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: {
    elapsedMs: 0,
    isRunning: false,
    startTime: 0,
  },
})

// SUBSCRIPTION

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  tick: entry(
    { isRunning: S.Boolean },
    {
      modelToDependencies: model => ({ isRunning: model.isRunning }),
      dependenciesToStream: ({ isRunning }) =>
        Stream.when(
          Stream.tick(Duration.millis(TICK_INTERVAL_MS)).pipe(
            Stream.map(Message.Ticked),
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

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
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
})

const startStopButton = (isRunning: boolean, h: HtmlBuilder<Message>): Html =>
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
