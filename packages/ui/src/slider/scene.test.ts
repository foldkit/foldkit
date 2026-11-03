import { Array, Effect } from 'effect'
import { inertHtml as ih } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { it as baseIt } from 'vitest'

import { describe, makeMethods } from '@effect/vitest'

import type { SliderAttributes, ViewInputs } from './slider.js'
import { Message, SliderBlock, layer } from './slider.js'

const testToView = (attributes: SliderAttributes) =>
  ih.div(
    [...attributes.root],
    [
      ih.label([...attributes.label], ['Test']),
      ih.div([...attributes.track], [ih.div([...attributes.filledTrack])]),
      ih.div([...attributes.thumb]),
      ...(Array.isReadonlyArrayNonEmpty(attributes.hiddenInput)
        ? [ih.input(attributes.hiddenInput)]
        : []),
    ],
  )

const sceneViewInputs = (overrides: Partial<ViewInputs> = {}): ViewInputs => ({
  value: 5,
  toView: testToView,
  ...overrides,
})

const makeFixture = ({
  init,
  update,
  view,
}: Story.TestBlock<typeof SliderBlock>) => {
  const sceneView = Scene.withViewInputs(view, {
    value: 5,
    toView: testToView,
  })

  const defaultModel = init({
    id: 'test',
    min: 0,
    max: 10,
    step: 1,
  }).model

  return { update, sceneView, defaultModel }
}
const it = makeMethods(
  baseIt.extend<{ slider: ReturnType<typeof makeFixture> }>({
    slider: async ({}, use) =>
      Effect.runPromise(
        Story.withBlock(SliderBlock, slider =>
          Effect.promise(() => use(makeFixture(slider))),
        ).pipe(Effect.provide(layer)),
      ),
  }),
)

const root = Scene.selector('[data-slider-id="test"]')
const track = Scene.selector('[data-slider-track-id="test"]')
const filledTrack = Scene.selector('[data-slider-track-id="test"] div')
const thumb = Scene.role('slider')
const hiddenInput = Scene.selector('[type="hidden"]')

describe('Slider', () => {
  describe('rendering', () => {
    it.effect('renders the root with data-slider-id and data-orientation', () =>
      Scene.scene(
        { block: SliderBlock, viewInputs: sceneViewInputs() },
        Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Scene.expect(root).toExist(),
        Scene.expect(root).toHaveAttr('data-orientation', 'horizontal'),
      ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'renders the track with the data-slider-track-id selector the pointer subscription relies on',
      () =>
        Scene.scene(
          { block: SliderBlock, viewInputs: sceneViewInputs() },
          Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
          Scene.expect(track).toExist(),
        ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'renders the thumb with role=slider and aria value / orientation attributes',
      () =>
        Scene.scene(
          { block: SliderBlock, viewInputs: sceneViewInputs() },
          Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
          Scene.expect(thumb).toExist(),
          Scene.expect(thumb).toHaveAttr('aria-valuemin', '0'),
          Scene.expect(thumb).toHaveAttr('aria-valuemax', '10'),
          Scene.expect(thumb).toHaveAttr('aria-valuenow', '5'),
          Scene.expect(thumb).toHaveAttr('aria-orientation', 'horizontal'),
        ).pipe(Effect.provide(layer)),
    )
  })

  describe('thumb labeling', () => {
    it.effect('falls back to aria-labelledby pointing at the label id', () =>
      Scene.scene(
        { block: SliderBlock, viewInputs: sceneViewInputs() },
        Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Scene.expect(thumb).toHaveAttr('aria-labelledby', 'test-label'),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('uses explicit ariaLabel when provided', () =>
      Scene.scene(
        {
          block: SliderBlock,
          viewInputs: sceneViewInputs({ ariaLabel: 'Volume' }),
        },
        Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Scene.expect(thumb).toHaveAttr('aria-label', 'Volume'),
        Scene.expect(thumb).not.toHaveAttr('aria-labelledby'),
      ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'uses explicit ariaLabelledBy when provided, overriding the default',
      () =>
        Scene.scene(
          {
            block: SliderBlock,
            viewInputs: sceneViewInputs({ ariaLabelledBy: 'external-label' }),
          },
          Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
          Scene.expect(thumb).toHaveAttr('aria-labelledby', 'external-label'),
        ).pipe(Effect.provide(layer)),
    )
  })

  describe('aria-valuetext', () => {
    it.effect('is absent by default', () =>
      Scene.scene(
        { block: SliderBlock, viewInputs: sceneViewInputs() },
        Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Scene.expect(thumb).not.toHaveAttr('aria-valuetext'),
      ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'announces the formatted string when formatValue is provided',
      () =>
        Scene.scene(
          {
            block: SliderBlock,
            viewInputs: sceneViewInputs({
              formatValue: value => `${value} of 10`,
            }),
          },
          Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
          Scene.expect(thumb).toHaveAttr('aria-valuetext', '5 of 10'),
        ).pipe(Effect.provide(layer)),
    )
  })

  describe('state attributes', () => {
    it('marks the root, track, and thumb with data-dragging while Dragging', ({
      slider: { update, defaultModel, sceneView },
    }) => {
      const dragStart = update(
        defaultModel,
        Message.PressedThumb({ originValue: 5 }),
      )
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(dragStart.model),
        Scene.expect(root).toHaveAttr('data-dragging', ''),
        Scene.expect(track).toHaveAttr('data-dragging', ''),
        Scene.expect(thumb).toHaveAttr('data-dragging', ''),
      )
    })

    it.effect('marks disabled with aria-disabled and data-disabled', () =>
      Scene.scene(
        {
          block: SliderBlock,
          viewInputs: sceneViewInputs({ isDisabled: true }),
        },
        Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Scene.expect(root).toHaveAttr('data-disabled', ''),
        Scene.expect(thumb).toHaveAttr('aria-disabled', 'true'),
        Scene.expect(thumb).toHaveAttr('data-disabled', ''),
      ).pipe(Effect.provide(layer)),
    )
  })

  describe('read-only', () => {
    it.effect(
      'marks the root, track, and thumb with data-readonly and the thumb with aria-readonly',
      () =>
        Scene.scene(
          {
            block: SliderBlock,
            viewInputs: sceneViewInputs({ isReadOnly: true }),
          },
          Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
          Scene.expect(root).toHaveAttr('data-readonly', ''),
          Scene.expect(track).toHaveAttr('data-readonly', ''),
          Scene.expect(thumb).toHaveAttr('data-readonly', ''),
          Scene.expect(thumb).toHaveAttr('aria-readonly', 'true'),
          Scene.expect(thumb).not.toHaveAttr('aria-disabled'),
          Scene.expect(thumb).not.toHaveAttr('data-disabled'),
        ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'emits both attribute sets when disabled and read-only are combined',
      () =>
        Scene.scene(
          {
            block: SliderBlock,
            viewInputs: sceneViewInputs({ isDisabled: true, isReadOnly: true }),
          },
          Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
          Scene.expect(thumb).toHaveAttr('aria-disabled', 'true'),
          Scene.expect(thumb).toHaveAttr('data-disabled', ''),
          Scene.expect(thumb).toHaveAttr('aria-readonly', 'true'),
          Scene.expect(thumb).toHaveAttr('data-readonly', ''),
        ).pipe(Effect.provide(layer)),
    )

    it.effect('drops the track and thumb pointer handlers when read-only', () =>
      Scene.scene(
        {
          block: SliderBlock,
          viewInputs: sceneViewInputs({ isReadOnly: true }),
        },
        Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Scene.expect(track).not.toHaveHandler('pointerdown'),
        Scene.expect(thumb).not.toHaveHandler('pointerdown'),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('drops the keyboard handler when read-only', () =>
      Scene.scene(
        {
          block: SliderBlock,
          viewInputs: sceneViewInputs({ isReadOnly: true }),
        },
        Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Scene.expect(thumb).not.toHaveHandler('keydown'),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('keeps the thumb focusable when read-only', () =>
      Scene.scene(
        {
          block: SliderBlock,
          viewInputs: sceneViewInputs({ isReadOnly: true }),
        },
        Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Scene.expect(thumb).toHaveAttr('tabIndex', '0'),
      ).pipe(Effect.provide(layer)),
    )
  })

  describe('vertical Slider geometry', () => {
    it.effect.each([
      { value: 0, bottom: '0%' },
      { value: 5, bottom: '50%' },
      { value: 10, bottom: '100%' },
    ])('positions the centered thumb at value $value', ({ value, bottom }) =>
      Scene.scene(
        {
          block: SliderBlock,
          viewInputs: sceneViewInputs({ orientation: 'Vertical', value }),
        },
        Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Scene.expect(thumb).toHaveStyle('bottom', bottom),
        Scene.expect(thumb).toHaveStyle('left', '50%'),
        Scene.expect(thumb).toHaveStyle(
          'transform',
          'translateX(-50%) translateY(50%)',
        ),
      ).pipe(Effect.provide(layer)),
    )

    it.effect.each([
      { value: 0, bottom: 'calc((100% - 0.75rem) * 0)' },
      { value: 5, bottom: 'calc((100% - 0.75rem) * 0.5)' },
      { value: 10, bottom: 'calc((100% - 0.75rem) * 1)' },
    ])(
      'positions the edge-aligned thumb at value $value',
      ({ value, bottom }) =>
        Scene.scene(
          {
            block: SliderBlock,
            viewInputs: sceneViewInputs({
              orientation: 'Vertical',
              thumbAlignment: 'Edge',
              value,
            }),
          },
          Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
          Scene.expect(thumb).toHaveStyle('bottom', bottom),
          Scene.expect(thumb).toHaveStyle('transform', 'translateX(-50%)'),
        ).pipe(Effect.provide(layer)),
    )

    it.effect('uses thumbSize to position the edge-aligned thumb', () =>
      Scene.scene(
        {
          block: SliderBlock,
          viewInputs: sceneViewInputs({
            orientation: 'Vertical',
            thumbAlignment: 'Edge',
            thumbSize: '1rem',
            value: 5,
          }),
        },
        Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Scene.expect(thumb).toHaveStyle('bottom', 'calc((100% - 1rem) * 0.5)'),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('sizes the edge-aligned fill to the thumb center', () =>
      Scene.scene(
        {
          block: SliderBlock,
          viewInputs: sceneViewInputs({
            orientation: 'Vertical',
            thumbAlignment: 'Edge',
            value: 5,
          }),
        },
        Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Scene.expect(filledTrack).toHaveStyle(
          'height',
          'calc((100% - 0.75rem) * 0.5 + 0.75rem / 2)',
        ),
      ).pipe(Effect.provide(layer)),
    )
  })

  describe('thumb alignment attributes', () => {
    it.effect(
      'marks the track with data-thumb-alignment="center" by default',
      () =>
        Scene.scene(
          { block: SliderBlock, viewInputs: sceneViewInputs() },
          Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
          Scene.expect(track).toHaveAttr('data-thumb-alignment', 'center'),
        ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'marks the track with data-thumb-alignment="edge" for pointer mapping',
      () =>
        Scene.scene(
          {
            block: SliderBlock,
            viewInputs: sceneViewInputs({ thumbAlignment: 'Edge' }),
          },
          Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
          Scene.expect(track).toHaveAttr('data-thumb-alignment', 'edge'),
        ).pipe(Effect.provide(layer)),
    )
  })

  describe('hidden input', () => {
    it.effect('is absent when no name is provided', () =>
      Scene.scene(
        { block: SliderBlock, viewInputs: sceneViewInputs() },
        Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Scene.expect(hiddenInput).toBeAbsent(),
      ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'renders with the name and current value when name is provided',
      () =>
        Scene.scene(
          {
            block: SliderBlock,
            viewInputs: sceneViewInputs({ name: 'volume' }),
          },
          Scene.init({ id: 'test', min: 0, max: 10, step: 1 }),
          Scene.expect(hiddenInput).toExist(),
          Scene.expect(hiddenInput).toHaveAttr('name', 'volume'),
          Scene.expect(hiddenInput).toHaveAttr('value', '5'),
        ).pipe(Effect.provide(layer)),
    )
  })
})
