import { click, deliver, expect, role, scene } from 'foldkit/scene'

import { it } from '@effect/vitest'

import { Message, TimerLive } from './timer'

it.effect('shows the elapsed time after two ticks', () =>
  scene(
    TimerLive,
    click(role('button', { name: 'Start' })),
    // Scene does not run the tick Stream. Deliver the Message it produces.
    deliver(Message.Ticked()),
    deliver(Message.Ticked()),
    expect(role('timer')).toHaveText('2s'),
  ),
)
