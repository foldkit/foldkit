import { Mount, click, expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { Model, PanelState, update, view } from './main'
import { Message } from './message'
import { AnimatePanel } from './mount'

const hiddenModel = Model.make({ panel: PanelState.Hidden(), count: 0 })

describe('panel Model and view', () => {
  test('V1: starts hidden without a Mount', () => {
    scene(
      { update, view },
      given(hiddenModel),
      expect(text('Hidden')).toExist(),
      Mount.expectNone(),
    )
  })

  test('V2: completion is handled as a declared Mount result', () => {
    scene(
      { update, view },
      given(hiddenModel),
      click(role('button', { name: 'Show panel' })),
      expect(text('Running')).toExist(),
      Mount.resolve(AnimatePanel, Message.CompletedAnimatePanel()),
      expect(text('Completed')).toExist(),
      expect(role('button', { name: 'Show panel' })).toBeAbsent(),
    )
  })

  test('V3 and V4: hiding ends the Mount and showing starts another', () => {
    scene(
      { update, view },
      given(hiddenModel),
      click(role('button', { name: 'Show panel' })),
      Mount.resolve(AnimatePanel, Message.CompletedAnimatePanel()),
      click(role('button', { name: 'Hide panel' })),
      Mount.expectEnded(AnimatePanel),
      expect(text('Hidden')).toExist(),
      click(role('button', { name: 'Show panel' })),
      Mount.resolve(AnimatePanel, Message.CompletedAnimatePanel()),
      expect(text('Completed')).toExist(),
    )
  })

  test('V5: a counter interaction does not acquire a second Mount', () => {
    scene(
      { update, view },
      given(hiddenModel),
      click(role('button', { name: 'Show panel' })),
      Mount.resolve(AnimatePanel, Message.CompletedAnimatePanel()),
      click(role('button', { name: 'Increment counter' })),
      expect(text('Counter: 1')).toExist(),
      expect(text('Completed')).toExist(),
      Mount.expectNone(),
    )
  })

  test('V7: failure is visible and the panel can still be hidden', () => {
    scene(
      { update, view },
      given(hiddenModel),
      click(role('button', { name: 'Show panel' })),
      Mount.resolve(
        AnimatePanel,
        Message.FailedAnimatePanel({ error: 'Native animation unavailable' }),
      ),
      expect(text('Failed: Native animation unavailable')).toExist(),
      click(role('button', { name: 'Hide panel' })),
      Mount.expectEnded(AnimatePanel),
      expect(text('Hidden')).toExist(),
    )
  })
})
