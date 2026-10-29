import { Schema, Stream } from 'effect'
import { Block, Canvas, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ isPlaying: Schema.Boolean, angle: Schema.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  TickedFrame: { deltaTime: Schema.Number },
  ClickedCanvas: { x: Schema.Number, y: Schema.Number },
})
type Message = typeof Message.Type

const CanvasAppDefinition = Block.makeDefinition('CanvasApp', {
  Model,
  Message,
})
const CanvasAppComposition = CanvasAppDefinition.makeComposition()

const subscriptions = CanvasAppDefinition.makeSubscriptions(entry => ({
  animationFrameTicks: entry(
    'AnimationFrameTicks',
    { isActive: Schema.Boolean },
    {
      messages: [Message.TickedFrame],
      modelToDependencies: model => ({ isActive: model.isPlaying }),
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

const view = CanvasAppComposition.makeView((model, h) =>
  Canvas.view(
    {
      width: 600,
      height: 400,
      shapes: [
        Canvas.Rect({ x: 0, y: 0, width: 600, height: 400, fill: '#0a0a0f' }),
        Canvas.Group({
          translate: { x: 300, y: 200 },
          rotate: model.angle,
          shapes: [
            Canvas.Circle({ x: 0, y: 0, radius: 50, fill: '#ff2d55' }),
            Canvas.Path({
              instructions: [
                Canvas.MoveTo({ x: -30, y: -30 }),
                Canvas.LineTo({ x: 30, y: -30 }),
                Canvas.LineTo({ x: 0, y: 30 }),
                Canvas.Close(),
              ],
              fill: '#ffcc00',
            }),
          ],
        }),
      ],
      onPointerDown: ({ x, y }) => Message.ClickedCanvas({ x, y }),
    },
    h,
  ),
)
