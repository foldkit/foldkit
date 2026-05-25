import { Array, Option, pipe } from 'effect'
import { Canvas, Ui } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'

import {
  BACKGROUND_COLOR_TOP,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CORE_ALPHA_BASE,
  CORE_LIGHTNESS_PERCENT,
  CORE_LINE_WIDTH,
  FADE_IN_MS,
  FADE_OUT_MS,
  GLOW_ALPHA_BASE,
  GLOW_LIGHTNESS_PERCENT,
  GLOW_LINE_WIDTH,
  HEAD_ALPHA,
  HEAD_LIGHTNESS_PERCENT,
  HEAD_RADIUS,
  HUE_MAX,
  MOUSE_INFLUENCE_RADIUS,
  SATURATION_PERCENT,
  TWO_PI,
  VIGNETTE_ALPHA,
} from './constant'
import {
  ClickedReset,
  ClickedTogglePlay,
  GotFlowStrengthSliderMessage,
  GotNoiseScaleSliderMessage,
  Message,
  MovedPointer,
  PressedCanvas,
} from './message'
import type { Model, Particle, Point } from './model'

const fadeAlpha = (particle: Particle): number => {
  const remainingMs = particle.lifespanMs - particle.ageMs
  const fadeIn = Math.min(1, particle.ageMs / FADE_IN_MS)
  const fadeOut = Math.min(1, remainingMs / FADE_OUT_MS)
  return Math.max(0, Math.min(fadeIn, fadeOut))
}

const currentHue = (particle: Particle, elapsedSeconds: number): number => {
  const drift =
    particle.hueDriftPerSecond * (elapsedSeconds - particle.bornAtSeconds)
  const raw = particle.baseHue + drift
  return ((raw % HUE_MAX) + HUE_MAX) % HUE_MAX
}

const trailToInstructions = (
  trail: ReadonlyArray<Point>,
): ReadonlyArray<Canvas.PathInstruction> =>
  Array.matchLeft(trail, {
    onEmpty: () => [],
    onNonEmpty: (head, tail) => [
      Canvas.MoveTo({ x: head.x, y: head.y }),
      ...Array.map(tail, segment =>
        Canvas.LineTo({ x: segment.x, y: segment.y }),
      ),
    ],
  })

const ALPHA_VISIBILITY_EPSILON = 0.01

const particleShapes = (
  particle: Particle,
  elapsedSeconds: number,
): ReadonlyArray<Canvas.Shape> => {
  if (particle.trail.length < 2) {
    return []
  }
  const fade = fadeAlpha(particle)
  if (fade < ALPHA_VISIBILITY_EPSILON) {
    return []
  }
  const instructions = trailToInstructions(particle.trail)
  const hue = currentHue(particle, elapsedSeconds)
  const glowColor = `hsla(${hue}, ${SATURATION_PERCENT}%, ${GLOW_LIGHTNESS_PERCENT}%, ${
    GLOW_ALPHA_BASE * fade
  })`
  const coreColor = `hsla(${hue}, ${SATURATION_PERCENT}%, ${CORE_LIGHTNESS_PERCENT}%, ${
    CORE_ALPHA_BASE * fade
  })`
  return [
    Canvas.Path({
      instructions,
      stroke: glowColor,
      lineWidth: GLOW_LINE_WIDTH,
      lineCap: 'Round',
      lineJoin: 'Round',
    }),
    Canvas.Path({
      instructions,
      stroke: coreColor,
      lineWidth: CORE_LINE_WIDTH,
      lineCap: 'Round',
      lineJoin: 'Round',
    }),
  ]
}

const NEBULA_GLOW_COUNT = 3
const NEBULA_GLOW_RADIUS = 280
const NEBULA_DRIFT_SPEEDS = [0.11, 0.07, 0.13]
const NEBULA_OFFSETS_X = [0.3, 0.72, 0.52]
const NEBULA_OFFSETS_Y = [0.4, 0.62, 0.28]
const NEBULA_DRIFT_AMPLITUDES_X = [80, 100, 60]
const NEBULA_DRIFT_AMPLITUDES_Y = [50, 60, 80]
const NEBULA_COLORS: ReadonlyArray<string> = [
  'rgba(120, 35, 200, 0.18)',
  'rgba(28, 90, 200, 0.16)',
  'rgba(220, 30, 140, 0.13)',
]
const NEBULA_FALLBACK_COLOR = 'rgba(80, 40, 120, 0.12)'

const nebulaGlowAt = (index: number, elapsedSeconds: number): Canvas.Shape => {
  const fallbackZero = 0
  const fallbackHalf = 0.5
  const driftSpeed = pipe(
    NEBULA_DRIFT_SPEEDS,
    Array.get(index),
    Option.getOrElse(() => fallbackZero),
  )
  const offsetX = pipe(
    NEBULA_OFFSETS_X,
    Array.get(index),
    Option.getOrElse(() => fallbackHalf),
  )
  const offsetY = pipe(
    NEBULA_OFFSETS_Y,
    Array.get(index),
    Option.getOrElse(() => fallbackHalf),
  )
  const amplitudeX = pipe(
    NEBULA_DRIFT_AMPLITUDES_X,
    Array.get(index),
    Option.getOrElse(() => fallbackZero),
  )
  const amplitudeY = pipe(
    NEBULA_DRIFT_AMPLITUDES_Y,
    Array.get(index),
    Option.getOrElse(() => fallbackZero),
  )
  const color = pipe(
    NEBULA_COLORS,
    Array.get(index),
    Option.getOrElse(() => NEBULA_FALLBACK_COLOR),
  )
  const phase = (index / NEBULA_GLOW_COUNT) * TWO_PI
  return Canvas.Circle({
    x:
      CANVAS_WIDTH * offsetX +
      Math.sin(elapsedSeconds * driftSpeed + phase) * amplitudeX,
    y:
      CANVAS_HEIGHT * offsetY +
      Math.cos(elapsedSeconds * driftSpeed + phase) * amplitudeY,
    radius: NEBULA_GLOW_RADIUS,
    fill: color,
  })
}

const nebulaShapes = (elapsedSeconds: number): ReadonlyArray<Canvas.Shape> =>
  Array.makeBy(NEBULA_GLOW_COUNT, index => nebulaGlowAt(index, elapsedSeconds))

const backgroundShape = Canvas.Rect({
  x: 0,
  y: 0,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  fill: BACKGROUND_COLOR_TOP,
})

const VIGNETTE_INSET = 1
const VIGNETTE_STRIP_WIDTH = 80
const VIGNETTE_STEPS = 4
const VIGNETTE_ALPHA_PER_STEP = VIGNETTE_ALPHA / VIGNETTE_STEPS

const vignetteStrips: ReadonlyArray<Canvas.Shape> = Array.flatMap(
  Array.makeBy(VIGNETTE_STEPS, step => step),
  step => {
    const stripWidth = VIGNETTE_STRIP_WIDTH * (1 - step / VIGNETTE_STEPS)
    if (stripWidth <= VIGNETTE_INSET) {
      return []
    }
    const fill = `rgba(2, 1, 8, ${VIGNETTE_ALPHA_PER_STEP})`
    return [
      Canvas.Rect({
        x: 0,
        y: 0,
        width: CANVAS_WIDTH,
        height: stripWidth,
        fill,
      }),
      Canvas.Rect({
        x: 0,
        y: CANVAS_HEIGHT - stripWidth,
        width: CANVAS_WIDTH,
        height: stripWidth,
        fill,
      }),
      Canvas.Rect({
        x: 0,
        y: 0,
        width: stripWidth,
        height: CANVAS_HEIGHT,
        fill,
      }),
      Canvas.Rect({
        x: CANVAS_WIDTH - stripWidth,
        y: 0,
        width: stripWidth,
        height: CANVAS_HEIGHT,
        fill,
      }),
    ]
  },
)

const particleHeadShape = (
  particle: Particle,
  elapsedSeconds: number,
): Option.Option<Canvas.Shape> =>
  Option.map(Array.last(particle.trail), head => {
    const hue = currentHue(particle, elapsedSeconds)
    const fade = fadeAlpha(particle)
    return Canvas.Circle({
      x: head.x,
      y: head.y,
      radius: HEAD_RADIUS,
      fill: `hsla(${hue}, ${SATURATION_PERCENT}%, ${HEAD_LIGHTNESS_PERCENT}%, ${
        HEAD_ALPHA * fade
      })`,
    })
  })

const mouseIndicator = (
  maybeMousePosition: Option.Option<Point>,
): ReadonlyArray<Canvas.Shape> =>
  Option.match(maybeMousePosition, {
    onNone: () => [],
    onSome: position => [
      Canvas.Circle({
        x: position.x,
        y: position.y,
        radius: MOUSE_INFLUENCE_RADIUS,
        fill: 'rgba(255, 255, 255, 0.04)',
      }),
    ],
  })

const sceneShapes = (model: Model): ReadonlyArray<Canvas.Shape> => [
  backgroundShape,
  ...nebulaShapes(model.elapsedSeconds),
  ...Array.flatMap(model.particles, particle =>
    particleShapes(particle, model.elapsedSeconds),
  ),
  ...Array.flatMap(model.particles, particle =>
    Option.toArray(particleHeadShape(particle, model.elapsedSeconds)),
  ),
  ...vignetteStrips,
  ...mouseIndicator(model.maybeMousePosition),
]

const buttonClass =
  'min-w-20 px-4 py-2 text-sm font-medium tracking-wide uppercase rounded-md ' +
  'border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 ' +
  'text-white/85 transition-colors duration-200'

const sliderRowClass = 'flex flex-col gap-2 min-w-44'

const sliderHeaderClass =
  'flex items-baseline justify-between text-xs uppercase tracking-widest text-white/60'

const sliderLabelClass = 'cursor-pointer select-none'

const sliderValueClass = 'text-white/40 tabular-nums'

const sliderRootClass =
  'relative h-5 w-full flex items-center select-none touch-none'

const sliderTrackClass =
  'h-5 w-full rounded-full bg-white/10 py-2 bg-clip-content cursor-pointer'

const sliderFilledTrackClass =
  'h-full rounded-full bg-fuchsia-400 py-2 bg-clip-content'

const sliderThumbClass =
  'h-3 w-3 rounded-full bg-white border border-fuchsia-400 shadow cursor-grab focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300 focus-visible:ring-offset-1 focus-visible:ring-offset-black/40 data-[dragging]:cursor-grabbing'

const playPauseLabel = (isRunning: boolean): string =>
  isRunning ? 'Pause' : 'Play'

const slider = (
  label: string,
  sliderModel: Ui.Slider.Model,
  toParentMessage: (message: Ui.Slider.Message) => Message,
): Html => {
  const h = html<Message>()

  return h.submodel({
    slotId: sliderModel.id,
    model: sliderModel,
    view: Ui.Slider.view,
    viewInputs: {
      formatValue: value => value.toFixed(2),
      toView: attributes =>
        h.div(
          [h.Class(sliderRowClass)],
          [
            h.div(
              [h.Class(sliderHeaderClass)],
              [
                h.label(
                  [...attributes.label, h.Class(sliderLabelClass)],
                  [label],
                ),
                h.span(
                  [h.Class(sliderValueClass)],
                  [sliderModel.value.toFixed(2)],
                ),
              ],
            ),
            h.div(
              [...attributes.root, h.Class(sliderRootClass)],
              [
                h.div(
                  [...attributes.track, h.Class(sliderTrackClass)],
                  [
                    h.div(
                      [
                        ...attributes.filledTrack,
                        h.Class(sliderFilledTrackClass),
                      ],
                      [],
                    ),
                  ],
                ),
                h.div([...attributes.thumb, h.Class(sliderThumbClass)], []),
              ],
            ),
          ],
        ),
    },
    toParentMessage,
  })
}

const controlButton = (label: string, onClick: Message): Html => {
  const h = html<Message>()
  return Ui.Button.view<Message>({
    onClick,
    toView: attributes =>
      h.button([...attributes.button, h.Class(buttonClass)], [label]),
  })
}

const controlsView = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'flex flex-wrap items-end gap-6 mt-6 px-6 py-4 rounded-xl ' +
          'bg-black/40 border border-white/10 backdrop-blur',
      ),
    ],
    [
      h.div(
        [h.Class('flex items-center gap-3')],
        [
          controlButton(playPauseLabel(model.isRunning), ClickedTogglePlay()),
          controlButton('Reset', ClickedReset()),
          h.span(
            [h.Class('text-xs uppercase tracking-widest text-white/40')],
            [
              h.span(
                [
                  h.Class(
                    'inline-block tabular-nums text-right min-w-8 tracking-normal',
                  ),
                ],
                [`${model.particles.length}`],
              ),
              ' particles',
            ],
          ),
        ],
      ),
      slider('Turbulence', model.flowStrengthSlider, message =>
        GotFlowStrengthSliderMessage({ message }),
      ),
      slider('Noise scale', model.noiseScaleSlider, message =>
        GotNoiseScaleSliderMessage({ message }),
      ),
    ],
  )
}

const headerView = (): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('flex flex-col items-center mb-6 text-center')],
    [
      h.h1(
        [
          h.Class(
            'text-3xl font-light tracking-[0.3em] uppercase ' +
              'bg-gradient-to-r from-fuchsia-300 via-cyan-200 to-amber-200 ' +
              'bg-clip-text text-transparent',
          ),
        ],
        ['Prism Field'],
      ),
      h.p(
        [h.Class('mt-2 text-xs tracking-widest text-white/40 uppercase')],
        ['Move to stir. Click to bloom.'],
      ),
    ],
  )
}

export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: `Prism Field · ${model.particles.length} particles`,
    body: h.div(
      [
        h.Class(
          'flex flex-col items-center justify-center min-h-screen p-8 ' +
            'bg-[radial-gradient(ellipse_at_top,_#1a0a2c_0%,_#04010a_55%,_#000_100%)] ' +
            'text-white font-mono select-none',
        ),
      ],
      [
        headerView(),
        Canvas.view<Message>({
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          shapes: sceneShapes(model),
          className:
            'rounded-2xl shadow-[0_0_120px_rgba(80,30,140,0.35)] ' +
            'border border-white/10 cursor-crosshair',
          onPointerDown: ({ x, y }) => PressedCanvas({ x, y }),
          onPointerMove: ({ x, y }) => MovedPointer({ x, y }),
        }),
        controlsView(model),
      ],
    ),
  }
}
