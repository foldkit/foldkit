import { Scene } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, type Model, layer } from './block'

const emptyModel: Model = {
  balls: [],
  nextId: 0,
  isRunning: true,
}

describe('view', () => {
  it.effect(
    'initial view shows the heading, prompt, and Pause + Clear controls',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(emptyModel),
        Scene.expect(Scene.role('heading', { name: 'Canvas Art' })).toExist(),
        Scene.expect(Scene.text('Click the canvas to spawn a ball.')).toExist(),
        Scene.expect(Scene.role('button', { name: 'Pause' })).toExist(),
        Scene.expect(Scene.role('button', { name: 'Clear' })).toExist(),
        Scene.expect(Scene.text('0 balls')).toExist(),
      ),
  )

  it.effect('Pause toggles to Play when the simulation is stopped', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(emptyModel),
      Scene.click(Scene.role('button', { name: 'Pause' })),
      Scene.expect(Scene.role('button', { name: 'Play' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Pause' })).toBeAbsent(),
    ),
  )

  it.effect('the ball count reflects spawned balls in the Model', () => {
    const populatedModel: Model = modifyFields(emptyModel, {
      balls: () => [
        { id: 0, x: 10, y: 20, vx: 1, vy: 1, radius: 8, color: '#ff2d55' },
        { id: 1, x: 30, y: 40, vx: -1, vy: 1, radius: 12, color: '#5ac8fa' },
        { id: 2, x: 50, y: 60, vx: 1, vy: -1, radius: 16, color: '#34c759' },
      ],
      nextId: () => 3,
    })

    return Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(populatedModel),
      Scene.expect(Scene.text('3 balls')).toExist(),
    )
  })

  it.effect('Clear empties the rendered ball count', () => {
    const populatedModel: Model = modifyFields(emptyModel, {
      balls: () => [
        { id: 0, x: 10, y: 20, vx: 1, vy: 1, radius: 8, color: '#ff2d55' },
      ],
      nextId: () => 1,
    })

    return Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(populatedModel),
      Scene.expect(Scene.text('1 balls')).toExist(),
      Scene.click(Scene.role('button', { name: 'Clear' })),
      Scene.expect(Scene.text('0 balls')).toExist(),
    )
  })
})
