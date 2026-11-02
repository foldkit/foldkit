import { Layer } from 'effect'
import {
  all,
  click,
  expect,
  expectAll,
  first,
  given,
  nth,
  role,
  scene,
  text,
} from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { ApplicationLive } from './application'
import { CounterLive } from './counter'

const TestLive = ApplicationLive.pipe(Layer.provide(CounterLive))

describe('view', () => {
  it.effect('renders one Counter instance per entry', () =>
    scene(
      TestLive,
      expectAll(all.role('button', { name: '+' })).toHaveCount(3),
      expectAll(all.role('button', { name: '-' })).toHaveCount(3),
      expectAll(all.role('button', { name: 'Remove' })).toHaveCount(3),
    ),
  )

  it.effect(
    'clicking + on a Counter routes the Message back to the right instance',
    () =>
      scene(
        TestLive,
        expectAll(all.text('0')).toHaveCount(3),
        click(nth(all.role('button', { name: '+' }), 1)),
        expectAll(all.text('0')).toHaveCount(2),
        expect(text('1')).toExist(),
      ),
  )

  it.effect('clicking - on a Counter decrements it', () =>
    scene(
      TestLive,
      given({
        counters: [{ count: 3 }, { count: 7 }, { count: 9 }],
        nextCounterId: 3,
      }),
      expect(text('3')).toExist(),
      click(first(all.role('button', { name: '-' }))),
      expect(text('2')).toExist(),
      expect(text('7')).toExist(),
    ),
  )

  it.effect('Add Counter creates a new instance with a fresh Counter', () =>
    scene(
      TestLive,
      click(role('button', { name: '+ Add Counter' })),
      expectAll(all.role('button', { name: 'Remove' })).toHaveCount(4),
      expectAll(all.text('0')).toHaveCount(4),
    ),
  )

  it.effect(
    'Remove deletes an instance and routes future events to surviving counters',
    () =>
      scene(
        TestLive,
        given({
          counters: [{ count: 5 }, { count: 10 }, { count: 20 }],
          nextCounterId: 3,
        }),
        expect(text('5')).toExist(),
        expect(text('10')).toExist(),
        click(first(all.role('button', { name: 'Remove' }))),
        expectAll(all.role('button', { name: 'Remove' })).toHaveCount(2),
        expect(text('5')).not.toExist(),
        expect(text('10')).toExist(),
        click(first(all.role('button', { name: '+' }))),
        expect(text('11')).toExist(),
      ),
  )
})
