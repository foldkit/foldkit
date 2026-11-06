import { Scene } from 'foldkit'

import { CanvasBlock, Message, ObserveCanvas, layer } from './canvas'

export const resizeCanvas = Scene.scene(
  { block: CanvasBlock, layer },
  Scene.init(),
  Scene.Mount.resolve(
    ObserveCanvas,
    Message.MeasuredCanvas({ width: 640, height: 480 }),
  ),
  Scene.Mount.emit(
    ObserveCanvas,
    Message.MeasuredCanvas({ width: 960, height: 720 }),
  ),
  Scene.Mount.emit(
    ObserveCanvas,
    Message.MeasuredCanvas({ width: 1280, height: 720 }),
  ),
  Scene.Mount.expectNone(),
)
