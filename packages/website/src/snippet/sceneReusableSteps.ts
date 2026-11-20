import { click, expect, given, role, scene, steps, text } from 'foldkit/scene'
import { test } from 'vitest'

import { initialModel, update, view } from './main'

const increment = steps(click(role('button', { name: 'Increment' })))
const givenIncremented = steps(
  given(initialModel),
  increment,
  expect(text('Count: 1')).toExist(),
)

test('increments again', () => {
  scene(
    { update, view },
    givenIncremented,
    increment,
    expect(text('Count: 2')).toExist(),
  )
})

test('decrements from the shared setup', () => {
  scene(
    { update, view },
    givenIncremented,
    click(role('button', { name: 'Decrement' })),
    expect(text('Count: 0')).toExist(),
  )
})
