---
'foldkit': minor
---

Add `foldkit/canvas` subpath export for declarative 2D canvas rendering.

`Canvas.view` produces a `<canvas>` VNode whose pixel state is a pure function of a `shapes` prop. The canvas re-paints on every patch with the latest shapes, so time-travel through DevTools reproduces past frames exactly.

```ts
import { Canvas } from 'foldkit'

// In view:
Canvas.view<Message>({
  width: 600,
  height: 400,
  shapes: [
    Canvas.Rect({ x: 0, y: 0, width: 600, height: 400, fill: '#0a0a0f' }),
    Canvas.Circle({ x: 100, y: 100, radius: 25, fill: '#ff2d55' }),
    Canvas.Group({
      translate: { x: 300, y: 200 },
      rotate: model.angle,
      shapes: [
        Canvas.Path({
          instructions: [
            Canvas.MoveTo({ x: 0, y: 0 }),
            Canvas.LineTo({ x: 50, y: 0 }),
            Canvas.LineTo({ x: 25, y: 43 }),
            Canvas.Close(),
          ],
          fill: '#ffcc00',
        }),
      ],
    }),
    Canvas.Text({
      x: 10,
      y: 30,
      content: `Score: ${model.score}`,
      font: '24px sans-serif',
      fill: 'white',
    }),
  ],
  onPointerDown: ({ x, y }) => ClickedCanvas({ x, y }),
})
```

## Shapes

- `Canvas.Rect`: axis-aligned rectangle with `fill` / `stroke` / `lineWidth`.
- `Canvas.Circle`: filled or stroked circle.
- `Canvas.Path`: sequence of `MoveTo` / `LineTo` / `QuadTo` / `BezierTo` / `Close` instructions, with `lineCap` / `lineJoin`.
- `Canvas.Text`: single line of text with `font` / `align` / `baseline`.
- `Canvas.Group`: wraps children in a 2D transform (`translate`, `rotate`, `scale`, `opacity`); composes recursively.

`Canvas.Shape` is a discriminated union over the variants. Pattern-match with `Match.tagsExhaustive` if you need to inspect or transform shapes.

## Pointer events

`onPointerDown` / `onPointerMove` / `onPointerUp` are config args on `Canvas.view`. They receive a `Point` already translated to the canvas's internal coordinate space (independent of CSS sizing).

For continuous animation (physics simulations, generative scenes, time-based motion), pair `Canvas.view` with `Subscription.animationFrame`.

## Out of scope for this release

No imperative escape hatch (`DrawFrame((ctx) => ...)`-style Commands), no images / textures, no gradients, no patterns, no WebGL. The declarative path covers pixel art, board games, card games, 2D puzzlers, generative art, charts, and dataviz. The escape hatch is intentionally deferred until a real use case demands it; opting into imperative drawing breaks pixel-level time travel and that tradeoff should be made explicitly.
