import {
  Array,
  Effect,
  Number,
  Option,
  Random,
  Schema as S,
  pipe,
} from 'effect'
import { Canvas, Command, Runtime, Subscription, type Update } from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

// MODEL

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 400

const BALL_RADIUS_MIN = 8
const BALL_RADIUS_MAX = 24
const BALL_SPEED_MIN = 80
const BALL_SPEED_MAX = 240
const FULL_CIRCLE_RADIANS = Math.PI * 2
const MS_PER_SECOND = 1000

const PALETTE: ReadonlyArray<string> = [
  '#ff2d55',
  '#ffcc00',
  '#34c759',
  '#5ac8fa',
  '#af52de',
  '#ff9500',
]
const FALLBACK_COLOR = '#ffffff'

const Ball = S.Struct({
  id: S.Number,
  x: S.Number,
  y: S.Number,
  vx: S.Number,
  vy: S.Number,
  radius: S.Number,
  color: S.String,
})
type Ball = typeof Ball.Type

export const Model = S.Struct({
  balls: S.Array(Ball),
  nextId: S.Number,
  isRunning: S.Boolean,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  TickedFrame: { deltaTime: S.Number },
  ClickedCanvas: { x: S.Number, y: S.Number },
  CompletedGenerateBall: {
    x: S.Number,
    y: S.Number,
    vx: S.Number,
    vy: S.Number,
    radius: S.Number,
    color: S.String,
  },
  ClickedClear: {},
  ClickedTogglePlay: {},
})

export type Message = typeof Message.Type

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: { balls: [], nextId: 0, isRunning: true },
})

// COMMAND

export const GenerateBall = Command.define('GenerateBall', {
  args: { x: S.Number, y: S.Number },
  messages: [Message.CompletedGenerateBall],
  execute: ({ x, y }) =>
    Effect.gen(function* () {
      const angle = yield* Random.nextBetween(0, FULL_CIRCLE_RADIANS)
      const speed = yield* Random.nextBetween(BALL_SPEED_MIN, BALL_SPEED_MAX)
      const radius = yield* Random.nextBetween(BALL_RADIUS_MIN, BALL_RADIUS_MAX)
      const colorIndex = yield* Random.nextIntBetween(0, PALETTE.length, {
        halfOpen: true,
      })
      const color = pipe(
        PALETTE,
        Array.get(colorIndex),
        Option.getOrElse(() => FALLBACK_COLOR),
      )
      return Message.CompletedGenerateBall({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius,
        color,
      })
    }),
})

// UPDATE

const advanceBall =
  (deltaSeconds: number) =>
  (ball: Ball): Ball => {
    const nextX = ball.x + ball.vx * deltaSeconds
    const nextY = ball.y + ball.vy * deltaSeconds
    const minX = ball.radius
    const maxX = CANVAS_WIDTH - ball.radius
    const minY = ball.radius
    const maxY = CANVAS_HEIGHT - ball.radius
    const bouncedX = nextX < minX || nextX > maxX
    const bouncedY = nextY < minY || nextY > maxY
    return evo(ball, {
      x: () => Math.max(minX, Math.min(maxX, nextX)),
      y: () => Math.max(minY, Math.min(maxY, nextY)),
      vx: vx => (bouncedX ? -vx : vx),
      vy: vy => (bouncedY ? -vy : vy),
    })
  }

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    TickedFrame: ({ deltaTime }) => ({
      model: evo(model, {
        balls: Array.map(advanceBall(deltaTime / MS_PER_SECOND)),
      }),
    }),

    ClickedCanvas: ({ x, y }) => ({
      model,
      commands: [GenerateBall({ x, y })],
    }),

    CompletedGenerateBall: ({ x, y, vx, vy, radius, color }) => ({
      model: evo(model, {
        balls: balls => [
          ...balls,
          { id: model.nextId, x, y, vx, vy, radius, color },
        ],
        nextId: Number.increment,
      }),
    }),

    ClickedClear: () => ({ model: evo(model, { balls: () => [] }) }),

    ClickedTogglePlay: () => ({
      model: evo(model, { isRunning: running => !running }),
    }),
  })

// SUBSCRIPTION

export const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  frame: Subscription.animationFrame({
    isActive: model => model.isRunning,
    toMessage: deltaTime => Message.TickedFrame({ deltaTime }),
  }),
}))

// VIEW

const backgroundShape = Canvas.Rect({
  x: 0,
  y: 0,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  fill: '#0a0a0f',
})

const ballShape = (ball: Ball): Canvas.Shape =>
  Canvas.Circle({
    x: ball.x,
    y: ball.y,
    radius: ball.radius,
    fill: ball.color,
  })

const sceneShapes = (model: Model): ReadonlyArray<Canvas.Shape> => [
  backgroundShape,
  ...Array.map(model.balls, ballShape),
]

const controlsView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex gap-3 mt-4')],
    [
      Button.view(
        {
          onClick: Message.ClickedTogglePlay(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'min-w-20 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500',
                ),
              ],
              [model.isRunning ? 'Pause' : 'Play'],
            ),
        },
        h,
      ),
      Button.view(
        {
          onClick: Message.ClickedClear(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'min-w-20 px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600',
                ),
              ],
              ['Clear'],
            ),
        },
        h,
      ),
      h.p(
        [h.Class('px-4 py-2 text-zinc-400 text-sm self-center')],
        [
          h.span(
            [h.Class('inline-block tabular-nums text-right min-w-8')],
            [`${model.balls.length}`],
          ),
          ' balls',
        ],
      ),
    ],
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: `Canvas Art (${model.balls.length} balls)`,
  body: h.div(
    [
      h.Class(
        'flex flex-col items-center justify-center min-h-screen bg-black text-white p-8',
      ),
    ],
    [
      h.h1([h.Class('text-4xl font-bold mb-2')], ['Canvas Art']),
      h.p(
        [h.Class('text-zinc-400 mb-6')],
        ['Click the canvas to spawn a ball.'],
      ),
      Canvas.view(
        {
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          shapes: sceneShapes(model),
          className: 'rounded-lg shadow-2xl cursor-crosshair',
          onPointerDown: ({ x, y }) => Message.ClickedCanvas({ x, y }),
        },
        h,
      ),
      controlsView(model, h),
    ],
  ),
})
