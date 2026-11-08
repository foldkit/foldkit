import { Canvas } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import heroSheetUrl from './hero-sheet.png'

const FRAME_SIZE = 16
const PIXEL_SCALE = 4

const heroShape = (hero: Hero): Canvas.Shape =>
  Canvas.Image({
    src: heroSheetUrl,
    x: hero.x,
    y: hero.y,
    width: FRAME_SIZE * PIXEL_SCALE,
    height: FRAME_SIZE * PIXEL_SCALE,
    crop: {
      x: hero.frameIndex * FRAME_SIZE,
      y: 0,
      width: FRAME_SIZE,
      height: FRAME_SIZE,
    },
    rendering: 'Pixelated',
  })

const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Canvas.view(
    {
      width: 640,
      height: 360,
      shapes: [
        Canvas.Rect({ x: 0, y: 0, width: 640, height: 360, fill: '#1b1b2f' }),
        heroShape(model.hero),
      ],
    },
    h,
  )
