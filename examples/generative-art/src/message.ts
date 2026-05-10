import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

export const TickedFrame = m('TickedFrame', { deltaTimeMs: S.Number })

export const SpawnedParticle = m('SpawnedParticle', {
  x: S.Number,
  y: S.Number,
  baseHue: S.Number,
  hueDriftPerSecond: S.Number,
  lifespanMs: S.Number,
  speed: S.Number,
  initialAngle: S.Option(S.Number),
  initialSpeedScale: S.Number,
})

export const PressedCanvas = m('PressedCanvas', {
  x: S.Number,
  y: S.Number,
})
export const MovedPointer = m('MovedPointer', { x: S.Number, y: S.Number })

export const ClickedTogglePlay = m('ClickedTogglePlay')
export const ClickedReset = m('ClickedReset')
export const ChangedFlowStrength = m('ChangedFlowStrength', {
  value: S.Number,
})
export const ChangedNoiseScale = m('ChangedNoiseScale', { value: S.Number })

export const Message = S.Union([
  TickedFrame,
  SpawnedParticle,
  PressedCanvas,
  MovedPointer,
  ClickedTogglePlay,
  ClickedReset,
  ChangedFlowStrength,
  ChangedNoiseScale,
])
export type Message = typeof Message.Type
