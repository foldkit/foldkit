import * as Mount from 'foldkit/mount'
import * as Scene from 'foldkit/scene'

import {
  FocusSurface,
  Message,
  ObserveHostSurface,
  ObserveSurface,
} from './scene-mount-stream.accepted.js'

export const invalidPayload = Scene.Mount.emit(
  ObserveSurface,
  // @ts-expect-error stream payloads retain their declared field types
  { _tag: 'MeasuredSurface', width: 'wide' },
)
export const invalidMessage = Scene.Mount.emit(
  ObserveHostSurface,
  // @ts-expect-error a stream cannot emit another Mount's local Message
  Message.CompletedFocusSurface(),
)
export const invalidOneShot = Scene.Mount.emit(
  // @ts-expect-error one-shot Mounts must use resolve, not emit
  FocusSurface,
  Message.CompletedFocusSurface(),
)
export const invalidOneShotInstance = Scene.Mount.emit(
  // @ts-expect-error a one-shot action is not a continuous stream action
  FocusSurface(),
  Message.CompletedFocusSurface(),
)
export const invalidArgs = Scene.Mount.emit(
  // @ts-expect-error instance matching keeps the Definition's complete args
  ObserveSurface({ id: 42 }),
  Message.MeasuredSurface({ width: 240 }),
)
declare const erased: Mount.MountDefinition<string, typeof Message.Type>
export const invalidErasedStream = Scene.Mount.emit(
  // @ts-expect-error an erased Mount contract does not promise a stream
  erased,
  Message.MeasuredSurface({ width: 240 }),
)
