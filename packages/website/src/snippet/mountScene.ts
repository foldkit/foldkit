import { Mount, expect, scene, text } from 'foldkit/scene'

import { it } from '@effect/vitest'

import { MeasurePanel, Panel, PanelLive } from './mountMeasurePanel'

it.effect('shows the measured height', () =>
  scene(
    PanelLive,
    expect(text('Measuring')).toExist(),
    Mount.resolve(
      MeasurePanel,
      Panel.Message.CompletedMeasurePanel({ height: 120 }),
    ),
    expect(text('Height: 120')).toExist(),
  ),
)
