import type { Effect } from 'effect'
import type * as Scene from 'foldkit/scene'

import {
  type Message,
  ObserveHostSurface,
  ObserveSurface,
  emitDefinition,
  emitHostDefinition,
  emitInstance,
  runSurfaceScene,
} from './scene-mount-stream.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type DefinitionMessage = Expect<
  Equal<
    Scene.StreamMountMessage<typeof ObserveSurface>,
    Extract<Message, { _tag: 'MeasuredSurface' }>
  >
>
export type InstanceMessage = Expect<
  Equal<
    Scene.StreamMountMessage<ReturnType<typeof ObserveSurface>>,
    Extract<Message, { _tag: 'MeasuredSurface' }>
  >
>
export type HostMessage = Expect<
  Equal<
    Scene.StreamMountMessage<typeof ObserveHostSurface>,
    Extract<Message, { _tag: 'MeasuredSurface' }>
  >
>
export type NoHandlerRequirement = Expect<
  Equal<Effect.Services<ReturnType<typeof runSurfaceScene>>, never>
>
export const reusableSteps = [emitDefinition, emitInstance, emitHostDefinition]
export const runEmittedScene = runSurfaceScene
