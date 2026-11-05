import { it } from '@effect/vitest'

import * as Scene from '../scene/public.js'
import {
  MeasureSurface,
  ObserveSurface,
  ParentBlock,
  SurfaceMessage,
  initialModel,
  layer,
} from './apps/keyedMountOwner.js'

it.effect(
  'reacquires a stream when the selected persistent child changes',
  () =>
    Scene.scene(
      { block: ParentBlock, layer },
      Scene.given(initialModel(true)),
      Scene.Mount.resolve(
        ObserveSurface,
        SurfaceMessage.MeasuredSurface({ width: 100 }),
      ),
      Scene.click(Scene.text('second')),
      Scene.Mount.expectExact(ObserveSurface),
      Scene.Mount.expectEnded(ObserveSurface),
      Scene.Mount.resolve(
        ObserveSurface,
        SurfaceMessage.MeasuredSurface({ width: 200 }),
      ),
      Scene.expect(Scene.text('first:100,second:200')).toExist(),
      Scene.Mount.emit(
        ObserveSurface,
        SurfaceMessage.MeasuredSurface({ width: 240 }),
      ),
      Scene.Mount.expectNone(),
      Scene.expect(Scene.text('first:100,second:240')).toExist(),
    ),
)

it.effect(
  'reacquires a one-shot Mount only when the selected owner changes',
  () =>
    Scene.scene(
      { block: ParentBlock, layer },
      Scene.given(initialModel(false)),
      Scene.Mount.resolve(
        MeasureSurface,
        SurfaceMessage.MeasuredSurface({ width: 100 }),
      ),
      Scene.Mount.expectNone(),
      Scene.click(Scene.text('second')),
      Scene.Mount.expectExact(MeasureSurface),
      Scene.Mount.expectEnded(MeasureSurface),
      Scene.Mount.resolve(
        MeasureSurface,
        SurfaceMessage.MeasuredSurface({ width: 200 }),
      ),
      Scene.click(Scene.text('second')),
      Scene.Mount.expectNone(),
      Scene.expect(Scene.text('first:100,second:200')).toExist(),
    ),
)

it.effect(
  'preserves a nested acquisition through same-owner marker omission and restoration',
  () =>
    Scene.scene(
      { block: ParentBlock, layer },
      Scene.given(initialModel(true)),
      Scene.Mount.resolve(
        ObserveSurface,
        SurfaceMessage.MeasuredSurface({ width: 100 }),
      ),
      Scene.Mount.emit(
        ObserveSurface,
        SurfaceMessage.MeasuredSurface({ width: 600 }),
      ),
      Scene.Mount.expectNone(),
      Scene.expect(Scene.text('first:600,second:0')).toExist(),
      Scene.Mount.emit(
        ObserveSurface,
        SurfaceMessage.MeasuredSurface({ width: 240 }),
      ),
      Scene.Mount.expectNone(),
      Scene.Mount.emit(
        ObserveSurface,
        SurfaceMessage.MeasuredSurface({ width: 320 }),
      ),
      Scene.expect(Scene.text('first:320,second:0')).toExist(),
    ),
)
