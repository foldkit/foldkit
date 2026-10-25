import {
  Array,
  Effect,
  Layer,
  Number,
  Option,
  Random,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { Block, Canvas, Dom } from 'foldkit'
import { Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

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

const Ball = Schema.Struct({
  id: Schema.Number,
  x: Schema.Number,
  y: Schema.Number,
  vx: Schema.Number,
  vy: Schema.Number,
  radius: Schema.Number,
  color: Schema.String,
})

export const Model = Schema.Struct({
  balls: Schema.Array(Ball),
  nextId: Schema.Number,
  isRunning: Schema.Boolean,
})

export const Message = defineMessageUnion({
  TickedFrame: { deltaTime: Schema.Number },
  ClickedCanvas: { x: Schema.Number, y: Schema.Number },
  CompletedGenerateBall: {
    x: Schema.Number,
    y: Schema.Number,
    vx: Schema.Number,
    vy: Schema.Number,
    radius: Schema.Number,
    color: Schema.String,
  },
  ClickedClear: {},
  ClickedTogglePlay: {},
})

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

export const ApplicationComposition = ApplicationDefinition.makeComposition()
type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>

export const init = ApplicationComposition.makeInit(() => ({
  model: Model.make({ balls: [], nextId: 0, isRunning: true }),
}))

export const GenerateBall = ApplicationDefinition.makeCommand('GenerateBall', {
  args: { x: Schema.Number, y: Schema.Number },
  messages: [Message.CompletedGenerateBall],
  handler: function* () {
    return ({ x, y }) =>
      Effect.gen(function* () {
        const angle = yield* Random.nextBetween(0, FULL_CIRCLE_RADIANS)
        const speed = yield* Random.nextBetween(BALL_SPEED_MIN, BALL_SPEED_MAX)
        const radius = yield* Random.nextBetween(
          BALL_RADIUS_MIN,
          BALL_RADIUS_MAX,
        )
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
      })
  },
})

const advanceBall =
  (deltaSeconds: number) =>
  (ball: typeof Ball.Type): typeof Ball.Type => {
    const nextX = ball.x + ball.vx * deltaSeconds
    const nextY = ball.y + ball.vy * deltaSeconds
    const minX = ball.radius
    const maxX = CANVAS_WIDTH - ball.radius
    const minY = ball.radius
    const maxY = CANVAS_HEIGHT - ball.radius
    const bouncedX = nextX < minX || nextX > maxX
    const bouncedY = nextY < minY || nextY > maxY
    return modifyFields(ball, {
      x: () => Math.max(minX, Math.min(maxX, nextX)),
      y: () => Math.max(minY, Math.min(maxY, nextY)),
      vx: vx => (bouncedX ? -vx : vx),
      vy: vy => (bouncedY ? -vy : vy),
    })
  }

export const update = ApplicationComposition.makeUpdate({
  TickedFrame: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ deltaTime }) => ({
      balls: Array.map(advanceBall(deltaTime / MS_PER_SECOND)),
    }),
  ),

  ClickedCanvas: ApplicationDefinition.makeCommandsStep.fromMessage(
    ({ x, y }) => [GenerateBall({ x, y })],
  ),

  CompletedGenerateBall: ApplicationDefinition.makeFieldsStep(
    (model, { x, y, vx, vy, radius, color }) => ({
      balls: Array.append({
        id: model.nextId,
        x,
        y,
        vx,
        vy,
        radius,
        color,
      }),
      nextId: Number.increment,
    }),
  ),

  ClickedClear: ApplicationDefinition.makeFieldsStep(() => ({
    balls: () => [],
  })),

  ClickedTogglePlay: ApplicationDefinition.makeFieldsStep(() => ({
    isRunning: running => !running,
  })),
})

export const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
  animationFrameTicks: entry(
    'AnimationFrameTicks',
    { isActive: Schema.Boolean },
    {
      messages: [Message.TickedFrame],
      modelToDependencies: model => ({ isActive: model.isRunning }),
      handler: function* () {
        return ({ isActive }) =>
          isActive
            ? Dom.animationFrameTicks.pipe(
                Stream.map(deltaTime => Message.TickedFrame({ deltaTime })),
              )
            : Stream.empty
      },
    },
  ),
}))

export const EffectsLayer = Layer.mergeAll(
  GenerateBall.layer,
  subscriptions.layer,
)

const backgroundShape = Canvas.Rect({
  x: 0,
  y: 0,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  fill: '#0a0a0f',
})

const ballShape = (ball: typeof Ball.Type): Canvas.Shape =>
  Canvas.Circle({
    x: ball.x,
    y: ball.y,
    radius: ball.radius,
    fill: ball.color,
  })

const sceneShapes = (model: typeof Model.Type): ReadonlyArray<Canvas.Shape> => [
  backgroundShape,
  ...Array.map(model.balls, ballShape),
]

const controlsView = (
  model: typeof Model.Type,
  h: ApplicationViewBuilder,
): Html =>
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

export const view = ApplicationComposition.makeView((model, h) => ({
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
}))

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
