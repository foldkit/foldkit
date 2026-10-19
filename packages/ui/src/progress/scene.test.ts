import { type Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { expect, vi } from 'vitest'

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
  (config: TestConfig = {}, isIndeterminate = false) =>
  (_model: Model, h: HtmlBuilder<Message>) =>
    view(
      {
        id: 'test',
        ...(isIndeterminate ? {} : { value: 25 }),
        ...config,
        toView: ({ progress, label, track, indicator }) =>
          h.div(
            [...progress],
            [
              h.span([...label], ['Upload']),
              h.div(
                [...track, h.Id('test-track')],
                [h.div([...indicator, h.Id('test-indicator')])],
              ),
            ],
          ),
      },
      h,
    )

const progress = Scene.role('progressbar')
const track = Scene.selector('#test-track')
const indicator = Scene.selector('#test-indicator')

describe('Progress view', () => {
  it('renders determinate progress against the default range', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({}),
      Scene.expect(progress).toHaveAttr('aria-valuemin', '0'),
      Scene.expect(progress).toHaveAttr('aria-valuemax', '100'),
      Scene.expect(progress).toHaveAttr('aria-valuenow', '25'),
      Scene.expect(progress).toHaveAttr('data-value', '25'),
      Scene.expect(progress).toHaveAttr('data-min', '0'),
      Scene.expect(progress).toHaveAttr('data-max', '100'),
      Scene.expect(progress).toHaveAttr('data-state', 'loading'),
      Scene.expect(track).toHaveAttr('data-state', 'loading'),
      Scene.expect(indicator).toHaveAttr('data-state', 'loading'),
      Scene.expect(indicator).toHaveAttr('data-min', '0'),
      Scene.expect(indicator).toHaveStyle('width', '25%'),
    )
  })

  it.each([
    {
      value: -5,
      expectedValue: '0',
      expectedWidth: '0%',
      expectedState: 'loading',
    },
    {
      value: 125,
      expectedValue: '100',
      expectedWidth: '100%',
      expectedState: 'complete',
    },
  ])(
    'clamps $value before rendering determinate state',
    ({ value, expectedValue, expectedWidth, expectedState }) => {
      Scene.scene(
        { update, view: testView({ value }) },
        Scene.given({}),
        Scene.expect(progress).toHaveAttr('aria-valuenow', expectedValue),
        Scene.expect(progress).toHaveAttr('data-state', expectedState),
        Scene.expect(indicator).toHaveAttr('data-value', expectedValue),
        Scene.expect(indicator).toHaveStyle('width', expectedWidth),
      )
    },
  )

  it('normalizes max to min when the configured range is inverted', () => {
    Scene.scene(
      { update, view: testView({ value: 5, min: 10, max: 0 }) },
      Scene.given({}),
      Scene.expect(progress).toHaveAttr('aria-valuemin', '10'),
      Scene.expect(progress).toHaveAttr('aria-valuemax', '10'),
      Scene.expect(progress).toHaveAttr('aria-valuenow', '10'),
      Scene.expect(indicator).toHaveStyle('width', '0%'),
    )
  })

  it('renders indeterminate progress without a numeric range', () => {
    Scene.scene(
      { update, view: testView({}, true) },
      Scene.given({}),
      Scene.expect(progress).not.toHaveAttr('aria-valuemin'),
      Scene.expect(progress).not.toHaveAttr('aria-valuemax'),
      Scene.expect(progress).not.toHaveAttr('aria-valuenow'),
      Scene.expect(progress).not.toHaveAttr('data-value'),
      Scene.expect(progress).toHaveAttr('data-state', 'indeterminate'),
      Scene.expect(progress).toHaveAttr('data-indeterminate', ''),
      Scene.expect(track).toHaveAttr('data-indeterminate', ''),
      Scene.expect(indicator).toHaveAttr('data-indeterminate', ''),
      Scene.expect(indicator).not.toHaveStyle('width'),
    )
  })

  it('does not call a numeric formatter for indeterminate progress', () => {
    const valueText = vi.fn((value: number) => `${value} percent`)

    Scene.scene(
      { update, view: testView({ valueText }, true) },
      Scene.given({}),
      Scene.expect(progress).not.toHaveAttr('aria-valuetext'),
    )

    expect(valueText).not.toHaveBeenCalled()
  })

  it('uses a string valueText for indeterminate progress', () => {
    Scene.scene(
      {
        update,
        view: testView({ valueText: 'Still loading' }, true),
      },
      Scene.given({}),
      Scene.expect(progress).toHaveAttr('aria-valuetext', 'Still loading'),
    )
  })

  it.each([
    {
      source: 'string',
      valueText: '25 percent',
      expectedValueText: '25 percent',
    },
    {
      source: 'formatter',
      valueText: (value: number, max: number) => `${value} of ${max}`,
      expectedValueText: '25 of 100',
    },
  ])(
    'renders determinate aria-valuetext from the configured $source',
    ({ valueText, expectedValueText }) => {
      Scene.scene(
        { update, view: testView({ valueText }) },
        Scene.given({}),
        Scene.expect(progress).toHaveAttr('aria-valuetext', expectedValueText),
      )
    },
  )

  it('falls back to the rendered label for its accessible name', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({}),
      Scene.expect(progress).toHaveAttr('aria-labelledby', 'test-label'),
      Scene.expect(Scene.selector('#test-label')).toHaveText('Upload'),
    )
  })

  it('uses an explicit ariaLabel before ariaLabelledBy', () => {
    Scene.scene(
      {
        update,
        view: testView({
          ariaLabel: 'File upload',
          ariaLabelledBy: 'external-label',
        }),
      },
      Scene.given({}),
      Scene.expect(progress).toHaveAttr('aria-label', 'File upload'),
      Scene.expect(progress).not.toHaveAttr('aria-labelledby'),
    )
  })

  it('uses an explicit ariaLabelledBy when provided', () => {
    Scene.scene(
      { update, view: testView({ ariaLabelledBy: 'external-label' }) },
      Scene.given({}),
      Scene.expect(progress).toHaveAttr('aria-labelledby', 'external-label'),
    )
  })
})
