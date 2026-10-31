import {
  Clock,
  Duration,
  Effect,
  Schema,
  Stream,
  String,
  flow,
  pipe,
} from 'effect'
import { Block, Command } from 'foldkit'
import type { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

const TICK_INTERVAL_MS = 10

export const Model = Schema.Struct({
  elapsedMs: Schema.Number,
  isRunning: Schema.Boolean,
  startTime: Schema.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedStart: {},
  CompletedDetermineStartTime: { startTime: Schema.Number },
  ClickedStop: {},
  ClickedReset: {},
  Ticked: {},
  CompletedDetermineTickTime: { elapsedMs: Schema.Number },
})
export type Message = typeof Message.Type

export const DetermineStartTime = Command.define('DetermineStartTime', {
  args: { elapsedMs: Schema.Number },
  messages: [Message.CompletedDetermineStartTime],
})

export const DetermineTickTime = Command.define('DetermineTickTime', {
  args: { startTime: Schema.Number },
  messages: [Message.CompletedDetermineTickTime],
})

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
  Command: [DetermineStartTime, DetermineTickTime],
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const clock = yield* Clock.Clock

    return {
      model: {
        elapsedMs: 0,
        isRunning: false,
        startTime: 0,
      },

      update: {
        ClickedStart: model => ({
          model,
          commands: [DetermineStartTime({ elapsedMs: model.elapsedMs })],
        }),

        CompletedDetermineStartTime: (model, { startTime }) => ({
          model: modifyFields(model, {
            isRunning: () => true,
            startTime: () => startTime,
          }),
        }),

        ClickedStop: model => ({
          model: modifyFields(model, { isRunning: () => false }),
        }),

        ClickedReset: model => ({
          model: modifyFields(model, {
            elapsedMs: () => 0,
            isRunning: () => false,
            startTime: () => 0,
          }),
        }),

        Ticked: model => ({
          model,
          commands: [DetermineTickTime({ startTime: model.startTime })],
        }),

        CompletedDetermineTickTime: (model, { elapsedMs }) => ({
          model: modifyFields(model, { elapsedMs: () => elapsedMs }),
        }),
      },

      commands: {
        DetermineStartTime: ({ elapsedMs }) =>
          Effect.gen(function* () {
            const now = yield* clock.currentTimeMillis

            return Message.CompletedDetermineStartTime({
              startTime: now - elapsedMs,
            })
          }),

        DetermineTickTime: ({ startTime }) =>
          Effect.gen(function* () {
            const now = yield* clock.currentTimeMillis

            return Message.CompletedDetermineTickTime({
              elapsedMs: now - startTime,
            })
          }),
      },

      subscriptions: {
        stopwatchTicks: {
          dependencies: model => model.isRunning,
          stream: (isRunning: boolean) =>
            isRunning
              ? Stream.tick(Duration.millis(TICK_INTERVAL_MS)).pipe(
                  Stream.drop(1),
                  Stream.as(Message.Ticked()),
                )
              : Stream.empty,
        },
      },

      view,
    }
  }),
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

const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
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
