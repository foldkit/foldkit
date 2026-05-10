import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

const spawnedParticleFields = {
  x: S.Number,
  y: S.Number,
  baseHue: S.Number,
  hueDriftPerSecond: S.Number,
  lifespanMs: S.Number,
  speed: S.Number,
  initialAngle: S.Option(S.Number),
  initialSpeedScale: S.Number,
}

export const TickedFrame = m('TickedFrame', {
  deltaTimeMs: S.Number,
})
export const SpawnedAmbientParticle = m(
  'SpawnedAmbientParticle',
  spawnedParticleFields,
)
export const SpawnedBurstParticle = m(
  'SpawnedBurstParticle',
  spawnedParticleFields,
)
export const PressedCanvas = m('PressedCanvas', {
  x: S.Number,
  y: S.Number,
})
export const MovedPointer = m('MovedPointer', {
  x: S.Number,
  y: S.Number,
})
export const ClickedTogglePlay = m('ClickedTogglePlay')
export const ClickedReset = m('ClickedReset')
export const GotFlowStrengthSliderMessage = m('GotFlowStrengthSliderMessage', {
  message: Ui.Slider.Message,
})
export const GotNoiseScaleSliderMessage = m('GotNoiseScaleSliderMessage', {
  message: Ui.Slider.Message,
})

export const Message = S.Union([
  TickedFrame,
  SpawnedAmbientParticle,
  SpawnedBurstParticle,
  PressedCanvas,
  MovedPointer,
  ClickedTogglePlay,
  ClickedReset,
  GotFlowStrengthSliderMessage,
  GotNoiseScaleSliderMessage,
])
export type Message = typeof Message.Type
