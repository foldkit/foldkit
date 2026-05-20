import { Canvas, Subscription } from 'foldkit'

const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  frame: Subscription.animationFrame({
    isActive: model => model.isPlaying,
    toMessage: deltaTime => TickedFrame({ deltaTime }),
  }),
}))

const view = (model: Model): Html =>
  Canvas.view<Message>({
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
  })
