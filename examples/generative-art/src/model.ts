import { Schema as S } from 'effect'
import { Ui } from 'foldkit'

export const Point = S.Struct({ x: S.Number, y: S.Number })
export type Point = typeof Point.Type

export const Particle = S.Struct({
  id: S.Number,
  trail: S.Array(Point),
  baseHue: S.Number,
  hueDriftPerSecond: S.Number,
  ageMs: S.Number,
  lifespanMs: S.Number,
  speed: S.Number,
  bornAtSeconds: S.Number,
  initialAngle: S.Option(S.Number),
  initialSpeedScale: S.Number,
})
export type Particle = typeof Particle.Type

export const Model = S.Struct({
  particles: S.Array(Particle),
  nextId: S.Number,
  elapsedSeconds: S.Number,
  maybeMousePosition: S.Option(Point),
  isRunning: S.Boolean,
  flowStrengthSlider: Ui.Slider.Model,
  noiseScaleSlider: Ui.Slider.Model,
})
export type Model = typeof Model.Type
