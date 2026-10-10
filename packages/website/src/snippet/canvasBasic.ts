import { Effect, Schema, Stream } from 'effect'
import { Canvas, Subscription } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

const subscriptions = Subscription.make<Model, Message>()(entry => ({
  animationFrameTicks: entry(
    'AnimationFrameTicks',
    { isActive: Schema.Boolean },
    {
      messages: [TickedFrame],
      modelToDependencies: model => ({ isActive: model.isPlaying }),
      handler: function* () {
        return ({ isActive }) =>
          isActive
            ? Subscription.animationFrameStream.pipe(
                Stream.map(deltaTime => TickedFrame({ deltaTime })),
              )
            : Stream.empty
      },
    },
  ),
}))

const view = (model: Model, h: HtmlBuilder<Message>): Html =>
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
      onPointerDown: ({ x, y }) => ClickedCanvas({ x, y }),
    },
    h,
  )
