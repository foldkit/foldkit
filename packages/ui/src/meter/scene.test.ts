import { type Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { type ViewConfig, view } from './index.js'

const Message = defineMessageUnion({
  Ignored: {},
})
type Message = typeof Message.Type

type Model = Readonly<Record<string, never>>

const update = (model: Model): Update.Return<Model, Message> => ({ model })

type TestConfig = Partial<Omit<ViewConfig<Message>, 'id' | 'toView'>>

const testView =
  (config: TestConfig = {}) =>
  (_model: Model, h: HtmlBuilder<Message>) =>
    view(
      {
        id: 'test',
        value: 25,
        ...config,
        toView: ({ meter, label, fill }) =>
          h.div(
            [...meter],
            [
              h.span([...label], ['Storage']),
              h.div([...fill, h.Id('test-fill')]),
            ],
          ),
      },
      h,
    )

const meter = Scene.role('meter')
const fill = Scene.selector('#test-fill')

describe('Meter view', () => {
  it('renders the value against the default range', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({}),
      Scene.expect(meter).toHaveAttr('aria-valuemin', '0'),
      Scene.expect(meter).toHaveAttr('aria-valuemax', '100'),
      Scene.expect(meter).toHaveAttr('aria-valuenow', '25'),
      Scene.expect(meter).toHaveAttr('data-value', '25'),
      Scene.expect(meter).toHaveAttr('data-min', '0'),
      Scene.expect(meter).toHaveAttr('data-max', '100'),
      Scene.expect(fill).toHaveStyle('width', '25%'),
    )
  })

  it.each([
    { value: -5, expectedValue: '0', expectedWidth: '0%' },
    { value: 125, expectedValue: '100', expectedWidth: '100%' },
  ])(
    'clamps $value before rendering ARIA and fill attributes',
    ({ value, expectedValue, expectedWidth }) => {
      Scene.scene(
        { update, view: testView({ value }) },
        Scene.given({}),
        Scene.expect(meter).toHaveAttr('aria-valuenow', expectedValue),
        Scene.expect(meter).toHaveAttr('data-value', expectedValue),
        Scene.expect(fill).toHaveAttr('data-value', expectedValue),
        Scene.expect(fill).toHaveStyle('width', expectedWidth),
      )
    },
  )

  it('normalizes max to min when the configured range is inverted', () => {
    Scene.scene(
      { update, view: testView({ value: 5, min: 10, max: 0 }) },
      Scene.given({}),
      Scene.expect(meter).toHaveAttr('aria-valuemin', '10'),
      Scene.expect(meter).toHaveAttr('aria-valuemax', '10'),
      Scene.expect(meter).toHaveAttr('aria-valuenow', '10'),
      Scene.expect(fill).toHaveStyle('width', '0%'),
    )
  })

  it('exposes configured thresholds without adding progress state', () => {
    Scene.scene(
      {
        update,
        view: testView({ low: 20, high: 80, optimum: 60 }),
      },
      Scene.given({}),
      Scene.expect(meter).toHaveAttr('data-low', '20'),
      Scene.expect(meter).toHaveAttr('data-high', '80'),
      Scene.expect(meter).toHaveAttr('data-optimum', '60'),
      Scene.expect(meter).not.toHaveAttr('data-state'),
      Scene.expect(fill).not.toHaveAttr('data-state'),
    )
  })

  it('falls back to the rendered label for its accessible name', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({}),
      Scene.expect(meter).toHaveAttr('aria-labelledby', 'test-label'),
      Scene.expect(Scene.selector('#test-label')).toHaveText('Storage'),
    )
  })

  it('uses an explicit ariaLabel before ariaLabelledBy', () => {
    Scene.scene(
      {
        update,
        view: testView({
          ariaLabel: 'Disk usage',
          ariaLabelledBy: 'external-label',
        }),
      },
      Scene.given({}),
      Scene.expect(meter).toHaveAttr('aria-label', 'Disk usage'),
      Scene.expect(meter).not.toHaveAttr('aria-labelledby'),
    )
  })

  it('uses an explicit ariaLabelledBy when provided', () => {
    Scene.scene(
      { update, view: testView({ ariaLabelledBy: 'external-label' }) },
      Scene.given({}),
      Scene.expect(meter).toHaveAttr('aria-labelledby', 'external-label'),
    )
  })

  it.each([
    {
      source: 'string',
      valueText: '25 of 100',
      expectedValueText: '25 of 100',
    },
    {
      source: 'formatter',
      valueText: (value: number, max: number) => `${value} of ${max}`,
      expectedValueText: '25 of 100',
    },
  ])(
    'renders aria-valuetext from the configured $source',
    ({ valueText, expectedValueText }) => {
      Scene.scene(
        { update, view: testView({ valueText }) },
        Scene.given({}),
        Scene.expect(meter).toHaveAttr('aria-valuetext', expectedValueText),
      )
    },
  )
})
