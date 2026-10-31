import { Effect, Number, Schema, Stream } from 'effect'
import { Block, Canvas, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const ROTATION_RADIANS_PER_MILLISECOND = 0.002

const Message = defineMessageUnion({
  TickedFrame: { deltaTime: Schema.Number },
  ClickedCanvas: { x: Schema.Number, y: Schema.Number },
})

export class CanvasApp extends Block<CanvasApp>()('CanvasApp', {
  Model: Schema.Struct({ isPlaying: Schema.Boolean, angle: Schema.Number }),
  Message,
}) {}

const frameTicks = (isPlaying: boolean) =>
  isPlaying
    ? Dom.animationFrameTicks.pipe(
        Stream.map(deltaTime => Message.TickedFrame({ deltaTime })),
      )
    : Stream.empty

export const CanvasAppLive = CanvasApp.make(
  Effect.fn(function* () {
    return {
      model: { isPlaying: true, angle: 0 },

      update: {
        TickedFrame: (model, { deltaTime }) => ({
          model: modifyFields(model, {
            angle: Number.sum(deltaTime * ROTATION_RADIANS_PER_MILLISECOND),
          }),
        }),
        ClickedCanvas: model => ({
          model: modifyFields(model, { isPlaying: isPlaying => !isPlaying }),
        }),
      },

      subscriptions: {
        animationFrameTicks: {
          dependencies: model => model.isPlaying,
          stream: frameTicks,
        },
      },

      view: (model, h) =>
        Canvas.view(
          {
            width: 600,
            height: 400,
            shapes: [
              Canvas.Rect({
                x: 0,
                y: 0,
                width: 600,
                height: 400,
                fill: '#0a0a0f',
              }),
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
    }
  }),
)
