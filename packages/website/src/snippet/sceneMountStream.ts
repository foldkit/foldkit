import * as Scene from 'foldkit/scene'

import { CanvasBlock, Message, ObserveCanvas } from './canvas'

export const resizeCanvas = Scene.scene(
  CanvasBlock,
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
